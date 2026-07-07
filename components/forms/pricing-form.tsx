"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Domaine } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
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
import { Textarea } from "@/components/ui/textarea";
import { updatePricing } from "@/actions/pricing";
import { pricingSchema } from "@/lib/validators";
import { DOMAINES, DOMAINE_LABELS } from "@/lib/constants";
import type { PricingDTO } from "@/lib/dto";

type FormValues = z.input<typeof pricingSchema>;
type FormOutput = z.output<typeof pricingSchema>;

const TOUS_DOMAINES = "__tous__";

/** Prix types de l'entreprise — aide au chiffrage, jamais un engagement. */
export function PricingForm({ pricing }: { pricing: PricingDTO | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      tauxHoraireMoyen: pricing?.tauxHoraireMoyen ?? "",
      coutDeplacementKm: pricing?.coutDeplacementKm ?? "",
      prixJourneeEquipe: pricing?.prixJourneeEquipe ?? "",
      margeCiblePct: pricing?.margeCiblePct ?? "",
      fraisGenerauxPct: pricing?.fraisGenerauxPct ?? "",
      notes: pricing?.notes ?? "",
      items: (pricing?.items ?? []).map((item) => ({
        libelle: item.libelle,
        unite: item.unite,
        prixUnitaireHT: item.prixUnitaireHT,
        domaine: item.domaine,
      })),
    },
  });

  const items = useFieldArray({ control: form.control, name: "items" });

  function onSubmit(values: FormOutput) {
    startTransition(async () => {
      const result = await updatePricing(values);
      if (result.ok) {
        toast.success("Prix types enregistrés.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Enregistrement impossible.");
      }
    });
  }

  function numberField(
    name: "tauxHoraireMoyen" | "coutDeplacementKm" | "prixJourneeEquipe" | "margeCiblePct" | "fraisGenerauxPct",
    label: string,
    placeholder?: string
  ) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder={placeholder}
                {...field}
                value={(field.value as number | string | null) ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? null : e.target.value)
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Taux de base ── */}
        <Card>
          <CardHeader>
            <CardTitle>Taux de base</CardTitle>
            <CardDescription>
              Vos coûts de référence pour pré-chiffrer rapidement une offre.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {numberField("tauxHoraireMoyen", "Taux horaire moyen (€ HT/h)", "Ex. 45")}
            {numberField("coutDeplacementKm", "Coût de déplacement (€/km)", "Ex. 0,60")}
            {numberField("prixJourneeEquipe", "Prix journée équipe (€ HT)", "Ex. 950")}
          </CardContent>
        </Card>

        {/* ── Marges ── */}
        <Card>
          <CardHeader>
            <CardTitle>Marges</CardTitle>
            <CardDescription>
              Marge cible et frais généraux appliqués lors du chiffrage.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {numberField("margeCiblePct", "Marge cible (%)", "Ex. 15")}
            {numberField("fraisGenerauxPct", "Frais généraux (%)", "Ex. 12")}
          </CardContent>
        </Card>

        {/* ── Prix unitaires fréquents ── */}
        <Card>
          <CardHeader>
            <CardTitle>Prix unitaires fréquents</CardTitle>
            <CardDescription>
              Bordereau de prix maison : prestations récurrentes avec leur unité.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun prix unitaire renseigné pour le moment.
              </p>
            ) : (
              <div className="hidden gap-2 px-3 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_8rem_8rem_11rem_auto]">
                <span>Libellé</span>
                <span>Unité</span>
                <span>Prix HT (€)</span>
                <span>Domaine</span>
                <span className="w-8" />
              </div>
            )}
            {items.fields.map((row, index) => (
              <div
                key={row.id}
                className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_8rem_8rem_11rem_auto] sm:items-start"
              >
                <FormField
                  control={form.control}
                  name={`items.${index}.libelle` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Ex. Pose radiateur acier" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.unite` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Ex. u, m², ml" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.prixUnitaireHT` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          aria-label="Prix unitaire HT"
                          {...field}
                          value={(field.value as number | string | null) ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.domaine` as const}
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        value={(field.value as Domaine | null | undefined) ?? TOUS_DOMAINES}
                        onValueChange={(v) =>
                          field.onChange(v === TOUS_DOMAINES ? null : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger
                            className="w-full"
                            aria-label="Domaine (optionnel)"
                          >
                            <SelectValue placeholder="Tous domaines" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={TOUS_DOMAINES}>Tous domaines</SelectItem>
                          {DOMAINES.map((d) => (
                            <SelectItem key={d} value={d}>
                              {DOMAINE_LABELS[d]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Retirer ce prix unitaire"
                  onClick={() => items.remove(index)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                items.append({
                  libelle: "",
                  unite: "",
                  prixUnitaireHT: "",
                  domaine: null,
                })
              }
            >
              <Plus className="size-3.5" />
              Ajouter un prix unitaire
            </Button>
          </CardContent>
        </Card>

        {/* ── Notes internes ── */}
        <Card>
          <CardHeader>
            <CardTitle>Notes internes</CardTitle>
            <CardDescription>
              Conditions particulières, remises habituelles… visibles uniquement par vous.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Ex. +10 % sur interventions en site occupé…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-1 flex justify-end border-t bg-background/85 px-1 py-3 backdrop-blur">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </div>
      </form>
    </Form>
  );
}
