import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import {
  AnalyseDCESchema,
  MemoireTechniqueSchema,
  ValidationBriefSchema,
  type AnalyseDCE,
  type MemoireTechnique,
  type ValidationBrief,
} from "../schemas";
import type { CompanySnapshot, DceInput, ProposalVersionInput } from "../types";
import { MockAiProvider } from "./mock";
import {
  buildAnalysePrompt,
  buildMemoirePrompt,
  buildQuestionsPrompt,
  buildValidationBriefPrompt,
  QuestionsSchema,
  SYSTEM_PROMPT,
} from "./prompts";

/**
 * Provider Anthropic (Claude) — les fonctions génératives (analyse du DCE,
 * mémoire technique, questions, brief de validation) passent par l'API.
 * Les fonctions de vérification (compatibilité, pièces manquantes, sélection
 * de références) restent déterministes (héritées du mock) : elles croisent
 * des données réelles et ne doivent jamais halluciner.
 *
 * Clé lue exclusivement côté serveur : ANTHROPIC_API_KEY.
 */
export class AnthropicAiProvider extends MockAiProvider {
  // @ts-expect-error — surcharge du littéral "mock"
  readonly name = "anthropic" as const;
  private client: Anthropic;
  private model: string;

  constructor(model?: string | null) {
    super();
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = model || "claude-opus-4-8";
  }

  private async generate<T>(schema: z.ZodType<T>, prompt: string): Promise<T> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(schema) },
    });
    if (response.parsed_output == null) {
      throw new Error("Réponse IA invalide (schéma non respecté)");
    }
    return response.parsed_output;
  }

  override async analyserDCE(input: DceInput): Promise<AnalyseDCE> {
    return this.generate(AnalyseDCESchema, buildAnalysePrompt(input));
  }

  override async genererMemoireTechnique(
    analyse: AnalyseDCE,
    company: CompanySnapshot
  ): Promise<MemoireTechnique> {
    return this.generate(MemoireTechniqueSchema, buildMemoirePrompt(analyse, company));
  }

  override async genererQuestionsAcheteur(analyse: AnalyseDCE): Promise<string[]> {
    const result = await this.generate(QuestionsSchema, buildQuestionsPrompt(analyse));
    return result.questions;
  }

  override async preparerValidationDirigeant(
    version: ProposalVersionInput
  ): Promise<ValidationBrief> {
    return this.generate(ValidationBriefSchema, buildValidationBriefPrompt(version));
  }
}
