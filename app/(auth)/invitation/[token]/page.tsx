import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { findValidInvitation } from "@/lib/services/invitations";
import { ROLE_LABELS } from "@/lib/constants";
import { AcceptInvitationForm } from "./accept-form";

export const metadata: Metadata = { title: "Invitation" };

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await findValidInvitation(token);

  if (!invitation) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <CircleAlert className="size-4" />
          <AlertTitle>Invitation invalide</AlertTitle>
          <AlertDescription>
            Ce lien d&apos;invitation est invalide, expiré ou déjà utilisé.
            Contactez la personne qui vous a invité.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="w-full">
          <Link href="/connexion">Retour à la connexion</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-primary">Créer votre compte</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Vous êtes invité·e en tant que{" "}
        <strong>{ROLE_LABELS[invitation.role]}</strong>
        {invitation.company ? (
          <>
            {" "}chez <strong>{invitation.company.raisonSociale}</strong>
          </>
        ) : null}{" "}
        ({invitation.email}).
      </p>
      <AcceptInvitationForm token={token} />
    </div>
  );
}
