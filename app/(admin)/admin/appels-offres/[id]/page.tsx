import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  CircleAlert,
  ExternalLink,
  FileText,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import {
  COMMISSION_STATUS_LABELS,
  DOMAINE_LABELS,
} from "@/lib/constants";
import {
  formatDate,
  formatDateTime,
  formatEuros,
  formatFileSize,
} from "@/lib/format";
import type { CompatibilityResult, PieceManquante } from "@/lib/ai/schemas";
import { PageHeader } from "@/components/page-header";
import { TenderStatusBadge } from "@/components/status-badge";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { CompatibilityGauge } from "@/components/compatibility-gauge";
import { DceUpload } from "@/components/admin/tender/dce-upload";
import { TenderActions } from "@/components/admin/tender/tender-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Pilotage de l'AO — Admin BTPilot" };

type BaremeRow = {
  de: number;
  a: number | null;
  taux: number;
  assiette: number;
  montant: number;
};

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export default async function AdminTenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const tender = await prisma.tender.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, raisonSociale: true } },
      files: { orderBy: { createdAt: "desc" } },
      analysis: true,
      proposal: {
        include: {
          currentVersion: {
            include: {
              validations: {
                include: { user: { select: { firstName: true, lastName: true } } },
                orderBy: { validatedAt: "desc" },
              },
            },
          },
          versions: { orderBy: { versionNumber: "desc" } },
        },
      },
      commission: true,
    },
  });
  if (!tender) notFound();

  const analysis = tender.analysis;
  const compat = analysis?.compatibilityDetail
    ? (analysis.compatibilityDetail as unknown as CompatibilityResult)
    : null;
  const missingDocuments = Array.isArray(analysis?.missingDocuments)
    ? (analysis.missingDocuments as unknown as PieceManquante[])
    : [];
  const champsACompleter = analysis?.champsACompleter ?? [];

  const proposal = tender.proposal;
  const currentVersion = proposal?.currentVersion ?? null;
  const validations = currentVersion?.validations ?? [];

  const commission = tender.commission;
  const bareme =
    commission && Array.isArray(commission.bareme)
      ? (commission.bareme as unknown as BaremeRow[])
      : [];

  return (
    <div>
      {/* (a) En-tête */}
      <PageHeader title={tender.objet} description={tender.reference ?? undefined}>
        <TenderStatusBadge status={tender.status} />
      </PageHeader>

      <p className="-mt-4 mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Building2 className="size-4" />
        <Link
          href={`/admin/clients/${tender.company.id}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {tender.company.raisonSociale}
        </Link>
      </p>

      <Card className="mb-6">
        <CardContent>
          <WorkflowStepper status={tender.status} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* (c) Analyse IA + actions */}
          <Card>
            <CardHeader>
              <CardTitle>Analyse IA</CardTitle>
              <CardDescription>
                Lecture du DCE, score de compatibilité et pièces à réunir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {analysis ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      Compatibilité entreprise :
                    </span>
                    <CompatibilityGauge score={analysis.compatibilityScore} />
                    <span className="text-xs text-muted-foreground">
                      Analysé le {formatDateTime(analysis.analysedAt)}
                    </span>
                  </div>

                  {compat?.recommandation ? (
                    <p className="rounded-lg bg-secondary p-3 text-sm">
                      {compat.recommandation}
                    </p>
                  ) : null}

                  {compat?.criteres?.length ? (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-primary">
                        Critères évalués
                      </h3>
                      <ul className="space-y-2">
                        {compat.criteres.map((critere, i) => (
                          <li key={i} className="text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">{critere.critere}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {critere.points}/{critere.maxPoints}
                              </span>
                            </div>
                            {critere.commentaire ? (
                              <p className="text-xs text-muted-foreground">
                                {critere.commentaire}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {missingDocuments.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-primary">
                        Pièces manquantes
                      </h3>
                      <ul className="space-y-2">
                        {missingDocuments.map((piece, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <CircleAlert
                              className={
                                piece.critique
                                  ? "mt-0.5 size-4 shrink-0 text-destructive"
                                  : "mt-0.5 size-4 shrink-0 text-warning"
                              }
                            />
                            <div className="min-w-0">
                              <p className="font-medium">
                                {piece.libelle}
                                {piece.critique ? (
                                  <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                                    Critique
                                  </span>
                                ) : null}
                              </p>
                              {piece.detail ? (
                                <p className="text-xs text-muted-foreground">
                                  {piece.detail}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {champsACompleter.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-primary">
                        Champs à compléter
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {champsACompleter.map((champ, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning"
                          >
                            {champ}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune analyse pour le moment. Ajoutez les pièces du DCE puis lancez
                  l&apos;analyse IA.
                </p>
              )}

              <Separator />
              <TenderActions
                tenderId={tender.id}
                status={tender.status}
                hasAnalysis={Boolean(analysis)}
              />
            </CardContent>
          </Card>

          {/* (d) Dossier */}
          <Card>
            <CardHeader>
              <CardTitle>Dossier de réponse</CardTitle>
              <CardDescription>
                Versions générées et validations du dirigeant sur la version courante.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {proposal && proposal.versions.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Version</TableHead>
                          <TableHead>Générée le</TableHead>
                          <TableHead>Empreinte</TableHead>
                          <TableHead>Prix proposé HT</TableHead>
                          <TableHead>Délai</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposal.versions.map((version) => (
                          <TableRow key={version.id}>
                            <TableCell className="whitespace-nowrap font-medium">
                              v{version.versionNumber}
                              {version.id === proposal.currentVersionId ? (
                                <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                                  Courante
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDateTime(version.createdAt)}
                            </TableCell>
                            <TableCell>
                              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                {version.contentHash.slice(0, 10)}…
                              </code>
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              {version.prixProposeHT
                                ? formatEuros(Number(version.prixProposeHT))
                                : "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {version.delaiProposeJours
                                ? `${version.delaiProposeJours} jours`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-primary">
                      Validation de la version courante
                    </h3>
                    {validations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucune validation dirigeant sur la version courante.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {validations.map((validation) => (
                          <li
                            key={validation.id}
                            className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-success/5 p-3"
                          >
                            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                            <div className="min-w-0 text-sm">
                              <p className="font-medium">
                                {validation.user.firstName} {validation.user.lastName}
                                {validation.autorisationDepot
                                  ? " — dépôt autorisé"
                                  : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Le {formatDateTime(validation.validatedAt)} · IP{" "}
                                {validation.ipAddress}
                              </p>
                              {validation.commentaire ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  « {validation.commentaire} »
                                </p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun dossier généré. Lancez d&apos;abord l&apos;analyse IA, puis générez
                  le dossier de réponse.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* (b) Infos marché + DCE */}
          <Card>
            <CardHeader>
              <CardTitle>Informations du marché</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <InfoRow label="Référence">{tender.reference ?? "—"}</InfoRow>
                <InfoRow label="Acheteur">{tender.acheteur ?? "—"}</InfoRow>
                <InfoRow label="Domaine">
                  {tender.domaine ? DOMAINE_LABELS[tender.domaine] : "—"}
                </InfoRow>
                <InfoRow label="Lieu">{tender.lieu ?? "—"}</InfoRow>
                <InfoRow label="Montant estimé HT">
                  {tender.montantEstimeHT
                    ? formatEuros(Number(tender.montantEstimeHT))
                    : "—"}
                </InfoRow>
                <InfoRow label="Date limite">
                  {formatDateTime(tender.dateLimite)}
                </InfoRow>
                <InfoRow label="Visite obligatoire">
                  {tender.visiteObligatoire ? "Oui" : "Non"}
                </InfoRow>
                {tender.visitePlanifieeLe ? (
                  <InfoRow label="Visite planifiée le">
                    {formatDateTime(tender.visitePlanifieeLe)}
                  </InfoRow>
                ) : null}
                <InfoRow label="Créé le">{formatDate(tender.createdAt)}</InfoRow>
              </dl>
              {tender.url ? (
                <a
                  href={tender.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="size-4" />
                  Consultation en ligne
                </a>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pièces du DCE</CardTitle>
              <CardDescription>
                Documents de la consultation (règlement, CCTP, CCAP…).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tender.files.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune pièce téléversée pour le moment.
                </p>
              ) : (
                <ul className="divide-y">
                  {tender.files.map((file) => (
                    <li key={file.id} className="flex items-center gap-2.5 py-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <a
                          href={`/api/files/tender/${file.id}`}
                          target="_blank"
                          className="block truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {file.fileName}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.sizeBytes)} ·{" "}
                          {formatDate(file.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <DceUpload tenderId={tender.id} />
            </CardContent>
          </Card>

          {/* (e) Commission — interne uniquement */}
          {commission ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-4 text-muted-foreground" />
                  Commission (interne)
                </CardTitle>
                <CardDescription>
                  Visible uniquement par l&apos;équipe BTPilot — jamais exposée côté
                  client.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="divide-y">
                  <InfoRow label="Montant du marché HT">
                    {formatEuros(Number(commission.montantMarcheHT))}
                  </InfoRow>
                  <InfoRow label="Commission">
                    <span className="text-success">
                      {formatEuros(Number(commission.montantCommission))}
                    </span>
                  </InfoRow>
                  <InfoRow label="Statut">
                    {COMMISSION_STATUS_LABELS[commission.status]}
                  </InfoRow>
                </dl>
                {bareme.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tranche</TableHead>
                          <TableHead>Taux</TableHead>
                          <TableHead>Assiette</TableHead>
                          <TableHead>Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bareme.map((tranche, i) => (
                          <TableRow key={i}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {formatEuros(tranche.de)} →{" "}
                              {tranche.a === null ? "∞" : formatEuros(tranche.a)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs tabular-nums">
                              {tranche.taux} %
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs tabular-nums">
                              {formatEuros(tranche.assiette)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs font-medium tabular-nums">
                              {formatEuros(tranche.montant)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
