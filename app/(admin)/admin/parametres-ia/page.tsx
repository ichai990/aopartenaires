import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { AiSettingsForm } from "@/components/admin/manage/ai-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Paramètres IA — Admin BTPilot" };

export default async function AdminParametresIaPage() {
  await requireSuperAdmin();

  const settings = await prisma.aiSettings.findUnique({ where: { id: "default" } });

  // Présence des clés vérifiée côté serveur — les valeurs ne quittent JAMAIS le serveur.
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenaiKey = !!process.env.OPENAI_API_KEY;

  return (
    <div>
      <PageHeader
        title="Paramètres IA"
        description="Fournisseur utilisé pour l'analyse des DCE et la génération des dossiers."
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Ces réglages s&apos;appliquent aux prochaines analyses lancées depuis
              l&apos;espace admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AiSettingsForm
              initial={{
                provider: settings?.provider ?? "MOCK",
                model: settings?.model ?? null,
                temperature: settings?.temperature ?? 0.2,
              }}
              hasAnthropicKey={hasAnthropicKey}
              hasOpenaiKey={hasOpenaiKey}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comment ça marche ?</CardTitle>
            <CardDescription>Deux modes de fonctionnement, sans surprise.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-primary">Simulation (mock)</p>
              <p className="mt-1">
                L&apos;analyse repose sur des règles déterministes appliquées au dossier :
                aucune clé API n&apos;est requise. Idéal pour la démonstration et les
                environnements de test.
              </p>
            </div>
            <div>
              <p className="font-semibold text-primary">Fournisseur réel (Anthropic / OpenAI)</p>
              <p className="mt-1">
                Renseignez la clé correspondante dans le fichier{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env</code>{" "}
                du serveur (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">ANTHROPIC_API_KEY</code>{" "}
                ou{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">OPENAI_API_KEY</code>
                ), puis sélectionnez le fournisseur ci-contre. Les clés ne sont jamais
                stockées en base ni affichées dans l&apos;interface.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
