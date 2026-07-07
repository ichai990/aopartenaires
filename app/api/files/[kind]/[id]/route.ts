import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Téléchargement de fichiers privés — contrôle multi-tenant systématique :
 * la clé de stockage est résolue depuis la base, jamais depuis le client.
 *  - /api/files/document/[id]   → Document administratif
 *  - /api/files/tender/[id]     → Pièce de DCE
 *  - /api/files/equipment/[id]  → Photo de matériel
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { kind, id } = await params;
  const isAdmin = user.role === "SUPER_ADMIN";

  let storageKey: string | null = null;
  let fileName = "fichier";
  let mimeType = "application/octet-stream";

  if (kind === "document") {
    const doc = await prisma.document.findUnique({ where: { id } });
    // 404 (et non 403) pour ne pas révéler l'existence de données d'autres tenants.
    if (!doc || (!isAdmin && doc.companyId !== user.companyId)) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    storageKey = doc.storageKey;
    fileName = doc.fileName;
    mimeType = doc.mimeType;
  } else if (kind === "tender") {
    const file = await prisma.tenderFile.findUnique({
      where: { id },
      include: { tender: { select: { companyId: true } } },
    });
    if (!file || (!isAdmin && file.tender.companyId !== user.companyId)) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    storageKey = file.storageKey;
    fileName = file.fileName;
    mimeType = file.mimeType;
  } else if (kind === "equipment") {
    const equipment = await prisma.equipment.findUnique({ where: { id } });
    if (
      !equipment?.photoKey ||
      (!isAdmin && equipment.companyId !== user.companyId)
    ) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    storageKey = equipment.photoKey;
    fileName = `photo-${equipment.nom}`;
    mimeType = "image/jpeg";
  } else {
    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  }

  try {
    const content = await getStorage().get(storageKey);
    // Seuls les types réellement prévisualisables sont servis inline ; tout le
    // reste part en téléchargement avec un type neutre, et nosniff empêche le
    // navigateur d'interpréter un contenu uploadé comme du HTML (XSS stockée).
    const previewable =
      mimeType === "application/pdf" ||
      ["image/jpeg", "image/png", "image/webp"].includes(mimeType);
    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": previewable ? mimeType : "application/octet-stream",
        "Content-Disposition": `${previewable ? "inline" : "attachment"}; filename="${encodeURIComponent(fileName)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier absent du stockage" }, { status: 404 });
  }
}
