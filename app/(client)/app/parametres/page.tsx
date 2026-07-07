import { requireUser } from "@/lib/auth/guards";
import { ROLE_LABELS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "@/components/forms/change-password-form";

export const metadata = { title: "Paramètres" };

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default async function ParametresPage() {
  const user = await requireUser();

  return (
    <div>
      <PageHeader
        title="Paramètres"
        description="Votre compte et la sécurité de votre accès."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Mon compte</CardTitle>
            <CardDescription>Informations liées à votre connexion.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <InfoRow label="Nom">
                {user.firstName} {user.lastName}
              </InfoRow>
              <InfoRow label="Email">{user.email}</InfoRow>
              <InfoRow label="Rôle">{ROLE_LABELS[user.role]}</InfoRow>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Changer mon mot de passe</CardTitle>
            <CardDescription>10 caractères minimum.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
