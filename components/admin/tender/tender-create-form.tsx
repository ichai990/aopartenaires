"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { tenderCreateSchema, type TenderCreateInput } from "@/lib/validators";
import { DOMAINE_LABELS, DOMAINES } from "@/lib/constants";
import { createTender } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TenderCreateFormValues = z.input<typeof tenderCreateSchema>;

const NO_DOMAINE = "__AUCUN__";

export function TenderCreateForm({
  companies,
}: {
  companies: { id: string; raisonSociale: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<TenderCreateFormValues, unknown, TenderCreateInput>({
    resolver: zodResolver(tenderCreateSchema),
    defaultValues: {
      companyId: "",
      objet: "",
      reference: "",
      acheteur: "",
      url: "",
      domaine: null,
      lieu: "",
      montantEstimeHT: "",
      dateLimite: "",
      visiteObligatoire: false,
    },
  });

  function onSubmit(values: TenderCreateInput) {
    startTransition(async () => {
      const result = await createTender(values);
      if (!result.ok) {
        toast.error(result.error ?? "Impossible de créer l'appel d'offres.");
        return;
      }
      toast.success("Appel d'offres importé.");
      const tenderId = (result.data as { tenderId?: string })?.tenderId;
      router.push(`/admin/appels-offres/${tenderId}`);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entreprise cliente</FormLabel>
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir une entreprise" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.raisonSociale}
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
          name="objet"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objet du marché</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex. Rénovation de la plomberie du groupe scolaire Jules Ferry"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Référence de consultation</FormLabel>
                <FormControl>
                  <Input placeholder="Ex. 2026-DCE-042" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="acheteur"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Acheteur</FormLabel>
                <FormControl>
                  <Input placeholder="Ex. Ville de Montreuil" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lien de la consultation</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://www.marches-publics.gouv.fr/..."
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="domaine"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domaine</FormLabel>
                <Select
                  value={field.value ?? NO_DOMAINE}
                  onValueChange={(v) => field.onChange(v === NO_DOMAINE ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="À déterminer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_DOMAINE}>À déterminer</SelectItem>
                    {DOMAINES.map((domaine) => (
                      <SelectItem key={domaine} value={domaine}>
                        {DOMAINE_LABELS[domaine]}
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
            name="lieu"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lieu d&apos;exécution</FormLabel>
                <FormControl>
                  <Input placeholder="Ex. Montreuil (93)" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="montantEstimeHT"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant estimé HT (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex. 250000"
                    {...field}
                    value={(field.value as string | number | null | undefined) ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateLimite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date limite de remise</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="visiteObligatoire"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel>Visite de site obligatoire</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Le règlement de consultation impose une visite avant remise de l&apos;offre.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Importer l&apos;appel d&apos;offres
        </Button>
      </form>
    </Form>
  );
}
