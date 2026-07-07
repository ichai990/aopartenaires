import type { Metadata } from "next";
import { UserX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";

export const metadata: Metadata = { title: "Compte désactivé" };

/**
 * Page d'atterrissage des comptes désactivés (voir requireUser).
 * Publique et hors de la liste AUTH_PAGES du middleware pour éviter
 * toute boucle de redirection avec une session encore présente.
 */
export default function CompteDesactivePage() {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <UserX className="size-4" />
        <AlertTitle>Compte désactivé</AlertTitle>
        <AlertDescription>
          Votre compte a été désactivé. Contactez votre interlocuteur BTPilot
          si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
        </AlertDescription>
      </Alert>
      <form action={logoutAction}>
        <Button type="submit" variant="outline" className="w-full">
          Se déconnecter
        </Button>
      </form>
    </div>
  );
}
