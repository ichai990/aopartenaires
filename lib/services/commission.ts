import "server-only";

/**
 * Barème de commission BTPilot — STRICTEMENT ADMIN.
 * Ce module ne doit jamais être importé depuis une page ou action
 * de l'espace client : uniquement depuis le code admin (requireSuperAdmin).
 *
 * Barème progressif par tranche (HT) :
 *   0 → 100 000 €        : 10 %
 *   100 000 → 1 000 000 € : 7 %
 *   1 000 000 → 10 000 000 € : 4 %
 *   au-delà de 10 000 000 € : 2,5 %
 */

export type CommissionBracket = {
  de: number;
  a: number | null; // null = illimité
  taux: number; // en %
  assiette: number; // part du marché dans cette tranche
  montant: number; // commission sur cette tranche
};

export const COMMISSION_BRACKETS: { de: number; a: number | null; taux: number }[] = [
  { de: 0, a: 100_000, taux: 10 },
  { de: 100_000, a: 1_000_000, taux: 7 },
  { de: 1_000_000, a: 10_000_000, taux: 4 },
  { de: 10_000_000, a: null, taux: 2.5 },
];

export function calculateCommission(amountHT: number): {
  total: number;
  brackets: CommissionBracket[];
} {
  if (!Number.isFinite(amountHT) || amountHT <= 0) {
    return { total: 0, brackets: [] };
  }

  const brackets: CommissionBracket[] = [];
  let total = 0;

  for (const { de, a, taux } of COMMISSION_BRACKETS) {
    if (amountHT <= de) break;
    const plafond = a ?? Infinity;
    const assiette = Math.min(amountHT, plafond) - de;
    const montant = Math.round(assiette * taux) / 100; // taux en %, arrondi au centime
    brackets.push({ de, a, taux, assiette, montant });
    total += montant;
  }

  return { total: Math.round(total * 100) / 100, brackets };
}
