import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Validation } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const metadata = { title: "Validations — Admin BTPilot" };

const ELEMENTS: { key: keyof Validation; label: string }[] = [
  { key: "prixValide", label: "Prix" },
  { key: "delaisValides", label: "Délais" },
  { key: "moyensHumainsValides", label: "Moyens humains" },
  { key: "moyensMaterielsValides", label: "Moyens matériels" },
  { key: "engagementsValides", label: "Engagements" },
  { key: "autorisationDepot", label: "Dépôt autorisé" },
];

/** 6 pastilles : une par élément validé par le dirigeant. */
function ElementsValides({ validation }: { validation: Validation }) {
  return (
    <div className="flex items-center gap-1">
      {ELEMENTS.map(({ key, label }) => {
        const valide = Boolean(validation[key]);
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  valide ? "bg-success" : "bg-destructive/40"
                )}
              />
            </TooltipTrigger>
            <TooltipContent>
              {label} — {valide ? "validé" : "non validé"}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default async function AdminValidationsPage() {
  await requireSuperAdmin();

  const [validations, auditLogs] = await Promise.all([
    prisma.validation.findMany({
      include: {
        user: true,
        proposalVersion: {
          include: {
            proposal: {
              include: { tender: { include: { company: true } } },
            },
          },
        },
      },
      orderBy: { validatedAt: "desc" },
    }),
    prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <TooltipProvider>
      <div>
        <PageHeader
          title="Validations"
          description="Journal horodaté des validations dirigeant — preuve de ce qui a été approuvé, jamais modifié."
        />

        {validations.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Aucune validation"
            description="Les validations des dirigeants apparaîtront ici avec leur empreinte et leur adresse IP."
          />
        ) : (
          <Card className="py-0">
            <CardContent className="overflow-x-auto px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Marché</TableHead>
                    <TableHead>Dirigeant</TableHead>
                    <TableHead className="text-center">Version</TableHead>
                    <TableHead>Éléments validés</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead>Commentaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validations.map((validation) => {
                    const tender = validation.proposalVersion.proposal.tender;
                    return (
                      <TableRow key={validation.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateTime(validation.validatedAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {tender.company.raisonSociale}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <Link
                            href={`/admin/appels-offres/${tender.id}`}
                            className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {tender.objet}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {validation.user.firstName} {validation.user.lastName}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          n°{validation.proposalVersion.versionNumber}
                        </TableCell>
                        <TableCell>
                          <ElementsValides validation={validation} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">
                          {validation.ipAddress}
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-mono text-xs">
                                {validation.contentHash.slice(0, 8)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md break-all font-mono">
                              {validation.contentHash}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {validation.commentaire ? (
                            <span className="block truncate text-sm" title={validation.commentaire}>
                              {validation.commentaire}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6 gap-0 py-0">
          <CardHeader className="py-5">
            <CardTitle>Audit log</CardTitle>
            <CardDescription>Les 30 dernières actions tracées sur la plateforme.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0 pb-0">
            {auditLogs.length === 0 ? (
              <p className="px-6 pb-5 text-sm text-muted-foreground">
                Aucune entrée d&apos;audit pour le moment.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs font-medium">
                        {log.action}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {log.ipAddress ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
