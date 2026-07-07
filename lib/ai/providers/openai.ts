import "server-only";
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
 * Provider OpenAI — même découpage que le provider Anthropic :
 * fonctions génératives via l'API, vérifications déterministes héritées.
 * Clé lue exclusivement côté serveur : OPENAI_API_KEY.
 */
export class OpenAiProvider extends MockAiProvider {
  // @ts-expect-error — surcharge du littéral "mock"
  readonly name = "openai" as const;
  private model: string;

  constructor(model?: string | null) {
    super();
    this.model = model || "gpt-4o";
  }

  private async generate<T>(schema: z.ZodType<T>, prompt: string): Promise<T> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\nRéponds UNIQUEMENT avec un objet JSON valide respectant la structure demandée.`,
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI API : ${response.status} ${await response.text()}`);
    }
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(`Réponse OpenAI invalide : ${parsed.error.message}`);
    }
    return parsed.data;
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
