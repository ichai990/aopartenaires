import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getAiProvider } from "@/lib/ai";
import { buildCompanySnapshot } from "@/lib/ai/snapshot";
import { getStorage } from "@/lib/storage";
import { writeAuditLog } from "@/lib/services/audit";
import type { DceInput, ProposalVersionInput } from "@/lib/ai/types";
import type { PieceManquante } from "@/lib/ai/schemas";
import type { TenderStatus } from "@prisma/client";

const TEXT_MIME_PREFIXES = ["text/", "application/json"];

/**
 * Pipeline : DCE importé → Analyse IA → statut recalculé.
 * Écrit TenderAnalysis + audit log, retourne le nouveau statut.
 */
export async function runAnalysisForTender(
  tenderId: string,
  actor: { userId: string; ip: string }
): Promise<TenderStatus> {
  const tender = await prisma.tender.findUniqueOrThrow({
    where: { id: tenderId },
    include: { files: true },
  });

  // Texte des fichiers du DCE quand il est lisible (txt/markdown/json).
  const storage = getStorage();
  const files: DceInput["files"] = await Promise.all(
    tender.files.map(async (f) => {
      let text: string | null = null;
      if (TEXT_MIME_PREFIXES.some((p) => f.mimeType.startsWith(p))) {
        try {
          text = (await storage.get(f.storageKey)).toString("utf8").slice(0, 100_000);
        } catch {
          text = null;
        }
      }
      return { fileName: f.fileName, mimeType: f.mimeType, text };
    })
  );

  const input: DceInput = {
    tenderId: tender.id,
    manual: {
      objet: tender.objet,
      acheteur: tender.acheteur,
      reference: tender.reference,
      domaine: tender.domaine,
      lieu: tender.lieu,
      montantEstimeHT: tender.montantEstimeHT ? Number(tender.montantEstimeHT) : null,
      dateLimite: tender.dateLimite?.toISOString() ?? null,
      visiteObligatoire: tender.visiteObligatoire,
      url: tender.url,
    },
    files,
  };

  const provider = await getAiProvider();
  const snapshot = await buildCompanySnapshot(tender.companyId);

  const analyse = await provider.analyserDCE(input);
  const missing = await provider.detecterPiecesManquantes(analyse, snapshot);
  const compat = await provider.calculerCompatibiliteEntreprise(analyse, snapshot);

  // Statut suivant selon les constats de l'analyse.
  const visiteAPlanifier =
    (analyse.visiteObligatoire === true || tender.visiteObligatoire) &&
    !tender.visitePlanifieeLe;
  const nextStatus: TenderStatus = visiteAPlanifier
    ? "VISITE_A_PLANIFIER"
    : missing.some((m) => m.critique)
      ? "PIECES_MANQUANTES"
      : "EN_PREPARATION";

  // Une (re)analyse recalcule le statut tant que le dossier est en phase de
  // préparation — c'est la sortie légitime de PIECES_MANQUANTES quand les
  // pièces ont été complétées. Au-delà (dossier prêt/validé/déposé), le
  // statut n'est jamais rétrogradé par une analyse.
  const RECALC_FROM: TenderStatus[] = [
    "A_ANALYSER",
    "PIECES_MANQUANTES",
    "VISITE_A_PLANIFIER",
    "EN_PREPARATION",
  ];
  const shouldRecalc = RECALC_FROM.includes(tender.status);

  await prisma.$transaction(async (tx) => {
    await tx.tenderAnalysis.upsert({
      where: { tenderId },
      create: {
        tenderId,
        provider: provider.name,
        extraction: analyse,
        compatibilityScore: compat.score,
        compatibilityDetail: compat,
        missingDocuments: missing,
        champsACompleter: analyse.champsACompleter,
      },
      update: {
        provider: provider.name,
        extraction: analyse,
        compatibilityScore: compat.score,
        compatibilityDetail: compat,
        missingDocuments: missing,
        champsACompleter: analyse.champsACompleter,
        analysedAt: new Date(),
      },
    });
    // Mise à jour des champs extraits si absents à l'import.
    await tx.tender.update({
      where: { id: tenderId },
      data: {
        status: shouldRecalc ? nextStatus : tender.status,
        domaine: tender.domaine ?? analyse.domainePrincipal,
        acheteur: tender.acheteur ?? (analyse.acheteur !== "à compléter" ? analyse.acheteur : null),
        visiteObligatoire: analyse.visiteObligatoire ?? tender.visiteObligatoire,
      },
    });
    await writeAuditLog({
      tx,
      action: "TENDER_ANALYSED",
      userId: actor.userId,
      companyId: tender.companyId,
      entityType: "Tender",
      entityId: tenderId,
      metadata: { provider: provider.name, score: compat.score, nextStatus },
      ipAddress: actor.ip,
    });
  });

  return shouldRecalc ? nextStatus : tender.status;
}

/**
 * Génère une nouvelle version IMMUABLE du dossier de réponse.
 * Toute régénération après validation renvoie le dossier en attente
 * de re-validation dirigeant.
 */
