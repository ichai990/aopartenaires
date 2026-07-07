-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "Domaine" AS ENUM ('PLOMBERIE', 'CVC', 'ELECTRICITE', 'PEINTURE', 'MACONNERIE', 'GROS_OEUVRE', 'SECOND_OEUVRE', 'MENUISERIE', 'ETANCHEITE', 'ISOLATION', 'MAINTENANCE', 'NETTOYAGE', 'VRD', 'SERRURERIE', 'COUVERTURE', 'RENOVATION_TCE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('KBIS', 'URSSAF', 'ATTESTATION_FISCALE', 'RC_PRO', 'DECENNALE', 'RIB', 'QUALIBAT', 'RGE', 'PG_GAZ', 'ATTESTATION_FLUIDES', 'HABILITATION_ELECTRIQUE', 'CACES', 'AMIANTE', 'AUTRE');

-- CreateEnum
CREATE TYPE "TenderStatus" AS ENUM ('A_ANALYSER', 'EN_PREPARATION', 'PIECES_MANQUANTES', 'VISITE_A_PLANIFIER', 'PRET_POUR_VALIDATION', 'EN_ATTENTE_DIRIGEANT', 'VALIDE', 'DEPOSE', 'GAGNE', 'PERDU');

-- CreateEnum
CREATE TYPE "Disponibilite" AS ENUM ('DISPONIBLE', 'PARTIELLE', 'INDISPONIBLE');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('VEHICULE', 'OUTILLAGE', 'MACHINE', 'NACELLE', 'ECHAFAUDAGE', 'EPI', 'LOGICIEL', 'SECURITE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('POTENTIELLE', 'GAGNEE', 'FACTUREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MANUEL', 'URL_PUBLIQUE', 'BOAMP', 'MARCHES_PUBLICS', 'AUTRE');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('ACTIVE', 'ERREUR', 'DESACTIVEE');

-- CreateEnum
CREATE TYPE "AiProviderKind" AS ENUM ('MOCK', 'ANTHROPIC', 'OPENAI');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "companyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "dirigeantNom" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "domaines" "Domaine"[],
    "zonesGeographiques" TEXT[],
    "caAnnuel" DECIMAL(14,2),
    "effectif" INTEGER,
    "capaciteFinanciere" DECIMAL(14,2),
    "description" TEXT,
    "assurances" JSONB,
    "qualifications" TEXT[],
    "certifications" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "companyId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT,
    "type" "DocumentType" NOT NULL,
    "label" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "dateEmission" TIMESTAMP(3),
    "dateExpiration" TIMESTAMP(3),
    "commentaireAdmin" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "poste" TEXT NOT NULL,
    "experienceAnnees" INTEGER,
    "competences" TEXT[],
    "habilitations" JSONB,
    "formations" JSONB,
    "permis" TEXT[],
    "roleChantier" TEXT,
    "disponibilite" "Disponibilite" NOT NULL DEFAULT 'DISPONIBLE',
    "cvGenere" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categorie" "EquipmentCategory" NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "disponibilite" "Disponibilite" NOT NULL DEFAULT 'DISPONIBLE',
    "photoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reference" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nomChantier" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "prestation" TEXT NOT NULL,
    "domaine" "Domaine" NOT NULL,
    "montantHT" DECIMAL(14,2) NOT NULL,
    "annee" INTEGER NOT NULL,
    "dureeMois" INTEGER,
    "description" TEXT,
    "photoKeys" TEXT[],
    "contactAutorise" BOOLEAN NOT NULL DEFAULT false,
    "contactNom" TEXT,
    "contactTelephone" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tauxHoraireMoyen" DECIMAL(10,2),
    "coutDeplacementKm" DECIMAL(10,2),
    "prixJourneeEquipe" DECIMAL(10,2),
    "margeCiblePct" DECIMAL(5,2),
    "fraisGenerauxPct" DECIMAL(5,2),
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingItem" (
    "id" TEXT NOT NULL,
    "pricingProfileId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "unite" TEXT NOT NULL,
    "prixUnitaireHT" DECIMAL(12,2) NOT NULL,
    "domaine" "Domaine",

    CONSTRAINT "PricingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainRate" (
    "id" TEXT NOT NULL,
    "pricingProfileId" TEXT NOT NULL,
    "domaine" "Domaine" NOT NULL,
    "tauxHoraire" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "DomainRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "baseUrl" TEXT,
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceId" TEXT,
    "reference" TEXT,
    "objet" TEXT NOT NULL,
    "acheteur" TEXT,
    "url" TEXT,
    "domaine" "Domaine",
    "lieu" TEXT,
    "montantEstimeHT" DECIMAL(14,2),
    "dateLimite" TIMESTAMP(3),
    "visiteObligatoire" BOOLEAN NOT NULL DEFAULT false,
    "visitePlanifieeLe" TIMESTAMP(3),
    "status" "TenderStatus" NOT NULL DEFAULT 'A_ANALYSER',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderFile" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderAnalysis" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "extraction" JSONB NOT NULL,
    "compatibilityScore" INTEGER,
    "compatibilityDetail" JSONB,
    "missingDocuments" JSONB,
    "champsACompleter" TEXT[],
    "analysedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalVersion" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "memoireTechnique" JSONB NOT NULL,
    "checklistAdministrative" JSONB NOT NULL,
    "checklistTechnique" JSONB NOT NULL,
    "checklistFinanciere" JSONB NOT NULL,
    "referencesSelectionnees" JSONB NOT NULL,
    "moyensHumains" JSONB NOT NULL,
    "moyensMateriels" JSONB NOT NULL,
    "planning" JSONB,
    "questionsAcheteur" JSONB NOT NULL,
    "prixProposeHT" DECIMAL(14,2),
    "delaiProposeJours" INTEGER,
    "contentHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validation" (
    "id" TEXT NOT NULL,
    "proposalVersionId" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prixValide" BOOLEAN NOT NULL,
    "delaisValides" BOOLEAN NOT NULL,
    "moyensHumainsValides" BOOLEAN NOT NULL,
    "moyensMaterielsValides" BOOLEAN NOT NULL,
    "engagementsValides" BOOLEAN NOT NULL,
    "autorisationDepot" BOOLEAN NOT NULL,
    "commentaire" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "contentHash" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "montantMarcheHT" DECIMAL(14,2) NOT NULL,
    "montantCommission" DECIMAL(14,2) NOT NULL,
    "bareme" JSONB NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'POTENTIELLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" "AiProviderKind" NOT NULL DEFAULT 'MOCK',
    "model" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_siret_key" ON "Company"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_companyId_idx" ON "Invitation"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "Document_companyId_type_idx" ON "Document"("companyId", "type");

-- CreateIndex
CREATE INDEX "Document_dateExpiration_idx" ON "Document"("dateExpiration");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "Equipment_companyId_idx" ON "Equipment"("companyId");

-- CreateIndex
CREATE INDEX "Reference_companyId_domaine_idx" ON "Reference"("companyId", "domaine");

-- CreateIndex
CREATE UNIQUE INDEX "PricingProfile_companyId_key" ON "PricingProfile"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainRate_pricingProfileId_domaine_key" ON "DomainRate"("pricingProfileId", "domaine");

-- CreateIndex
CREATE INDEX "Tender_companyId_status_idx" ON "Tender"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TenderAnalysis_tenderId_key" ON "TenderAnalysis"("tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_tenderId_key" ON "Proposal"("tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_currentVersionId_key" ON "Proposal"("currentVersionId");

-- CreateIndex
CREATE INDEX "Proposal_companyId_idx" ON "Proposal"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVersion_proposalId_versionNumber_key" ON "ProposalVersion"("proposalId", "versionNumber");

-- CreateIndex
CREATE INDEX "Validation_companyId_idx" ON "Validation"("companyId");

-- CreateIndex
CREATE INDEX "Validation_tenderId_idx" ON "Validation"("tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_tenderId_key" ON "Commission"("tenderId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingProfile" ADD CONSTRAINT "PricingProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingItem" ADD CONSTRAINT "PricingItem_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "PricingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainRate" ADD CONSTRAINT "DomainRate_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "PricingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderFile" ADD CONSTRAINT "TenderFile_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderAnalysis" ADD CONSTRAINT "TenderAnalysis_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ProposalVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVersion" ADD CONSTRAINT "ProposalVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_proposalVersionId_fkey" FOREIGN KEY ("proposalVersionId") REFERENCES "ProposalVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
