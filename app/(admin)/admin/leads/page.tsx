import type { Metadata } from "next";
import { CircleAlert, Inbox, UserPlus } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { fetchSiteLeads } from "@/lib/services/leads";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateCompanyDialog } from "@/components/admin/manage/create-company-dialog";

export const metadata: Metadata = { title: "Leads du site" };

export default async function LeadsPage() {
  await requireSuperAdmin();

  const [feed, companies] = await Promise.all([
    fetchSiteLeads(),
    prisma.company.findMany({ select: { email: true, raisonSociale: true } }),
  ]);
  const emailsClients = new Map(
    companies
      .filter((c) => c.email)
      .map((c) => [c.email!.toLowerCase(), c.raisonSociale])
  );

  return (
    <div>
      <PageHeader
        title="Leads du site"
        description="Les contacts du formulaire AO Partenaires (Google Sheet), prêts à être convertis en clients BTPilot."
      />

      {!feed.configured ? (
        <EmptyState
          icon={Inbox}
          title="Flux non configuré"
          description="Renseignez LEADS_FEED_URL et LEADS_FEED_TOKEN dans le fichier .env (voir google-apps-script.gs du site vitrine), puis redémarrez le serveur."
        />
      ) : feed.error === "SCRIPT_NOT_UPDATED" ? (
        <Alert className="border-warning/40 bg-warning/10">
          <CircleAlert className="text-warning" />
          <AlertTitle>Le script Google doit être mis à jour (2 minutes)</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                Ouvrez le Google Sheet « AO partenaires (formulaire) » → menu
                Extensions → Apps Script.
              </li>
              <li>
                Remplacez tout le code par le fichier{" "}
                <span className="font-mono">google-apps-script.gs</span> du dépôt du
                site vitrine, puis enregistrez.
              </li>
              <li>
                Déployer → Gérer les déploiements → ✏️ → Version : « Nouvelle
                version » → Déployer. L&apos;URL ne change pas.
              </li>
              <li>Rechargez cette page : les leads apparaîtront.</li>
            </ol>
          </AlertDescription>
        </Alert>
      ) : feed.error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Flux injoignable</AlertTitle>
          <AlertDescription>{feed.error}</AlertDescription>
        </Alert>
      ) : feed.leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aucun lead pour le moment"
          description="Les contacts envoyés depuis le formulaire du site apparaîtront ici."
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reçu le</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Métier</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feed.leads.map((lead, i) => {
                  const clientExistant = lead.email
                    ? emailsClients.get(lead.email.toLowerCase())
                    : undefined;
                  return (
                    <TableRow key={`${lead.email}-${lead.date}-${i}`}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(lead.date || null)}
                      </TableCell>
                      <TableCell className="font-medium">{lead.nom || "—"}</TableCell>
                      <TableCell>{lead.entreprise || "—"}</TableCell>
                      <TableCell>{lead.metier || "—"}</TableCell>
                      <TableCell>{lead.zone || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {lead.tel || "—"}
                      </TableCell>
                      <TableCell>{lead.email || "—"}</TableCell>
                      <TableCell>
                        {clientExistant ? (
                          <Badge variant="secondary">Déjà client · {clientExistant}</Badge>
                        ) : (
                          <Badge className="bg-success/15 text-success">Nouveau</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!clientExistant ? (
                          <CreateCompanyDialog
                            defaultValues={{
                              raisonSociale: lead.entreprise,
                              dirigeantNom: lead.nom,
                              email: lead.email,
                            }}
                            trigger={
                              <Button size="sm" variant="outline">
                                <UserPlus className="size-4" />
                                Convertir en client
                              </Button>
                            }
                          />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
