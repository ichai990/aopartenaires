import type {
  CommissionStatus,
  Disponibilite,
  DocumentType,
  Domaine,
  EquipmentCategory,
  Role,
  SourceStatus,
  SourceType,
  TenderStatus,
} from "@prisma/client";

// ─────────────── Domaines d'activité BTP ───────────────

export const DOMAINE_LABELS: Record<Domaine, string> = {
  PLOMBERIE: "Plomberie",
  CVC: "CVC",
  ELECTRICITE: "Électricité",
  PEINTURE: "Peinture",
  MACONNERIE: "Maçonnerie",
  GROS_OEUVRE: "Gros œuvre",
  SECOND_OEUVRE: "Second œuvre",
  MENUISERIE: "Menuiserie",
  ETANCHEITE: "Étanchéité",
  ISOLATION: "Isolation",
  MAINTENANCE: "Maintenance",
  NETTOYAGE: "Nettoyage",
  VRD: "VRD",
  SERRURERIE: "Serrurerie",
  COUVERTURE: "Couverture",
  RENOVATION_TCE: "Rénovation TCE",
};

export const DOMAINES = Object.keys(DOMAINE_LABELS) as Domaine[];

// ─────────────── Types de documents administratifs ───────────────

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  KBIS: "Extrait Kbis",
  URSSAF: "Attestation URSSAF",
  ATTESTATION_FISCALE: "Attestation fiscale",
  RC_PRO: "RC Professionnelle",
  DECENNALE: "Assurance décennale",
  RIB: "RIB",
  QUALIBAT: "Qualification Qualibat",
  RGE: "Certification RGE",
  PG_GAZ: "PG Gaz",
  ATTESTATION_FLUIDES: "Attestation fluides frigorigènes",
  HABILITATION_ELECTRIQUE: "Habilitation électrique",
  CACES: "CACES",
  AMIANTE: "Certification amiante",
  AUTRE: "Autre document",
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

/** Documents attendus pour un dossier d'AO standard (checklist de base). */
export const DOCUMENTS_STANDARDS: DocumentType[] = [
  "KBIS",
  "URSSAF",
  "ATTESTATION_FISCALE",
  "RC_PRO",
  "DECENNALE",
  "RIB",
];

// ─────────────── Statuts d'appel d'offres ───────────────

export const TENDER_STATUS_LABELS: Record<TenderStatus, string> = {
  A_ANALYSER: "À analyser",
  EN_PREPARATION: "En préparation",
  PIECES_MANQUANTES: "Pièces manquantes",
  VISITE_A_PLANIFIER: "Visite à planifier",
  PRET_POUR_VALIDATION: "Prêt pour validation",
  EN_ATTENTE_DIRIGEANT: "En attente dirigeant",
  VALIDE: "Validé",
  DEPOSE: "Déposé",
  GAGNE: "Gagné",
  PERDU: "Perdu",
};

/** Teinte visuelle par statut : vert = OK, orange = action requise, rouge = bloquant/perdu. */
export const TENDER_STATUS_TONE: Record<
  TenderStatus,
  "neutral" | "info" | "warning" | "success" | "danger"
> = {
  A_ANALYSER: "neutral",
  EN_PREPARATION: "info",
  PIECES_MANQUANTES: "danger",
  VISITE_A_PLANIFIER: "warning",
  PRET_POUR_VALIDATION: "info",
  EN_ATTENTE_DIRIGEANT: "warning",
  VALIDE: "success",
  DEPOSE: "info",
  GAGNE: "success",
  PERDU: "danger",
};

// ─────────────── Divers ───────────────

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Admin BTPilot",
  COMPANY_ADMIN: "Dirigeant",
  EMPLOYEE: "Employé",
};

export const DISPONIBILITE_LABELS: Record<Disponibilite, string> = {
  DISPONIBLE: "Disponible",
  PARTIELLE: "Partiellement disponible",
  INDISPONIBLE: "Indisponible",
};

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  VEHICULE: "Véhicule",
  OUTILLAGE: "Outillage",
  MACHINE: "Machine",
  NACELLE: "Nacelle",
  ECHAFAUDAGE: "Échafaudage",
  EPI: "EPI",
  LOGICIEL: "Logiciel",
  SECURITE: "Matériel de sécurité",
  AUTRE: "Autre",
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  POTENTIELLE: "Potentielle",
  GAGNEE: "Gagnée",
  FACTUREE: "Facturée",
  ANNULEE: "Annulée",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  MANUEL: "Import manuel",
  URL_PUBLIQUE: "URL publique",
  BOAMP: "BOAMP",
  MARCHES_PUBLICS: "Marchés-publics.gouv",
  AUTRE: "Autre",
};

export const SOURCE_STATUS_LABELS: Record<SourceStatus, string> = {
  ACTIVE: "Active",
  ERREUR: "En erreur",
  DESACTIVEE: "Désactivée",
};

/** Jours avant expiration à partir desquels un document passe en alerte. */
export const DOCUMENT_EXPIRY_WARNING_DAYS = 30;

/** Départements français courants pour les zones d'intervention. */
export const ZONES_IDF = ["75", "77", "78", "91", "92", "93", "94", "95"];
