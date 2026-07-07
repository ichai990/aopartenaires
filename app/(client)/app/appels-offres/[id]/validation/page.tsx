import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CircleAlert,
  FileCheck2,
  Info,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin } from "@/lib/auth/guards";
import { getAiProvider } from "@/lib/ai";
import type { ProposalVersionInput } from "@/lib/ai/types";
import type {
  MemoireTechnique,
  PieceManquante,
  SelectedReference,
  ValidationBrief,
} from "@/lib/ai/schemas";
import { formatEuros } from "@/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ValidationForm } from "./validation-form";

export const metadata = { title: "Validation dirigeant" };

function VoletCard({
  icon: Icon,
  title,
  volet,
  highlight,
}: {
  icon: LucideIcon;
  title: string;
  volet: { resume: string; pointsAttention: string[] };
  highlight?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Icon className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {highlight ? (
          <p className="font-heading text-xl font-bold text-success">{highlight}</p>
        ) : null}
        <p className="text-sm text-foreground">{volet.resume}</p>
        {volet.pointsAttention.length > 0 ? (
          <ul className="space-y-1.5">
            {volet.pointsAttention.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                {point}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function ValidationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { companyId } = await requireCompanyAdmin();
  const { id } = await params;

  const tender = await prisma.tender.findFirst({
    where: { id, companyId },
    include: {
      analysis: true,
      proposal: { include: { currentVersion: true } },
    },
  });
  if (!tender?.proposal?.currentVersion) notFound();

  const version = tender.proposal.currentVersion;

  if (tender.status !== "EN_ATTENTE_DIRIGEANT") {
    return (
      <div>
        <PageHeader title="Validation dirigeant" description={tender.objet} />
        <Alert>
          <Info />
          <AlertTitle>Ce dossier n&apos;est pas en attente de validation</AlertTitle>
          <AlertDescription>
            <Link
              href={`/app/appels-offres/${tender.id}`}
              className="font-medium text-primary"
            >
              Retour à l&apos;appel d&apos;offres
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Brief de synthèse généré à partir de la version stockée (données réelles uniquement).
  const provider = await getAiProvider();
  const versionInput: ProposalVersionInput = {
    objet: tender.objet,
    acheteur: tender.acheteur,
    prixProposeHT:
      version.prixProposeHT !== null ? Number(version.prixProposeHT) : null,
    delaiProposeJours: version.delaiProposeJours,
    memoireTechnique: version.memoireTechnique as unknown as MemoireTechnique,
    checklists: {
      administrative:
        version.checklistAdministrative as unknown as ProposalVersionInput["checklists"]["administrative"],
      technique:
        version.checklistTechnique as unknown as ProposalVersionInput["checklists"]["technique"],
      financiere:
        version.checklistFinanciere as unknown as ProposalVersionInput["checklists"]["financiere"],
    },
    referencesSelectionnees:
      version.referencesSelectionnees as unknown as SelectedReference[],
    moyensHumains:
      version.moyensHumains as unknown as ProposalVersionInput["moyensHumains"],
    moyensMateriels:
      version.moyensMateriels as unknown as ProposalVersionInput["moyensMateriels"],
    piecesManquantes: (tender.analysis?.missingDocuments ??
      []) as unknown as PieceManquante[],
  };
  const brief: ValidationBrief = await provider.preparerValidationDirigeant(
    versionInput
  );

  return (
    <div>
      <PageHeader
        title="Validation dirigeant"
        description={[tender.objet, tender.acheteur].filter(Boolean).join(" · ")}
      >
        <Button asChild variant="ghost">
          <Link href={`/app/appels-offres/${tender.id}/dossier`}>
            <ArrowLeft data-icon="inline-start" />
            Relire le dossier
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Synthèse générale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{brief.syntheseGenerale}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <VoletCard
            icon={Banknote}
            title="Prix"
            volet={brief.prix}
            highlight={
              versionInput.prixProposeHT !== null
                ? formatEuros(versionInput.prixProposeHT)
                : undefined
            }
          />
          <VoletCard
            icon={CalendarClock}
            title="Délais"
            volet={brief.delais}
            highlight={
              version.delaiProposeJours !== null
                ? `${version.delaiProposeJours} jours`
                : undefined
            }
          />
          <VoletCard icon={Users} title="Moyens humains" volet={brief.moyensHumains} />
          <VoletCard
            icon={Wrench}
            title="Moyens matériels"
            volet={brief.moyensMateriels}
          />
          <VoletCard
            icon={FileCheck2}
            title="Engagements techniques"
            volet={brief.engagements}
          />
        </div>

        {brief.risques.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <TriangleAlert className="size-4" />
                Risques identifiés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {brief.risques.map((risque, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-destructive"
                  >
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    {risque}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <ValidationForm
          tenderId={tender.id}
          proposalVersionId={version.id}
          versionNumber={version.versionNumber}
          contentHash={version.contentHash}
        />
      </div>
    </div>
  );
}
