import Link from "next/link";
import { BadgeEuro, HandCoins, Lock, Receipt, Trophy } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEuros } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { CommissionStatusBadge } from "@/components/admin/manage/commission-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Commissions — Admin BTPilot" };

/** Barème progressif par tranche (statique, documentaire). */
const BAREME_TRANCHES = [
  { tranche: "0 – 100 000 €", taux: "10 %" },
  { tranche: "100 000 – 1 000 000 €", taux: "7 %" },
  { tranche: "1 – 10 M€", taux: "4 %" },
  { tranche: "> 10 M€", taux: "2,5 %" },
];

type BaremeTranche = {
  de?: number;
  a?: number | null;
  taux?: number;
  assiette?: number;
  montant?: number;
};

/** Résumé compact du détail par tranche stocké en Json : « 10 000 € + 14 000 € ». */
function resumeBareme(bareme: unknown): string {
  if (!Array.isArray(bareme)) return "—";
  const montants = (bareme as BaremeTranche[])
    .map((t) => Number(t?.montant ?? 0))
    .filter((m) => m > 0);
  if (montants.length === 0) return "—";
  return montants.map((m) => formatEuros(m)).join(" + ");
}

export default async function AdminCommissionsPage() {
  await requireSuperAdmin();

  const [potentielles, gagnees, facturees, commissions] = await Promise.all([
    prisma.commission.aggregate({
      _sum: { montantCommission: true },
      where: { status: "POTENTIELLE" },
    }),
    prisma.commission.aggregate({
      _sum: { montantCommission: true },
      where: { status: "GAGNEE" },
    }),
    prisma.commission.aggregate({
      _sum: { montantCommission: true },
      where: { status: "FACTUREE" },
    }),
    prisma.commission.findMany({
      include: { tender: true, company: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Commissions"
        description="Suivi du modèle économique BTPilot : commission au succès, par tranche de marché."
      />

      <Alert className="mb-6">
        <Lock />
        <AlertTitle>Données strictement internes — jamais visibles côté client.</AlertTitle>
        <AlertDescription>
          Les montants de commission ne transitent jamais vers l&apos;espace client.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Potentielles"
          value={formatEuros(Number(potentielles._sum.montantCommission ?? 0))}
          icon={HandCoins}
          tone="warning"
        />
        <StatCard
          label="Gagnées"
          value={formatEuros(Number(gagnees._sum.montantCommission ?? 0))}
          icon={Trophy}
          tone="success"
        />
        <StatCard
          label="Facturées"
          value={formatEuros(Number(facturees._sum.montantCommission ?? 0))}
          icon={Receipt}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Barème progressif par tranche</CardTitle>
          <CardDescription>
            La commission est calculée tranche par tranche sur le montant du marché HT.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tranche de marché HT</TableHead>
                  <TableHead className="text-right">Taux</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {BAREME_TRANCHES.map((row) => (
                  <TableRow key={row.tranche}>
                    <TableCell className="whitespace-nowrap">{row.tranche}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.taux}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Exemple : « Marché de 300 000 € HT → 100 000 × 10 % + 200 000 × 7 % =
            24 000 € HT ».
          </p>
        </CardContent>
      </Card>

      <div className="mt-6">
        {commissions.length === 0 ? (
          <EmptyState
            icon={BadgeEuro}
            title="Aucune commission"
            description="Les commissions sont créées automatiquement lorsqu'un appel d'offres est marqué gagné."
          />
        ) : (
          <Card className="py-0">
            <CardContent className="overflow-x-auto px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Marché</TableHead>
                    <TableHead className="text-right">Montant marché HT</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Détail des tranches</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Mise à jour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="whitespace-nowrap">
                        <Link
                          href={`/admin/clients/${commission.companyId}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {commission.company.raisonSociale}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <Link
                          href={`/admin/appels-offres/${commission.tenderId}`}
                          className="block truncate text-primary underline-offset-4 hover:underline"
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
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {resumeBareme(commission.bareme)}
                      </TableCell>
                      <TableCell>
                        <CommissionStatusBadge status={commission.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(commission.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
