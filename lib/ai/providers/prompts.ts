import "server-only";
import { z } from "zod";
import { A_COMPLETER, type AnalyseDCE } from "../schemas";
import type { CompanySnapshot, DceInput, ProposalVersionInput } from "../types";

/**
 * Prompts partagés entre les providers Anthropic et OpenAI.
 * Règle d'or transmise au modèle : ne JAMAIS inventer — toute information
 * absente des sources est remplacée par « à compléter ».
 */

export const SYSTEM_PROMPT = `Tu es l'assistant IA de BTPilot, une plateforme qui aide les entreprises du BTP à répondre aux appels d'offres publics français.

RÈGLE ABSOLUE : tu n'inventes JAMAIS d'information. Tu utilises exclusivement :
- le contenu du DCE fourni,
- les données réelles de l'entreprise fournies.
Si une information est absente des sources, tu écris exactement « ${A_COMPLETER} » et tu l'ajoutes à la liste champsACompleter quand elle existe. Tu réponds toujours en français, dans un style professionnel adapté aux marchés publics.`;

export const QuestionsSchema = z.object({
  questions: z.array(z.string()),
});

export function buildAnalysePrompt(input: DceInput): string {
  const files = input.files
    .map(
      (f) =>
        `--- Fichier : ${f.fileName} (${f.mimeType}) ---\n${f.text ?? "[contenu non textuel — non extrait]"}`
    )
    .join("\n\n");

  return `Analyse ce dossier de consultation des entreprises (DCE) et extrais les informations demandées.

## Métadonnées saisies à l'import (source fiable, à reprendre telles quelles)
${JSON.stringify(input.manual, null, 2)}

## Fichiers du DCE
${files || "[aucun fichier fourni]"}

Extrais : acheteur, objet, lots, domaine principal, lieu d'exécution, montant estimé HT, date limite de remise (ISO), visite obligatoire, documents demandés, qualifications exigées, critères de notation avec pondération, risques identifiés, pénalités, délais d'exécution, pièces financières attendues, questions à poser à l'acheteur.
Tout champ introuvable → « ${A_COMPLETER} » (ou null pour les champs typés) + entrée dans champsACompleter.`;
}

export function buildMemoirePrompt(
  analyse: AnalyseDCE,
  company: CompanySnapshot
): string {
  return `Rédige un mémoire technique structuré pour répondre à ce marché public.

## Analyse du marché
${JSON.stringify(analyse, null, 2)}

## Données réelles de l'entreprise (SEULE source autorisée)
${JSON.stringify(company, null, 2)}

Structure attendue : présentation de l'entreprise, compréhension du besoin, moyens humains affectés, moyens matériels, références similaires, organisation/qualité/sécurité, planning d'exécution.
Chaque section utilise UNIQUEMENT les données ci-dessus. Section sans donnée suffisante → contenu « ${A_COMPLETER} » et aCompleter=true. N'invente ni chiffre, ni référence, ni qualification.`;
}

export function buildQuestionsPrompt(analyse: AnalyseDCE): string {
  return `À partir de cette analyse de DCE, liste les questions pertinentes à poser à l'acheteur public avant la remise de l'offre (zones d'ombre, informations manquantes, précisions utiles au chiffrage).

${JSON.stringify(analyse, null, 2)}`;
}

export function buildValidationBriefPrompt(version: ProposalVersionInput): string {
  return `Prépare une synthèse de validation pour le dirigeant qui doit approuver ce dossier de réponse avant dépôt. Sois factuel : le dirigeant engage son entreprise sur les prix, délais, moyens et engagements.

## Contenu du dossier
${JSON.stringify(version, null, 2)}

Pour chaque volet (prix, délais, moyens humains, moyens matériels, engagements) : résumé + points d'attention. Liste aussi les risques (pièces manquantes critiques, sections à compléter).`;
}
