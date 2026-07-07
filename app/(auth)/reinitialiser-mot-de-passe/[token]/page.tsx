import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Réinitialiser le mot de passe" };

export default async function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div>
      <h1 className="text-xl font-bold text-primary">Nouveau mot de passe</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Choisissez un nouveau mot de passe (10 caractères minimum).
      </p>
      <ResetPasswordForm token={token} />
    </div>
  );
}
