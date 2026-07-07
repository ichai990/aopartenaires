"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin, getClientIp } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/services/audit";
import { referenceSchema } from "@/lib/validators";
import type { ActionResult } from "./auth";

export async function upsertReference(
  referenceId: string | null,
  values: unknown
): Promise<ActionResult> {
  const { user, companyId } = await requireCompanyAdmin();
  const parsed = referenceSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const d = parsed.data;
  const data = {
    nomChantier: d.nomChantier,
    client: d.client,
    prestation: d.prestation,
    domaine: d.domaine,
    montantHT: d.montantHT,
    annee: d.annee,
    dureeMois: d.dureeMois ?? null,
    description: d.description,
    contactAutorise: d.contactAutorise,
    contactNom: d.contactAutorise ? d.contactNom : null,
    contactTelephone: d.contactAutorise ? d.contactTelephone : null,
    contactEmail: d.contactAutorise ? d.contactEmail : null,
  };

  let id = referenceId;
  if (referenceId) {
    const found = await prisma.reference.findFirst({
      where: { id: referenceId, companyId },
      select: { id: true },
    });
    if (!found) return { ok: false, error: "Référence introuvable." };
    await prisma.reference.update({ where: { id: referenceId }, data });
  } else {
    const created = await prisma.reference.create({ data: { ...data, companyId } });
    id = created.id;
  }

  await writeAuditLog({
    action: "REFERENCE_UPSERTED",
    userId: user.id,
    companyId,
    entityType: "Reference",
    entityId: id ?? undefined,
    ipAddress: await getClientIp(),
  });
  revalidatePath("/app/references");
  return { ok: true, data: { id } };
}

export async function deleteReference(referenceId: string): Promise<ActionResult> {
  const { companyId } = await requireCompanyAdmin();
  const found = await prisma.reference.findFirst({
    where: { id: referenceId, companyId },
    select: { id: true },
  });
  if (!found) return { ok: false, error: "Référence introuvable." };
  await prisma.reference.delete({ where: { id: referenceId } });
  revalidatePath("/app/references");
  return { ok: true };
}
