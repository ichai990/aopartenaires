"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { SourceStatus, SourceType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { upsertSource } from "@/actions/admin";
import { SOURCE_STATUS_LABELS, SOURCE_TYPE_LABELS } from "@/lib/constants";

const sourceFormSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis"),
  type: z.enum(Object.values(SourceType) as [SourceType, ...SourceType[]]),
  baseUrl: z
    .string()
    .trim()
    .refine((v) => {
      if (v === "") return true;
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    }, "URL invalide (ex. https://www.boamp.fr)"),
  status: z.enum(Object.values(SourceStatus) as [SourceStatus, ...SourceStatus[]]),
});

type SourceFormValues = z.infer<typeof sourceFormSchema>;

export type SourceDialogSource = {
  id: string;
  nom: string;
  type: SourceType;
  baseUrl: string | null;
  status: SourceStatus;
};

/** Création / édition d'une source de veille (connecteur). */
export function SourceDialog({ source }: { source?: SourceDialogSource }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<SourceFormValues>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: {
      nom: source?.nom ?? "",
      type: source?.type ?? "MANUEL",
      baseUrl: source?.baseUrl ?? "",
      status: source?.status ?? "ACTIVE",
    },
  });

  function onSubmit(values: SourceFormValues) {
    startTransition(async () => {
      const result = await upsertSource(source?.id ?? null, values);
      if (!result.ok) {
        toast.error(result.error ?? "Enregistrement impossible.");
        return;
      }
      toast.success(source ? "Source mise à jour." : "Source créée.");
      setOpen(false);
      router.refresh();
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset({
        nom: source?.nom ?? "",
        type: source?.type ?? "MANUEL",
        baseUrl: source?.baseUrl ?? "",
        status: source?.status ?? "ACTIVE",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {source ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-3.5" />
            Modifier
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" />
            Nouvelle source
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{source ? "Modifier la source" : "Nouvelle source"}</DialogTitle>
          <DialogDescription>
            Une source décrit d&apos;où proviennent les appels d&apos;offres importés.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. BOAMP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {SOURCE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de base (optionnelle)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.boamp.fr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir un statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(SOURCE_STATUS_LABELS) as SourceStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {SOURCE_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {source ? "Enregistrer" : "Créer la source"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
