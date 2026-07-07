import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Jeton opaque envoyé à l'utilisateur (lien d'invitation / reset). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Seul le hash du jeton est stocké en base. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
