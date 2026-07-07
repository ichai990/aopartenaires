"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin, getClientIp } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/services/audit";
import { pricingSchema } from "@/lib/validators";
import type { ActionResult } from "./auth";

/**
 * Prix types : aide au chiffrage uniquement.
 * Le prix final d'une offre est TOUJOURS validé par le dirigeant
 * dans le workflow de validation avant tout dépôt.
 */
export async function updatePricing(values: unknown): Promise<ActionResult> {
  const { user, companyId } = await requireCompanyAdmin();
  const parsed = pricingSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const d = parsed.data;

  await prisma.$transaction(async (tx) => {
    const profile = await tx.pricingProfile.upsert({
      where: { companyId },
      create: {
        companyId,
        tauxHoraireMoyen: d.tauxHoraireMoyen,
        coutDeplacementKm: d.coutDeplacementKm,
        prixJourneeEquipe: d.prixJourneeEquipe,
        margeCiblePct: d.margeCiblePct,
        fraisGenerauxPct: d.fraisGenerauxPct,
        notes: d.notes,
      },
      update: {
        tauxHoraireMoyen: d.tauxHoraireMoyen,
        coutDeplacementKm: d.coutDeplacementKm,
        prixJourneeEquipe: d.prixJourneeEquipe,
        margeCiblePct: d.margeCiblePct,
        fraisGenerauxPct: d.fraisGenerauxPct,
        notes: d.notes,
      },
    });
    // Remplacement complet des prix unitaires (édition en tableau).
    await tx.pricingItem.deleteMany({ where: { pricingProfileId: profile.id } });
    if (d.items.length > 0) {
      await tx.pricingItem.createMany({
        data: d.items.map((i) => ({
          pricingProfileId: profile.id,
          libelle: i.libelle,
          unite: i.unite,
          prixUnitaireHT: i.prixUnitaireHT,
          domaine: i.domaine ?? null,
        })),
      });
    }
  });

  await writeAuditLog({
    action: "PRICING_UPDATED",
    userId: user.id,
    companyId,
    entityType: "PricingProfile",
    ipAddress: await getClientIp(),
  });
  revalidatePath("/app/prix");
  return { ok: true };
}
