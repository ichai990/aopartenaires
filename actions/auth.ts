"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import { requireUser, getClientIp } from "@/lib/auth/guards";
import {
  generateToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "@/lib/auth/password";
import { findValidInvitation } from "@/lib/services/invitations";
import { writeAuditLog } from "@/lib/services/audit";
import {
  acceptInvitationSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validators";

export type ActionResult = { ok: boolean; error?: string; data?: unknown };

// Limitation de débit en mémoire (instance unique) : 5 échecs / 10 min
// par couple IP+email, remis à zéro à la première connexion réussie.
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function loginThrottled(key: string): boolean {
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < Date.now()) return false;
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function recordLoginFailure(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count += 1;
  }
  // Purge opportuniste des entrées expirées.
  if (loginAttempts.size > 1000) {
    for (const [k, v] of loginAttempts) {
      if (v.resetAt < now) loginAttempts.delete(k);
    }
  }
}

export async function loginAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Identifiants invalides." };

  const throttleKey = `${await getClientIp()}|${parsed.data.email.toLowerCase().trim()}`;
  if (loginThrottled(throttleKey)) {
    return {
      ok: false,
      error: "Trop de tentatives. Réessayez dans une dizaine de minutes.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      recordLoginFailure(throttleKey);
      return { ok: false, error: "Email ou mot de passe incorrect." };
    }
    throw error;
  }
  loginAttempts.delete(throttleKey);

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
    select: { id: true, role: true, companyId: true },
  });
  if (user) {
    await writeAuditLog({
      action: "LOGIN",
      userId: user.id,
      companyId: user.companyId,
      ipAddress: await getClientIp(),
    });
  }
  return { ok: true, data: { role: user?.role } };
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirect: false });
  redirect("/connexion");
}

/**
 * Mot de passe oublié : génère un lien de réinitialisation.
 * En local (pas de SMTP), le lien est retourné pour affichage direct.
 * En production avec SMTP configuré, il serait envoyé par email.
 */
export async function requestPasswordReset(values: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Email invalide." };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
  });
  // Réponse identique que le compte existe ou non (pas d'énumération d'emails)…
  if (!user || !user.isActive) return { ok: true, data: { url: null } };

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 h
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
  });

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/reinitialiser-mot-de-passe/${token}`;

  // Le lien est TOUJOURS loggé côté serveur (point d'extension : envoi
  // réel via nodemailer/Resend quand SMTP_* est configuré).
  console.log(`[RESET] Lien de réinitialisation pour ${user.email} : ${url}`);

  // SÉCURITÉ : le lien n'est renvoyé au navigateur qu'en développement local.
  // En production, le renvoyer permettrait à n'importe qui de prendre le
  // contrôle d'un compte depuis le formulaire public « mot de passe oublié ».
  const isDev = process.env.NODE_ENV !== "production";
  return { ok: true, data: { url: isDev ? url : null } };
}

export async function resetPassword(values: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "Lien invalide ou expiré. Refaites une demande." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
  await writeAuditLog({
    action: "PASSWORD_CHANGED",
    userId: record.userId,
    companyId: record.user.companyId,
    ipAddress: await getClientIp(),
  });
  return { ok: true };
}

export async function changePassword(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const valid = await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) return { ok: false, error: "Mot de passe actuel incorrect." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  await writeAuditLog({
    action: "PASSWORD_CHANGED",
    userId: user.id,
    companyId: user.companyId,
    ipAddress: await getClientIp(),
  });
  return { ok: true };
}

export async function acceptInvitation(values: unknown): Promise<ActionResult> {
  const parsed = acceptInvitationSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const invitation = await findValidInvitation(parsed.data.token);
  if (!invitation) {
    return { ok: false, error: "Invitation invalide, expirée ou déjà utilisée." };
  }

  const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existing) {
    return { ok: false, error: "Un compte existe déjà avec cet email." };
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: invitation.email,
        passwordHash: await hashPassword(parsed.data.password),
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        role: invitation.role,
        companyId: invitation.companyId,
      },
    });
    // Un employé invité est relié à une fiche RH existante quand le
    // rapprochement nom + prénom est possible (fiche créée par le dirigeant
    // avant l'invitation) ; sinon une fiche est créée à la volée.
    if (invitation.role === "EMPLOYEE" && invitation.companyId) {
      const existingSheet = await tx.employee.findFirst({
        where: {
          companyId: invitation.companyId,
          userId: null,
          nom: { equals: parsed.data.lastName.trim(), mode: "insensitive" },
          prenom: { equals: parsed.data.firstName.trim(), mode: "insensitive" },
        },
      });
      if (existingSheet) {
        await tx.employee.update({
          where: { id: existingSheet.id },
          data: { userId: created.id },
        });
      } else {
        await tx.employee.create({
          data: {
            companyId: invitation.companyId,
            userId: created.id,
            nom: parsed.data.lastName,
            prenom: parsed.data.firstName,
            poste: "À compléter",
          },
        });
      }
    }
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    await writeAuditLog({
      tx,
      action: "USER_CREATED",
      userId: created.id,
      companyId: invitation.companyId,
      entityType: "Invitation",
      entityId: invitation.id,
      ipAddress: await getClientIp(),
    });
    return created;
  });

  // Connexion automatique après création du compte.
  await signIn("credentials", {
    email: user.email,
    password: parsed.data.password,
    redirect: false,
  });

  return { ok: true, data: { role: user.role } };
}
