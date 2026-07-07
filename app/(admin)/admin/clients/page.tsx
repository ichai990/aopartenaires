import Link from "next/link";
import { Building2 } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { DOMAINE_LABELS } from "@/lib/constants";
import { formatDate, formatSiret } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CreateCompanyDialog } from "@/components/admin/manage/create-company-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ViewAsButton } from "@/components/admin/manage/view-as-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Clients — Admin BTPilot" };

export default async function AdminClientsPage() {
  await requireSuperAdmin();

  const companies = await prisma.company.findMany({
    include: {
      _count: { select: { users: true, tenders: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Les entreprises accompagnées par BTPilot dans leurs réponses aux appels d'offres."
      >
        <CreateCompanyDialog />
      </PageHeader>

      {companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune entreprise cliente"
          description="Créez votre première entreprise cliente : un lien d'invitation sera généré pour son dirigeant."
        >
          <CreateCompanyDialog />
        </EmptyState>
      ) : (
        <Card className="py-0">
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raison sociale</TableHead>
                  <TableHead>SIRET</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Domaines</TableHead>
                  <TableHead className="text-right">Effectif</TableHead>
                  <TableHead className="text-right">Utilisateurs</TableHead>
                  <TableHead className="text-right">AO suivis</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead className="text-right">Espace client</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`/admin/clients/${company.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {company.raisonSociale}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {formatSiret(company.siret)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {company.ville ?? "—"}
                    </TableCell>
                    <TableCell>
                      {company.domaines.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          {company.domaines.slice(0, 2).map((domaine) => (
                            <Badge key={domaine} variant="secondary">
                              {DOMAINE_LABELS[domaine]}
                            </Badge>
                          ))}
                          {company.domaines.length > 2 ? (
                            <Badge variant="outline">
                              +{company.domaines.length - 2}
                            </Badge>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {company.effectif ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {company._count.users}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {company._count.tenders}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(company.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ViewAsButton companyId={company.id} size="xs" label="Voir" />
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
