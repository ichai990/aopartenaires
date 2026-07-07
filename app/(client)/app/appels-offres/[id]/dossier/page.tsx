import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarRange,
  FileDown,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/auth/guards";
import { toProposalVersionDTO } from "@/lib/dto";
import { formatDateTime, formatEuros } from "@/lib/format";
import type { MemoireTechnique, SelectedReference } from "@/lib/ai/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChecklistView, type ChecklistItemData } from "@/components/checklist-view";
import { CompatibilityGauge } from "@/components/compatibility-gauge";
import { PageHeader } from "@/components/page-header";
import { TenderStatusBadge } from "@/components/status-badge";

export const metadata = { title: "Dossier généré" };

type MoyenHumain = {
  employeeId: string;
  nom: string;
  poste: string;
  roleChantier: string | null;
};
type MoyenMateriel = { equipmentId: string; nom: string; quantite: number };
type PlanningData = {
  etapes?: { libelle: string; detail?: string | null }[];
  note?: string;
} | null;

function ExportButton({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>
          <Button variant="outline" disabled>
            <FileDown data-icon="inline-start" />
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Bientôt disponible</TooltipContent>
    </Tooltip>
  );
}

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, companyId } = await requireCompany();
  const { id } = await params;

  const tender = await prisma.tender.findFirst({
    where: { id, companyId },
    include: { proposal: { include: { currentVersion: true } } },
  });
  if (!tender?.proposal?.currentVersion) notFound();

  const version = toProposalVersionDTO(tender.proposal.currentVersion);

  const memoire = version.memoireTechnique as MemoireTechnique;
  const checklistAdministrative =
    version.checklistAdministrative as ChecklistItemData[];
  const checklistTechnique = version.checklistTechnique as ChecklistItemData[];
  const checklistFinanciere = version.checklistFinanciere as ChecklistItemData[];
  const referencesSelectionnees =
    version.referencesSelectionnees as SelectedReference[];
  const moyensHumains = version.moyensHumains as MoyenHumain[];
  const moyensMateriels = version.moyensMateriels as MoyenMateriel[];
  const planning = version.planning as PlanningData;
  const questionsAcheteur = version.questionsAcheteur as string[];

  // Croisement des références sélectionnées avec les fiches réelles (scopées entreprise).
  const references = await prisma.reference.findMany({
    where: {
      companyId,
      id: { in: referencesSelectionnees.map((r) => r.referenceId) },
    },
  });
  const referencesById = new Map(references.map((r) => [r.id, r]));

  const canValidate =
    tender.status === "EN_ATTENTE_DIRIGEANT" && user.role === "COMPANY_ADMIN";

  return (
    <TooltipProvider>
      <div>
        <PageHeader
          title="Dossier généré"
          description={tender.objet}
        >
          <Button asChild variant="ghost">
            <Link href={`/app/appels-offres/${tender.id}`}>
              <ArrowLeft data-icon="inline-start" />
              Retour à l&apos;appel d&apos;offres
            </Link>
          </Button>
          <ExportButton label="Exporter PDF" />
          <ExportButton label="Exporter DOCX" />
        </PageHeader>

        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Version n° {version.versionNumber}</Badge>
              <span className="text-sm text-muted-foreground">
                Générée le {formatDateTime(version.createdAt)}
              </span>
              <TenderStatusBadge status={tender.status} />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Prix proposé HT</p>
                <p className="font-heading text-2xl font-bold text-success">
                  {formatEuros(version.prixProposeHT)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Délai proposé</p>
                <p className="font-heading text-2xl font-bold text-primary">
                  {version.delaiProposeJours !== null
                    ? `${version.delaiProposeJours} jours`
                    : "—"}
                </p>
              </div>
            </div>
            <p className="w-full text-xs text-muted-foreground">
              Le prix final est validé par le dirigeant avant tout dépôt.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="memoire">
          <div className="max-w-full overflow-x-auto">
            <TabsList>
              <TabsTrigger value="memoire">Mémoire technique</TabsTrigger>
              <TabsTrigger value="checklists">Checklists</TabsTrigger>
              <TabsTrigger value="references">Références</TabsTrigger>
              <TabsTrigger value="moyens">Moyens</TabsTrigger>
              <TabsTrigger value="planning">Planning &amp; questions</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="memoire" className="space-y-4">
            <h2 className="text-lg font-semibold text-primary">{memoire.titre}</h2>
            {memoire.sections.map((section, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-primary">
                    {section.titre}
                    {section.aCompleter ? (
                      <Badge className="bg-warning/15 text-warning">
                        à compléter
                      </Badge>
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line text-foreground">
                    {section.contenu}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="checklists">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-primary">Administrative</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChecklistView items={checklistAdministrative} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-primary">Technique</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChecklistView items={checklistTechnique} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-primary">Financière</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChecklistView items={checklistFinanciere} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="references" className="space-y-4">
            {referencesSelectionnees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune référence sélectionnée pour ce dossier.
              </p>
            ) : (
              referencesSelectionnees.map((sel) => {
                const ref = referencesById.get(sel.referenceId);
                return (
                  <Card key={sel.referenceId}>
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-primary">
                        <span>
                          {ref ? ref.nomChantier : "Référence supprimée"}
                          {ref ? (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                              {ref.client} · {ref.annee}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex items-center gap-2 text-sm font-normal">
                          <span className="text-muted-foreground">Similarité</span>
                          <CompatibilityGauge score={sel.similarite} compact />
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {ref?.prestation ? (
                        <p className="mb-1 text-sm text-foreground">
                          {ref.prestation}
                        </p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        {sel.justification}
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="moyens">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Users className="size-4" />
                    Moyens humains
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {moyensHumains.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun moyen humain déclaré.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {moyensHumains.map((m) => (
                        <li key={m.employeeId} className="text-sm">
                          <span className="font-medium">{m.nom}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            — {m.poste}
                            {m.roleChantier ? ` · ${m.roleChantier}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Wrench className="size-4" />
                    Moyens matériels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {moyensMateriels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun moyen matériel déclaré.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {moyensMateriels.map((m) => (
                        <li key={m.equipmentId} className="text-sm">
                          <span className="font-medium">{m.nom}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            × {m.quantite}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="planning">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <CalendarRange className="size-4" />
                    Planning prévisionnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!planning?.etapes || planning.etapes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun planning renseigné.
                    </p>
                  ) : (
                    <ol className="space-y-2">
                      {planning.etapes.map((etape, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.7rem] font-bold text-primary">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium">{etape.libelle}</p>
                            {etape.detail ? (
                              <p className="text-xs text-muted-foreground">
                                {etape.detail}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                  {planning?.note ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {planning.note}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-primary">
                    Questions à poser à l&apos;acheteur
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {questionsAcheteur.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune question suggérée.
                    </p>
                  ) : (
                    <ol className="list-decimal space-y-1.5 pl-5">
                      {questionsAcheteur.map((q, i) => (
                        <li key={i} className="text-sm">
                          {q}
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {canValidate ? (
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link href={`/app/appels-offres/${tender.id}/validation`}>
                <ShieldCheck data-icon="inline-start" />
                Valider le dossier et autoriser le dépôt
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
