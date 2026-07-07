import { z } from "zod";
import { Domaine, DocumentType } from "@prisma/client";

/** Valeur sentinelle : l'IA ne doit JAMAIS inventer — si l'information
 *  est absente des sources, elle renvoie cette valeur. */
export const A_COMPLETER = "à compléter" as const;

const domaineEnum = z.enum(
  Object.values(Domaine) as [Domaine, ...Domaine[]]
);
const documentTypeEnum = z.enum(
  Object.values(DocumentType) as [DocumentType, ...DocumentType[]]
);

// ─────────────── Analyse du DCE ───────────────

export const AnalyseDCESchema = z.object({
  acheteur: z.string(),
  objet: z.string(),
  lots: z.array(
    z.object({
      numero: z.string(),
      intitule: z.string(),
      domaine: domaineEnum.nullable(),
    })
  ),
  domainePrincipal: domaineEnum.nullable(),
  lieuExecution: z.string(),
  montantEstimeHT: z.number().nullable(),
  dateLimiteRemise: z.string().nullable(), // ISO
  visiteObligatoire: z.boolean().nullable(),
  documentsDemandes: z.array(
    z.object({
      libelle: z.string(),
      type: documentTypeEnum.nullable(),
    })
  ),
  qualificationsExigees: z.array(z.string()),
  criteresNotation: z.array(
    z.object({ critere: z.string(), ponderationPct: z.number() })
  ),
  risquesIdentifies: z.array(z.string()),
  penalites: z.string(),
  delaisExecution: z.string(),
  piecesFinancieres: z.array(z.string()),
  questionsSuggerees: z.array(z.string()),
  /** Tout champ introuvable dans le DCE est listé ici. */
  champsACompleter: z.array(z.string()),
});
export type AnalyseDCE = z.infer<typeof AnalyseDCESchema>;

// ─────────────── Compatibilité entreprise ───────────────

export const CompatibilityResultSchema = z.object({
  score: z.number().min(0).max(100),
  criteres: z.array(
    z.object({
      critere: z.string(),
      points: z.number(),
      maxPoints: z.number(),
      commentaire: z.string(),
    })
  ),
  recommandation: z.string(),
});
export type CompatibilityResult = z.infer<typeof CompatibilityResultSchema>;

// ─────────────── Pièces manquantes ───────────────

export const PieceManquanteSchema = z.object({
  type: documentTypeEnum.nullable(),
  libelle: z.string(),
  critique: z.boolean(),
  detail: z.string(),
});
export type PieceManquante = z.infer<typeof PieceManquanteSchema>;

// ─────────────── Mémoire technique ───────────────

export const MemoireTechniqueSchema = z.object({
  titre: z.string(),
  sections: z.array(
    z.object({
      titre: z.string(),
      contenu: z.string(), // markdown, uniquement à partir des données réelles
      aCompleter: z.boolean(),
    })
  ),
});
export type MemoireTechnique = z.infer<typeof MemoireTechniqueSchema>;

// ─────────────── Checklists ───────────────

export const ChecklistItemSchema = z.object({
  libelle: z.string(),
  fait: z.boolean(),
  detail: z.string().nullable(),
});
export const ChecklistsSchema = z.object({
  administrative: z.array(ChecklistItemSchema),
  technique: z.array(ChecklistItemSchema),
  financiere: z.array(ChecklistItemSchema),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type Checklists = z.infer<typeof ChecklistsSchema>;

// ─────────────── Références similaires ───────────────

export const SelectedReferenceSchema = z.object({
  referenceId: z.string(),
  similarite: z.number().min(0).max(100),
  justification: z.string(),
});
export type SelectedReference = z.infer<typeof SelectedReferenceSchema>;

// ─────────────── Brief de validation dirigeant ───────────────

export const ValidationBriefSchema = z.object({
  syntheseGenerale: z.string(),
  prix: z.object({ resume: z.string(), pointsAttention: z.array(z.string()) }),
  delais: z.object({ resume: z.string(), pointsAttention: z.array(z.string()) }),
  moyensHumains: z.object({ resume: z.string(), pointsAttention: z.array(z.string()) }),
  moyensMateriels: z.object({ resume: z.string(), pointsAttention: z.array(z.string()) }),
  engagements: z.object({ resume: z.string(), pointsAttention: z.array(z.string()) }),
  risques: z.array(z.string()),
});
export type ValidationBrief = z.infer<typeof ValidationBriefSchema>;
