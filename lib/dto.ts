import type {
  Company,
  Document,
  Employee,
  Equipment,
  PricingItem,
  PricingProfile,
  ProposalVersion,
  Reference,
  Tender,
  TenderAnalysis,
} from "@prisma/client";
import { computeDocumentStatut, type DocumentStatut } from "@/lib/services/documents";

/**
 * Couche DTO : convertit les entités Prisma en objets sérialisables
 * (Decimal → number, Date → ISO string) pour la frontière RSC.
 *
 * RÈGLE : les DTO côté client énumèrent leurs champs un par un et
 * n'incluent JAMAIS de données de commission.
 */

export function toNumber(d: unknown): number | null {
  if (d === null || d === undefined) return null;
  return Number(d);
}

// ─────────────── Tender ───────────────

export type ClientTenderDTO = {
  id: string;
  reference: string | null;
  objet: string;
  acheteur: string | null;
  url: string | null;
  domaine: Tender["domaine"];
  lieu: string | null;
  montantEstimeHT: number | null;
  dateLimite: string | null;
  visiteObligatoire: boolean;
  visitePlanifieeLe: string | null;
  status: Tender["status"];
  compatibilityScore: number | null;
  createdAt: string;
};

export function toClientTenderDTO(
  tender: Tender & { analysis?: TenderAnalysis | null }
): ClientTenderDTO {
  return {
    id: tender.id,
    reference: tender.reference,
    objet: tender.objet,
    acheteur: tender.acheteur,
    url: tender.url,
    domaine: tender.domaine,
    lieu: tender.lieu,
    montantEstimeHT: toNumber(tender.montantEstimeHT),
    dateLimite: tender.dateLimite?.toISOString() ?? null,
    visiteObligatoire: tender.visiteObligatoire,
    visitePlanifieeLe: tender.visitePlanifieeLe?.toISOString() ?? null,
    status: tender.status,
    compatibilityScore: tender.analysis?.compatibilityScore ?? null,
    createdAt: tender.createdAt.toISOString(),
  };
}

// ─────────────── Documents ───────────────

export type DocumentDTO = {
  id: string;
  type: Document["type"];
  label: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dateEmission: string | null;
  dateExpiration: string | null;
  statut: DocumentStatut;
  commentaireAdmin: string | null;
  employeeId: string | null;
  createdAt: string;
};

export function toDocumentDTO(doc: Document): DocumentDTO {
  return {
    id: doc.id,
    type: doc.type,
    label: doc.label,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    dateEmission: doc.dateEmission?.toISOString() ?? null,
    dateExpiration: doc.dateExpiration?.toISOString() ?? null,
    statut: computeDocumentStatut(doc.dateExpiration),
    commentaireAdmin: doc.commentaireAdmin,
    employeeId: doc.employeeId,
    createdAt: doc.createdAt.toISOString(),
  };
}

// ─────────────── Company ───────────────

export type CompanyDTO = {
  id: string;
  raisonSociale: string;
  siret: string;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  dirigeantNom: string | null;
  email: string | null;
  telephone: string | null;
  domaines: Company["domaines"];
  zonesGeographiques: string[];
  caAnnuel: number | null;
  effectif: number | null;
  capaciteFinanciere: number | null;
  description: string | null;
  assurances: { type?: string; assureur?: string; numeroContrat?: string; echeance?: string }[];
  qualifications: string[];
  certifications: string[];
};

export function toCompanyDTO(c: Company): CompanyDTO {
  return {
    id: c.id,
    raisonSociale: c.raisonSociale,
    siret: c.siret,
    adresse: c.adresse,
    codePostal: c.codePostal,
    ville: c.ville,
    dirigeantNom: c.dirigeantNom,
    email: c.email,
    telephone: c.telephone,
    domaines: c.domaines,
    zonesGeographiques: c.zonesGeographiques,
    caAnnuel: toNumber(c.caAnnuel),
    effectif: c.effectif,
    capaciteFinanciere: toNumber(c.capaciteFinanciere),
    description: c.description,
    assurances: Array.isArray(c.assurances)
      ? (c.assurances as CompanyDTO["assurances"])
      : [],
    qualifications: c.qualifications,
    certifications: c.certifications,
  };
}

// ─────────────── Employee ───────────────

export type EmployeeDTO = {
  id: string;
  nom: string;
  prenom: string;
  poste: string;
  experienceAnnees: number | null;
  competences: string[];
  habilitations: { type?: string; obtention?: string; echeance?: string }[];
  formations: { intitule?: string; organisme?: string; annee?: number }[];
  permis: string[];
  roleChantier: string | null;
  disponibilite: Employee["disponibilite"];
  cvGenere: string | null;
  userId: string | null;
};

