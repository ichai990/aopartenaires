import "server-only";
import type { Disponibilite, Domaine, DocumentType, EquipmentCategory } from "@prisma/client";
import type {
  AnalyseDCE,
  Checklists,
  CompatibilityResult,
  MemoireTechnique,
  PieceManquante,
  SelectedReference,
  ValidationBrief,
} from "./schemas";

/**
 * Photographie server-side des données réelles de l'entreprise.
 * C'est la SEULE matière première autorisée pour l'IA (avec le DCE) :
 * l'IA n'invente jamais, elle marque « à compléter ».
 * Ne contient AUCUNE donnée de commission.
 */
export type CompanySnapshot = {
  id: string;
  raisonSociale: string;
  siret: string;
  ville: string | null;
  domaines: Domaine[];
  zonesGeographiques: string[];
  caAnnuel: number | null;
  effectif: number | null;
  capaciteFinanciere: number | null;
  description: string | null;
  qualifications: string[];
  certifications: string[];
  assurances: { type?: string; assureur?: string; echeance?: string }[];
  documents: {
    id: string;
    type: DocumentType;
    label: string;
    dateExpiration: string | null;
    expire: boolean;
  }[];
  employees: {
    id: string;
    nom: string;
    prenom: string;
    poste: string;
    experienceAnnees: number | null;
    competences: string[];
    habilitations: { type?: string; echeance?: string }[];
    permis: string[];
    roleChantier: string | null;
    disponibilite: Disponibilite;
  }[];
  equipments: {
    id: string;
    categorie: EquipmentCategory;
    nom: string;
    quantite: number;
    disponibilite: Disponibilite;
  }[];
  references: {
    id: string;
    nomChantier: string;
    client: string;
    prestation: string;
    domaine: Domaine;
    montantHT: number;
    annee: number;
    description: string | null;
  }[];
  pricing: {
    tauxHoraireMoyen: number | null;
    coutDeplacementKm: number | null;
    prixJourneeEquipe: number | null;
    margeCiblePct: number | null;
    fraisGenerauxPct: number | null;
    items: { libelle: string; unite: string; prixUnitaireHT: number; domaine: Domaine | null }[];
  } | null;
};

export type DceInput = {
  tenderId: string;
  /** Métadonnées saisies manuellement à l'import (source fiable). */
  manual: {
    objet: string;
    acheteur: string | null;
    reference: string | null;
    domaine: Domaine | null;
    lieu: string | null;
    montantEstimeHT: number | null;
    dateLimite: string | null;
    visiteObligatoire: boolean;
    url: string | null;
  };
  /** Fichiers du DCE (texte extrait quand disponible). */
  files: { fileName: string; mimeType: string; text: string | null }[];
};

export type ProposalVersionInput = {
  objet: string;
  acheteur: string | null;
  prixProposeHT: number | null;
  delaiProposeJours: number | null;
  memoireTechnique: MemoireTechnique;
  checklists: Checklists;
  referencesSelectionnees: SelectedReference[];
  moyensHumains: { employeeId: string; nom: string; poste: string; roleChantier: string | null }[];
  moyensMateriels: { equipmentId: string; nom: string; quantite: number }[];
  piecesManquantes: PieceManquante[];
};

/**
 * Interface commune à tous les providers IA (mock, Anthropic, OpenAI).
 * Chaque fonction reçoit exclusivement des données réelles (DCE + entreprise)
 * et renvoie une sortie structurée validée par zod.
 */
export interface AiProvider {
  readonly name: "mock" | "anthropic" | "openai";

  analyserDCE(input: DceInput): Promise<AnalyseDCE>;

  detecterPiecesManquantes(
    analyse: AnalyseDCE,
    company: CompanySnapshot
  ): Promise<PieceManquante[]>;

  calculerCompatibiliteEntreprise(
    analyse: AnalyseDCE,
    company: CompanySnapshot
  ): Promise<CompatibilityResult>;

  genererMemoireTechnique(
    analyse: AnalyseDCE,
    company: CompanySnapshot
  ): Promise<MemoireTechnique>;

  genererChecklist(
    analyse: AnalyseDCE,
    company: CompanySnapshot,
    piecesManquantes: PieceManquante[]
  ): Promise<Checklists>;

  genererQuestionsAcheteur(analyse: AnalyseDCE): Promise<string[]>;

  selectionnerReferencesSimilaires(
    analyse: AnalyseDCE,
    references: CompanySnapshot["references"]
  ): Promise<SelectedReference[]>;

  preparerValidationDirigeant(
    version: ProposalVersionInput
  ): Promise<ValidationBrief>;
}
