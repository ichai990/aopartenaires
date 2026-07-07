import Link from "next/link";
import {
  BadgeEuro,
  Building2,
  CalendarClock,
  FileWarning,
  HandCoins,
  Hourglass,
  ScanSearch,
  Send,
  Trophy,
} from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEuros, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TenderStatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Tableau de bord — Admin BTPilot" };

/** Badge d'urgence sur une date limite : rouge si moins de 7 jours. */
function DeadlineBadge({ dateLimite }: { dateLimite: Date | null }) {
  if (!dateLimite) return <span className="text-xs text-muted-foreground">Sans date</span>;
  const days = daysUntil(dateLimite);
  const urgent = days < 7;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        urgent ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
      )}
    >
      {days < 0 ? "Dépassée" : `J-${days}`}
    </span>
  );
}

export default async function AdminDashboardPage() {
  await requireSuperAdmin();
  const now = new Date();

  const [
    clientsCount,
    analysesCount,
    deposesCount,
    gagnesCount,
    commissionsPotentielles,
    commissionsGagnees,
    enAttenteCount,
    visitesCount,
    documentsExpiresCount,
    dossiersEnAttente,
    prochainesEcheances,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.tenderAnalysis.count(),
    prisma.tender.count({ where: { status: "DEPOSE" } }),
    prisma.tender.count({ where: { status: "GAGNE" } }),
    prisma.commission.aggregate({
      _sum: { montantCommission: true },
      where: { status: "POTENTIELLE" },
    }),
    prisma.commission.aggregate({
      _sum: { montantCommission: true },
      where: { status: { in: ["GAGNEE", "FACTUREE"] } },
    }),
    prisma.tender.count({ where: { status: "EN_ATTENTE_DIRIGEANT" } }),
    prisma.tender.count({ where: { status: "VISITE_A_PLANIFIER" } }),
    prisma.document.count({ where: { dateExpiration: { lt: now } } }),
    prisma.tender.findMany({
      where: { status: "EN_ATTENTE_DIRIGEANT" },
      include: { company: { select: { raisonSociale: true } } },
      orderBy: { dateLimite: "asc" },
    }),
    prisma.tender.findMany({
      where: { status: { notIn: ["GAGNE", "PERDU"] }, dateLimite: { not: null } },
      include: { company: { select: { raisonSociale: true } } },
      orderBy: { dateLimite: "asc" },
      take: 8,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Pilotage global des clients, des appels d'offres et des commissions BTPilot."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Clients" value={clientsCount} icon={Building2} />
        <StatCard label="AO analysés" value={analysesCount} icon={ScanSearch} />
        <StatCard label="AO déposés" value={deposesCount} icon={Send} />
        <StatCard label="AO gagnés" value={gagnesCount} icon={Trophy} tone="success" />
        <StatCard
          label="Commissions potentielles"
          value={formatEuros(Number(commissionsPotentielles._sum.montantCommission ?? 0))}
          icon={HandCoins}
          tone="warning"
        />
        <StatCard
          label="Commissions gagnées"
          value={formatEuros(Number(commissionsGagnees._sum.montantCommission ?? 0))}
          icon={BadgeEuro}
          tone="success"
        />
        <StatCard
          label="Dossiers en attente client"
          value={enAttenteCount}
          icon={Hourglass}
        />
        <StatCard label="Visites à planifier" value={visitesCount} icon={CalendarClock} />
        <StatCard
          label="Documents expirés"
          value={documentsExpiresCount}
          icon={FileWarning}
          tone={documentsExpiresCount > 0 ? "danger" : "default"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dossiers en attente de validation client</CardTitle>
            <CardDescription>
              Dossiers envoyés aux dirigeants, en attente de leur signature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dossiersEnAttente.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun dossier en attente de validation.
              </p>
            ) : (
              <ul className="divide-y">
                {dossiersEnAttente.map((tender) => (
                  <li key={tender.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/appels-offres/${tender.id}`}
                        className="block truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {tender.objet}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {tender.company.raisonSociale} · Date limite :{" "}
                        {formatDate(tender.dateLimite)}
                      </p>
                    </div>
                    <DeadlineBadge dateLimite={tender.dateLimite} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prochaines échéances</CardTitle>
            <CardDescription>
              Appels d&apos;offres en cours, triés par date limite de remise.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prochainesEcheances.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune échéance à venir.</p>
            ) : (
              <ul className="divide-y">
                {prochainesEcheances.map((tender) => (
                  <li key={tender.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/appels-offres/${tender.id}`}
                        className="block truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {tender.objet}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {tender.company.raisonSociale} · {formatDate(tender.dateLimite)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <TenderStatusBadge status={tender.status} />
                      <DeadlineBadge dateLimite={tender.dateLimite} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
