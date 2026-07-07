import Link from "next/link";
import { notFound } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import type { EquipmentCategory } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import {
  DOMAINE_LABELS,
  EQUIPMENT_CATEGORY_LABELS,
  ROLE_LABELS,
} from "@/lib/constants";
import { formatDate, formatEuros, formatSiret } from "@/lib/format";
import { toNumber } from "@/lib/dto";
import {
  computeDocumentStatut,
  DOCUMENT_STATUT_LABELS,
  type DocumentStatut,
} from "@/lib/services/documents";
import { PageHeader } from "@/components/page-header";
import { TenderStatusBadge } from "@/components/status-badge";
import { CommissionStatusBadge } from "@/components/admin/manage/commission-status-badge";
import { InviteDialog } from "@/components/admin/manage/invite-dialog";
import { ViewAsButton } from "@/components/admin/manage/view-as-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Fiche client — Admin BTPilot" };

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-primary">{children}</dd>
    </div>
  );
}

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      employees: { orderBy: { nom: "asc" } },
      equipments: true,
      references: { orderBy: { annee: "desc" } },
      documents: { orderBy: { dateExpiration: "asc" } },
      tenders: { include: { analysis: true }, orderBy: { createdAt: "desc" } },
      commissions: { include: { tender: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!company) notFound();

  // Compteurs de documents par statut (calculés à la lecture).
  const documentStatuts = company.documents.map((doc) => ({
    doc,
    statut: computeDocumentStatut(doc.dateExpiration),
  }));
  const statutCounts = documentStatuts.reduce<Record<DocumentStatut, number>>(
    (acc, { statut }) => {
      acc[statut] += 1;
      return acc;
    },
    { VALIDE: 0, EXPIRE_BIENTOT: 0, EXPIRE: 0, SANS_ECHEANCE: 0 }
  );
  const documentsExpires = documentStatuts
    .filter(({ statut }) => statut === "EXPIRE")
    .map(({ doc }) => doc);

  // Matériel : compte par catégorie.
  const equipmentByCategory = company.equipments.reduce<
    Partial<Record<EquipmentCategory, number>>
  >((acc, eq) => {
    acc[eq.categorie] = (acc[eq.categorie] ?? 0) + 1;
    return acc;
  }, {});

  const totalCommissions = company.commissions.reduce(
    (sum, c) => sum + Number(c.montantCommission),
    0
  );

  return (
    <div>
      <PageHeader
        title={company.raisonSociale}
        description={`SIRET ${formatSiret(company.siret)}${company.ville ? ` · ${company.ville}` : ""}`}
      >
        <ViewAsButton companyId={company.id} size="default" />
        <InviteDialog
          companies={[{ id: company.id, raisonSociale: company.raisonSociale }]}
          defaultCompanyId={company.id}
          triggerLabel="Inviter un utilisateur"
          triggerVariant="outline"
        />
        <Button asChild>
          <Link href="/admin/appels-offres/nouveau">
            <FilePlus2 className="size-4" />
            Nouvel appel d&apos;offres
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>Informations générales de l&apos;entreprise.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <InfoRow label="Dirigeant">{company.dirigeantNom ?? "—"}</InfoRow>
              <InfoRow label="Email">{company.email ?? "—"}</InfoRow>
              <InfoRow label="Téléphone">{company.telephone ?? "—"}</InfoRow>
              <InfoRow label="CA annuel">{formatEuros(toNumber(company.caAnnuel))}</InfoRow>
              <InfoRow label="Effectif">{company.effectif ?? "—"}</InfoRow>
              <InfoRow label="Capacité financière">
                {formatEuros(toNumber(company.capaciteFinanciere))}
              </InfoRow>
              <InfoRow label="Domaines">
                {company.domaines.length === 0 ? (
                  "—"
                ) : (
                  <span className="flex flex-wrap justify-end gap-1">
                    {company.domaines.map((domaine) => (
                      <Badge key={domaine} variant="secondary">
                        {DOMAINE_LABELS[domaine]}
                      </Badge>
                    ))}
                  </span>
                )}
              </InfoRow>
              <InfoRow label="Zones d'intervention">
                {company.zonesGeographiques.length === 0
                  ? "—"
                  : company.zonesGeographiques.join(", ")}
              </InfoRow>
            </dl>
            {company.description ? (
              <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                {company.description}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs</CardTitle>
            <CardDescription>Comptes ayant accès à l&apos;espace client.</CardDescription>
          </CardHeader>
          <CardContent>
            {company.users.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun utilisateur.</p>
            ) : (
              <ul className="divide-y">
                {company.users.map((user) => (
                  <li key={user.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                      {!user.isActive ? (
                        <Badge variant="destructive">Inactif</Badge>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              {company.documents.length} document{company.documents.length > 1 ? "s" : ""} au
              coffre-fort.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["VALIDE", "text-success"],
                  ["EXPIRE_BIENTOT", "text-warning"],
                  ["EXPIRE", "text-destructive"],
                  ["SANS_ECHEANCE", "text-muted-foreground"],
                ] as [DocumentStatut, string][]
              ).map(([statut, color]) => (
                <div key={statut} className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className={`font-heading text-xl font-bold ${color}`}>
                    {statutCounts[statut]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_STATUT_LABELS[statut]}
                  </p>
                </div>
              ))}
            </div>
            {documentsExpires.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm font-semibold text-destructive">Documents expirés</p>
                <ul className="mt-1 space-y-1">
                  {documentsExpires.map((doc) => (
                    <li key={doc.id} className="text-sm text-destructive">
                      {doc.label} — expiré le {formatDate(doc.dateExpiration)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Équipe</CardTitle>
            <CardDescription>
              {company.employees.length} salarié{company.employees.length > 1 ? "s" : ""}{" "}
              référencé{company.employees.length > 1 ? "s" : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {company.employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun salarié référencé.</p>
            ) : (
              <ul className="divide-y">
                {company.employees.map((employee) => (
                  <li
                    key={employee.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-primary">
                      {employee.prenom} {employee.nom}
                    </p>
                    <p className="text-sm text-muted-foreground">{employee.poste}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matériel</CardTitle>
            <CardDescription>Parc matériel déclaré, par catégorie.</CardDescription>
          </CardHeader>
          <CardContent>
            {company.equipments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun matériel déclaré.</p>
            ) : (
              <ul className="divide-y">
                {(Object.entries(equipmentByCategory) as [EquipmentCategory, number][]).map(
                  ([categorie, count]) => (
                    <li
                      key={categorie}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <p className="text-sm text-primary">
                        {EQUIPMENT_CATEGORY_LABELS[categorie]}
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-primary">{count}</p>
                    </li>
                  )
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Références</CardTitle>
            <CardDescription>Chantiers réalisés mis en avant dans les dossiers.</CardDescription>
          </CardHeader>
          <CardContent>
            {company.references.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune référence enregistrée.</p>
            ) : (
              <ul className="divide-y">
                {company.references.map((reference) => (
                  <li
                    key={reference.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">
                        {reference.nomChantier}
                      </p>
                      <p className="text-xs text-muted-foreground">{reference.annee}</p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums text-primary">
                      {formatEuros(Number(reference.montantHT))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 gap-0 py-0">
        <CardHeader className="py-5">
          <CardTitle>Appels d&apos;offres</CardTitle>
          <CardDescription>
            {company.tenders.length} appel{company.tenders.length > 1 ? "s" : ""} d&apos;offres
            suivi{company.tenders.length > 1 ? "s" : ""} pour ce client.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 pb-0">
          {company.tenders.length === 0 ? (
            <p className="px-6 pb-5 text-sm text-muted-foreground">
              Aucun appel d&apos;offres pour ce client.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Objet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant estimé HT</TableHead>
                  <TableHead>Date limite</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.tenders.map((tender) => (
                  <TableRow key={tender.id}>
                    <TableCell className="max-w-md">
                      <Link
                        href={`/admin/appels-offres/${tender.id}`}
                        className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {tender.objet}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <TenderStatusBadge status={tender.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatEuros(toNumber(tender.montantEstimeHT))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(tender.dateLimite)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 gap-0 py-0">
        <CardHeader className="py-5">
          <CardTitle>Commissions du client</CardTitle>
          <CardDescription>
            Données strictement internes — jamais visibles côté client.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 pb-0">
          {company.commissions.length === 0 ? (
            <p className="px-6 pb-5 text-sm text-muted-foreground">
              Aucune commission pour ce client.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marché</TableHead>
                  <TableHead className="text-right">Montant marché HT</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="max-w-md">
                      <Link
                        href={`/admin/appels-offres/${commission.tenderId}`}
                        className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {commission.tender.objet}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatEuros(Number(commission.montantMarcheHT))}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatEuros(Number(commission.montantCommission))}
                    </TableCell>
                    <TableCell>
                      <CommissionStatusBadge status={commission.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatEuros(totalCommissions)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
