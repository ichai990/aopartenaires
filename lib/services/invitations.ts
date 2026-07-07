import "server-only";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/auth/password";

const INVITATION_TTL_DAYS = 7;

/**
 * Crée une invitation et retourne le lien en clair (affiché une seule fois
 * dans l'UI admin — pas d'envoi d'email en local ; brancher SMTP/Resend
 * via lib/mailer.ts en production).
 */
export async function createInvitationLink(params: {
  email: string;
  role: Role;
  companyId: string | null;
  invitedById: string;
}): Promise<{ invitationId: string; url: string }> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

  // Révoque les invitations en attente pour le même email.
  await prisma.invitation.updateMany({
    where: { email: params.email.toLowerCase(), acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const invitation = await prisma.invitation.create({
    data: {
      email: params.email.toLowerCase(),
      role: params.role,
      companyId: params.companyId,
      tokenHash: hashToken(token),
      expiresAt,
      invitedById: params.invitedById,
    },
  });

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  return {
    invitationId: invitation.id,
    url: `${baseUrl}/invitation/${token}`,
  };
}

export async function findValidInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { company: { select: { raisonSociale: true } } },
  });
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.revokedAt ||
    invitation.expiresAt < new Date()
  ) {
    return null;
  }
  return invitation;
}
