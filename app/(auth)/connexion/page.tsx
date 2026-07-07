import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function ConnexionPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-primary">Connexion</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Accédez à votre espace de suivi d&apos;appels d&apos;offres.
      </p>
      <LoginForm />
    </div>
  );
}
