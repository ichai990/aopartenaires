"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AiProviderKind, Role, SourceStatus, SourceType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, getClientIp, VIEW_AS_COOKIE } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/services/audit";
import { createInvitationLink } from "@/lib/services/invitations";
import {
  runAnalysisForTender,
  generateProposalForTender,
} from "@/lib/services/tender-pipeline";
import { markDeposited, markResult } from "@/lib/services/tender-admin";
import { canTransition } from "@/lib/workflow/tender-status";
import type { TenderStatus } from "@prisma/client";
import { createCompanySchema, invitationSchema, tenderCreateSchema } from "@/lib/validators";
import type { ActionResult } from "./auth";

// ─────────────── Clients ───────────────

/** Crée une entreprise cliente et retourne le lien d'invitation du dirigeant. */
export async function createCompany(values: unknown): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = createCompanySchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const d = parsed.data;

  const existing = await prisma.company.findUnique({ where: { siret: d.siret } });
  if (existing) return { ok: false, error: "Une entreprise avec ce SIRET existe déjà." };

  const company = await prisma.company.create({
    data: {
      raisonSociale: d.raisonSociale,
      siret: d.siret,
      dirigeantNom: d.dirigeantNom,
      email: d.email,
    },
  });

  const invitation = await createInvitationLink({
    email: d.email,
    role: Role.COMPANY_ADMIN,
    companyId: company.id,
    invitedById: admin.id,
  });

  await writeAuditLog({
    action: "COMPANY_CREATED",
    userId: admin.id,
    companyId: company.id,
    entityType: "Company",
    entityId: company.id,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/clients");
  return { ok: true, data: { companyId: company.id, invitationUrl: invitation.url } };
}

// ─────────────── « Voir comme » (espace client) ───────────────

/** Bascule le super admin sur l'espace client de l'entreprise choisie. */
export async function startImpersonation(companyId: string): Promise<never> {
  await requireSuperAdmin();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!company) redirect("/admin/clients");
  (await cookies()).set(VIEW_AS_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/app");
}

/** Retour à l'espace admin. */
export async function stopImpersonation(): Promise<never> {
  await requireSuperAdmin();
  (await cookies()).delete(VIEW_AS_COOKIE);
  redirect("/admin/clients");
}

// ─────────────── Invitations ───────────────

export async function createInvitation(values: unknown): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = invitationSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const d = parsed.data;

  if (d.role !== Role.SUPER_ADMIN && !d.companyId) {
    return { ok: false, error: "Une entreprise est requise pour ce rôle." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: d.email.toLowerCase() },
  });
  if (existing) return { ok: false, error: "Un compte existe déjà avec cet email." };

  const invitation = await createInvitationLink({
    email: d.email,
    role: d.role,
    companyId: d.role === Role.SUPER_ADMIN ? null : (d.companyId ?? null),
    invitedById: admin.id,
  });

  await writeAuditLog({
    action: "INVITATION_CREATED",
    userId: admin.id,
    companyId: d.companyId ?? null,
    entityType: "Invitation",
    entityId: invitation.invitationId,
    metadata: { email: d.email, role: d.role },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/invitations");
  return { ok: true, data: { invitationUrl: invitation.url } };
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  await prisma.invitation.update({
    where: { id: invitationId },
    data: { revokedAt: new Date() },
  });
  await writeAuditLog({
    action: "INVITATION_REVOKED",
    userId: admin.id,
    entityType: "Invitation",
    entityId: invitationId,
    ipAddress: await getClientIp(),
  });
  revalidatePath("/admin/invitations");
  return { ok: true };
}

// ─────────────── Appels d'offres ───────────────

export async function createTender(values: unknown): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = tenderCreateSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const d = parsed.data;

  const source = await prisma.source.findFirst({ where: { type: SourceType.MANUEL } });
  const tender = await prisma.tender.create({
    data: {
      companyId: d.companyId,
      sourceId: source?.id,
      objet: d.objet,
      reference: d.reference,
      acheteur: d.acheteur,
      url: d.url || null,
      domaine: d.domaine ?? null,
      lieu: d.lieu,
      montantEstimeHT: d.montantEstimeHT,
      dateLimite: d.dateLimite ? new Date(d.dateLimite) : null,
      visiteObligatoire: d.visiteObligatoire,
      createdById: admin.id,
    },
  });

  await writeAuditLog({
    action: "TENDER_CREATED",
    userId: admin.id,
    companyId: d.companyId,
    entityType: "Tender",
    entityId: tender.id,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/appels-offres");
  return { ok: true, data: { tenderId: tender.id } };
}

export async function runAnalysis(tenderId: string): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  try {
    const status = await runAnalysisForTender(tenderId, {
      userId: admin.id,
      ip: await getClientIp(),
    });
    revalidatePath(`/admin/appels-offres/${tenderId}`);
    revalidatePath("/admin/appels-offres");
    return { ok: true, data: { status } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur d'analyse." };
  }
}

export async function generateProposal(
  tenderId: string,
  options: { prixProposeHT?: number | null; delaiProposeJours?: number | null }
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  try {
    const result = await generateProposalForTender(
      tenderId,
      { userId: admin.id, ip: await getClientIp() },
      options
    );
    revalidatePath(`/admin/appels-offres/${tenderId}`);
    revalidatePath("/admin/dossiers");
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de génération." };
  }
}

/** Envoie le dossier au dirigeant pour validation. */
export async function sendToDirigeant(tenderId: string): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const tender = await prisma.tender.findUniqueOrThrow({ where: { id: tenderId } });
  if (!canTransition("SUPER_ADMIN", tender.status, "EN_ATTENTE_DIRIGEANT")) {
    return { ok: false, error: `Transition impossible depuis « ${tender.status} ».` };
  }
  await prisma.$transaction(async (tx) => {
    await tx.tender.update({
      where: { id: tenderId },
      data: { status: "EN_ATTENTE_DIRIGEANT" },
    });
    await writeAuditLog({
      tx,
      action: "TENDER_STATUS_CHANGED",
      userId: admin.id,
      companyId: tender.companyId,
      entityType: "Tender",
      entityId: tenderId,
      metadata: { from: tender.status, to: "EN_ATTENTE_DIRIGEANT" },
      ipAddress: await getClientIp(),
    });
  });
  revalidatePath(`/admin/appels-offres/${tenderId}`);
  return { ok: true };
}

export async function planVisite(
  tenderId: string,
  dateISO: string
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsedDate = z.coerce.date().safeParse(dateISO);
  if (!parsedDate.success || Number.isNaN(parsedDate.data.getTime())) {
    return { ok: false, error: "Date de visite invalide." };
  }
  const tender = await prisma.tender.findUniqueOrThrow({ where: { id: tenderId } });
  const statusChanged = tender.status === "VISITE_A_PLANIFIER";
  await prisma.$transaction(async (tx) => {
    await tx.tender.update({
      where: { id: tenderId },
      data: {
        visitePlanifieeLe: parsedDate.data,
        status: statusChanged ? "EN_PREPARATION" : tender.status,
      },
    });
    await writeAuditLog({
      tx,
      action: "TENDER_VISIT_PLANNED",
      userId: admin.id,
      companyId: tender.companyId,
      entityType: "Tender",
      entityId: tenderId,
      metadata: {
        visitePlanifieeLe: parsedDate.data.toISOString(),
        ...(statusChanged ? { from: "VISITE_A_PLANIFIER", to: "EN_PREPARATION" } : {}),
      },
      ipAddress: await getClientIp(),
    });
  });
  revalidatePath(`/admin/appels-offres/${tenderId}`);
  return { ok: true };
}

/**
 * Changement de statut générique, strictement gardé par la machine à états
 * (« Classer sans suite », « Renvoyer en préparation », retour re-validation…).
 */
export async function changeTenderStatus(
  tenderId: string,
  to: TenderStatus
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const tender = await prisma.tender.findUniqueOrThrow({ where: { id: tenderId } });
  if (!canTransition("SUPER_ADMIN", tender.status, to)) {
    return { ok: false, error: `Transition impossible : ${tender.status} → ${to}.` };
  }
  // Le passage à DEPOSE a sa propre action avec garde de validation.
  if (to === "DEPOSE") {
    return { ok: false, error: "Utilisez l'action de dépôt dédiée." };
  }
  await prisma.$transaction(async (tx) => {
    await tx.tender.update({ where: { id: tenderId }, data: { status: to } });
    if (to === "PERDU" && tender.status !== "DEPOSE") {
      // Classement sans suite avant dépôt : annule une éventuelle commission.
      await tx.commission.updateMany({
        where: { tenderId },
        data: { status: "ANNULEE" },
      });
    }
    await writeAuditLog({
      tx,
      action: "TENDER_STATUS_CHANGED",
      userId: admin.id,
      companyId: tender.companyId,
      entityType: "Tender",
      entityId: tenderId,
      metadata: { from: tender.status, to },
      ipAddress: await getClientIp(),
    });
  });
  revalidatePath(`/admin/appels-offres/${tenderId}`);
  revalidatePath("/admin/appels-offres");
  revalidatePath("/admin");
  return { ok: true };
}

export async function depositTender(tenderId: string): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  try {
    await markDeposited(tenderId, { userId: admin.id, ip: await getClientIp() });
    revalidatePath(`/admin/appels-offres/${tenderId}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Dépôt impossible." };
  }
}

export async function setTenderResult(
  tenderId: string,
  won: boolean,
  montantMarcheHT?: number
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  try {
    await markResult(tenderId, won, { userId: admin.id, ip: await getClientIp() }, montantMarcheHT);
    revalidatePath(`/admin/appels-offres/${tenderId}`);
    revalidatePath("/admin/commissions");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Opération impossible." };
  }
}

// ─────────────── Sources de veille ───────────────

const sourceSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis"),
  type: z.enum(Object.values(SourceType) as [SourceType, ...SourceType[]]),
  baseUrl: z.string().url().or(z.literal("")).nullable().optional(),
  status: z.enum(Object.values(SourceStatus) as [SourceStatus, ...SourceStatus[]]),
});

export async function upsertSource(
  sourceId: string | null,
  values: unknown
): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = sourceSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const data = { ...parsed.data, baseUrl: parsed.data.baseUrl || null };
  if (sourceId) {
    await prisma.source.update({ where: { id: sourceId }, data });
  } else {
    await prisma.source.create({ data });
  }
  revalidatePath("/admin/sources");
  return { ok: true };
}

// ─────────────── Paramètres IA ───────────────

const aiSettingsSchema = z.object({
  provider: z.enum(
    Object.values(AiProviderKind) as [AiProviderKind, ...AiProviderKind[]]
  ),
  model: z.string().trim().nullable().optional(),
  temperature: z.coerce.number().min(0).max(1).default(0.2),
});

export async function updateAiSettings(values: unknown): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = aiSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  await prisma.aiSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...parsed.data, model: parsed.data.model || null },
    update: { ...parsed.data, model: parsed.data.model || null },
  });
  revalidatePath("/admin/parametres-ia");
  return { ok: true };
}
