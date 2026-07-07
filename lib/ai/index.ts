import "server-only";
import { prisma } from "@/lib/prisma";
import type { AiProvider } from "./types";
import { MockAiProvider } from "./providers/mock";
import { AnthropicAiProvider } from "./providers/anthropic";
import { OpenAiProvider } from "./providers/openai";

/**
 * Sélection du provider IA : réglage en base (page admin « Paramètres IA »),
 * sinon variable d'environnement AI_PROVIDER, sinon mock.
 * Si le provider demandé n'a pas de clé API configurée, retombe sur le mock
 * plutôt que d'échouer — l'application reste utilisable.
 */
export async function getAiProvider(): Promise<AiProvider> {
  let provider = (process.env.AI_PROVIDER ?? "mock").toUpperCase();
  let model: string | null = null;

  try {
    const settings = await prisma.aiSettings.findUnique({ where: { id: "default" } });
    if (settings) {
      provider = settings.provider;
      model = settings.model;
    }
  } catch {
    /* table absente pendant les migrations — fallback env */
  }

  if (provider === "ANTHROPIC") {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("[IA] ANTHROPIC_API_KEY absente — utilisation du provider mock.");
      return new MockAiProvider();
    }
    return new AnthropicAiProvider(model);
  }

  if (provider === "OPENAI") {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("[IA] OPENAI_API_KEY absente — utilisation du provider mock.");
      return new MockAiProvider();
    }
    return new OpenAiProvider(model);
  }

  return new MockAiProvider();
}
