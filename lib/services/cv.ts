import type { Disponibilite } from "@prisma/client";
import { DISPONIBILITE_LABELS } from "@/lib/constants";

type EmployeeForCv = {
  nom: string;
  prenom: string;
  poste: string;
  experienceAnnees: number | null;
  competences: string[];
  habilitations: unknown;
  formations: unknown;
  permis: string[];
  roleChantier: string | null;
  disponibilite: Disponibilite;
};

/**
 * CV court auto-généré (markdown) à partir des données réelles de la fiche.
 * Aucune invention : les champs absents sont omis.
 */
export function generateShortCv(e: EmployeeForCv): string {
  const lines: string[] = [];
  lines.push(`## ${e.prenom} ${e.nom.toUpperCase()}`);
  lines.push(`**${e.poste}**${e.experienceAnnees ? ` — ${e.experienceAnnees} ans d'expérience` : ""}`);
  lines.push("");

  if (e.roleChantier) {
    lines.push(`Rôle chantier : ${e.roleChantier}`);
  }

  if (e.competences.length > 0) {
    lines.push("", "### Compétences", ...e.competences.map((c) => `- ${c}`));
  }

  const habilitations = Array.isArray(e.habilitations)
    ? (e.habilitations as { type?: string; echeance?: string }[])
    : [];
  if (habilitations.length > 0) {
    lines.push(
      "",
      "### Habilitations",
      ...habilitations.map(
        (h) => `- ${h.type ?? "?"}${h.echeance ? ` (valide jusqu'au ${h.echeance})` : ""}`
      )
    );
  }

  const formations = Array.isArray(e.formations)
    ? (e.formations as { intitule?: string; organisme?: string; annee?: number }[])
    : [];
  if (formations.length > 0) {
    lines.push(
      "",
      "### Formations",
      ...formations.map(
        (f) =>
          `- ${f.intitule ?? "?"}${f.organisme ? ` — ${f.organisme}` : ""}${f.annee ? ` (${f.annee})` : ""}`
      )
    );
  }

  if (e.permis.length > 0) {
    lines.push("", `Permis : ${e.permis.join(", ")}`);
  }

  lines.push("", `Disponibilité : ${DISPONIBILITE_LABELS[e.disponibilite]}`);

  return lines.join("\n");
}
