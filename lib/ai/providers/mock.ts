import "server-only";
import type { Domaine, DocumentType } from "@prisma/client";
import { DOMAINE_LABELS, DOCUMENTS_STANDARDS, DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { A_COMPLETER } from "../schemas";
import type {
  AnalyseDCE,
  Checklists,
  CompatibilityResult,
  MemoireTechnique,
  PieceManquante,
  SelectedReference,
  ValidationBrief,
} from "../schemas";
import type { AiProvider, CompanySnapshot, DceInput, ProposalVersionInput } from "../types";

/**
 * Provider mock : déterministe, à base de règles.
 * Il n'invente RIEN : il exploite les métadonnées saisies à l'import,
 * les mots-clés des fichiers du DCE et les données réelles de l'entreprise.
 * Tout champ inconnu → « à compléter ».
 */

const DOMAINE_KEYWORDS: Record<Domaine, string[]> = {
  PLOMBERIE: ["plomberie", "plombier", "sanitaire", "sanitaires"],
  CVC: ["cvc", "chauffage", "ventilation", "climatisation", "chaufferie", "pac"],
  ELECTRICITE: ["electricite", "électricité", "electrique", "électrique", "courants forts", "courants faibles"],
  PEINTURE: ["peinture", "revetement mural", "revêtement"],
  MACONNERIE: ["maconnerie", "maçonnerie"],
  GROS_OEUVRE: ["gros oeuvre", "gros œuvre", "structure", "beton", "béton"],
  SECOND_OEUVRE: ["second oeuvre", "second œuvre"],
  MENUISERIE: ["menuiserie", "menuiseries", "fenetre", "fenêtre", "porte"],
  ETANCHEITE: ["etancheite", "étanchéité", "toiture terrasse"],
  ISOLATION: ["isolation", "ite", "iti", "thermique"],
  MAINTENANCE: ["maintenance", "entretien", "exploitation", "p2", "p3"],
  NETTOYAGE: ["nettoyage", "proprete", "propreté"],
  VRD: ["vrd", "voirie", "reseaux divers", "assainissement", "terrassement"],
  SERRURERIE: ["serrurerie", "metallerie", "métallerie"],
  COUVERTURE: ["couverture", "toiture", "zinguerie"],
  RENOVATION_TCE: ["tce", "tous corps d'etat", "tous corps d'état", "rehabilitation", "réhabilitation"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function detectDomaine(text: string): Domaine | null {
  const t = normalize(text);
  let best: { domaine: Domaine; hits: number } | null = null;
  for (const [domaine, keywords] of Object.entries(DOMAINE_KEYWORDS)) {
    const hits = keywords.filter((k) => t.includes(normalize(k))).length;
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { domaine: domaine as Domaine, hits };
    }
  }
  return best?.domaine ?? null;
}

function corpusOf(input: DceInput): string {
  return [
    input.manual.objet,
    input.manual.acheteur ?? "",
    ...input.files.map((f) => `${f.fileName} ${f.text ?? ""}`),
  ].join("\n");
}

export class MockAiProvider implements AiProvider {
  readonly name = "mock" as const;

  async analyserDCE(input: DceInput): Promise<AnalyseDCE> {
    const corpus = corpusOf(input);
    const champsACompleter: string[] = [];

    const domaine = input.manual.domaine ?? detectDomaine(corpus);
    if (!domaine) champsACompleter.push("Domaine principal");

    const acheteur = input.manual.acheteur ?? A_COMPLETER;
    if (acheteur === A_COMPLETER) champsACompleter.push("Acheteur");

    const lieu = input.manual.lieu ?? A_COMPLETER;
    if (lieu === A_COMPLETER) champsACompleter.push("Lieu d'exécution");

    if (input.manual.montantEstimeHT === null) champsACompleter.push("Montant estimé HT");
    if (input.manual.dateLimite === null) champsACompleter.push("Date limite de remise");

    // Documents systématiquement exigés dans un marché public + détection par mots-clés.
    const documentsDemandes: AnalyseDCE["documentsDemandes"] = DOCUMENTS_STANDARDS.map(
      (type) => ({ libelle: DOCUMENT_TYPE_LABELS[type], type })
    );
    const extraDocs: { kw: string; type: DocumentType }[] = [
      { kw: "qualibat", type: "QUALIBAT" },
      { kw: "rge", type: "RGE" },
      { kw: "amiante", type: "AMIANTE" },
      { kw: "caces", type: "CACES" },
      { kw: "gaz", type: "PG_GAZ" },
      { kw: "fluides", type: "ATTESTATION_FLUIDES" },
      { kw: "habilitation", type: "HABILITATION_ELECTRIQUE" },
    ];
    const t = normalize(corpus);
    for (const { kw, type } of extraDocs) {
      if (t.includes(kw) && !documentsDemandes.some((d) => d.type === type)) {
        documentsDemandes.push({ libelle: DOCUMENT_TYPE_LABELS[type], type });
      }
    }

    const qualificationsExigees: string[] = [];
    if (t.includes("qualibat")) qualificationsExigees.push("Qualibat (mention au DCE)");
    if (t.includes("rge")) qualificationsExigees.push("RGE");
    if (qualificationsExigees.length === 0) {
      champsACompleter.push("Qualifications exigées (vérifier le RC)");
    }

    const visite = input.manual.visiteObligatoire
      ? true
      : t.includes("visite obligatoire")
        ? true
        : null;
    if (visite === null) champsACompleter.push("Visite obligatoire (vérifier le RC)");

    const risques: string[] = [];
    if (t.includes("penalite") || t.includes("pénalité")) {
      risques.push("Pénalités de retard mentionnées dans le DCE — vérifier le CCAP");
    }
    if (input.manual.dateLimite) {
      const days = Math.ceil(
        (new Date(input.manual.dateLimite).getTime() - Date.now()) / 86_400_000
      );
      if (days >= 0 && days <= 14) {
        risques.push(`Délai de réponse court : ${days} jour(s) restant(s)`);
      }
    }
    if (visite) risques.push("Visite de site obligatoire à planifier avant la remise");

    return {
      acheteur,
      objet: input.manual.objet,
      lots: [],
      domainePrincipal: domaine,
      lieuExecution: lieu,
      montantEstimeHT: input.manual.montantEstimeHT,
      dateLimiteRemise: input.manual.dateLimite,
      visiteObligatoire: visite,
      documentsDemandes,
      qualificationsExigees,
      criteresNotation: [
        { critere: "Prix", ponderationPct: 50 },
        { critere: "Valeur technique", ponderationPct: 40 },
        { critere: "Délais", ponderationPct: 10 },
      ],
      risquesIdentifies: risques,
      penalites: A_COMPLETER,
      delaisExecution: A_COMPLETER,
      piecesFinancieres: ["DPGF ou BPU selon le dossier", "Acte d'engagement (AE)"],
      questionsSuggerees: [],
      champsACompleter: [
        ...champsACompleter,
        "Critères de notation exacts (grille par défaut proposée)",
        "Pénalités (CCAP)",
        "Délais d'exécution (CCAP/CCTP)",
      ],
    };
  }

  async detecterPiecesManquantes(
    analyse: AnalyseDCE,
    company: CompanySnapshot
  ): Promise<PieceManquante[]> {
    const manquantes: PieceManquante[] = [];
    for (const demande of analyse.documentsDemandes) {
      if (!demande.type) continue;
      // Le meilleur document du type l'emporte : un exemplaire valide couvre
      // la demande même si une ancienne version expirée traîne encore.
      const doc = company.documents
        .filter((d) => d.type === demande.type)
        .sort((a, b) => {
          if (a.expire !== b.expire) return a.expire ? 1 : -1;
          return (b.dateExpiration ?? "9999").localeCompare(a.dateExpiration ?? "9999");
        })[0];
      if (!doc) {
        manquantes.push({
          type: demande.type,
          libelle: demande.libelle,
          critique: DOCUMENTS_STANDARDS.includes(demande.type),
          detail: "Document absent du dossier entreprise — à téléverser.",
        });
      } else if (doc.expire) {
        manquantes.push({
          type: demande.type,
          libelle: demande.libelle,
          critique: true,
          detail: `Document présent mais expiré${doc.dateExpiration ? ` depuis le ${new Date(doc.dateExpiration).toLocaleDateString("fr-FR")}` : ""} — à renouveler.`,
        });
      }
    }
    return manquantes;
  }

  async calculerCompatibiliteEntreprise(
    analyse: AnalyseDCE,
    company: CompanySnapshot
  ): Promise<CompatibilityResult> {
    const criteres: CompatibilityResult["criteres"] = [];

    // Domaine d'activité — 30 pts
    const domaineOk =
      analyse.domainePrincipal !== null &&
      company.domaines.includes(analyse.domainePrincipal);
    criteres.push({
      critere: "Domaine d'activité",
      points: domaineOk ? 30 : 0,
      maxPoints: 30,
      commentaire: domaineOk
        ? `${DOMAINE_LABELS[analyse.domainePrincipal as Domaine]} fait partie des domaines de l'entreprise.`
        : analyse.domainePrincipal
          ? `${DOMAINE_LABELS[analyse.domainePrincipal as Domaine]} n'est pas déclaré dans le profil entreprise.`
          : "Domaine du marché à compléter.",
    });

    // Zone géographique — 20 pts
    const dept = extractDept(analyse.lieuExecution);
    const zoneOk = dept !== null && company.zonesGeographiques.includes(dept);
    criteres.push({
      critere: "Zone géographique",
      points: zoneOk ? 20 : dept === null ? 10 : 0,
      maxPoints: 20,
      commentaire: zoneOk
        ? `Le département ${dept} fait partie des zones d'intervention.`
        : dept === null
          ? "Lieu d'exécution à préciser — score partiel."
          : `Le département ${dept} n'est pas dans les zones d'intervention déclarées.`,
    });

    // Capacité financière — 15 pts (CA ≥ 2× montant du marché)
    let finPoints = 0;
    let finComment = "Chiffre d'affaires ou montant du marché à compléter — score partiel.";
    if (company.caAnnuel !== null && analyse.montantEstimeHT !== null) {
      const ratio = company.caAnnuel / analyse.montantEstimeHT;
      finPoints = ratio >= 2 ? 15 : ratio >= 1 ? 8 : 0;
      finComment =
        ratio >= 2
          ? "CA annuel ≥ 2× le montant du marché : capacité financière solide."
          : ratio >= 1
            ? "CA annuel proche du montant du marché : capacité à surveiller."
            : "Montant du marché supérieur au CA annuel : risque de rejet sur la capacité.";
    } else {
      finPoints = 7;
    }
    criteres.push({
      critere: "Capacité financière",
      points: finPoints,
      maxPoints: 15,
      commentaire: finComment,
    });

    // Qualifications — 15 pts
    const qualifsRequises = analyse.qualificationsExigees;
    let qualifPoints: number;
    let qualifComment: string;
    if (qualifsRequises.length === 0) {
      qualifPoints = 10;
      qualifComment = "Qualifications exigées à vérifier dans le RC — score partiel.";
    } else {
      const companyQualifs = normalize(
        [...company.qualifications, ...company.certifications].join(" ")
      );
      const matched = qualifsRequises.filter((q) =>
        companyQualifs.includes(normalize(q.split(" ")[0]))
      );
      qualifPoints = Math.round((matched.length / qualifsRequises.length) * 15);
      qualifComment =
        matched.length === qualifsRequises.length
          ? "Toutes les qualifications exigées sont déclarées."
          : `${matched.length}/${qualifsRequises.length} qualification(s) exigée(s) couverte(s).`;
    }
    criteres.push({
      critere: "Qualifications & certifications",
      points: qualifPoints,
      maxPoints: 15,
      commentaire: qualifComment,
    });

    // Effectif — 10 pts
    const effectifOk = (company.effectif ?? 0) >= 5;
    criteres.push({
      critere: "Moyens humains",
      points: company.effectif === null ? 5 : effectifOk ? 10 : 5,
      maxPoints: 10,
      commentaire:
        company.effectif === null
          ? "Effectif à compléter dans le profil."
          : `Effectif déclaré : ${company.effectif} personne(s), dont ${company.employees.length} fiche(s) détaillée(s).`,
    });

    // Moyens matériels — 10 pts
    const eqCount = company.equipments.reduce((s, e) => s + e.quantite, 0);
    criteres.push({
      critere: "Moyens matériels",
      points: eqCount >= 10 ? 10 : eqCount >= 3 ? 6 : eqCount > 0 ? 3 : 0,
      maxPoints: 10,
      commentaire:
        eqCount > 0
          ? `${eqCount} équipement(s) recensé(s) dans la base matériel.`
          : "Aucun matériel déclaré — compléter la base matériel.",
    });

    const score = Math.min(
      100,
      criteres.reduce((s, c) => s + c.points, 0)
    );

    return {
      score,
      criteres,
      recommandation:
        score >= 70
          ? "Entreprise bien positionnée : préparation du dossier recommandée."
          : score >= 45
            ? "Positionnement possible : compléter le profil et les pièces avant décision."
            : "Compatibilité faible en l'état : vérifier le domaine, la zone et la capacité avant d'engager la préparation.",
    };
  }

  async genererMemoireTechnique(
    analyse: AnalyseDCE,
    company: CompanySnapshot
  ): Promise<MemoireTechnique> {
    const sections: MemoireTechnique["sections"] = [];

    sections.push({
      titre: "Présentation de l'entreprise",
      contenu: company.description
        ? `${company.description}\n\n**Raison sociale :** ${company.raisonSociale}\n**SIRET :** ${company.siret}${company.caAnnuel ? `\n**Chiffre d'affaires :** ${company.caAnnuel.toLocaleString("fr-FR")} € HT` : ""}${company.effectif ? `\n**Effectif :** ${company.effectif} personnes` : ""}`
        : A_COMPLETER,
      aCompleter: !company.description,
    });

    sections.push({
      titre: "Compréhension du besoin",
      contenu: `Le présent marché porte sur : ${analyse.objet}.${analyse.acheteur !== A_COMPLETER ? ` Il est passé par ${analyse.acheteur}.` : ""}${analyse.lieuExecution !== A_COMPLETER ? ` Le lieu d'exécution est ${analyse.lieuExecution}.` : ""}\n\n*Reformulation à enrichir après lecture complète du CCTP.*`,
      aCompleter: true,
    });

    const dispo = company.employees.filter((e) => e.disponibilite !== "INDISPONIBLE");
    sections.push({
      titre: "Moyens humains affectés",
      contenu:
        dispo.length > 0
          ? dispo
              .map(
                (e) =>
                  `- **${e.prenom} ${e.nom}** — ${e.poste}${e.experienceAnnees ? ` (${e.experienceAnnees} ans d'expérience)` : ""}${e.roleChantier ? ` — rôle proposé : ${e.roleChantier}` : ""}`
              )
              .join("\n")
          : A_COMPLETER,
      aCompleter: dispo.length === 0,
    });

    const eqDispo = company.equipments.filter((e) => e.disponibilite !== "INDISPONIBLE");
    sections.push({
      titre: "Moyens matériels",
      contenu:
        eqDispo.length > 0
          ? eqDispo.map((e) => `- ${e.nom} × ${e.quantite}`).join("\n")
          : A_COMPLETER,
      aCompleter: eqDispo.length === 0,
    });

    const refsPertinentes = company.references.filter(
      (r) => !analyse.domainePrincipal || r.domaine === analyse.domainePrincipal
    );
    sections.push({
      titre: "Références similaires",
      contenu:
        refsPertinentes.length > 0
          ? refsPertinentes
              .map(
                (r) =>
                  `- **${r.nomChantier}** (${r.annee}) — ${r.client} — ${r.montantHT.toLocaleString("fr-FR")} € HT — ${r.prestation}`
              )
              .join("\n")
          : A_COMPLETER,
      aCompleter: refsPertinentes.length === 0,
    });

    sections.push({
      titre: "Organisation, qualité et sécurité",
      contenu:
        company.qualifications.length > 0 || company.certifications.length > 0
          ? `Qualifications : ${company.qualifications.join(", ") || "—"}\nCertifications : ${company.certifications.join(", ") || "—"}\n\n*Décrire ici l'organisation du chantier, le plan qualité et les dispositions SPS.*`
          : A_COMPLETER,
      aCompleter: true,
    });

    sections.push({
      titre: "Planning d'exécution",
      contenu: A_COMPLETER,
      aCompleter: true,
    });

    return {
      titre: `Mémoire technique — ${analyse.objet}`,
      sections,
    };
  }

  async genererChecklist(
    analyse: AnalyseDCE,
    company: CompanySnapshot,
    piecesManquantes: PieceManquante[]
  ): Promise<Checklists> {
    const administrative = analyse.documentsDemandes.map((d) => {
      const manquant = piecesManquantes.find(
        (p) => p.type === d.type || p.libelle === d.libelle
      );
      return {
        libelle: d.libelle,
        fait: !manquant,
        detail: manquant ? manquant.detail : null,
      };
    });

    const technique = [
      {
        libelle: "Mémoire technique rédigé et relu",
        fait: false,
        detail: "Compléter les sections marquées « à compléter ».",
      },
      {
        libelle: "Moyens humains affectés au chantier",
        fait: company.employees.length > 0,
        detail: company.employees.length === 0 ? "Ajouter les fiches salariés." : null,
      },
      {
        libelle: "Moyens matériels listés",
        fait: company.equipments.length > 0,
        detail: company.equipments.length === 0 ? "Compléter la base matériel." : null,
      },
      {
        libelle: "Références similaires jointes",
        fait: company.references.length > 0,
        detail: company.references.length === 0 ? "Ajouter des références chantiers." : null,
      },
      ...(analyse.visiteObligatoire
        ? [{ libelle: "Visite de site effectuée", fait: false, detail: "Visite obligatoire mentionnée au DCE." }]
        : []),
    ];

    const financiere = [
      {
        libelle: "DPGF / BPU complété",
        fait: false,
        detail: "À chiffrer à partir des prix types — validation dirigeant obligatoire.",
      },
      {
        libelle: "Prix vérifiés par le dirigeant",
        fait: false,
        detail: "Le prix final doit être validé explicitement avant dépôt.",
      },
      {
        libelle: "Acte d'engagement préparé",
        fait: false,
        detail: null,
      },
    ];

    return { administrative, technique, financiere };
  }

  async genererQuestionsAcheteur(analyse: AnalyseDCE): Promise<string[]> {
    const questions: string[] = [];
    if (analyse.visiteObligatoire === null) {
      questions.push("La visite de site est-elle obligatoire ? Si oui, quelles sont les dates proposées ?");
    }
    if (analyse.montantEstimeHT === null) {
      questions.push("Une estimation du montant du marché peut-elle être communiquée ?");
    }
    if (analyse.penalites === A_COMPLETER) {
      questions.push("Pouvez-vous préciser le régime des pénalités applicables (CCAP) ?");
    }
    if (analyse.delaisExecution === A_COMPLETER) {
      questions.push("Quel est le délai d'exécution prévisionnel et le calendrier de démarrage ?");
    }
    questions.push("Des variantes ou prestations supplémentaires éventuelles sont-elles autorisées ?");
    return questions;
  }

  async selectionnerReferencesSimilaires(
    analyse: AnalyseDCE,
    references: CompanySnapshot["references"]
  ): Promise<SelectedReference[]> {
    const currentYear = new Date().getFullYear();
    return references
      .map((r) => {
        let score = 0;
        const raisons: string[] = [];
        if (analyse.domainePrincipal && r.domaine === analyse.domainePrincipal) {
          score += 50;
          raisons.push("même domaine");
        }
        if (analyse.montantEstimeHT) {
          const ratio =
            Math.min(r.montantHT, analyse.montantEstimeHT) /
            Math.max(r.montantHT, analyse.montantEstimeHT);
          score += Math.round(ratio * 30);
          if (ratio >= 0.4) raisons.push("montant comparable");
        } else {
          score += 15;
        }
        const age = currentYear - r.annee;
        score += age <= 2 ? 20 : age <= 5 ? 10 : 0;
        if (age <= 2) raisons.push("référence récente");
        return {
          referenceId: r.id,
          similarite: Math.min(100, score),
          justification:
            raisons.length > 0
              ? `${r.nomChantier} (${r.annee}) : ${raisons.join(", ")}.`
              : `${r.nomChantier} (${r.annee}) : similarité limitée avec ce marché.`,
        };
      })
      .sort((a, b) => b.similarite - a.similarite)
      .slice(0, 4);
  }

  async preparerValidationDirigeant(
    version: ProposalVersionInput
  ): Promise<ValidationBrief> {
    const manquantesCritiques = version.piecesManquantes.filter((p) => p.critique);
    const sectionsACompleter = version.memoireTechnique.sections.filter((s) => s.aCompleter);

    return {
      syntheseGenerale: `Dossier de réponse pour « ${version.objet} »${version.acheteur ? ` (${version.acheteur})` : ""}. ${manquantesCritiques.length > 0 ? `${manquantesCritiques.length} pièce(s) critique(s) manquante(s). ` : "Toutes les pièces critiques sont présentes. "}${sectionsACompleter.length > 0 ? `${sectionsACompleter.length} section(s) du mémoire restent à compléter.` : "Le mémoire technique est complet."}`,
      prix: {
        resume: version.prixProposeHT
          ? `Prix proposé : ${version.prixProposeHT.toLocaleString("fr-FR")} € HT.`
          : "Aucun prix renseigné — à compléter avant validation.",
        pointsAttention: version.prixProposeHT
          ? ["Vérifier la cohérence avec la DPGF/BPU et les marges cibles."]
          : ["Le prix est obligatoire avant le dépôt."],
      },
      delais: {
        resume: version.delaiProposeJours
          ? `Délai proposé : ${version.delaiProposeJours} jours.`
          : "Délai d'exécution non renseigné — à compléter.",
        pointsAttention: ["Confirmer la disponibilité des équipes sur la période visée."],
      },
      moyensHumains: {
        resume:
          version.moyensHumains.length > 0
            ? `${version.moyensHumains.length} personne(s) affectée(s) : ${version.moyensHumains.map((m) => `${m.nom} (${m.roleChantier ?? m.poste})`).join(", ")}.`
            : "Aucun moyen humain affecté.",
        pointsAttention:
          version.moyensHumains.length === 0
            ? ["Affecter au moins un encadrant et une équipe d'exécution."]
            : [],
      },
      moyensMateriels: {
        resume:
          version.moyensMateriels.length > 0
            ? `${version.moyensMateriels.length} type(s) de matériel mobilisé(s).`
            : "Aucun matériel affecté.",
        pointsAttention: [],
      },
      engagements: {
        resume:
          "En validant, vous engagez l'entreprise sur les prix, délais et moyens déclarés dans cette version du dossier.",
        pointsAttention: manquantesCritiques.map((p) => `Pièce critique manquante : ${p.libelle}`),
      },
      risques: [
        ...manquantesCritiques.map((p) => `Pièce manquante : ${p.libelle} — ${p.detail}`),
        ...sectionsACompleter.map((s) => `Mémoire : section « ${s.titre} » à compléter`),
      ],
    };
  }
}

function extractDept(lieu: string): string | null {
  if (!lieu || lieu === A_COMPLETER) return null;
  const cp = lieu.match(/\b(\d{5})\b/);
  if (cp) return cp[1].slice(0, 2);
  const dept = lieu.match(/\((\d{2,3})\)/);
  if (dept) return dept[1];
  const known: Record<string, string> = {
    paris: "75",
    montreuil: "93",
    "boulogne-billancourt": "92",
    nanterre: "92",
    creteil: "94",
    créteil: "94",
    versailles: "78",
    "les lilas": "93",
  };
  const l = normalize(lieu);
  for (const [city, d] of Object.entries(known)) {
    if (l.includes(normalize(city))) return d;
  }
  return null;
}