export function toEmployeeDTO(e: Employee): EmployeeDTO {
  return {
    id: e.id,
    nom: e.nom,
    prenom: e.prenom,
    poste: e.poste,
    experienceAnnees: e.experienceAnnees,
    competences: e.competences,
    habilitations: Array.isArray(e.habilitations)
      ? (e.habilitations as EmployeeDTO["habilitations"])
      : [],
    formations: Array.isArray(e.formations)
      ? (e.formations as EmployeeDTO["formations"])
      : [],
    permis: e.permis,
    roleChantier: e.roleChantier,
    disponibilite: e.disponibilite,
    cvGenere: e.cvGenere,
    userId: e.userId,
  };
}

// ─────────────── Equipment ───────────────

export type EquipmentDTO = {
  id: string;
  categorie: Equipment["categorie"];
  nom: string;
  description: string | null;
  quantite: number;
  disponibilite: Equipment["disponibilite"];
  photoKey: string | null;
};

export function toEquipmentDTO(e: Equipment): EquipmentDTO {
  return {
    id: e.id,
    categorie: e.categorie,
    nom: e.nom,
    description: e.description,
    quantite: e.quantite,
    disponibilite: e.disponibilite,
    photoKey: e.photoKey,
  };
}

// ─────────────── Reference ───────────────

export type ReferenceDTO = {
  id: string;
  nomChantier: string;
  client: string;
  prestation: string;
  domaine: Reference["domaine"];
  montantHT: number;
  annee: number;
  dureeMois: number | null;
  description: string | null;
  contactAutorise: boolean;
  contactNom: string | null;
  contactTelephone: string | null;
  contactEmail: string | null;
};

export function toReferenceDTO(r: Reference): ReferenceDTO {
  return {
    id: r.id,
    nomChantier: r.nomChantier,
    client: r.client,
    prestation: r.prestation,
    domaine: r.domaine,
    montantHT: Number(r.montantHT),
    annee: r.annee,
    dureeMois: r.dureeMois,
    description: r.description,
    contactAutorise: r.contactAutorise,
    contactNom: r.contactNom,
    contactTelephone: r.contactTelephone,
    contactEmail: r.contactEmail,
  };
}

// ─────────────── Pricing ───────────────

export type PricingDTO = {
  tauxHoraireMoyen: number | null;
  coutDeplacementKm: number | null;
  prixJourneeEquipe: number | null;
  margeCiblePct: number | null;
  fraisGenerauxPct: number | null;
  notes: string | null;
  items: {
    id: string;
    libelle: string;
    unite: string;
    prixUnitaireHT: number;
    domaine: PricingItem["domaine"];
  }[];
};

export function toPricingDTO(
  p: (PricingProfile & { items: PricingItem[] }) | null
): PricingDTO | null {
  if (!p) return null;
  return {
    tauxHoraireMoyen: toNumber(p.tauxHoraireMoyen),
    coutDeplacementKm: toNumber(p.coutDeplacementKm),
    prixJourneeEquipe: toNumber(p.prixJourneeEquipe),
    margeCiblePct: toNumber(p.margeCiblePct),
    fraisGenerauxPct: toNumber(p.fraisGenerauxPct),
    notes: p.notes,
    items: p.items.map((i) => ({
      id: i.id,
      libelle: i.libelle,
      unite: i.unite,
      prixUnitaireHT: Number(i.prixUnitaireHT),
      domaine: i.domaine,
    })),
  };
}

// ─────────────── ProposalVersion ───────────────

export type ProposalVersionDTO = {
  id: string;
  versionNumber: number;
  memoireTechnique: unknown;
  checklistAdministrative: unknown;
  checklistTechnique: unknown;
  checklistFinanciere: unknown;
  referencesSelectionnees: unknown;
  moyensHumains: unknown;
  moyensMateriels: unknown;
  planning: unknown;
  questionsAcheteur: unknown;
  prixProposeHT: number | null;
  delaiProposeJours: number | null;
  contentHash: string;
  createdAt: string;
};

export function toProposalVersionDTO(v: ProposalVersion): ProposalVersionDTO {
  return {
    id: v.id,
    versionNumber: v.versionNumber,
    memoireTechnique: v.memoireTechnique,
    checklistAdministrative: v.checklistAdministrative,
    checklistTechnique: v.checklistTechnique,
    checklistFinanciere: v.checklistFinanciere,
    referencesSelectionnees: v.referencesSelectionnees,
    moyensHumains: v.moyensHumains,
    moyensMateriels: v.moyensMateriels,
    planning: v.planning,
    questionsAcheteur: v.questionsAcheteur,
    prixProposeHT: toNumber(v.prixProposeHT),
    delaiProposeJours: v.delaiProposeJours,
    contentHash: v.contentHash,
    createdAt: v.createdAt.toISOString(),
  };
}
