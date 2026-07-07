"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
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
import { CopyButton } from "@/components/copy-button";
import { createCompany } from "@/actions/admin";
import { createCompanySchema } from "@/lib/validators";

type FormInput = z.input<typeof createCompanySchema>;
type FormOutput = z.output<typeof createCompanySchema>;

/**
 * Création d'une entreprise cliente : à la soumission, le lien d'invitation
 * du dirigeant est affiché UNE seule fois dans le dialog.
 * `defaultValues` et `trigger` permettent la pré-saisie depuis un lead du site.
 */
export function CreateCompanyDialog({
  defaultValues,
  trigger,
}: {
  defaultValues?: Partial<FormInput>;
  trigger?: React.ReactNode;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      raisonSociale: "",
      siret: "",
      dirigeantNom: "",
      email: "",
      ...defaultValues,
    },
  });

  function onSubmit(values: FormOutput) {
    startTransition(async () => {
      const result = await createCompany(values);
      if (!result.ok) {
        toast.error(result.error ?? "Création impossible.");
        return;
      }
      const url =
        (result.data as { invitationUrl?: string } | undefined)?.invitationUrl ?? null;
      setInvitationUrl(url);
      toast.success("Entreprise créée.");
      router.refresh();
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setInvitationUrl(null);
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            Nouveau client
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {invitationUrl ? (
          <>
            <DialogHeader>
              <DialogTitle>Entreprise créée</DialogTitle>
              <DialogDescription>
                Voici le lien d&apos;invitation du dirigeant. Il n&apos;est affiché
                qu&apos;une seule fois.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="rounded-lg bg-muted p-3 font-mono text-xs break-all">
                {invitationUrl}
              </p>
              <CopyButton value={invitationUrl} label="Copier le lien" />
              <p className="text-xs text-muted-foreground">
                Transmettez ce lien au dirigeant — il expire dans 7 jours.
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nouveau client</DialogTitle>
              <DialogDescription>
                Créez l&apos;entreprise puis transmettez le lien d&apos;invitation à son
                dirigeant.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <Input
                          inputMode="numeric"
                          maxLength={14}
                          placeholder="14 chiffres"
                          {...field}
                        />
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
                        <Input
                          placeholder="Ex. Jean Dupont"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email du dirigeant</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="dirigeant@entreprise.fr"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Créer et générer l&apos;invitation
                </Button>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
