import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildStorageKey, getStorage } from "@/lib/storage";
import { writeAuditLog } from "@/lib/services/audit";
import { documentMetaSchema } from "@/lib/validators";
import { DocumentType } from "@prisma/client";

export const runtime = "nodejs";

const MAX_SIZE = 25 * 1024 * 1024; // 25 Mo
const ALLOWED_MIME = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Upload de fichiers (multipart) :
 *  - kind=document    → document administratif de l'entreprise (dirigeant, ou employé pour sa fiche)
 *  - kind=tenderFile  → pièce du DCE d'un AO (super admin)
 *  - kind=equipmentPhoto → photo d'un matériel (dirigeant)
 * Les fichiers sont privés (var/uploads), servis uniquement via /api/files.
 */
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = form.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 25 Mo)" }, { status: 413 });
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.includes(mimeType)) {
    return NextResponse.json(
      { error: `Type de fichier non autorisé (${mimeType})` },
      { status: 415 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorage();

  // ── Document administratif ──
  if (kind === "document") {
    if (!user.companyId || user.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    const meta = documentMetaSchema.safeParse({
      type: form.get("type"),
      label: form.get("label"),
      dateEmission: form.get("dateEmission") || null,
      dateExpiration: form.get("dateExpiration") || null,
      employeeId: form.get("employeeId") || null,
    });
    if (!meta.success) {
      return NextResponse.json(
        { error: meta.error.issues[0]?.message ?? "Métadonnées invalides" },
        { status: 400 }
      );
    }

    // Un employé ne peut téléverser que des documents liés à SA fiche.
    let employeeId = meta.data.employeeId ?? null;
    if (user.role === "EMPLOYEE") {
      const own = await prisma.employee.findFirst({
        where: { userId: user.id, companyId: user.companyId },
        select: { id: true },
      });
      if (!own) {
        return NextResponse.json({ error: "Aucune fiche employé liée" }, { status: 403 });
      }
      employeeId = own.id;
    } else if (employeeId) {
      const found = await prisma.employee.findFirst({
        where: { id: employeeId, companyId: user.companyId },
        select: { id: true },
      });
      if (!found) {
        return NextResponse.json({ error: "Fiche employé introuvable" }, { status: 400 });
      }
    }

    const storageKey = buildStorageKey(user.companyId, "documents", file.name);
    await storage.put(storageKey, buffer, mimeType);
    const doc = await prisma.document.create({
      data: {
        companyId: user.companyId,
        employeeId,
        type: meta.data.type as DocumentType,
        label: meta.data.label,
        storageKey,
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
        dateEmission: meta.data.dateEmission ? new Date(meta.data.dateEmission) : null,
        dateExpiration: meta.data.dateExpiration
          ? new Date(meta.data.dateExpiration)
          : null,
        uploadedById: user.id,
      },
    });
    await writeAuditLog({
      action: "DOCUMENT_UPLOADED",
      userId: user.id,
      companyId: user.companyId,
      entityType: "Document",
      entityId: doc.id,
      metadata: { fileName: file.name, type: meta.data.type },
    });
    return NextResponse.json({ ok: true, documentId: doc.id });
  }

  // ── Pièce du DCE ──
  if (kind === "tenderFile") {
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    const tenderId = form.get("tenderId");
    if (typeof tenderId !== "string") {
      return NextResponse.json({ error: "tenderId manquant" }, { status: 400 });
    }
    const tender = await prisma.tender.findUnique({ where: { id: tenderId } });
    if (!tender) {
      return NextResponse.json({ error: "AO introuvable" }, { status: 404 });
    }
    const storageKey = buildStorageKey(tender.companyId, "tenders", file.name);
    await storage.put(storageKey, buffer, mimeType);
    const tenderFile = await prisma.tenderFile.create({
      data: {
        tenderId,
        storageKey,
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
      },
    });
    return NextResponse.json({ ok: true, tenderFileId: tenderFile.id });
  }

  // ── Photo de matériel ──
  if (kind === "equipmentPhoto") {
    if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    const equipmentId = form.get("equipmentId");
    if (typeof equipmentId !== "string") {
      return NextResponse.json({ error: "equipmentId manquant" }, { status: 400 });
    }
    const equipment = await prisma.equipment.findFirst({
      where: { id: equipmentId, companyId: user.companyId },
    });
    if (!equipment) {
      return NextResponse.json({ error: "Matériel introuvable" }, { status: 404 });
    }
    const storageKey = buildStorageKey(user.companyId, "photos", file.name);
    await storage.put(storageKey, buffer, mimeType);
    if (equipment.photoKey) await storage.delete(equipment.photoKey);
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: { photoKey: storageKey },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "kind invalide" }, { status: 400 });
}
