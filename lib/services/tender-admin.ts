import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateCommission } from "@/lib/services/commission";
import { writeAuditLog } from "@/lib/services/audit";
import { canTransition } from "@/lib/workflow/tender-status";
import type { CommissionStatus, TenderStatus } from "@prisma/client";

/**
 * Opérations réservées à l'équipe interne (SUPER_ADMIN).
 * Les appelants DOIVENT avoir passé requireSuperAdmin() avant.
 * C'est ici — et uniquement ici — que les commissions sont créées.
 */

/** Garde de dépôt : validation dirigeant obligatoire sur la version courante. */
export async function markDeposited(
  tenderId: string,
  actor: { userId: string; ip: string }
): Promise<void> {
  const tender = await prisma.tender.findUniqueOrThrow({
    where: { id: tenderId },
    include: {
      proposal: { include: { currentVersion: { include: { validations: true } } } },
    },
  });

  if (!canTransition("SUPER_ADMIN", tender.status, "DEPOSE")) {
    throw new Error(`Transition impossible depuis « ${tender.status} ».`);
  }

  const currentVersion = tender.proposal?.currentVersion;
  const validation = currentVersion?.validations.find(
    (v) => v.autorisationDepot && v.contentHash === currentVersion.contentHash
  );
  if (!currentVersion || !validation) {
    throw new Error(
      "Dépôt refusé : aucune validation dirigeant sur la version courante du dossier."
    );
  }

  const montantHT = currentVersion.prixProposeHT ?? tender.montantEstimeHT;
  if (montantHT === null || Number(montantHT) <= 0) {
    throw new Error(
      "Dépôt refusé : aucun prix n'est renseigné sur le dossier (ni prix proposé, ni montant estimé)."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.tender.update({ where: { id: tenderId }, data: { status: "DEPOSE" } });
    await upsertCommission(tx, tender.id, tender.companyId, Number(montantHT), "POTENTIELLE");
    await writeAuditLog({
      tx,
      action: "TENDER_DEPOSITED",
      userId: actor.userId,
      companyId: tender.companyId,
      entityType: "Tender",
      entityId: tenderId,
      metadata: { validationId: validation.id, contentHash: currentVersion.contentHash },
      ipAddress: actor.ip,
    });
  });
}

export async function markResult(
  tenderId: string,
  won: boolean,
  actor: { userId: string; ip: string },
  montantMarcheHT?: number
): Promise<void> {
  const tender = await prisma.tender.findUniqueOrThrow({
    where: { id: tenderId },
    include: { proposal: { include: { currentVersion: true } }, commission: true },
  });

  const to: TenderStatus = won ? "GAGNE" : "PERDU";
  if (!canTransition("SUPER_ADMIN", tender.status, to)) {
    throw new Error(`Transition impossible depuis « ${tender.status} ».`);
  }

  const montant =
    montantMarcheHT != null && montantMarcheHT > 0
      ? montantMarcheHT
      : tender.proposal?.currentVersion?.prixProposeHT
        ? Number(tender.proposal.currentVersion.prixProposeHT)
        : tender.montantEstimeHT
          ? Number(tender.montantEstimeHT)
          : null;

  // Un marché gagné DOIT porter une commission : sans montant déterminable,
  // le statut GAGNE (terminal) rendrait la commission irrécupérable.
  if (won && (montant === null || montant <= 0)) {
    throw new Error(
      "Montant du marché requis : saisissez le montant final HT pour marquer ce marché gagné."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.tender.update({ where: { id: tenderId }, data: { status: to } });
    if (won && montant) {
      await upsertCommission(tx, tender.id, tender.companyId, montant, "GAGNEE");
    } else if (!won && tender.commission) {
      await tx.commission.update({
        where: { tenderId },
        data: { status: "ANNULEE" },
      });
    }
    await writeAuditLog({
      tx,
      action: won ? "TENDER_WON" : "TENDER_LOST",
      userId: actor.userId,
      companyId: tender.companyId,
      entityType: "Tender",
      entityId: tenderId,
      metadata: { montantMarcheHT: montant },
      ipAddress: actor.ip,
    });
  });
}

async function upsertCommission(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  tenderId: string,
  companyId: string,
  montantMarcheHT: number,
  status: CommissionStatus
) {
  const { total, brackets } = calculateCommission(montantMarcheHT);
  await tx.commission.upsert({
    where: { tenderId },
    create: {
      tenderId,
      companyId,
      montantMarcheHT,
      montantCommission: total,
      bareme: brackets,
      status,
    },
    update: {
      montantMarcheHT,
      montantCommission: total,
      bareme: brackets,
      status,
    },
  });
}
