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
import { TagInput } from "@/components/tag-input";
import { upsertEmployee } from "@/actions/employees";
import { employeeSchema } from "@/lib/validators";
import { DISPONIBILITE_LABELS } from "@/lib/constants";
import type { EmployeeDTO } from "@/lib/dto";
import type { Disponibilite } from "@prisma/client";

type FormValues = z.input<typeof employeeSchema>;
type FormOutput = z.output<typeof employeeSchema>;

/** Fiche salarié : création (employee absent) ou édition (employee présent). */
export function EmployeeForm({ employee }: { employee?: EmployeeDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(employee);

  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      nom: employee?.nom ?? "",
      prenom: employee?.prenom ?? "",
      poste: employee?.poste ?? "",
      experienceAnnees: employee?.experienceAnnees ?? "",
      competences: employee?.competences ?? [],
      habilitations: (employee?.habilitations ?? []).map((h) => ({
        type: h.type ?? "",
        obtention: h.obtention ? h.obtention.slice(0, 10) : "",
        echeance: h.echeance ? h.echeance.slice(0, 10) : "",
      })),
      formations: (employee?.formations ?? []).map((f) => ({
        intitule: f.intitule ?? "",
        organisme: f.organisme ?? "",
        annee: f.annee ?? "",
      })),
      permis: employee?.permis ?? [],
      roleChantier: employee?.roleChantier ?? "",
      disponibilite: employee?.disponibilite ?? "DISPONIBLE",
    },
  });

  const habilitations = useFieldArray({ control: form.control, name: "habilitations" });
  const formations = useFieldArray({ control: form.control, name: "formations" });

  function onSubmit(values: FormOutput) {
    startTransition(async () => {
      const result = await upsertEmployee(employee?.id ?? null, values);
      if (result.ok) {
        toast.success(isEdit ? "Fiche salarié mise à jour." : "Salarié ajouté à l'équipe.");
        if (isEdit) {
          router.refresh();
        } else {
          router.push("/app/equipe");
          router.refresh();
        }
      } else {
        toast.error(result.error ?? "Enregistrement impossible.");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Informations ── */}
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
            <CardDescription>
              Identité, poste et disponibilité du salarié pour les chantiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="prenom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="poste"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poste</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. Chef d'équipe plombier" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="experienceAnnees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Années d&apos;expérience</FormLabel>
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
              name="roleChantier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle sur chantier</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex. Conducteur de travaux"
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
              name="disponibilite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disponibilité</FormLabel>
                  <Select
                    value={(field.value as Disponibilite | undefined) ?? "DISPONIBLE"}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        Object.keys(DISPONIBILITE_LABELS) as Disponibilite[]
                      ).map((d) => (
                        <SelectItem key={d} value={d}>
                          {DISPONIBILITE_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Compétences & permis ── */}
        <Card>
          <CardHeader>
            <CardTitle>Compétences &amp; permis</CardTitle>
            <CardDescription>
              Ces éléments alimentent le CV court joint aux dossiers d&apos;appel
              d&apos;offres.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="competences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compétences</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ex. Soudure cuivre puis Entrée"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="permis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permis</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ex. B, C1E puis Entrée"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Habilitations ── */}
        <Card>
          <CardHeader>
            <CardTitle>Habilitations</CardTitle>
            <CardDescription>
              CACES, habilitations électriques, amiante… avec leurs échéances.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {habilitations.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune habilitation renseignée pour le moment.
              </p>
            ) : null}
            {habilitations.fields.map((row, index) => (
              <div
                key={row.id}
                className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-start"
              >
                <FormField
                  control={form.control}
                  name={`habilitations.${index}.type` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Type (ex. CACES R486)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`habilitations.${index}.obtention` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="date"
                          aria-label="Date d'obtention"
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
                  name={`habilitations.${index}.echeance` as const}
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
                  aria-label="Retirer cette habilitation"
                  onClick={() => habilitations.remove(index)}
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
                habilitations.append({ type: "", obtention: "", echeance: "" })
              }
            >
              <Plus className="size-3.5" />
              Ajouter une habilitation
            </Button>
          </CardContent>
        </Card>

        {/* ── Formations ── */}
        <Card>
          <CardHeader>
            <CardTitle>Formations</CardTitle>
            <CardDescription>Formations suivies, avec organisme et année.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {formations.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune formation renseignée pour le moment.
              </p>
            ) : null}
            {formations.fields.map((row, index) => (
              <div
                key={row.id}
                className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-start"
              >
                <FormField
                  control={form.control}
                  name={`formations.${index}.intitule` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Intitulé" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`formations.${index}.organisme` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Organisme"
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
                  name={`formations.${index}.annee` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          min={1950}
                          step="1"
                          className="sm:w-28"
                          aria-label="Année"
                          placeholder="Année"
                          {...field}
                          value={(field.value as number | string | null) ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? undefined : e.target.value
                            )
                          }
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
                  aria-label="Retirer cette formation"
                  onClick={() => formations.remove(index)}
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
                formations.append({ intitule: "", organisme: "", annee: "" })
              }
            >
              <Plus className="size-3.5" />
              Ajouter une formation
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? "Enregistrer la fiche" : "Ajouter le salarié"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
