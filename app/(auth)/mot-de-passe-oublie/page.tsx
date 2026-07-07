import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOubliePage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-primary">Mot de passe oublié</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Indiquez votre email : nous générons un lien de réinitialisation.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
