"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin, getClientIp } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/services/audit";
import { equipmentSchema } from "@/lib/validators";
import type { ActionResult } from "./auth";

export async function upsertEquipment(
  equipmentId: string | null,
  values: unknown
): Promise<ActionResult> {
  const { user, companyId } = await requireCompanyAdmin();
  const parsed = equipmentSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  let id = equipmentId;
  if (equipmentId) {
    const found = await prisma.equipment.findFirst({
      where: { id: equipmentId, companyId },
      select: { id: true },
    });
    if (!found) return { ok: false, error: "Matériel introuvable." };
    await prisma.equipment.update({ where: { id: equipmentId }, data: parsed.data });
  } else {
    const created = await prisma.equipment.create({
      data: { ...parsed.data, companyId },
    });
    id = created.id;
  }

  await writeAuditLog({
    action: "EQUIPMENT_UPSERTED",
    userId: user.id,
    companyId,
    entityType: "Equipment",
    entityId: id ?? undefined,
    ipAddress: await getClientIp(),
  });
  revalidatePath("/app/materiel");
  return { ok: true, data: { id } };
}

export async function deleteEquipment(equipmentId: string): Promise<ActionResult> {
  const { companyId } = await requireCompanyAdmin();
  const found = await prisma.equipment.findFirst({
    where: { id: equipmentId, companyId },
    select: { id: true },
  });
  if (!found) return { ok: false, error: "Matériel introuvable." };
  await prisma.equipment.delete({ where: { id: equipmentId } });
  revalidatePath("/app/materiel");
  return { ok: true };
}
