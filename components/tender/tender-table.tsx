import Link from "next/link";
import { FileSearch } from "lucide-react";
import type { ClientTenderDTO } from "@/lib/dto";
import { DOMAINE_LABELS } from "@/lib/constants";
import { daysUntil, formatDate, formatEuros } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompatibilityGauge } from "@/components/compatibility-gauge";
import { EmptyState } from "@/components/empty-state";
import { TenderStatusBadge } from "@/components/status-badge";

/**
 * Tableau des appels d'offres côté client (dashboard + liste complète).
 * Reçoit exclusivement des DTO sérialisables.
 */
export function TenderTable({
  tenders,
  title,
}: {
  tenders: ClientTenderDTO[];
  title?: string;
}) {
  if (tenders.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Aucun appel d'offres pour le moment"
        description="Les appels d'offres détectés pour votre entreprise apparaîtront ici dès leur import."
      />
    );
  }

  return (
    <Card>
      {title ? (
        <CardHeader>
          <CardTitle className="text-primary">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marché</TableHead>
              <TableHead>Domaine</TableHead>
              <TableHead>Montant estimé</TableHead>
              <TableHead>Date limite</TableHead>
              <TableHead>Compatibilité IA</TableHead>
              <TableHead>Visite obligatoire</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenders.map((tender) => {
              const urgent =
                tender.dateLimite !== null && daysUntil(tender.dateLimite) < 7;
              return (
                <TableRow key={tender.id}>
                  <TableCell className="max-w-xs">
                    <Link
                      href={`/app/appels-offres/${tender.id}`}
                      className="block font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <span className="line-clamp-2">{tender.objet}</span>
                    </Link>
                    {tender.acheteur ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {tender.acheteur}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {tender.domaine ? DOMAINE_LABELS[tender.domaine] : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatEuros(tender.montantEstimeHT)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "whitespace-nowrap",
                      urgent && "font-semibold text-destructive"
                    )}
                  >
                    {formatDate(tender.dateLimite)}
                  </TableCell>
                  <TableCell>
                    <CompatibilityGauge score={tender.compatibilityScore} compact />
                  </TableCell>
                  <TableCell>
                    {!tender.visiteObligatoire ? (
                      <span className="text-muted-foreground">Non</span>
                    ) : tender.visitePlanifieeLe ? (
                      <span>Oui</span>
                    ) : (
                      <Badge className="bg-warning/15 text-warning">
                        Oui — à planifier
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <TenderStatusBadge status={tender.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
