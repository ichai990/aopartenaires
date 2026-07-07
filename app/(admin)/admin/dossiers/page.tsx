import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";
import type { TenderStatus } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { TENDER_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime, formatEuros } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TenderStatusBadge } from "@/components/status-badge";
import { StatusFilterPills } from "@/components/admin/tender/status-filter-pills";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Dossiers — Admin BTPilot" };

export default async function AdminProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  await requireSuperAdmin();
  const { statut } = await searchParams;

  const statusFilter: TenderStatus | null =
    statut && statut in TENDER_STATUS_LABELS ? (statut as TenderStatus) : null;

  const proposals = await prisma.proposal.findMany({
    where: statusFilter ? { tender: { status: statusFilter } } : undefined,
    include: {
      tender: {
        include: { company: { select: { raisonSociale: true } } },
      },
      currentVersion: {
        include: {
          validations: {
            orderBy: { validatedAt: "desc" },
            take: 1,
            select: { id: true, validatedAt: true },
          },
        },
      },
      _count: { select: { versions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Dossiers"
        description="Tous les dossiers de réponse générés, avec leur version courante et l'état de validation."
      />

      <StatusFilterPills basePath="/admin/dossiers" current={statusFilter} />

      {proposals.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Aucun dossier"
          description={
            statusFilter
              ? `Aucun dossier dont l'appel d'offres est au statut « ${TENDER_STATUS_LABELS[statusFilter]} ».`
              : "Les dossiers de réponse générés depuis le pilotage des appels d'offres apparaîtront ici."
          }
        />
      ) : (
        <Card className="py-0">
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Marché</TableHead>
                  <TableHead>Version courante</TableHead>
                  <TableHead>Prix proposé HT</TableHead>
                  <TableHead>Statut AO</TableHead>
                  <TableHead>Dernière validation</TableHead>
                  <TableHead className="text-right">Pilotage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal) => {
                  const currentVersion = proposal.currentVersion;
                  const lastValidation = currentVersion?.validations[0] ?? null;
                  return (
                    <TableRow key={proposal.id}>
                      <TableCell className="whitespace-nowrap">
                        {proposal.tender.company.raisonSociale}
                      </TableCell>
                      <TableCell className="max-w-72">
                        <Link
                          href={`/admin/appels-offres/${proposal.tenderId}`}
                          className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                          title={proposal.tender.objet}
                        >
                          {proposal.tender.objet}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {currentVersion ? (
                          <>
                            <span className="font-medium">
                              v{currentVersion.versionNumber}
                            </span>
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              ({proposal._count.versions} version
                              {proposal._count.versions > 1 ? "s" : ""})
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {currentVersion?.prixProposeHT
                          ? formatEuros(Number(currentVersion.prixProposeHT))
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <TenderStatusBadge status={proposal.tender.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {lastValidation ? (
                          <span className="text-success">
                            {formatDateTime(lastValidation.validatedAt)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/appels-offres/${proposal.tenderId}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Piloter
                          <ArrowRight className="size-3.5" />
                        </Link>
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