export async function generateProposalForTender(
  tenderId: string,
  actor: { userId: string; ip: string },
  options: { prixProposeHT?: number | null; delaiProposeJours?: number | null } = {}
): Promise<{ versionId: string; versionNumber: number }> {
  const tender = await prisma.tender.findUniqueOrThrow({
    where: { id: tenderId },
    include: { analysis: true, proposal: { include: { versions: true } } },
  });
  if (!tender.analysis) {
    throw new Error("Analyse IA requise avant la génération du dossier.");
  }
  // Statuts terminaux ou déposés : le dossier est figé, aucune régénération.
  if (["DEPOSE", "GAGNE", "PERDU"].includes(tender.status)) {
    throw new Error(
      `Ce marché est « ${tender.status} » : le dossier ne peut plus être régénéré.`
    );
  }

  const provider = await getAiProvider();
  const snapshot = await buildCompanySnapshot(tender.companyId);
  const analyse = tender.analysis.extraction as never;

  const missing = await provider.detecterPiecesManquantes(analyse, snapshot);
  const memoire = await provider.genererMemoireTechnique(analyse, snapshot);
  const checklists = await provider.genererChecklist(analyse, snapshot, missing);
  const questions = await provider.genererQuestionsAcheteur(analyse);
  const refs = await provider.selectionnerReferencesSimilaires(
    analyse,
    snapshot.references
  );

  const moyensHumains = snapshot.employees
    .filter((e) => e.disponibilite !== "INDISPONIBLE")
    .map((e) => ({
      employeeId: e.id,
      nom: `${e.prenom} ${e.nom}`,
      poste: e.poste,
      roleChantier: e.roleChantier,
    }));
  const moyensMateriels = snapshot.equipments
    .filter((e) => e.disponibilite !== "INDISPONIBLE")
    .map((e) => ({ equipmentId: e.id, nom: e.nom, quantite: e.quantite }));

  const planning = {
    etapes: [
      { libelle: "Préparation / installation de chantier", detail: "à compléter" },
      { libelle: "Exécution des travaux", detail: "à compléter" },
      { libelle: "Réception / levée de réserves", detail: "à compléter" },
    ],
    note: "Planning indicatif à affiner à partir du CCTP avant validation.",
  };

  const content = {
    memoireTechnique: memoire,
    checklistAdministrative: checklists.administrative,
    checklistTechnique: checklists.technique,
    checklistFinanciere: checklists.financiere,
    referencesSelectionnees: refs,
    moyensHumains,
    moyensMateriels,
    planning,
    questionsAcheteur: questions,
    prixProposeHT: options.prixProposeHT ?? null,
    delaiProposeJours: options.delaiProposeJours ?? null,
  };
  const contentHash = createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");

  const result = await prisma.$transaction(async (tx) => {
    const proposal = await tx.proposal.upsert({
      where: { tenderId },
      create: { tenderId, companyId: tender.companyId },
      update: {},
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    const versionNumber = (proposal.versions[0]?.versionNumber ?? 0) + 1;

    const version = await tx.proposalVersion.create({
      data: {
        proposalId: proposal.id,
        versionNumber,
        memoireTechnique: content.memoireTechnique,
        checklistAdministrative: content.checklistAdministrative,
        checklistTechnique: content.checklistTechnique,
        checklistFinanciere: content.checklistFinanciere,
        referencesSelectionnees: content.referencesSelectionnees,
        moyensHumains: content.moyensHumains,
        moyensMateriels: content.moyensMateriels,
        planning: content.planning,
        questionsAcheteur: content.questionsAcheteur,
        prixProposeHT: content.prixProposeHT,
        delaiProposeJours: content.delaiProposeJours,
        contentHash,
        createdById: actor.userId,
      },
    });

    await tx.proposal.update({
      where: { id: proposal.id },
      data: { currentVersionId: version.id },
    });

    // Nouvelle version ⇒ toute validation précédente devient caduque.
    // Le statut n'avance vers PRET_POUR_VALIDATION que si la préparation est
    // réellement terminée : une visite non planifiée ou des pièces critiques
    // manquantes conservent leur statut bloquant (le dossier existe, mais le
    // blocage reste visible et doit être levé par l'admin).
    const wasValidated = ["VALIDE", "EN_ATTENTE_DIRIGEANT"].includes(tender.status);
    const nextStatus: TenderStatus = wasValidated
      ? "EN_ATTENTE_DIRIGEANT"
      : ["EN_PREPARATION", "PRET_POUR_VALIDATION"].includes(tender.status)
        ? "PRET_POUR_VALIDATION"
        : tender.status;
    await tx.tender.update({
      where: { id: tenderId },
      data: { status: nextStatus },
    });

    await writeAuditLog({
      tx,
      action: "PROPOSAL_GENERATED",
      userId: actor.userId,
      companyId: tender.companyId,
      entityType: "ProposalVersion",
      entityId: version.id,
      metadata: { versionNumber, contentHash },
      ipAddress: actor.ip,
    });

    return { versionId: version.id, versionNumber };
  });

  return result;
}

export type { PieceManquante, ProposalVersionInput };
