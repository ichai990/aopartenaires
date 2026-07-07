import { Radar, ShieldAlert } from "lucide-react";
import type { SourceStatus } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { SOURCE_STATUS_LABELS, SOURCE_TYPE_LABELS } from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SourceDialog } from "@/components/admin/manage/source-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Veille & sources — Admin BTPilot" };

const STATUS_CLASSES: Record<SourceStatus, string> = {
  ACTIVE: "bg-success/15 text-success",
  ERREUR: "bg-destructive/10 text-destructive",
  DESACTIVEE: "bg-muted text-muted-foreground",
};

function SourceStatusBadge({ status }: { status: SourceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STATUS_CLASSES[status]
      )}
    >
      {SOURCE_STATUS_LABELS[status]}
    </span>
  );
}

export default async function AdminSourcesPage() {
  await requireSuperAdmin();

  const sources = await prisma.source.findMany({
    include: { _count: { select: { tenders: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Veille & sources"
        description="D'où proviennent les appels d'offres importés dans BTPilot."
      >
        <SourceDialog />
      </PageHeader>

      <Alert className="mb-6">
        <ShieldAlert />
        <AlertTitle>
          Architecture de veille : import manuel aujourd&apos;hui, connecteurs extensibles
          demain.
        </AlertTitle>
        <AlertDescription>
          Aucune source ne contourne captcha ou accès restreint.
        </AlertDescription>
      </Alert>

      {sources.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="Aucune source"
          description="Déclarez une première source de veille pour tracer la provenance des appels d'offres."
        >
          <SourceDialog />
        </EmptyState>
      ) : (
        <Card className="py-0">
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>URL de base</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière exécution</TableHead>
                  <TableHead>Dernière erreur</TableHead>
                  <TableHead className="text-right">AO importés</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="whitespace-nowrap font-medium text-primary">
                      {source.nom}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {SOURCE_TYPE_LABELS[source.type]}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {source.baseUrl ? (
                        <span className="block truncate font-mono text-xs" title={source.baseUrl}>
                          {source.baseUrl}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <SourceStatusBadge status={source.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {source.lastRunAt ? formatRelative(source.lastRunAt) : "—"}
                    </TableCell>
                    <TableCell className="max-w-48">
                      {source.lastError ? (
                        <span
                          className="block truncate text-sm text-destructive"
                          title={source.lastError}
                        >
                          {source.lastError}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {source._count.tenders}
                    </TableCell>
                    <TableCell className="text-right">
                      <SourceDialog
                        source={{
                          id: source.id,
                          nom: source.nom,
                          type: source.type,
                          baseUrl: source.baseUrl,
                          status: source.status,
                        }}
                      />
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
