"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireCompanyAdmin,
  requireSuperAdmin,
  getClientIp,
} from "@/lib/auth/guards";
import { getStorage } from "@/lib/storage";
import { writeAuditLog } from "@/lib/services/audit";
import { documentMetaSchema } from "@/lib/validators";
import type { ActionResult } from "./auth";

/** Mise à jour des métadonnées d'un document (l'upload passe par /api/upload). */
export async function updateDocumentMeta(
  documentId: string,
  values: unknown
): Promise<ActionResult> {
  const { companyId } = await requireCompanyAdmin();
  const parsed = documentMetaSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const found = await prisma.document.findFirst({
    where: { id: documentId, companyId },
    select: { id: true },
  });
  if (!found) return { ok: false, error: "Document introuvable." };

  const d = parsed.data;
  // La fiche salarié liée doit appartenir au même tenant.
  if (d.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: d.employeeId, companyId },
      select: { id: true },
    });
    if (!employee) return { ok: false, error: "Fiche salarié introuvable." };
  }
  await prisma.document.update({
    where: { id: documentId },
    data: {
      type: d.type,
      label: d.label,
      dateEmission: d.dateEmission ? new Date(d.dateEmission) : null,
      dateExpiration: d.dateExpiration ? new Date(d.dateExpiration) : null,
      employeeId: d.employeeId,
    },
  });
  revalidatePath("/app/documents");
  return { ok: true };
}

export async function deleteDocument(documentId: string): Promise<ActionResult> {
  const { user, companyId } = await requireCompanyAdmin();
  const doc = await prisma.document.findFirst({
    where: { id: documentId, companyId },
  });
  if (!doc) return { ok: false, error: "Document introuvable." };

  await prisma.document.delete({ where: { id: documentId } });
  await getStorage().delete(doc.storageKey);
  await writeAuditLog({
    action: "DOCUMENT_DELETED",
    userId: user.id,
    companyId,
    entityType: "Document",
    entityId: documentId,
    metadata: { fileName: doc.fileName },
    ipAddress: await getClientIp(),
  });
  revalidatePath("/app/documents");
  return { ok: true };
}

/** Commentaire de l'équipe BTPilot sur un document (visible par le client). */
export async function setDocumentAdminComment(
  documentId: string,
  comment: string
): Promise<ActionResult> {
  await requireSuperAdmin();
  await prisma.document.update({
    where: { id: documentId },
    data: { commentaireAdmin: comment.trim() || null },
  });
  revalidatePath("/admin/documents-expires");
  return { ok: true };
}
