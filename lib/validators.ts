import { z } from "zod";
import {
  Disponibilite,
  DocumentType,
  Domaine,
  EquipmentCategory,
  Role,
} from "@prisma/client";

/**
 * Schémas zod partagés entre les formulaires (react-hook-form)
 * et les server actions — une seule source de validation.
 */

const domaineEnum = z.enum(Object.values(Domaine) as [Domaine, ...Domaine[]]);
const documentTypeEnum = z.enum(
  Object.values(DocumentType) as [DocumentType, ...DocumentType[]]
);
const disponibiliteEnum = z.enum(
  Object.values(Disponibilite) as [Disponibilite, ...Disponibilite[]]
);
const equipmentCategoryEnum = z.enum(
  Object.values(EquipmentCategory) as [EquipmentCategory, ...EquipmentCategory[]]
);

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const optionalNumber = z.coerce
  .number()
  .nonnegative("Doit être positif")
  .nullable()
  .optional();

// ─────────────── Auth ───────────────

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(10, "10 caractères minimum"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    password: z.string().min(10, "10 caractères minimum"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1),
    firstName: z.string().trim().min(1, "Prénom requis"),
    lastName: z.string().trim().min(1, "Nom requis"),
    password: z.string().min(10, "10 caractères minimum"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export const invitationSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum([Role.COMPANY_ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN]),
  companyId: optionalString,
});

// ─────────────── Entreprise ───────────────

export const companyProfileSchema = z.object({
  raisonSociale: z.string().trim().min(1, "Raison sociale requise"),
  siret: z
    .string()
    .trim()
    .regex(/^\d{14}$/, "SIRET : 14 chiffres attendus"),
  adresse: optionalString,
  codePostal: optionalString,
  ville: optionalString,
  dirigeantNom: optionalString,
  email: z.string().email("Email invalide").or(z.literal("")).nullable().optional(),
  telephone: optionalString,
  domaines: z.array(domaineEnum).min(1, "Au moins un domaine d'activité"),
  zonesGeographiques: z.array(z.string().trim()).default([]),
  caAnnuel: optionalNumber,
  effectif: z.coerce.number().int().nonnegative().nullable().optional(),
  capaciteFinanciere: optionalNumber,
  description: optionalString,
  qualifications: z.array(z.string().trim()).default([]),
  certifications: z.array(z.string().trim()).default([]),
  assurances: z
    .array(
      z.object({
        type: z.string().trim().min(1),
        assureur: z.string().trim().optional(),
        numeroContrat: z.string().trim().optional(),
        echeance: z.string().optional(),
      })
    )
    .default([]),
});
export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

/** Création d'un client par le super admin (entreprise + dirigeant invité). */
export const createCompanySchema = z.object({
  raisonSociale: z.string().trim().min(1, "Raison sociale requise"),
  siret: z
    .string()
    .trim()
    .regex(/^\d{14}$/, "SIRET : 14 chiffres attendus"),
  dirigeantNom: optionalString,
  email: z.string().email("Email du dirigeant invalide"),
});

// ─────────────── Documents ───────────────

export const documentMetaSchema = z.object({
  type: documentTypeEnum,
  label: z.string().trim().min(1, "Libellé requis"),
  dateEmission: optionalString,
  dateExpiration: optionalString,
  employeeId: optionalString,
});

// ─────────────── Employés ───────────────

export const employeeSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis"),
  prenom: z.string().trim().min(1, "Prénom requis"),
  poste: z.string().trim().min(1, "Poste requis"),
  experienceAnnees: z.coerce.number().int().nonnegative().nullable().optional(),
  competences: z.array(z.string().trim()).default([]),
  habilitations: z
    .array(
      z.object({
        type: z.string().trim().min(1),
        obtention: z.string().optional(),
        echeance: z.string().optional(),
      })
    )
    .default([]),
  formations: z
    .array(
      z.object({
        intitule: z.string().trim().min(1),
        organisme: z.string().trim().optional(),
        annee: z.coerce.number().int().optional(),
      })
    )
    .default([]),
  permis: z.array(z.string().trim()).default([]),
  roleChantier: optionalString,
  disponibilite: disponibiliteEnum.default("DISPONIBLE"),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

