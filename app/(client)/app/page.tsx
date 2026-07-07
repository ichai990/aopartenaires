import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  FolderOpen,
  PenLine,
  Radar,
  Send,
  Trophy,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/auth/guards";
import { toClientTenderDTO } from "@/lib/dto";
import type { TenderStatus } from "@prisma/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TenderTable } from "@/components/tender/tender-table";

export const metadata = { title: "Tableau de bord" };

const STATUTS_EN_PREPARATION: TenderStatus[] = [
  "EN_PREPARATION",
  "PIECES_MANQUANTES",
  "VISITE_A_PLANIFIER",
  "PRET_POUR_VALIDATION",
];

export default async function DashboardPage() {
  const { user, companyId } = await requireCompany();
  if (user.role === "EMPLOYEE") redirect("/app/mon-profil");

  const tenders = await prisma.tender.findMany({
    where: { companyId },
    include: { analysis: true },
    orderBy: [{ dateLimite: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });

  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

  const detectesCeMois = tenders.filter((t) => t.createdAt >= debutMois).length;
  const enPreparation = tenders.filter((t) =>
    STATUTS_EN_PREPARATION.includes(t.status)
  ).length;
  const enAttenteValidation = tenders.filter(
    (t) => t.status === "EN_ATTENTE_DIRIGEANT"
  ).length;
  const deposes = tenders.filter((t) => t.status === "DEPOSE").length;
  const gagnes = tenders.filter((t) => t.status === "GAGNE").length;

  const rows = tenders.map(toClientTenderDTO);

  return (
    <div>
      <PageHeader
        title="Suivi de vos appels d'offres BTP"
        description="Vue d'ensemble des marchés détectés pour votre entreprise et de l'avancement des dossiers."
      />

      {enAttenteValidation > 0 ? (
        <Alert className="mb-6 border border-warning/40 bg-warning/10">
          <BellRing className="text-warning" />
          <AlertTitle>
            {enAttenteValidation > 1
              ? `${enAttenteValidation} dossiers attendent votre validation`
              : "1 dossier attend votre validation"}
          </AlertTitle>
          <AlertDescription>
            <Link href="/app/appels-offres" className="font-medium text-primary">
              Voir les dossiers à valider
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="AO détectés ce mois-ci" value={detectesCeMois} icon={Radar} />
        <StatCard
          label="Dossiers en préparation"
          value={enPreparation}
          icon={FolderOpen}
        />
        <StatCard
          label="En attente de votre validation"
          value={enAttenteValidation}
          icon={PenLine}
          tone="warning"
        />
        <StatCard label="AO déposés" value={deposes} icon={Send} />
        <StatCard
          label="Marchés remportés"
          value={gagnes}
          icon={Trophy}
          tone="success"
        />
      </div>

      <TenderTable tenders={rows} title="Appels d'offres suivis" />
    </div>
  );
}
