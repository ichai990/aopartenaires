"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
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
import { documentMetaSchema } from "@/lib/validators";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from "@/lib/constants";

type FormValues = z.input<typeof documentMetaSchema>;
type FormOutput = z.output<typeof documentMetaSchema>;

const AUCUN_SALARIE = "__aucun__";

/**
 * Téléversement d'un document administratif via /api/upload (kind=document).
 * Pour un employé, le champ « salarié lié » est masqué : le serveur rattache
 * automatiquement le document à sa propre fiche.
 */
export function DocumentUploadDialog({
  employees = [],
  hideEmployeeField = false,
}: {
  employees?: { id: string; nom: string; prenom: string }[];
  hideEmployeeField?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(documentMetaSchema),
    defaultValues: {
      type: undefined,
      label: "",
      dateEmission: "",
      dateExpiration: "",
      employeeId: null,
    },
  });

  function onSubmit(values: FormOutput) {
    if (!file) {
      toast.error("Sélectionnez un fichier à téléverser.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("kind", "document");
      formData.set("file", file);
      formData.set("type", values.type);
      formData.set("label", values.label);
      if (values.dateEmission) formData.set("dateEmission", values.dateEmission);
      if (values.dateExpiration) formData.set("dateExpiration", values.dateExpiration);
      if (values.employeeId) formData.set("employeeId", values.employeeId);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(json?.error ?? "Échec du téléversement.");
        return;
      }
      toast.success("Document téléversé.");
      form.reset();
      setFile(null);
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
          setFile(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" />
          Téléverser un document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Téléverser un document</DialogTitle>
          <DialogDescription>
            Ajoutez une pièce administrative (PDF, image, ZIP ou Word, 25 Mo max).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Type de document</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {DOCUMENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error ? (
                    <p className="text-sm text-destructive">Type de document requis</p>
                  ) : null}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex. Attestation URSSAF T2 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dateEmission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d&apos;émission</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateExpiration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d&apos;expiration</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {!hideEmployeeField ? (
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salarié lié (optionnel)</FormLabel>
                    <Select
                      value={field.value ?? AUCUN_SALARIE}
                      onValueChange={(v) =>
                        field.onChange(v === AUCUN_SALARIE ? null : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Aucun" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={AUCUN_SALARIE}>Aucun</SelectItem>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.prenom} {e.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="document-file">Fichier</Label>
              <Input
                id="document-file"
                type="file"
                accept=".pdf,.jpg,.png,.zip,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
                Téléverser
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
