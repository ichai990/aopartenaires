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
import { TagInput } from "@/components/tag-input";
import { updateOwnProfile } from "@/actions/employees";
import { employeeSelfSchema } from "@/lib/validators";
import type { EmployeeDTO } from "@/lib/dto";

type FormValues = z.input<typeof employeeSelfSchema>;
type FormOutput = z.output<typeof employeeSelfSchema>;

/** L'employé complète lui-même son profil : compétences, permis, habilitations, formations. */
export function SelfProfileForm({ employee }: { employee: EmployeeDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(employeeSelfSchema),
    defaultValues: {
      competences: employee.competences,
      permis: employee.permis,
      habilitations: employee.habilitations.map((h) => ({
        type: h.type ?? "",
        obtention: h.obtention ? h.obtention.slice(0, 10) : "",
        echeance: h.echeance ? h.echeance.slice(0, 10) : "",
      })),
      formations: employee.formations.map((f) => ({
        intitule: f.intitule ?? "",
        organisme: f.organisme ?? "",
        annee: f.annee ?? "",
      })),
    },
  });

  const habilitations = useFieldArray({ control: form.control, name: "habilitations" });
  const formations = useFieldArray({ control: form.control, name: "formations" });

  function onSubmit(values: FormOutput) {
    startTransition(async () => {
      const result = await updateOwnProfile(values);
      if (result.ok) {
        toast.success("Profil mis à jour.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Enregistrement impossible.");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Compétences & permis ── */}
        <Card>
          <CardHeader>
            <CardTitle>Compétences &amp; permis</CardTitle>
            <CardDescription>
              Ces éléments alimentent votre CV court joint aux dossiers d&apos;appel
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
            Enregistrer mon profil
          </Button>
        </div>
      </form>
    </Form>
  );
}
