/**
 * Seed BTPilot — données de démonstration.
 *
 * Comptes créés :
 *   admin@btpilot.fr          / Admin1234!  (Super admin BTPilot)
 *   martin.sanchez@novabtp.fr / Nova1234!   (Dirigeant Nova BTP)
 *   julie.moreau@novabtp.fr   / Nova1234!   (Employée Nova BTP)
 *
 * NOTE : ce script tourne via tsx (hors Next) — il n'importe aucun module
 * marqué "server-only" (storage, commission, providers IA). Les quelques
 * logiques nécessaires (PDF factice, barème) sont dupliquées localement.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { generateShortCv } from "../lib/services/cv";

const prisma = new PrismaClient();

const UPLOAD_ROOT = join(process.cwd(), "var", "uploads");

/** PDF minimal valide (une page avec un titre) pour les documents factices. */
function makePdf(title: string): Buffer {
  const content = `BT
/F1 18 Tf
50 750 Td
(${title.replace(/[()\\]/g, "")}) Tj
ET`;
  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${content.length} >> stream
${content}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
trailer << /Root 1 0 R >>
%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function writeUpload(companyId: string, category: string, fileName: string, content: Buffer): string {
  const key = `companies/${companyId}/${category}/${randomUUID()}-${fileName}`;
  const path = join(UPLOAD_ROOT, key);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return key;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Copie locale du barème (lib/services/commission.ts est server-only). */
function calcCommission(amountHT: number) {
  const brackets = [
    { de: 0, a: 100_000, taux: 10 },
    { de: 100_000, a: 1_000_000, taux: 7 },
    { de: 1_000_000, a: 10_000_000, taux: 4 },
    { de: 10_000_000, a: null as number | null, taux: 2.5 },
  ];
  const detail: { de: number; a: number | null; taux: number; assiette: number; montant: number }[] = [];
  let total = 0;
  for (const { de, a, taux } of brackets) {
    if (amountHT <= de) break;
    const assiette = Math.min(amountHT, a ?? Infinity) - de;
    const montant = Math.round(assiette * taux) / 100;
    detail.push({ de, a, taux, assiette, montant });
    total += montant;
  }
  return { total: Math.round(total * 100) / 100, detail };
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("Seed BTPilot…");
  const password = await bcrypt.hash("Nova1234!", 12);
  const adminPassword = await bcrypt.hash("Admin1234!", 12);

  // ── Super admin ──
  const admin = await prisma.user.upsert({
    where: { email: "admin@btpilot.fr" },
    update: {},
    create: {
      email: "admin@btpilot.fr",
      passwordHash: adminPassword,
      firstName: "Léa",
      lastName: "Fontaine",
      role: "SUPER_ADMIN",
    },
  });

  // ── Entreprise Nova BTP ──
  const company = await prisma.company.upsert({
    where: { siret: "88254639100027" },
    update: {},
    create: {
      id: "seed-nova-btp",
      raisonSociale: "Nova BTP",
      siret: "88254639100027",
      adresse: "14 rue des Frères Lumière",
      codePostal: "93100",
      ville: "Montreuil",
      dirigeantNom: "Martin Sanchez",
      email: "contact@novabtp.fr",
      telephone: "01 48 57 62 10",
      domaines: ["PLOMBERIE", "CVC", "ELECTRICITE", "MAINTENANCE"],
      zonesGeographiques: ["75", "92", "93", "94"],
      caAnnuel: 1_850_000,
      effectif: 14,
      capaciteFinanciere: 450_000,
      description:
        "Entreprise générale de plomberie, CVC et électricité créée en 2011. " +
        "Nova BTP intervient en Île-de-France sur des chantiers publics et privés : " +
        "rénovation de réseaux, chaufferies, ventilation et maintenance multi-sites. " +
        "Encadrement stable, équipes qualifiées, engagement fort sur les délais.",
      assurances: [
        { type: "RC Professionnelle", assureur: "SMABTP", numeroContrat: "RC-2024-88431", echeance: "2027-03-31" },
        { type: "Décennale", assureur: "SMABTP", numeroContrat: "DC-2024-88432", echeance: "2027-03-31" },
      ],
      qualifications: ["Qualibat 5112 - Plomberie sanitaire", "Qualibat 5312 - CVC", "QualiPAC"],
      certifications: ["RGE", "PG Gaz"],
    },
  });

  // ── Utilisateurs Nova BTP ──
  const martin = await prisma.user.upsert({
    where: { email: "martin.sanchez@novabtp.fr" },
    update: {},
    create: {
      email: "martin.sanchez@novabtp.fr",
      passwordHash: password,
      firstName: "Martin",
      lastName: "Sanchez",
      role: "COMPANY_ADMIN",
      companyId: company.id,
    },
  });
  const julieUser = await prisma.user.upsert({
    where: { email: "julie.moreau@novabtp.fr" },
    update: {},
    create: {
      email: "julie.moreau@novabtp.fr",
      passwordHash: password,
      firstName: "Julie",
      lastName: "Moreau",
      role: "EMPLOYEE",
      companyId: company.id,
    },
  });

  // ── Employés ──
  const employeesData = [
    {
      id: "seed-emp-julie",
      userId: julieUser.id,
      nom: "Moreau",
      prenom: "Julie",
      poste: "Chargée d'affaires CVC",
      experienceAnnees: 8,
      competences: ["Chiffrage CVC", "Suivi de chantier", "DPGF", "Relation client"],
      habilitations: [{ type: "Habilitation électrique B1V", obtention: "2024-05-12", echeance: "2027-05-12" }],
      formations: [{ intitule: "BTS Fluides Énergies Domotique", organisme: "Lycée Raspail", annee: 2016 }],
      permis: ["B"],
      roleChantier: "Conductrice de travaux",
      disponibilite: "DISPONIBLE" as const,
    },
    {
      id: "seed-emp-karim",
      userId: null,
      nom: "Benali",
      prenom: "Karim",
      poste: "Chef d'équipe plomberie",
      experienceAnnees: 15,
      competences: ["Réseaux cuivre/PER/multicouche", "Sanitaires collectifs", "Lecture de plans", "Soudure"],
      habilitations: [
        { type: "PG Gaz", obtention: "2023-09-01", echeance: "2026-09-01" },
        { type: "CACES R486 (nacelle)", obtention: "2022-06-15", echeance: "2027-06-15" },
      ],
      formations: [{ intitule: "CAP Installateur sanitaire", organisme: "CFA Saint-Denis", annee: 2008 }],
      permis: ["B", "BE"],
      roleChantier: "Chef d'équipe",
      disponibilite: "DISPONIBLE" as const,
    },
    {
      id: "seed-emp-pavel",
      userId: null,
      nom: "Kovac",
      prenom: "Pavel",
      poste: "Technicien CVC",
      experienceAnnees: 6,
      competences: ["Chaufferies gaz", "PAC", "VMC double flux", "Mise en service", "Dépannage"],
      habilitations: [
        { type: "Attestation fluides frigorigènes cat. 1", obtention: "2023-02-20", echeance: "2028-02-20" },
        { type: "Habilitation électrique BR", obtention: "2024-01-10", echeance: "2027-01-10" },
      ],
      formations: [{ intitule: "Titre pro Technicien CVC", organisme: "AFPA", annee: 2019 }],
      permis: ["B"],
      roleChantier: "Technicien de mise en service",
      disponibilite: "PARTIELLE" as const,
    },
    {
      id: "seed-emp-sofiane",
      userId: null,
      nom: "Traoré",
      prenom: "Sofiane",
      poste: "Électricien",
      experienceAnnees: 4,
      competences: ["Courants forts", "Armoires électriques", "Chemins de câbles", "Consuel"],
      habilitations: [{ type: "Habilitation électrique B2V BR BC", obtention: "2024-11-05", echeance: "2027-11-05" }],
      formations: [{ intitule: "Bac pro MELEC", organisme: "Lycée Condorcet", annee: 2020 }],
      permis: ["B"],
      roleChantier: "Électricien d'exécution",
      disponibilite: "DISPONIBLE" as const,
    },
  ];

  for (const e of employeesData) {
    const { id, userId, ...data } = e;
    await prisma.employee.upsert({
      where: { id },
      update: {},
      create: {
        id,
        companyId: company.id,
        userId,
        ...data,
        cvGenere: generateShortCv({
          nom: data.nom,
          prenom: data.prenom,
          poste: data.poste,
          experienceAnnees: data.experienceAnnees,
          competences: data.competences,
          habilitations: data.habilitations,
          formations: data.formations,
          permis: data.permis,
          roleChantier: data.roleChantier,
          disponibilite: data.disponibilite,
        }),
      },
    });
  }

  // ── Matériel ──
  const equipments = [
    { id: "seed-eq-1", categorie: "VEHICULE" as const, nom: "Fourgon Renault Master (atelier mobile)", quantite: 3, disponibilite: "DISPONIBLE" as const, description: "Aménagés étagères + outillage" },
    { id: "seed-eq-2", categorie: "VEHICULE" as const, nom: "Camion benne Iveco Daily", quantite: 1, disponibilite: "DISPONIBLE" as const, description: null },
    { id: "seed-eq-3", categorie: "MACHINE" as const, nom: "Sertisseuse Viega Pressgun", quantite: 4, disponibilite: "DISPONIBLE" as const, description: "Mâchoires 12-54 mm" },
    { id: "seed-eq-4", categorie: "MACHINE" as const, nom: "Pompe à épreuve électrique", quantite: 2, disponibilite: "DISPONIBLE" as const, description: "Essais réseaux 60 bar" },
    { id: "seed-eq-5", categorie: "NACELLE" as const, nom: "Nacelle ciseaux 8 m (location cadre)", quantite: 1, disponibilite: "PARTIELLE" as const, description: "Contrat cadre Kiloutou" },
    { id: "seed-eq-6", categorie: "ECHAFAUDAGE" as const, nom: "Échafaudage roulant alu 6 m", quantite: 2, disponibilite: "DISPONIBLE" as const, description: null },
    { id: "seed-eq-7", categorie: "EPI" as const, nom: "Kits EPI complets (casque, harnais, gants)", quantite: 16, disponibilite: "DISPONIBLE" as const, description: "Vérification annuelle à jour" },
    { id: "seed-eq-8", categorie: "LOGICIEL" as const, nom: "Autocad LT + Batiprix", quantite: 2, disponibilite: "DISPONIBLE" as const, description: "Licences à jour 2026" },
  ];
  for (const eq of equipments) {
    const { id, ...data } = eq;
    await prisma.equipment.upsert({
      where: { id },
      update: {},
      create: { id, companyId: company.id, ...data },
    });
  }

  // ── Références chantiers ──
  const references = [
    {
      id: "seed-ref-1",
      nomChantier: "Rénovation chaufferie collective — Résidence Le Parc",
      client: "OPH Montreuil Habitat",
      prestation: "Remplacement de 2 chaudières gaz 400 kW, régulation, désembouage",
      domaine: "CVC" as const,
      montantHT: 320_000,
      annee: 2024,
      dureeMois: 5,
      description:
        "Chaufferie collective de 180 logements : dépose, installation de chaudières à condensation, remise en conformité gaz et régulation GTB. Site occupé.",
      contactAutorise: true,
      contactNom: "M. Diallo (directeur du patrimoine)",
      contactTelephone: "01 48 70 12 34",
      contactEmail: "s.diallo@montreuil-habitat.fr",
    },
    {
      id: "seed-ref-2",
      nomChantier: "Réfection sanitaires — Collège Paul Éluard",
      client: "Département de la Seine-Saint-Denis",
      prestation: "Rénovation complète de 12 blocs sanitaires, réseaux EU/EV",
      domaine: "PLOMBERIE" as const,
      montantHT: 185_000,
      annee: 2023,
      dureeMois: 4,
      description: "Travaux en site occupé pendant périodes scolaires et vacances, phasage strict.",
      contactAutorise: false,
      contactNom: null,
      contactTelephone: null,
      contactEmail: null,
    },
    {
      id: "seed-ref-3",
      nomChantier: "Maintenance CVC multi-sites — Ville de Vincennes",
      client: "Ville de Vincennes",
      prestation: "Maintenance préventive et corrective P2 de 23 bâtiments communaux",
      domaine: "MAINTENANCE" as const,
      montantHT: 450_000,
      annee: 2024,
      dureeMois: 36,
      description: "Marché à bons de commande sur 3 ans : écoles, gymnases, bâtiments administratifs. GMAO partagée.",
      contactAutorise: true,
      contactNom: "Mme Robert (services techniques)",
      contactTelephone: "01 43 98 65 00",
      contactEmail: "c.robert@vincennes.fr",
    },
    {
      id: "seed-ref-4",
      nomChantier: "Mise aux normes électriques — Gymnase Léo Lagrange",
      client: "Ville de Bagnolet",
      prestation: "Remplacement TGBT, éclairage LED, alarme incendie type 3",
      domaine: "ELECTRICITE" as const,
      montantHT: 82_000,
      annee: 2025,
      dureeMois: 2,
      description: "Intervention en période estivale, réception Consuel sans réserve.",
      contactAutorise: false,
      contactNom: null,
      contactTelephone: null,
      contactEmail: null,
    },
  ];
  for (const ref of references) {
    const { id, ...data } = ref;
    await prisma.reference.upsert({
      where: { id },
      update: {},
      create: { id, companyId: company.id, ...data },
    });
  }

  // ── Prix types ──
  const pricing = await prisma.pricingProfile.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      tauxHoraireMoyen: 52,
      coutDeplacementKm: 0.85,
      prixJourneeEquipe: 980,
      margeCiblePct: 12,
      fraisGenerauxPct: 14,
      notes:
        "Taux horaire chef d'équipe : 62 €. Majoration interventions urgentes : +30 %. " +
        "Prévoir 1 journée de repérage sur les marchés > 100 k€.",
    },
  });
  await prisma.pricingItem.deleteMany({ where: { pricingProfileId: pricing.id } });
  await prisma.pricingItem.createMany({
    data: [
      { pricingProfileId: pricing.id, libelle: "Remplacement WC complet (cuvette + réservoir)", unite: "u", prixUnitaireHT: 420, domaine: "PLOMBERIE" },
      { pricingProfileId: pricing.id, libelle: "Création point d'eau (alim + évacuation)", unite: "u", prixUnitaireHT: 680, domaine: "PLOMBERIE" },
      { pricingProfileId: pricing.id, libelle: "Radiateur acier posé (h 600, L 1000)", unite: "u", prixUnitaireHT: 390, domaine: "CVC" },
      { pricingProfileId: pricing.id, libelle: "Bouche VMC autoréglable posée", unite: "u", prixUnitaireHT: 85, domaine: "CVC" },
      { pricingProfileId: pricing.id, libelle: "Point lumineux complet (appareillage + câblage)", unite: "u", prixUnitaireHT: 145, domaine: "ELECTRICITE" },
      { pricingProfileId: pricing.id, libelle: "Visite de maintenance préventive chaufferie", unite: "visite", prixUnitaireHT: 260, domaine: "MAINTENANCE" },
    ],
  });
  await prisma.domainRate.deleteMany({ where: { pricingProfileId: pricing.id } });
  await prisma.domainRate.createMany({
    data: [
      { pricingProfileId: pricing.id, domaine: "PLOMBERIE", tauxHoraire: 50 },
      { pricingProfileId: pricing.id, domaine: "CVC", tauxHoraire: 55 },
      { pricingProfileId: pricing.id, domaine: "ELECTRICITE", tauxHoraire: 54 },
      { pricingProfileId: pricing.id, domaine: "MAINTENANCE", tauxHoraire: 48 },
    ],
  });

  // ── Documents administratifs (10, dont 2 expirés et 1 expirant bientôt) ──
  const docs: {
    id: string;
    type: Parameters<typeof prisma.document.create>[0]["data"]["type"];
    label: string;
    emission: Date | null;
    expiration: Date | null;
    employeeId?: string;
    commentaireAdmin?: string;
  }[] = [
    { id: "seed-doc-kbis", type: "KBIS", label: "Extrait Kbis Nova BTP", emission: daysFromNow(-40), expiration: daysFromNow(50) },
    { id: "seed-doc-urssaf", type: "URSSAF", label: "Attestation de vigilance URSSAF", emission: daysFromNow(-200), expiration: daysFromNow(-20), commentaireAdmin: "Expirée — à renouveler avant tout dépôt (téléchargeable sur urssaf.fr)." },
    { id: "seed-doc-fiscale", type: "ATTESTATION_FISCALE", label: "Attestation de régularité fiscale 2026", emission: daysFromNow(-90), expiration: daysFromNow(275) },
    { id: "seed-doc-rcpro", type: "RC_PRO", label: "Attestation RC Pro SMABTP", emission: daysFromNow(-400), expiration: daysFromNow(-35), commentaireAdmin: "Expirée — demander l'attestation millésimée à SMABTP." },
    { id: "seed-doc-decennale", type: "DECENNALE", label: "Attestation décennale SMABTP", emission: daysFromNow(-100), expiration: daysFromNow(265) },
    { id: "seed-doc-rib", type: "RIB", label: "RIB Banque Populaire", emission: null, expiration: null },
    { id: "seed-doc-qualibat", type: "QUALIBAT", label: "Certificat Qualibat 5112 / 5312", emission: daysFromNow(-300), expiration: daysFromNow(18), commentaireAdmin: "Expire dans moins de 30 jours — renouvellement engagé ?" },
    { id: "seed-doc-rge", type: "RGE", label: "Qualification RGE QualiPAC", emission: daysFromNow(-150), expiration: daysFromNow(215) },
    { id: "seed-doc-fluides", type: "ATTESTATION_FLUIDES", label: "Attestation capacité fluides frigorigènes", emission: daysFromNow(-500), expiration: daysFromNow(230) },
    { id: "seed-doc-caces", type: "CACES", label: "CACES R486 — Karim Benali", emission: daysFromNow(-700), expiration: daysFromNow(400), employeeId: "seed-emp-karim" },
  ];
  for (const doc of docs) {
    const existing = await prisma.document.findUnique({ where: { id: doc.id } });
    if (existing) continue;
    const storageKey = writeUpload(
      company.id,
      "documents",
      `${doc.id}.pdf`,
      makePdf(doc.label)
    );
    await prisma.document.create({
      data: {
        id: doc.id,
        companyId: company.id,
        employeeId: doc.employeeId ?? null,
        type: doc.type,
        label: doc.label,
        storageKey,
        fileName: `${doc.label.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").slice(0, 40)}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 1024,
        dateEmission: doc.emission,
        dateExpiration: doc.expiration,
        commentaireAdmin: doc.commentaireAdmin ?? null,
        uploadedById: martin.id,
      },
    });
  }

  // ── Sources de veille ──
  const sourceManuel = await prisma.source.upsert({
    where: { id: "seed-source-manuel" },
    update: {},
    create: { id: "seed-source-manuel", nom: "Import manuel", type: "MANUEL", status: "ACTIVE" },
  });
  await prisma.source.upsert({
    where: { id: "seed-source-boamp" },
    update: {},
    create: {
      id: "seed-source-boamp",
      nom: "BOAMP (connecteur à venir)",
      type: "BOAMP",
      baseUrl: "https://www.boamp.fr",
      status: "DESACTIVEE",
    },
  });

  // Réglages IA : volontairement PAS seedés — tant que l'admin n'a rien
  // enregistré dans « Paramètres IA », c'est la variable d'environnement
  // AI_PROVIDER qui fait foi (voir lib/ai/index.ts).

  // ═══════════ AO n°1 — À analyser ═══════════
  if (!(await prisma.tender.findUnique({ where: { id: "seed-tender-1" } }))) {
    const dceText = `REGLEMENT DE CONSULTATION (extrait)
Objet : Rénovation des sanitaires et reprise des réseaux de plomberie du groupe scolaire Jules Ferry.
Acheteur : Ville de Montreuil — Direction des bâtiments.
Lieu d'exécution : Montreuil (93100).
Les candidats devront fournir : attestation URSSAF, attestation fiscale, RC professionnelle, décennale, Kbis, RIB.
Qualification Qualibat souhaitée. Visite obligatoire du site avant remise des offres.
Critères de notation : prix 40 %, valeur technique 50 %, délais 10 %.
Pénalités de retard : 300 € par jour calendaire (voir CCAP).`;
    const dceKey = writeUpload(company.id, "tenders", "RC-jules-ferry.txt", Buffer.from(dceText, "utf8"));
    await prisma.tender.create({
      data: {
        id: "seed-tender-1",
        companyId: company.id,
        sourceId: sourceManuel.id,
        reference: "2026-MTR-047",
        objet: "Rénovation des sanitaires — Groupe scolaire Jules Ferry",
        acheteur: "Ville de Montreuil",
        domaine: "PLOMBERIE",
        lieu: "Montreuil (93100)",
        montantEstimeHT: 180_000,
        dateLimite: daysFromNow(21),
        visiteObligatoire: true,
        status: "A_ANALYSER",
        createdById: admin.id,
        files: {
          create: {
            storageKey: dceKey,
            fileName: "RC-jules-ferry.txt",
            mimeType: "text/plain",
            sizeBytes: dceText.length,
          },
        },
      },
    });
  }

  // ═══════════ AO n°2 — En attente dirigeant (dossier v1 complet) ═══════════
  if (!(await prisma.tender.findUnique({ where: { id: "seed-tender-2" } }))) {
    const dce2 = `REGLEMENT DE CONSULTATION (extrait)
Objet : Remplacement des installations CVC de l'EHPAD Les Lilas (production et distribution).
Acheteur : CCAS Les Lilas. Lieu : Les Lilas (93260).
Visite obligatoire. Attestation fluides frigorigènes exigée. Qualibat 5312 ou équivalent.
Critères : prix 40 %, valeur technique 50 %, délais 10 %. Pénalités : 500 €/jour (CCAP art. 8).`;
    const dce2Key = writeUpload(company.id, "tenders", "RC-ehpad-les-lilas.txt", Buffer.from(dce2, "utf8"));
    const tender2 = await prisma.tender.create({
      data: {
        id: "seed-tender-2",
        companyId: company.id,
        sourceId: sourceManuel.id,
        reference: "2026-EHPAD-LL-012",
        objet: "Remplacement des installations CVC — EHPAD Les Lilas",
        acheteur: "CCAS Les Lilas",
        domaine: "CVC",
        lieu: "Les Lilas (93260)",
        montantEstimeHT: 320_000,
        dateLimite: daysFromNow(12),
        visiteObligatoire: true,
        visitePlanifieeLe: daysFromNow(-6),
        status: "EN_ATTENTE_DIRIGEANT",
        createdById: admin.id,
        files: {
          create: {
            storageKey: dce2Key,
            fileName: "RC-ehpad-les-lilas.txt",
            mimeType: "text/plain",
            sizeBytes: dce2.length,
          },
        },
      },
    });

    const analyse2 = {
      acheteur: "CCAS Les Lilas",
      objet: "Remplacement des installations CVC — EHPAD Les Lilas",
      lots: [{ numero: "2", intitule: "CVC — production et distribution", domaine: "CVC" }],
      domainePrincipal: "CVC",
      lieuExecution: "Les Lilas (93260)",
      montantEstimeHT: 320_000,
      dateLimiteRemise: daysFromNow(12).toISOString(),
      visiteObligatoire: true,
      documentsDemandes: [
        { libelle: "Extrait Kbis", type: "KBIS" },
        { libelle: "Attestation URSSAF", type: "URSSAF" },
        { libelle: "Attestation fiscale", type: "ATTESTATION_FISCALE" },
        { libelle: "RC Professionnelle", type: "RC_PRO" },
        { libelle: "Assurance décennale", type: "DECENNALE" },
        { libelle: "RIB", type: "RIB" },
        { libelle: "Attestation fluides frigorigènes", type: "ATTESTATION_FLUIDES" },
      ],
      qualificationsExigees: ["Qualibat 5312 ou équivalent"],
      criteresNotation: [
        { critere: "Prix", ponderationPct: 40 },
        { critere: "Valeur technique", ponderationPct: 50 },
        { critere: "Délais", ponderationPct: 10 },
      ],
      risquesIdentifies: [
        "Site occupé (résidents) : phasage et continuité de chauffage obligatoires",
        "Délai de réponse court : 12 jours restants",
      ],
      penalites: "500 € / jour calendaire de retard (CCAP art. 8)",
      delaisExecution: "4 mois, démarrage souhaité au T4 2026",
      piecesFinancieres: ["DPGF", "Acte d'engagement (AE)"],
      questionsSuggerees: [
        "La chaufferie provisoire est-elle à la charge du titulaire ?",
        "Des interventions de nuit sont-elles envisageables pour les coupures ?",
      ],
      champsACompleter: ["Pénalités détaillées (CCAP complet)", "Planning contractuel précis"],
    };
    const compat2 = {
      score: 78,
      criteres: [
        { critere: "Domaine d'activité", points: 30, maxPoints: 30, commentaire: "CVC fait partie des domaines de l'entreprise." },
        { critere: "Zone géographique", points: 20, maxPoints: 20, commentaire: "Le département 93 fait partie des zones d'intervention." },
        { critere: "Capacité financière", points: 15, maxPoints: 15, commentaire: "CA annuel ≥ 2× le montant du marché : capacité financière solide." },
        { critere: "Qualifications & certifications", points: 8, maxPoints: 15, commentaire: "Qualibat 5312 déclaré — certificat à jour à joindre (expire bientôt)." },
        { critere: "Moyens humains", points: 5, maxPoints: 10, commentaire: "Effectif adapté, mais technicien CVC partiellement disponible sur la période." },
        { critere: "Moyens matériels", points: 0, maxPoints: 10, commentaire: "Matériel de levage lourd à prévoir en location." },
      ],
      recommandation: "Entreprise bien positionnée : préparation du dossier recommandée.",
    };
    const missing2 = [
      { type: "URSSAF", libelle: "Attestation URSSAF", critique: true, detail: "Document présent mais expiré depuis 20 jours — à renouveler." },
      { type: "RC_PRO", libelle: "RC Professionnelle", critique: true, detail: "Document présent mais expiré — demander l'attestation millésimée." },
    ];
    await prisma.tenderAnalysis.create({
      data: {
        tenderId: tender2.id,
        provider: "mock",
        extraction: analyse2,
        compatibilityScore: compat2.score,
        compatibilityDetail: compat2,
        missingDocuments: missing2,
        champsACompleter: analyse2.champsACompleter,
      },
    });

    const content2 = {
      memoireTechnique: {
        titre: "Mémoire technique — Remplacement des installations CVC — EHPAD Les Lilas",
        sections: [
          { titre: "Présentation de l'entreprise", contenu: "Nova BTP, entreprise de plomberie/CVC/électricité (14 personnes, CA 1,85 M€), intervient depuis 2011 sur des chantiers publics en Île-de-France, notamment en milieu occupé (EHPAD, écoles, logements sociaux).", aCompleter: false },
          { titre: "Compréhension du besoin", contenu: "Le marché porte sur le remplacement complet de la production et de la distribution CVC de l'EHPAD Les Lilas, en site occupé, avec continuité de service chauffage et ECS pour les résidents.", aCompleter: false },
          { titre: "Moyens humains affectés", contenu: "- **Julie Moreau** — Conductrice de travaux (8 ans d'expérience)\n- **Karim Benali** — Chef d'équipe (15 ans)\n- **Pavel Kovac** — Technicien CVC, mise en service (attestation fluides cat. 1)", aCompleter: false },
          { titre: "Moyens matériels", contenu: "- Fourgons ateliers × 3\n- Sertisseuses Viega × 4\n- Pompe à épreuve × 2\n- Nacelle 8 m (contrat cadre)", aCompleter: false },
          { titre: "Références similaires", contenu: "- **Rénovation chaufferie collective — Résidence Le Parc** (2024) — OPH Montreuil Habitat — 320 000 € HT\n- **Maintenance CVC multi-sites — Ville de Vincennes** (2024) — 450 000 € HT", aCompleter: false },
          { titre: "Organisation, qualité et sécurité", contenu: "Qualifications : Qualibat 5112, Qualibat 5312, QualiPAC\nCertifications : RGE, PG Gaz\n\n*Plan de phasage en site occupé et dispositions SPS à détailler.*", aCompleter: true },
          { titre: "Planning d'exécution", contenu: "à compléter", aCompleter: true },
        ],
      },
      checklistAdministrative: [
        { libelle: "Extrait Kbis", fait: true, detail: null },
        { libelle: "Attestation URSSAF", fait: false, detail: "Document présent mais expiré — à renouveler." },
        { libelle: "Attestation fiscale", fait: true, detail: null },
        { libelle: "RC Professionnelle", fait: false, detail: "Document présent mais expiré — attestation millésimée à demander." },
        { libelle: "Assurance décennale", fait: true, detail: null },
        { libelle: "RIB", fait: true, detail: null },
        { libelle: "Attestation fluides frigorigènes", fait: true, detail: null },
      ],
      checklistTechnique: [
        { libelle: "Mémoire technique rédigé et relu", fait: false, detail: "Compléter les sections « à compléter »." },
        { libelle: "Moyens humains affectés au chantier", fait: true, detail: null },
        { libelle: "Moyens matériels listés", fait: true, detail: null },
        { libelle: "Références similaires jointes", fait: true, detail: null },
        { libelle: "Visite de site effectuée", fait: true, detail: "Visite réalisée la semaine dernière." },
      ],
      checklistFinanciere: [
        { libelle: "DPGF / BPU complété", fait: true, detail: "Chiffrage à 298 500 € HT sur la base des prix types." },
        { libelle: "Prix vérifiés par le dirigeant", fait: false, detail: "Validation dirigeant requise avant dépôt." },
        { libelle: "Acte d'engagement préparé", fait: true, detail: null },
      ],
      referencesSelectionnees: [
        { referenceId: "seed-ref-1", similarite: 92, justification: "Rénovation chaufferie collective — Résidence Le Parc (2024) : même domaine, montant comparable, référence récente." },
        { referenceId: "seed-ref-3", similarite: 70, justification: "Maintenance CVC multi-sites — Ville de Vincennes (2024) : même domaine, référence récente." },
      ],
      moyensHumains: [
        { employeeId: "seed-emp-julie", nom: "Julie Moreau", poste: "Chargée d'affaires CVC", roleChantier: "Conductrice de travaux" },
        { employeeId: "seed-emp-karim", nom: "Karim Benali", poste: "Chef d'équipe plomberie", roleChantier: "Chef d'équipe" },
        { employeeId: "seed-emp-pavel", nom: "Pavel Kovac", poste: "Technicien CVC", roleChantier: "Technicien de mise en service" },
      ],
      moyensMateriels: [
        { equipmentId: "seed-eq-1", nom: "Fourgon Renault Master (atelier mobile)", quantite: 3 },
        { equipmentId: "seed-eq-3", nom: "Sertisseuse Viega Pressgun", quantite: 4 },
        { equipmentId: "seed-eq-5", nom: "Nacelle ciseaux 8 m (location cadre)", quantite: 1 },
      ],
      planning: {
        etapes: [
          { libelle: "Installation de chantier + chaufferie provisoire", detail: "Semaines 1-2" },
          { libelle: "Dépose et remplacement production", detail: "Semaines 3-8" },
          { libelle: "Distribution, équilibrage, mise en service", detail: "Semaines 9-14" },
          { libelle: "Réception et levée de réserves", detail: "Semaines 15-16" },
        ],
        note: "Planning établi sur 4 mois, à confirmer avec le maître d'œuvre.",
      },
      questionsAcheteur: [
        "La chaufferie provisoire est-elle à la charge du titulaire ?",
        "Des interventions de nuit sont-elles envisageables pour les coupures réseau ?",
      ],
      prixProposeHT: 298_500,
      delaiProposeJours: 120,
    };
    const hash2 = sha256(content2);
    const proposal2 = await prisma.proposal.create({
      data: { tenderId: tender2.id, companyId: company.id },
    });
    const version2 = await prisma.proposalVersion.create({
      data: {
        proposalId: proposal2.id,
        versionNumber: 1,
        memoireTechnique: content2.memoireTechnique,
        checklistAdministrative: content2.checklistAdministrative,
        checklistTechnique: content2.checklistTechnique,
        checklistFinanciere: content2.checklistFinanciere,
        referencesSelectionnees: content2.referencesSelectionnees,
        moyensHumains: content2.moyensHumains,
        moyensMateriels: content2.moyensMateriels,
        planning: content2.planning,
        questionsAcheteur: content2.questionsAcheteur,
        prixProposeHT: content2.prixProposeHT,
        delaiProposeJours: content2.delaiProposeJours,
        contentHash: hash2,
        createdById: admin.id,
      },
    });
    await prisma.proposal.update({
      where: { id: proposal2.id },
      data: { currentVersionId: version2.id },
    });
  }

  // ═══════════ AO n°3 — Gagné (validation + commission) ═══════════
  if (!(await prisma.tender.findUnique({ where: { id: "seed-tender-3" } }))) {
    const dce3 = `REGLEMENT DE CONSULTATION (extrait)
Objet : Maintenance préventive et corrective plomberie/CVC multi-sites du parc Habitat 93.
Acheteur : Habitat 93 (bailleur social). Marché à bons de commande, 24 mois reconductibles.
Critères : prix 60 %, valeur technique 40 %. BPU à compléter.`;
    const dce3Key = writeUpload(company.id, "tenders", "RC-habitat93-maintenance.txt", Buffer.from(dce3, "utf8"));
    const tender3 = await prisma.tender.create({
      data: {
        id: "seed-tender-3",
        companyId: company.id,
        sourceId: sourceManuel.id,
        reference: "2025-H93-MAINT-008",
        objet: "Maintenance plomberie/CVC multi-sites — Habitat 93",
        acheteur: "Habitat 93 (bailleur social)",
        domaine: "MAINTENANCE",
        lieu: "Seine-Saint-Denis (93)",
        montantEstimeHT: 300_000,
        dateLimite: daysFromNow(-45),
        visiteObligatoire: false,
        status: "GAGNE",
        createdById: admin.id,
        files: {
          create: {
            storageKey: dce3Key,
            fileName: "RC-habitat93-maintenance.txt",
            mimeType: "text/plain",
            sizeBytes: dce3.length,
          },
        },
      },
    });

    const analyse3 = {
      acheteur: "Habitat 93 (bailleur social)",
      objet: "Maintenance plomberie/CVC multi-sites — Habitat 93",
      lots: [],
      domainePrincipal: "MAINTENANCE",
      lieuExecution: "Seine-Saint-Denis (93)",
      montantEstimeHT: 300_000,
      dateLimiteRemise: daysFromNow(-45).toISOString(),
      visiteObligatoire: false,
      documentsDemandes: [
        { libelle: "Extrait Kbis", type: "KBIS" },
        { libelle: "Attestation URSSAF", type: "URSSAF" },
        { libelle: "RC Professionnelle", type: "RC_PRO" },
        { libelle: "RIB", type: "RIB" },
      ],
      qualificationsExigees: [],
      criteresNotation: [
        { critere: "Prix", ponderationPct: 60 },
        { critere: "Valeur technique", ponderationPct: 40 },
      ],
      risquesIdentifies: [],
      penalites: "Pénalités forfaitaires par intervention non réalisée (CCAP)",
      delaisExecution: "Marché à bons de commande — 24 mois reconductibles",
      piecesFinancieres: ["BPU"],
      questionsSuggerees: [],
      champsACompleter: [],
    };
    await prisma.tenderAnalysis.create({
      data: {
        tenderId: tender3.id,
        provider: "mock",
        extraction: analyse3,
        compatibilityScore: 85,
        compatibilityDetail: {
          score: 85,
          criteres: [
            { critere: "Domaine d'activité", points: 30, maxPoints: 30, commentaire: "Maintenance déclarée." },
            { critere: "Zone géographique", points: 20, maxPoints: 20, commentaire: "Département 93 couvert." },
            { critere: "Capacité financière", points: 15, maxPoints: 15, commentaire: "CA largement suffisant." },
            { critere: "Qualifications & certifications", points: 10, maxPoints: 15, commentaire: "Aucune qualification exigée." },
            { critere: "Moyens humains", points: 10, maxPoints: 10, commentaire: "Effectif adapté au multi-sites." },
            { critere: "Moyens matériels", points: 0, maxPoints: 10, commentaire: "Astreinte véhicule à organiser." },
          ],
          recommandation: "Entreprise bien positionnée : préparation du dossier recommandée.",
        },
        missingDocuments: [],
        champsACompleter: [],
      },
    });

    const content3 = {
      memoireTechnique: {
        titre: "Mémoire technique — Maintenance plomberie/CVC multi-sites — Habitat 93",
        sections: [
          { titre: "Présentation de l'entreprise", contenu: "Nova BTP — 14 personnes, expérience éprouvée en maintenance multi-sites (Ville de Vincennes, 23 bâtiments).", aCompleter: false },
          { titre: "Organisation de la maintenance", contenu: "Astreinte 24/7, GMAO partagée, délais d'intervention garantis P1 4h / P2 48h.", aCompleter: false },
        ],
      },
      checklistAdministrative: [
        { libelle: "Extrait Kbis", fait: true, detail: null },
        { libelle: "Attestation URSSAF", fait: true, detail: null },
        { libelle: "RC Professionnelle", fait: true, detail: null },
        { libelle: "RIB", fait: true, detail: null },
      ],
      checklistTechnique: [
        { libelle: "Mémoire technique rédigé et relu", fait: true, detail: null },
        { libelle: "Moyens humains affectés", fait: true, detail: null },
      ],
      checklistFinanciere: [
        { libelle: "BPU complété", fait: true, detail: null },
        { libelle: "Prix vérifiés par le dirigeant", fait: true, detail: null },
      ],
      referencesSelectionnees: [
        { referenceId: "seed-ref-3", similarite: 95, justification: "Maintenance CVC multi-sites — Ville de Vincennes : même domaine, montant comparable, référence récente." },
      ],
      moyensHumains: [
        { employeeId: "seed-emp-karim", nom: "Karim Benali", poste: "Chef d'équipe plomberie", roleChantier: "Responsable d'astreinte" },
        { employeeId: "seed-emp-pavel", nom: "Pavel Kovac", poste: "Technicien CVC", roleChantier: "Technicien de maintenance" },
      ],
      moyensMateriels: [
        { equipmentId: "seed-eq-1", nom: "Fourgon Renault Master (atelier mobile)", quantite: 3 },
      ],
      planning: { etapes: [{ libelle: "Prise en charge du parc + état des lieux", detail: "Mois 1" }], note: "Marché à bons de commande." },
      questionsAcheteur: [],
      prixProposeHT: 300_000,
      delaiProposeJours: 730,
    };
    const hash3 = sha256(content3);
    const proposal3 = await prisma.proposal.create({
      data: { tenderId: tender3.id, companyId: company.id },
    });
    const version3 = await prisma.proposalVersion.create({
      data: {
        proposalId: proposal3.id,
        versionNumber: 1,
        memoireTechnique: content3.memoireTechnique,
        checklistAdministrative: content3.checklistAdministrative,
        checklistTechnique: content3.checklistTechnique,
        checklistFinanciere: content3.checklistFinanciere,
        referencesSelectionnees: content3.referencesSelectionnees,
        moyensHumains: content3.moyensHumains,
        moyensMateriels: content3.moyensMateriels,
        planning: content3.planning,
        questionsAcheteur: content3.questionsAcheteur,
        prixProposeHT: content3.prixProposeHT,
        delaiProposeJours: content3.delaiProposeJours,
        contentHash: hash3,
        createdById: admin.id,
        createdAt: daysFromNow(-60),
      },
    });
    await prisma.proposal.update({
      where: { id: proposal3.id },
      data: { currentVersionId: version3.id },
    });

    // Validation dirigeant historisée (trace complète).
    const validation3 = await prisma.validation.create({
      data: {
        proposalVersionId: version3.id,
        tenderId: tender3.id,
        companyId: company.id,
        userId: martin.id,
        prixValide: true,
        delaisValides: true,
        moyensHumainsValides: true,
        moyensMaterielsValides: true,
        engagementsValides: true,
        autorisationDepot: true,
        commentaire: "OK pour dépôt — prix conformes au BPU validé en interne.",
        ipAddress: "82.64.112.37",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        contentHash: hash3,
        validatedAt: daysFromNow(-52),
      },
    });

    // Commission (barème progressif) : 300 000 € → 24 000 €.
    const { total, detail } = calcCommission(300_000);
    await prisma.commission.create({
      data: {
        tenderId: tender3.id,
        companyId: company.id,
        montantMarcheHT: 300_000,
        montantCommission: total,
        bareme: detail,
        status: "GAGNEE",
      },
    });

    await prisma.auditLog.createMany({
      data: [
        { userId: admin.id, companyId: company.id, action: "TENDER_CREATED", entityType: "Tender", entityId: tender3.id, ipAddress: "10.0.0.1", createdAt: daysFromNow(-70) },
        { userId: admin.id, companyId: company.id, action: "TENDER_ANALYSED", entityType: "Tender", entityId: tender3.id, metadata: { provider: "mock", score: 85 }, ipAddress: "10.0.0.1", createdAt: daysFromNow(-68) },
        { userId: admin.id, companyId: company.id, action: "PROPOSAL_GENERATED", entityType: "ProposalVersion", entityId: version3.id, metadata: { versionNumber: 1, contentHash: hash3 }, ipAddress: "10.0.0.1", createdAt: daysFromNow(-60) },
        { userId: martin.id, companyId: company.id, action: "PROPOSAL_VALIDATED", entityType: "Validation", entityId: validation3.id, metadata: { tenderId: tender3.id, proposalVersionId: version3.id, versionNumber: 1, contentHash: hash3, elementsValides: ["prix", "delais", "moyensHumains", "moyensMateriels", "engagements", "autorisationDepot"] }, ipAddress: "82.64.112.37", createdAt: daysFromNow(-52) },
        { userId: admin.id, companyId: company.id, action: "TENDER_DEPOSITED", entityType: "Tender", entityId: tender3.id, metadata: { validationId: validation3.id, contentHash: hash3 }, ipAddress: "10.0.0.1", createdAt: daysFromNow(-50) },
        { userId: admin.id, companyId: company.id, action: "TENDER_WON", entityType: "Tender", entityId: tender3.id, metadata: { montantMarcheHT: 300_000 }, ipAddress: "10.0.0.1", createdAt: daysFromNow(-10) },
      ],
    });
  }

  console.log("✓ Seed terminé.");
  console.log("  Comptes : admin@btpilot.fr / Admin1234! · martin.sanchez@novabtp.fr / Nova1234! · julie.moreau@novabtp.fr / Nova1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