/** Mise à jour par l'employé lui-même (périmètre restreint). */
export const employeeSelfSchema = employeeSchema.pick({
  competences: true,
  habilitations: true,
  formations: true,
  permis: true,
});

// ─────────────── Matériel ───────────────

export const equipmentSchema = z.object({
  categorie: equipmentCategoryEnum,
  nom: z.string().trim().min(1, "Nom requis"),
  description: optionalString,
  quantite: z.coerce.number().int().min(1, "Quantité minimale : 1").default(1),
  disponibilite: disponibiliteEnum.default("DISPONIBLE"),
});
export type EquipmentInput = z.infer<typeof equipmentSchema>;

// ─────────────── Références ───────────────

export const referenceSchema = z.object({
  nomChantier: z.string().trim().min(1, "Nom du chantier requis"),
  client: z.string().trim().min(1, "Client requis"),
  prestation: z.string().trim().min(1, "Type de prestation requis"),
  domaine: domaineEnum,
  montantHT: z.coerce.number().positive("Montant HT requis"),
  annee: z.coerce
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear(), "Année invalide"),
  dureeMois: z.coerce.number().int().positive().nullable().optional(),
  description: optionalString,
  contactAutorise: z.coerce.boolean().default(false),
  contactNom: optionalString,
  contactTelephone: optionalString,
  contactEmail: optionalString,
});
export type ReferenceInput = z.infer<typeof referenceSchema>;

// ─────────────── Prix types ───────────────

export const pricingSchema = z.object({
  tauxHoraireMoyen: optionalNumber,
  coutDeplacementKm: optionalNumber,
  prixJourneeEquipe: optionalNumber,
  margeCiblePct: optionalNumber,
  fraisGenerauxPct: optionalNumber,
  notes: optionalString,
  items: z
    .array(
      z.object({
        libelle: z.string().trim().min(1),
        unite: z.string().trim().min(1),
        prixUnitaireHT: z.coerce.number().nonnegative(),
        domaine: domaineEnum.nullable().optional(),
      })
    )
    .default([]),
});
export type PricingInput = z.infer<typeof pricingSchema>;

// ─────────────── Appels d'offres ───────────────

export const tenderCreateSchema = z.object({
  companyId: z.string().min(1, "Entreprise requise"),
  objet: z.string().trim().min(1, "Objet du marché requis"),
  reference: optionalString,
  acheteur: optionalString,
  url: z.string().url("URL invalide").or(z.literal("")).nullable().optional(),
  domaine: domaineEnum.nullable().optional(),
  lieu: optionalString,
  montantEstimeHT: optionalNumber,
  dateLimite: optionalString,
  visiteObligatoire: z.coerce.boolean().default(false),
});
export type TenderCreateInput = z.infer<typeof tenderCreateSchema>;

// ─────────────── Validation dirigeant ───────────────

export const validationSchema = z.object({
  tenderId: z.string().min(1),
  proposalVersionId: z.string().min(1),
  prixValide: z.literal(true, { message: "Vous devez valider les prix" }),
  delaisValides: z.literal(true, { message: "Vous devez valider les délais" }),
  moyensHumainsValides: z.literal(true, {
    message: "Vous devez valider les moyens humains",
  }),
  moyensMaterielsValides: z.literal(true, {
    message: "Vous devez valider les moyens matériels",
  }),
  engagementsValides: z.literal(true, {
    message: "Vous devez valider les engagements techniques",
  }),
  autorisationDepot: z.literal(true, {
    message: "Vous devez autoriser le dépôt",
  }),
  commentaire: optionalString,
});
export type ValidationInput = z.infer<typeof validationSchema>;
