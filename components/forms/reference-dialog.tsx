"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Domaine } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { upsertReference } from "@/actions/references";
import { referenceSchema } from "@/lib/validators";
import { DOMAINES, DOMAINE_LABELS } from "@/lib/constants";
import type { ReferenceDTO } from "@/lib/dto";

type FormValues = z.input<typeof referenceSchema>;
type FormOutput = z.output<typeof referenceSchema>;

/** Création (reference absente) ou édition (reference présente) d'une référence chantier. */
export function ReferenceDialog({ reference }: { reference?: ReferenceDTO }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(reference);

  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(referenceSchema),
    defaultValues: {
      nomChantier: reference?.nomChantier ?? "",
      client: reference?.client ?? "",
      prestation: reference?.prestation ?? "",
      domaine: reference?.domaine ?? undefined,
      montantHT: reference?.montantHT ?? "",
      annee: reference?.annee ?? new Date().getFullYear(),
      dureeMois: reference?.dureeMois ?? "",
      description: reference?.description ?? "",
      contactAutorise: reference?.contactAutorise ?? false,
      contactNom: reference?.contactNom ?? "",
      contactTelephone: reference?.contactTelephone ?? "",
      contactEmail: reference?.contactEmail ?? "",
    },
  });

  const contactAutorise = form.watch("contactAutorise");

  function onSubmit(values: FormOutput) {
    startTransition(async () => {
      const result = await upsertReference(reference?.id ?? null, values);
      if (result.ok) {
        toast.success(isEdit ? "Référence mise à jour." : "Référence ajoutée.");
        form.reset();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Enregistrement impossible.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-3.5" />
            Modifier
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" />
            Ajouter une référence
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la référence" : "Ajouter une référence"}
          </DialogTitle>
          <DialogDescription>
            Vos chantiers passés servent de références similaires dans les mémoires
            techniques.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nomChantier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du chantier</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. Rénovation groupe scolaire" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. Ville de Montreuil" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prestation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prestation</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. Remplacement CTA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domaine"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Domaine</FormLabel>
                    <Select
                      value={(field.value as Domaine | undefined) ?? ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DOMAINES.map((d) => (
                          <SelectItem key={d} value={d}>
                            {DOMAINE_LABELS[d]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error ? (
                      <p className="text-sm text-destructive">Domaine requis</p>
                    ) : null}
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="montantHT"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant HT (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
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
                name="annee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Année</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1990}
                        max={new Date().getFullYear()}
                        step="1"
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
                name="dureeMois"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée (mois)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
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
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Contexte, travaux réalisés, points forts…"
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
              name="contactAutorise"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 rounded-lg border p-3">
                  <FormControl>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel>Contact référent autorisé</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      L&apos;acheteur peut contacter ce client pour vérifier la référence.
                    </p>
                  </div>
                </FormItem>
              )}
            />
            {contactAutorise ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="contactNom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du contact</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactTelephone"
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
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {isEdit ? "Enregistrer" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
