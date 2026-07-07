"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireCompany,
  requireCompanyAdmin,
  getClientIp,
} from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/services/audit";
import { generateShortCv } from "@/lib/services/cv";
import { employeeSchema, employeeSelfSchema } from "@/lib/validators";
import type { ActionResult } from "./auth";

export async function upsertEmployee(
  employeeId: string | null,
  values: unknown
): Promise<ActionResult> {
  const { user, companyId } = await requireCompanyAdmin();
  const parsed = employeeSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const d = parsed.data;
  const data = {
    nom: d.nom,
    prenom: d.prenom,
    poste: d.poste,
    experienceAnnees: d.experienceAnnees ?? null,
    competences: d.competences,
    habilitations: d.habilitations,
    formations: d.formations,
    permis: d.permis,
    roleChantier: d.roleChantier,
    disponibilite: d.disponibilite,
    cvGenere: generateShortCv({
      nom: d.nom,
      prenom: d.prenom,
      poste: d.poste,
      experienceAnnees: d.experienceAnnees ?? null,
      competences: d.competences,
      habilitations: d.habilitations,
      formations: d.formations,
      permis: d.permis,
      roleChantier: d.roleChantier ?? null,
      disponibilite: d.disponibilite,
    }),
  };

  let id = employeeId;
  if (employeeId) {
    // Scoping strict : la fiche doit appartenir à l'entreprise du JWT.
    const found = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true },
    });
    if (!found) return { ok: false, error: "Fiche introuvable." };
    await prisma.employee.update({ where: { id: employeeId }, data });
  } else {
    const created = await prisma.employee.create({ data: { ...data, companyId } });
    id = created.id;
  }

  await writeAuditLog({
    action: "EMPLOYEE_UPSERTED",
    userId: user.id,
    companyId,
    entityType: "Employee",
    entityId: id ?? undefined,
    ipAddress: await getClientIp(),
  });
  revalidatePath("/app/equipe");
  return { ok: true, data: { id } };
}

export async function deleteEmployee(employeeId: string): Promise<ActionResult> {
  const { companyId } = await requireCompanyAdmin();
  const found = await prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    select: { id: true },
  });
  if (!found) return { ok: false, error: "Fiche introuvable." };
  await prisma.employee.delete({ where: { id: employeeId } });
  revalidatePath("/app/equipe");
  return { ok: true };
}

/** L'employé complète son propre profil (compétences, habilitations, formations, permis). */
export async function updateOwnProfile(values: unknown): Promise<ActionResult> {
  const { user, companyId } = await requireCompany();
  const parsed = employeeSelfSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: user.id, companyId },
  });
  if (!employee) return { ok: false, error: "Aucune fiche employé liée à votre compte." };

  const d = parsed.data;
  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      competences: d.competences,
      habilitations: d.habilitations,
      formations: d.formations,
      permis: d.permis,
      cvGenere: generateShortCv({
        nom: employee.nom,
        prenom: employee.prenom,
        poste: employee.poste,
        experienceAnnees: employee.experienceAnnees,
        competences: d.competences,
        habilitations: d.habilitations,
        formations: d.formations,
        permis: d.permis,
        roleChantier: employee.roleChantier,
        disponibilite: employee.disponibilite,
      }),
    },
  });

  await writeAuditLog({
    action: "EMPLOYEE_UPSERTED",
    userId: user.id,
    companyId,
    entityType: "Employee",
    entityId: employee.id,
    ipAddress: await getClientIp(),
  });
  revalidatePath("/app/mon-profil");
  return { ok: true };
}
