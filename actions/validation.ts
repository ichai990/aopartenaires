"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireCompanyAdmin,
  getClientIp,
  getUserAgent,
} from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/services/audit";
import { validationSchema } from "@/lib/validators";
import type { ActionResult } from "./auth";

/**
 * Validation dirigeant — la SEULE voie vers le statut VALIDE.
 * Exige les 6 cases cochées, trace tout (utilisateur, IP, user-agent,
 * hash de la version validée) et verrouille la version du dossier.
 */
export async function submitValidation(values: unknown): Promise<ActionResult> {
  const { user, companyId, impersonated } = await requireCompanyAdmin();
  // La validation engage l'entreprise : elle doit émaner du dirigeant
  // lui-même, jamais d'un super admin en mode « voir comme ».
  if (impersonated) {
    return {
      ok: false,
      error:
        "Mode consultation : la validation doit être réalisée par le dirigeant lui-même.",
    };
  }
  const parsed = validationSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Toutes les cases doivent être cochées.",
    };
  }
  const d = parsed.data;

  // Scoping strict : l'AO doit appartenir à l'entreprise du dirigeant.
  const tender = await prisma.tender.findFirst({
    where: { id: d.tenderId, companyId },
    include: { proposal: { include: { currentVersion: true } } },
  });
  if (!tender) return { ok: false, error: "Appel d'offres introuvable." };
  if (tender.status !== "EN_ATTENTE_DIRIGEANT") {
    return { ok: false, error: "Ce dossier n'est pas en attente de votre validation." };
  }

  const version = tender.proposal?.currentVersion;
  if (!version || version.id !== d.proposalVersionId) {
    return {
      ok: false,
      error:
        "La version du dossier a changé depuis l'affichage. Rechargez la page et relisez le dossier avant de valider.",
    };
  }

  const ipAddress = await getClientIp();
  const userAgent = await getUserAgent();
  // Constante non-nullable capturée par la closure (narrowing TS).
  const tenderRecordId = tender.id;

  try {
    await prisma.$transaction(async (tx) => {
      // Re-contrôle DANS la transaction : si l'admin a régénéré le dossier
      // entre l'affichage et la soumission, la validation est refusée
      // (elle porterait sur une version qui n'est plus la version courante).
      const fresh = await tx.tender.findUniqueOrThrow({
        where: { id: tender.id },
        include: { proposal: { select: { currentVersionId: true } } },
      });
      if (
        fresh.status !== "EN_ATTENTE_DIRIGEANT" ||
        fresh.proposal?.currentVersionId !== version.id
      ) {
        throw new Error("VERSION_CHANGED");
      }
      await createValidationRecords(tx);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "VERSION_CHANGED") {
      return {
        ok: false,
        error:
          "Le dossier a été modifié pendant votre lecture. Rechargez la page et relisez la nouvelle version avant de valider.",
      };
    }
    throw e;
  }

  async function createValidationRecords(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
  ) {
    if (!version) return;
    const validation = await tx.validation.create({
      data: {
        proposalVersionId: version.id,
        tenderId: tenderRecordId,
        companyId,
        userId: user.id,
        prixValide: true,
        delaisValides: true,
        moyensHumainsValides: true,
        moyensMaterielsValides: true,
        engagementsValides: true,
        autorisationDepot: true,
        commentaire: d.commentaire,
        ipAddress,
        userAgent,
        contentHash: version.contentHash,
      },
    });
    await tx.tender.update({
      where: { id: tenderRecordId },
      data: { status: "VALIDE" },
    });
    await writeAuditLog({
      tx,
      action: "PROPOSAL_VALIDATED",
      userId: user.id,
      companyId,
      entityType: "Validation",
      entityId: validation.id,
      metadata: {
        tenderId: tenderRecordId,
        proposalVersionId: version.id,
        versionNumber: version.versionNumber,
        contentHash: version.contentHash,
        elementsValides: [
          "prix",
          "delais",
          "moyensHumains",
          "moyensMateriels",
          "engagements",
          "autorisationDepot",
        ],
      },
      ipAddress,
    });
  }

  revalidatePath(`/app/appels-offres/${tender.id}`);
  revalidatePath("/app");
  return { ok: true };
}

/**
 * Le dirigeant refuse le dossier en l'état et le renvoie en préparation
 * (transition EN_ATTENTE_DIRIGEANT → EN_PREPARATION, tracée avec son
 * commentaire pour l'équipe BTPilot).
 */
export async function requestChanges(
  tenderId: string,
  commentaire: string
): Promise<ActionResult> {
  const { user, companyId, impersonated } = await requireCompanyAdmin();
  if (impersonated) {
    return {
      ok: false,
      error:
        "Mode consultation : cette action est réservée au dirigeant lui-même.",
    };
  }
  const motif = commentaire.trim();
  if (!motif) {
    return { ok: false, error: "Indiquez ce qui doit être modifié." };
  }

  const tender = await prisma.tender.findFirst({
    where: { id: tenderId, companyId },
  });
  if (!tender) return { ok: false, error: "Appel d'offres introuvable." };
  if (tender.status !== "EN_ATTENTE_DIRIGEANT") {
    return { ok: false, error: "Ce dossier n'est pas en attente de votre validation." };
  }

  const ipAddress = await getClientIp();
  await prisma.$transaction(async (tx) => {
    await tx.tender.update({
      where: { id: tender.id },
      data: { status: "EN_PREPARATION" },
    });
    await writeAuditLog({
      tx,
      action: "TENDER_STATUS_CHANGED",
      userId: user.id,
      companyId,
      entityType: "Tender",
      entityId: tender.id,
      metadata: {
        from: "EN_ATTENTE_DIRIGEANT",
        to: "EN_PREPARATION",
        motifDirigeant: motif,
      },
      ipAddress,
    });
  });

  revalidatePath(`/app/appels-offres/${tender.id}`);
  revalidatePath("/app");
  return { ok: true };
}
