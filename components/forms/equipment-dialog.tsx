"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import type { EquipmentCategory, Disponibilite } from "@prisma/client";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertEquipment } from "@/actions/equipment";
import { equipmentSchema } from "@/lib/validators";
import {
  DISPONIBILITE_LABELS,
  EQUIPMENT_CATEGORY_LABELS,
} from "@/lib/constants";
import type { EquipmentDTO } from "@/lib/dto";

type FormValues = z.input<typeof equipmentSchema>;
type FormOutput = z.output<typeof equipmentSchema>;

/** Création (equipment absent) ou édition (equipment présent) d'un matériel. */
export function EquipmentDialog({ equipment }: { equipment?: EquipmentDTO }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(equipment);

  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      categorie: equipment?.categorie ?? undefined,
      nom: equipment?.nom ?? "",
      description: equipment?.description ?? "",
      quantite: equipment?.quantite ?? 1,
      disponibilite: equipment?.disponibilite ?? "DISPONIBLE",
    },
  });

  function onSubmit(values: FormOutput) {
    startTransition(async () => {
      const result = await upsertEquipment(equipment?.id ?? null, values);
      if (!result.ok) {
        toast.error(result.error ?? "Enregistrement impossible.");
        return;
      }
      // Photo optionnelle téléversée après création/édition du matériel.
      const equipmentId =
        (result.data as { id?: string } | undefined)?.id ?? equipment?.id;
      if (photo && equipmentId) {
        const formData = new FormData();
        formData.set("kind", "equipmentPhoto");
        formData.set("equipmentId", equipmentId);
        formData.set("file", photo);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          toast.error(json?.error ?? "Matériel enregistré, mais échec de la photo.");
        }
      }
      toast.success(isEdit ? "Matériel mis à jour." : "Matériel ajouté.");
      form.reset();
      setPhoto(null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setPhoto(null);
        }
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
            Ajouter un matériel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le matériel" : "Ajouter un matériel"}</DialogTitle>
          <DialogDescription>
            Véhicules, machines, échafaudages… vos moyens matériels sont repris dans les
            dossiers.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="categorie"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select
                      value={(field.value as EquipmentCategory | undefined) ?? ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.keys(EQUIPMENT_CATEGORY_LABELS) as EquipmentCategory[]
                        ).map((c) => (
                          <SelectItem key={c} value={c}>
                            {EQUIPMENT_CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error ? (
                      <p className="text-sm text-destructive">Catégorie requise</p>
                    ) : null}
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
                      <Input placeholder="Ex. Nacelle 12 m" {...field} />
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
                      placeholder="Modèle, caractéristiques…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="quantite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
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
                        {(Object.keys(DISPONIBILITE_LABELS) as Disponibilite[]).map(
                          (d) => (
                            <SelectItem key={d} value={d}>
                              {DISPONIBILITE_LABELS[d]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="equipment-photo">Photo (optionnel)</Label>
              <Input
                id="equipment-photo"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </div>
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
