"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/copy-button";
import { createInvitation } from "@/actions/admin";
import { invitationSchema } from "@/lib/validators";
import { ROLE_LABELS } from "@/lib/constants";

type FormInput = z.input<typeof invitationSchema>;
type FormOutput = z.output<typeof invitationSchema>;

/**
 * Création d'une invitation (dirigeant, employé ou admin BTPilot).
 * Le lien retourné n'est affiché qu'UNE seule fois — à copier immédiatement.
 */
export function InviteDialog({
  companies,
  defaultCompanyId,
  triggerLabel = "Nouvelle invitation",
  triggerVariant = "default",
}: {
  companies: { id: string; raisonSociale: string }[];
  defaultCompanyId?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      role: "COMPANY_ADMIN",
      companyId: defaultCompanyId ?? "",
    },
  });

  const role = form.watch("role");

  function onSubmit(values: FormOutput) {
    if (values.role !== "SUPER_ADMIN" && !values.companyId) {
      form.setError("companyId", {
        message: "Une entreprise est requise pour ce rôle.",
      });
      return;
    }
    startTransition(async () => {
      const result = await createInvitation({
        ...values,
        companyId: values.role === "SUPER_ADMIN" ? null : values.companyId,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Invitation impossible.");
        return;
      }
      const url =
        (result.data as { invitationUrl?: string } | undefined)?.invitationUrl ?? null;
      setInvitationUrl(url);
      toast.success("Invitation créée.");
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
        <Button variant={triggerVariant}>
          <UserPlus className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {invitationUrl ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation créée</DialogTitle>
              <DialogDescription>
                Copiez ce lien maintenant : il n&apos;est affiché qu&apos;une seule fois.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="rounded-lg bg-muted p-3 font-mono text-xs break-all">
                {invitationUrl}
              </p>
              <CopyButton value={invitationUrl} label="Copier le lien" />
              <p className="text-xs text-muted-foreground">
                Transmettez ce lien à la personne invitée — il expire dans 7 jours.
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Inviter un utilisateur</DialogTitle>
              <DialogDescription>
                Un lien d&apos;invitation sécurisé sera généré (valable 7 jours).
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="personne@entreprise.fr"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rôle</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choisir un rôle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="COMPANY_ADMIN">
                            {ROLE_LABELS.COMPANY_ADMIN}
                          </SelectItem>
                          <SelectItem value="EMPLOYEE">{ROLE_LABELS.EMPLOYEE}</SelectItem>
                          <SelectItem value="SUPER_ADMIN">
                            {ROLE_LABELS.SUPER_ADMIN}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Entreprise
                        {role === "SUPER_ADMIN" ? " (non requise pour ce rôle)" : ""}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={role === "SUPER_ADMIN"}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choisir une entreprise" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.raisonSociale}
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
                  Générer le lien d&apos;invitation
                </Button>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
