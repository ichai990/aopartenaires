"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/tag-input";
import { updateCompanyProfile } from "@/actions/company";
import { companyProfileSchema } from "@/lib/validators";
import { DOMAINES, DOMAINE_LABELS, ZONES_IDF } from "@/lib/constants";
import type { CompanyDTO } from "@/lib/dto";

type FormValues = z.input<typeof companyProfileSchema>;
type FormOutput = z.output<typeof companyProfileSchema>;

export function CompanyForm({ company }: { company: CompanyDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      raisonSociale: company.raisonSociale,
      siret: company.siret,
      adresse: company.adresse ?? "",
      codePostal: company.codePostal ?? "",
      ville: company.ville ?? "",
      dirigeantNom: company.dirigeantNom ?? "",
      email: company.email ?? "",
      telephone: company.telephone ?? "",
      domaines: company.domaines,
      zonesGeographiques: company.zonesGeographiques,
      caAnnuel: company.caAnnuel ?? "",
      effectif: company.effectif ?? "",
      capaciteFinanciere: company.capaciteFinanciere ?? "",
      description: company.description ?? "",
      qualifications: company.qualifications,
      certifications: company.certifications,
      assurances: company.assurances.map((a) => ({
        type: a.type ?? "",
        assureur: a.assureur ?? "",
        numeroContrat: a.numeroContrat ?? "",
        echeance: a.echeance ? a.echeance.slice(0, 10) : "",
      })),
    },
  });

  const assurances = useFieldArray({ control: form.control, name: "assurances" });

  function onSubmit(values: FormOutput) {
    startTransition(async () => {
      const result = await updateCompanyProfile(values);
      if (result.ok) {
        toast.success("Profil de l'entreprise enregistré.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Enregistrement impossible.");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Identité ── */}
        <Card>
          <CardHeader>
            <CardTitle>Identité</CardTitle>
            <CardDescription>
              Coordonnées officielles de votre entreprise, reprises dans vos dossiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="raisonSociale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raison sociale</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. Dupont Plomberie SARL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="siret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SIRET</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="14 chiffres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adresse"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codePostal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code postal</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ville"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dirigeantNom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du dirigeant</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telephone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de contact</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Activité ── */}
        <Card>
          <CardHeader>
            <CardTitle>Activité</CardTitle>
            <CardDescription>
              Vos métiers et zones d&apos;intervention servent à repérer les appels
              d&apos;offres qui vous correspondent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="domaines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domaines d&apos;activité</FormLabel>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {DOMAINES.map((domaine) => {
                      const selected = (field.value ?? []).includes(domaine);
                      return (
                        <label
                          key={domaine}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background p-2 text-sm hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              field.onChange(
                                checked
                                  ? [...current, domaine]
                                  : current.filter((d) => d !== domaine)
                              );
                            }}
                          />
                          {DOMAINE_LABELS[domaine]}
                        </label>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="zonesGeographiques"
              render={({ field }) => {
                const value = field.value ?? [];
                const suggestions = ZONES_IDF.filter((z) => !value.includes(z));
                return (
                  <FormItem>
                    <FormLabel>Zones d&apos;intervention (départements)</FormLabel>
                    <FormControl>
                      <TagInput
                        value={value}
                        onChange={field.onChange}
                        placeholder="Ex. 75, 92… puis Entrée"
                      />
                    </FormControl>
                    {suggestions.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Suggestions Île-de-France :
                        </span>
                        {suggestions.map((zone) => (
                          <button
                            key={zone}
                            type="button"
                            className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                            onClick={() => field.onChange([...value, zone])}
                          >
                            + {zone}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Présentation de l&apos;entreprise</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Votre savoir-faire, vos points forts…"
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

        {/* ── Capacités ── */}
        <Card>
          <CardHeader>
            <CardTitle>Capacités</CardTitle>
            <CardDescription>
              Ces chiffres sont demandés dans la plupart des dossiers de candidature.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="caAnnuel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chiffre d&apos;affaires annuel (€ HT)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
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
            <FormField
              control={form.control}
              name="effectif"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effectif</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="1"
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
            <FormField
              control={form.control}
              name="capaciteFinanciere"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacité financière (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
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
          </CardContent>
        </Card>

        {/* ── Qualifications & certifications ── */}
        <Card>
          <CardHeader>
            <CardTitle>Qualifications &amp; certifications</CardTitle>
            <CardDescription>
              Qualibat, RGE, mentions… tout ce qui rassure un acheteur public.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="qualifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualifications</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ex. Qualibat 5112 puis Entrée"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certifications</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ex. RGE, ISO 9001 puis Entrée"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Assurances ── */}
        <Card>
          <CardHeader>
            <CardTitle>Assurances</CardTitle>
            <CardDescription>
              RC professionnelle, décennale… avec leur échéance pour être alerté à temps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assurances.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune assurance renseignée pour le moment.
              </p>
            ) : null}
            {assurances.fields.map((row, index) => (
              <div
                key={row.id}
                className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-start"
              >
                <FormField
                  control={form.control}
                  name={`assurances.${index}.type` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Type (ex. Décennale)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`assurances.${index}.assureur` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Assureur"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`assurances.${index}.numeroContrat` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="N° de contrat"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`assurances.${index}.echeance` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="date"
                          aria-label="Échéance"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Retirer cette assurance"
                  onClick={() => assurances.remove(index)}
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
                assurances.append({
                  type: "",
                  assureur: "",
                  numeroContrat: "",
                  echeance: "",
                })
              }
            >
              <Plus className="size-3.5" />
              Ajouter une assurance
            </Button>
          </CardContent>
        </Card>

        {/* ── Enregistrer (sticky) ── */}
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
