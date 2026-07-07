"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin, getClientIp } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/services/audit";
import { companyProfileSchema } from "@/lib/validators";
import type { ActionResult } from "./auth";

export async function updateCompanyProfile(values: unknown): Promise<ActionResult> {
  const { user, companyId } = await requireCompanyAdmin();
  const parsed = companyProfileSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const d = parsed.data;

  // Unicité SIRET hors entreprise courante.
  const conflict = await prisma.company.findFirst({
    where: { siret: d.siret, id: { not: companyId } },
    select: { id: true },
  });
  if (conflict) return { ok: false, error: "Ce SIRET est déjà utilisé." };

  await prisma.company.update({
    where: { id: companyId },
    data: {
      raisonSociale: d.raisonSociale,
      siret: d.siret,
      adresse: d.adresse,
      codePostal: d.codePostal,
      ville: d.ville,
      dirigeantNom: d.dirigeantNom,
      email: d.email || null,
      telephone: d.telephone,
      domaines: d.domaines,
      zonesGeographiques: d.zonesGeographiques,
      caAnnuel: d.caAnnuel,
      effectif: d.effectif,
      capaciteFinanciere: d.capaciteFinanciere,
      description: d.description,
      qualifications: d.qualifications,
      certifications: d.certifications,
      assurances: d.assurances,
    },
  });

  await writeAuditLog({
    action: "COMPANY_UPDATED",
    userId: user.id,
    companyId,
    entityType: "Company",
    entityId: companyId,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/app/entreprise");
  return { ok: true };
}
