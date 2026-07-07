import "server-only";
import { prisma } from "@/lib/prisma";
import { computeDocumentStatut } from "@/lib/services/documents";
import type { CompanySnapshot } from "./types";

/**
 * Photographie des données réelles de l'entreprise pour l'IA.
 * Aucune donnée de commission n'entre jamais dans ce snapshot.
 */
export async function buildCompanySnapshot(companyId: string): Promise<CompanySnapshot> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    include: {
      documents: true,
      employees: true,
      equipments: true,
      references: true,
      pricingProfile: { include: { items: true } },
    },
  });

  return {
    id: company.id,
    raisonSociale: company.raisonSociale,
    siret: company.siret,
    ville: company.ville,
    domaines: company.domaines,
    zonesGeographiques: company.zonesGeographiques,
    caAnnuel: company.caAnnuel ? Number(company.caAnnuel) : null,
    effectif: company.effectif,
    capaciteFinanciere: company.capaciteFinanciere
      ? Number(company.capaciteFinanciere)
      : null,
    description: company.description,
    qualifications: company.qualifications,
    certifications: company.certifications,
    assurances: Array.isArray(company.assurances)
      ? (company.assurances as CompanySnapshot["assurances"])
      : [],
    documents: company.documents.map((d) => ({
      id: d.id,
      type: d.type,
      label: d.label,
      dateExpiration: d.dateExpiration?.toISOString() ?? null,
      expire: computeDocumentStatut(d.dateExpiration) === "EXPIRE",
    })),
    employees: company.employees.map((e) => ({
      id: e.id,
      nom: e.nom,
      prenom: e.prenom,
      poste: e.poste,
      experienceAnnees: e.experienceAnnees,
      competences: e.competences,
      habilitations: Array.isArray(e.habilitations)
        ? (e.habilitations as { type?: string; echeance?: string }[])
        : [],
      permis: e.permis,
      roleChantier: e.roleChantier,
      disponibilite: e.disponibilite,
    })),
    equipments: company.equipments.map((e) => ({
      id: e.id,
      categorie: e.categorie,
      nom: e.nom,
      quantite: e.quantite,
      disponibilite: e.disponibilite,
    })),
    references: company.references.map((r) => ({
      id: r.id,
      nomChantier: r.nomChantier,
      client: r.client,
      prestation: r.prestation,
      domaine: r.domaine,
      montantHT: Number(r.montantHT),
      annee: r.annee,
      description: r.description,
    })),
    pricing: company.pricingProfile
      ? {
          tauxHoraireMoyen: company.pricingProfile.tauxHoraireMoyen
            ? Number(company.pricingProfile.tauxHoraireMoyen)
            : null,
          coutDeplacementKm: company.pricingProfile.coutDeplacementKm
            ? Number(company.pricingProfile.coutDeplacementKm)
            : null,
          prixJourneeEquipe: company.pricingProfile.prixJourneeEquipe
            ? Number(company.pricingProfile.prixJourneeEquipe)
            : null,
          margeCiblePct: company.pricingProfile.margeCiblePct
            ? Number(company.pricingProfile.margeCiblePct)
            : null,
          fraisGenerauxPct: company.pricingProfile.fraisGenerauxPct
            ? Number(company.pricingProfile.fraisGenerauxPct)
            : null,
          items: company.pricingProfile.items.map((i) => ({
            libelle: i.libelle,
            unite: i.unite,
            prixUnitaireHT: Number(i.prixUnitaireHT),
            domaine: i.domaine,
          })),
        }
      : null,
  };
}
