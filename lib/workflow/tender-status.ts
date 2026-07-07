import type { Role, TenderStatus } from "@prisma/client";

/**
 * Machine à états des appels d'offres — source de vérité unique.
 *
 * DCE importé → Analyse IA → Pièces vérifiées → Mémoire généré
 *   → Prix à valider → Signature dirigeant → Dépôt → Gagné/Perdu
 *
 * Invariant absolu : DEPOSE est inaccessible sans une Validation
 * (autorisationDepot = true) portant sur la version courante du dossier —
 * cette garde est appliquée dans l'action markDeposited, en plus
 * des transitions ci-dessous.
 */

type Transition = {
  to: TenderStatus;
  /** Rôles autorisés à déclencher cette transition. */
  roles: Role[];
};

const TRANSITIONS: Record<TenderStatus, Transition[]> = {
  A_ANALYSER: [
    { to: "EN_PREPARATION", roles: ["SUPER_ADMIN"] },
    { to: "PIECES_MANQUANTES", roles: ["SUPER_ADMIN"] },
    { to: "VISITE_A_PLANIFIER", roles: ["SUPER_ADMIN"] },
    { to: "PERDU", roles: ["SUPER_ADMIN"] },
  ],
  PIECES_MANQUANTES: [
    { to: "EN_PREPARATION", roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
    { to: "VISITE_A_PLANIFIER", roles: ["SUPER_ADMIN"] },
    { to: "PERDU", roles: ["SUPER_ADMIN"] },
  ],
  VISITE_A_PLANIFIER: [
    { to: "EN_PREPARATION", roles: ["SUPER_ADMIN"] },
    { to: "PIECES_MANQUANTES", roles: ["SUPER_ADMIN"] },
    { to: "PERDU", roles: ["SUPER_ADMIN"] },
  ],
  EN_PREPARATION: [
    { to: "PRET_POUR_VALIDATION", roles: ["SUPER_ADMIN"] },
    { to: "PIECES_MANQUANTES", roles: ["SUPER_ADMIN"] },
    { to: "VISITE_A_PLANIFIER", roles: ["SUPER_ADMIN"] },
    { to: "PERDU", roles: ["SUPER_ADMIN"] },
  ],
  PRET_POUR_VALIDATION: [
    { to: "EN_ATTENTE_DIRIGEANT", roles: ["SUPER_ADMIN"] },
    { to: "EN_PREPARATION", roles: ["SUPER_ADMIN"] },
    { to: "PERDU", roles: ["SUPER_ADMIN"] },
  ],
  EN_ATTENTE_DIRIGEANT: [
    // La validation dirigeant est la SEULE voie vers VALIDE.
    { to: "VALIDE", roles: ["COMPANY_ADMIN"] },
    // Le dirigeant peut refuser le dossier en l'état (demande de modifications).
    { to: "EN_PREPARATION", roles: ["SUPER_ADMIN", "COMPANY_ADMIN"] },
    { to: "PERDU", roles: ["SUPER_ADMIN"] },
  ],
  VALIDE: [
    { to: "DEPOSE", roles: ["SUPER_ADMIN"] },
    // Régénération du dossier → retour en attente de re-validation.
    { to: "EN_ATTENTE_DIRIGEANT", roles: ["SUPER_ADMIN"] },
    { to: "PERDU", roles: ["SUPER_ADMIN"] },
  ],
  DEPOSE: [
    { to: "GAGNE", roles: ["SUPER_ADMIN"] },
    { to: "PERDU", roles: ["SUPER_ADMIN"] },
  ],
  GAGNE: [],
  PERDU: [],
};

export function canTransition(
  role: Role,
  from: TenderStatus,
  to: TenderStatus
): boolean {
  return TRANSITIONS[from].some(
    (t) => t.to === to && t.roles.includes(role)
  );
}

export function allowedTransitions(role: Role, from: TenderStatus): TenderStatus[] {
  return TRANSITIONS[from].filter((t) => t.roles.includes(role)).map((t) => t.to);
}

/** Étapes du workflow pour l'affichage de la frise de progression. */
export const WORKFLOW_STEPS: { status: TenderStatus[]; label: string }[] = [
  { status: ["A_ANALYSER"], label: "DCE importé" },
  { status: ["PIECES_MANQUANTES", "VISITE_A_PLANIFIER", "EN_PREPARATION"], label: "Préparation" },
  { status: ["PRET_POUR_VALIDATION"], label: "Dossier prêt" },
  { status: ["EN_ATTENTE_DIRIGEANT"], label: "Validation dirigeant" },
  { status: ["VALIDE"], label: "Validé" },
  { status: ["DEPOSE"], label: "Déposé" },
  { status: ["GAGNE", "PERDU"], label: "Résultat" },
];
