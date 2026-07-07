import { DOCUMENT_EXPIRY_WARNING_DAYS } from "@/lib/constants";

export type DocumentStatut = "VALIDE" | "EXPIRE_BIENTOT" | "EXPIRE" | "SANS_ECHEANCE";

/** Statut calculé à la lecture — jamais stocké (toujours à jour). */
export function computeDocumentStatut(
  dateExpiration: Date | string | null | undefined
): DocumentStatut {
  if (!dateExpiration) return "SANS_ECHEANCE";
  const exp = new Date(dateExpiration);
  const now = new Date();
  if (exp < now) return "EXPIRE";
  const warning = new Date();
  warning.setDate(warning.getDate() + DOCUMENT_EXPIRY_WARNING_DAYS);
  if (exp <= warning) return "EXPIRE_BIENTOT";
  return "VALIDE";
}

export const DOCUMENT_STATUT_LABELS: Record<DocumentStatut, string> = {
  VALIDE: "Valide",
  EXPIRE_BIENTOT: "Expire bientôt",
  EXPIRE: "Expiré",
  SANS_ECHEANCE: "Sans échéance",
};

export const DOCUMENT_STATUT_TONE: Record<
  DocumentStatut,
  "success" | "warning" | "danger" | "neutral"
> = {
  VALIDE: "success",
  EXPIRE_BIENTOT: "warning",
  EXPIRE: "danger",
  SANS_ECHEANCE: "neutral",
};
