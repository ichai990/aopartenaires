"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import type { AiProviderKind } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAiSettings } from "@/actions/admin";

const PROVIDER_LABELS: Record<AiProviderKind, string> = {
  MOCK: "Simulation (aucune clé requise)",
  ANTHROPIC: "Claude (Anthropic)",
  OPENAI: "OpenAI",
};

const MODEL_PLACEHOLDERS: Record<AiProviderKind, string> = {
  MOCK: "—",
  ANTHROPIC: "claude-opus-4-8",
  OPENAI: "gpt-4o",
};

const aiFormSchema = z.object({
  provider: z.enum(["MOCK", "ANTHROPIC", "OPENAI"]),
  model: z.string().trim(),
  temperature: z
    .string()
    .refine((v) => {
      const n = Number(v.replace(",", "."));
      return v.trim() !== "" && !Number.isNaN(n) && n >= 0 && n <= 1;
    }, "Température entre 0 et 1"),
});

type AiFormValues = z.infer<typeof aiFormSchema>;

function KeyBadge({ configured, label }: { configured: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        configured ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          configured ? "bg-success" : "bg-destructive"
        )}
      />
      {label} : {configured ? "clé configurée" : "clé manquante"}
    </span>
  );
}

/** Formulaire des paramètres IA (provider, modèle, température). */
export function AiSettingsForm({
  initial,
  hasAnthropicKey,
  hasOpenaiKey,
}: {
  initial: { provider: AiProviderKind; model: string | null; temperature: number };
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<AiFormValues>({
    resolver: zodResolver(aiFormSchema),
    defaultValues: {
      provider: initial.provider,
      model: initial.model ?? "",
      temperature: String(initial.temperature),
    },
  });

  const provider = form.watch("provider");

  function onSubmit(values: AiFormValues) {
    startTransition(async () => {
      const result = await updateAiSettings({
        provider: values.provider,
        model: values.model.trim() || null,
        temperature: Number(values.temperature.replace(",", ".")),
      });
      if (!result.ok) {
        toast.error(result.error ?? "Enregistrement impossible.");
        return;
      }
      toast.success("Paramètres IA enregistrés.");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fournisseur d&apos;analyse</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un fournisseur" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(PROVIDER_LABELS) as AiProviderKind[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PROVIDER_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 pt-1">
                {provider === "ANTHROPIC" ? (
                  <KeyBadge configured={hasAnthropicKey} label="Anthropic" />
                ) : null}
                {provider === "OPENAI" ? (
                  <KeyBadge configured={hasOpenaiKey} label="OpenAI" />
                ) : null}
                {provider === "MOCK" ? (
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                    Aucune clé requise
                  </span>
                ) : null}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modèle (optionnel)</FormLabel>
              <FormControl>
                <Input placeholder={MODEL_PLACEHOLDERS[provider]} {...field} />
              </FormControl>
              <FormDescription>
                Laisser vide pour utiliser le modèle par défaut du fournisseur.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="temperature"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Température</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  className="max-w-32"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Entre 0 (déterministe) et 1 (créatif). Recommandé : 0,2.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Enregistrer
        </Button>
      </form>
    </Form>
  );
}
