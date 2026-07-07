import Link from "next/link";
import { FileSearch, Plus } from "lucide-react";
import type { TenderStatus } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { DOMAINE_LABELS, TENDER_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatEuros } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CompatibilityGauge } from "@/components/compatibility-gauge";
import { TenderStatusBadge } from "@/components/status-badge";
import { StatusFilterPills } from "@/components/admin/tender/status-filter-pills";
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

export const metadata = { title: "Appels d'offres — Admin BTPilot" };

export default async function AdminTendersPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  await requireSuperAdmin();
  const { statut } = await searchParams;

  const statusFilter: TenderStatus | null =
    statut && statut in TENDER_STATUS_LABELS ? (statut as TenderStatus) : null;

  const tenders = await prisma.tender.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      company: { select: { raisonSociale: true } },
      analysis: { select: { compatibilityScore: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Appels d'offres"
        description="Tous les appels d'offres suivis pour les entreprises clientes."
      >
        <Button asChild>
          <Link href="/admin/appels-offres/nouveau">
            <Plus className="size-4" />
            Importer un AO
          </Link>
        </Button>
      </PageHeader>

      <StatusFilterPills basePath="/admin/appels-offres" current={statusFilter} />

      {tenders.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="Aucun appel d'offres"
          description={
            statusFilter
              ? `Aucun appel d'offres au statut « ${TENDER_STATUS_LABELS[statusFilter]} ».`
              : "Importez un premier appel d'offres pour démarrer le suivi."
          }
        >
          <Button asChild variant="outline">
            <Link href="/admin/appels-offres/nouveau">
              <Plus className="size-4" />
              Importer un AO
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <Card className="py-0">
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Marché</TableHead>
                  <TableHead>Domaine</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date limite</TableHead>
                  <TableHead>Compatibilité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenders.map((tender) => (
                  <TableRow key={tender.id}>
                    <TableCell className="whitespace-nowrap">
                      {tender.company.raisonSociale}
                    </TableCell>
                    <TableCell className="max-w-72">
                      <Link
                        href={`/admin/appels-offres/${tender.id}`}
                        className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                        title={tender.objet}
                      >
                        {tender.objet}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {tender.domaine ? DOMAINE_LABELS[tender.domaine] : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {tender.montantEstimeHT
                        ? formatEuros(Number(tender.montantEstimeHT))
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(tender.dateLimite)}
                    </TableCell>
                    <TableCell>
                      <CompatibilityGauge
                        score={tender.analysis?.compatibilityScore ?? null}
                        compact
                      />
                    </TableCell>
                    <TableCell>
                      <TenderStatusBadge status={tender.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(tender.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
