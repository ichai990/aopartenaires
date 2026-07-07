"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { requestPasswordReset } from "@/actions/auth";
import { forgotPasswordSchema } from "@/lib/validators";

type Values = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (!result.ok) {
        toast.error(result.error ?? "Demande impossible.");
        return;
      }
      setSent(true);
      setDevUrl((result.data as { url?: string | null })?.url ?? null);
    });
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert>
          <MailCheck className="size-4" />
          <AlertTitle>Demande enregistrée</AlertTitle>
          <AlertDescription>
            Si un compte existe avec cet email, un lien de réinitialisation a été
            généré (valable 1 heure).
          </AlertDescription>
        </Alert>
        {devUrl ? (
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <p className="mb-2 font-medium text-primary">
              Mode local (pas d&apos;email configuré) — votre lien :
            </p>
            <p className="mb-2 break-all text-xs text-muted-foreground">{devUrl}</p>
            <CopyButton value={devUrl} label="Copier le lien" />
          </div>
        ) : null}
        <Button asChild variant="outline" className="w-full">
          <Link href="/connexion">Retour à la connexion</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="vous@entreprise.fr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Générer le lien
        </Button>
        <p className="text-center text-sm">
          <Link
            href="/connexion"
            className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Retour à la connexion
          </Link>
        </p>
      </form>
    </Form>
  );
}
