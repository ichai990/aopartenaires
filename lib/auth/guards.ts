import "server-only";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Cookie « voir comme » : un super admin consulte l'espace d'une entreprise. */
export const VIEW_AS_COOKIE = "btp-view-as";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  companyId: string | null;
  firstName: string;
  lastName: string;
};

/**
 * Toute page/action authentifiée commence par ce guard.
 * Le JWT est revalidé contre la base à chaque requête : un compte désactivé
 * ou un changement de rôle/entreprise prend effet immédiatement, sans
 * attendre l'expiration du jeton (12 h).
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/connexion");

  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isActive: true, role: true, companyId: true },
  });
  if (!fresh) redirect("/connexion");
  if (!fresh.isActive) redirect("/compte-desactive");

  return {
    id: user.id,
    email: user.email ?? "",
    // Rôle et entreprise pris en base (valeurs fraîches), pas dans le JWT.
    role: fresh.role,
    companyId: fresh.companyId,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

/**
 * Périmètre entreprise (dirigeant ou employé).
 * Le companyId provient EXCLUSIVEMENT du JWT — jamais d'un paramètre client.
 * Exception contrôlée : un SUPER_ADMIN porteur du cookie « voir comme »
 * consulte l'espace de l'entreprise choisie (impersonated=true) — le cookie
 * n'est honoré QUE pour un super admin authentifié.
 */
export async function requireCompany(): Promise<{
  user: SessionUser;
  companyId: string;
  impersonated: boolean;
}> {
  const user = await requireUser();
  if (user.role === "SUPER_ADMIN") {
    const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value;
    if (viewAs) {
      const company = await prisma.company.findUnique({
        where: { id: viewAs },
        select: { id: true },
      });
      if (company) {
        return {
          user: { ...user, role: "COMPANY_ADMIN", companyId: company.id },
          companyId: company.id,
          impersonated: true,
        };
      }
    }
    redirect("/admin");
  }
  if (!user.companyId) redirect("/connexion");
  return { user, companyId: user.companyId, impersonated: false };
}

/** Réservé au dirigeant (validation, prix, gestion de l'entreprise). */
export async function requireCompanyAdmin(): Promise<{
  user: SessionUser;
  companyId: string;
  impersonated: boolean;
}> {
  const { user, companyId, impersonated } = await requireCompany();
  if (user.role !== "COMPANY_ADMIN") redirect("/app");
  return { user, companyId, impersonated };
}

/** Réservé à l'équipe interne BTPilot. */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/app");
  return user;
}

/** IP du client pour l'audit log (derrière un proxy en production). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "127.0.0.1"
  );
}

export async function getUserAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent");
}
