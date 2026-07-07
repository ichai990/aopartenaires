import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CircleAlert,
  Download,
  ExternalLink,
  FileText,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/auth/guards";
import { toClientTenderDTO } from "@/lib/dto";
import { DOMAINE_LABELS } from "@/lib/constants";
import { daysUntil, formatDate, formatEuros, formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AnalyseDCE,
  CompatibilityResult,
  PieceManquante,
} from "@/lib/ai/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CompatibilityGauge } from "@/components/compatibility-gauge";
import { PageHeader } from "@/components/page-header";
import { TenderStatusBadge } from "@/components/status-badge";
import { WorkflowStepper } from "@/components/workflow-stepper";

export const metadata = { title: "Détail de l'appel d'offres" };

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, companyId } = await requireCompany();
  const { id } = await params;

  const tender = await prisma.tender.findFirst({
    where: { id, companyId },
    include: {
      analysis: true,
      files: true,
      proposal: { include: { currentVersion: true } },
    },
  });
  if (!tender) notFound();

  const dto = toClientTenderDTO(tender);
  const urgent = dto.dateLimite !== null && daysUntil(dto.dateLimite) < 7;

  const analysis = tender.analysis;
  const compat = (analysis?.compatibilityDetail ?? null) as unknown as
    | CompatibilityResult
    | null;
  const extraction = (analysis?.extraction ?? null) as unknown as AnalyseDCE | null;
  const piecesManquantes = (analysis?.missingDocuments ??
    []) as unknown as PieceManquante[];

  const canValidate =
    tender.status === "EN_ATTENTE_DIRIGEANT" && user.role === "COMPANY_ADMIN";

  return (
    <div>
      <PageHeader
        title={tender.objet}
        description={[tender.acheteur, tender.reference ? `Réf. ${tender.reference}` : null]
          .filter(Boolean)
          .join(" · ")}
      >
        <TenderStatusBadge status={tender.status} />
        {tender.proposal ? (
          <Button asChild variant="outline">
            <Link href={`/app/appels-offres/${tender.id}/dossier`}>
              <FileText data-icon="inline-start" />
              Voir le dossier généré
            </Link>
          </Button>
        ) : null}
        {canValidate ? (
          <Button asChild>
            <Link href={`/app/appels-offres/${tender.id}/validation`}>
              <ShieldCheck data-icon="inline-start" />
              Valider le dossier
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      <Card className="mb-6">
        <CardContent>
          <WorkflowStepper status={tender.status} />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Informations marché</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <InfoRow label="Domaine">
                {dto.domaine ? DOMAINE_LABELS[dto.domaine] : "—"}
              </InfoRow>
              <InfoRow label="Lieu">{dto.lieu ?? "—"}</InfoRow>
              <InfoRow label="Montant estimé HT">
                {formatEuros(dto.montantEstimeHT)}
              </InfoRow>
              <InfoRow label="Date limite">
                <span className={cn(urgent && "font-semibold text-destructive")}>
                  {formatDate(dto.dateLimite)}
                  {urgent && dto.dateLimite
                    ? ` (dans ${Math.max(0, daysUntil(dto.dateLimite))} jour${
                        daysUntil(dto.dateLimite) > 1 ? "s" : ""
                      })`
                    : null}
                </span>
              </InfoRow>
              <InfoRow label="Visite obligatoire">
                {!dto.visiteObligatoire ? (
                  "Non"
                ) : dto.visitePlanifieeLe ? (
                  `Oui — visite planifiée le ${formatDate(dto.visitePlanifieeLe)}`
                ) : (
                  <Badge className="bg-warning/15 text-warning">
                    Oui — à planifier
                  </Badge>
                )}
              </InfoRow>
              <InfoRow label="Consultation">
                {dto.url ? (
                  <a
                    href={dto.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    Voir l&apos;annonce en ligne
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : (
                  "—"
                )}
              </InfoRow>
            </dl>

            <Separator className="my-4" />

            <p className="mb-2 text-sm font-medium text-foreground">
              Fichiers du DCE
            </p>
            {tender.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun fichier importé pour cet appel d&apos;offres.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {tender.files.map((file) => (
                  <li key={file.id}>
                    <a
                      href={`/api/files/tender/${file.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                    >
                      <Download className="size-3.5 shrink-0" />
                      {file.fileName}
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(file.sizeBytes)})
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {analysis ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Analyse IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Compatibilité avec votre entreprise :
                </span>
                <CompatibilityGauge score={analysis.compatibilityScore} />
              </div>

              {compat && compat.criteres.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Détail des critères
                  </p>
                  <ul className="space-y-2">
                    {compat.criteres.map((c, i) => (
                      <li key={i} className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-medium">{c.critere}</p>
                          <span className="text-sm font-semibold tabular-nums text-primary">
                            {c.points}/{c.maxPoints}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.commentaire}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {compat?.recommandation ? (
                <div className="rounded-lg border border-primary/20 bg-secondary/50 p-3">
                  <p className="text-sm font-medium text-primary">Recommandation</p>
                  <p className="mt-1 text-sm text-foreground">
                    {compat.recommandation}
                  </p>
                </div>
              ) : null}

              {analysis.champsACompleter.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Champs à compléter
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.champsACompleter.map((champ) => (
                      <Badge key={champ} variant="outline">
                        {champ}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {extraction && extraction.risquesIdentifies.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Risques identifiés
                  </p>
                  <ul className="space-y-1.5">
                    {extraction.risquesIdentifies.map((risque, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                        {risque}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {extraction && extraction.criteresNotation.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Critères de notation
                  </p>
                  <ul className="space-y-1">
                    {extraction.criteresNotation.map((c, i) => (
                      <li
                        key={i}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span>{c.critere}</span>
                        <span className="font-semibold tabular-nums text-primary">
                          {c.ponderationPct}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {extraction && extraction.documentsDemandes.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Documents demandés
                  </p>
                  <ul className="space-y-1">
                    {extraction.documentsDemandes.map((doc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        {doc.libelle}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {piecesManquantes.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Pièces manquantes
                  </p>
                  <ul className="space-y-2">
                    {piecesManquantes.map((piece, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CircleAlert
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            piece.critique ? "text-destructive" : "text-warning"
                          )}
                        />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {piece.libelle}
                            {piece.critique ? (
                              <Badge variant="destructive">Critique</Badge>
                            ) : (
                              <Badge className="bg-warning/15 text-warning">
                                À prévoir
                              </Badge>
                            )}
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
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
