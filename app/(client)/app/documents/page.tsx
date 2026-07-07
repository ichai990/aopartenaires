import { CircleAlert, Clock, Download, FileText, ShieldCheck, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/auth/guards";
import { toDocumentDTO } from "@/lib/dto";
import { DOCUMENTS_STANDARDS, DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatFileSize } from "@/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DocumentStatutBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { DocumentUploadDialog } from "@/components/forms/document-upload-dialog";
import { DeleteDocumentButton } from "@/components/forms/delete-document-button";

export const metadata = { title: "Documents administratifs" };

export default async function DocumentsPage() {
  const { user, companyId } = await requireCompany();
  const isAdmin = user.role === "COMPANY_ADMIN";

  // Un employé ne voit que les documents rattachés à sa propre fiche.
  let employeeScopeId: string | null = null;
  if (!isAdmin) {
    const own = await prisma.employee.findFirst({
      where: { userId: user.id, companyId },
      select: { id: true },
    });
    employeeScopeId = own?.id ?? null;
  }

  const [documents, employees] = await Promise.all([
    isAdmin
      ? prisma.document.findMany({
          where: { companyId },
          orderBy: [{ type: "asc" }, { createdAt: "desc" }],
        })
      : employeeScopeId
        ? prisma.document.findMany({
            where: { companyId, employeeId: employeeScopeId },
            orderBy: [{ type: "asc" }, { createdAt: "desc" }],
          })
        : Promise.resolve([]),
    prisma.employee.findMany({
      where: { companyId },
      select: { id: true, nom: true, prenom: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
  ]);

  const rows = documents.map(toDocumentDTO);
  const employeeNames = new Map(employees.map((e) => [e.id, `${e.prenom} ${e.nom}`]));

  // Un document sans échéance (RIB…) est utilisable : compté comme valide.
  const valides = rows.filter(
    (d) => d.statut === "VALIDE" || d.statut === "SANS_ECHEANCE"
  ).length;
  const expirentBientot = rows.filter((d) => d.statut === "EXPIRE_BIENTOT").length;
  const expires = rows.filter((d) => d.statut === "EXPIRE").length;

  // Aligné sur l'analyse IA : un type couvert uniquement par des documents
  // expirés compte comme « à renouveler », pas comme présent.
  const typesUtilisables = new Set(
    rows.filter((d) => d.statut !== "EXPIRE").map((d) => d.type)
  );
  const typesPresents = new Set(rows.map((d) => d.type));
  const standardsManquants = DOCUMENTS_STANDARDS.filter((t) => !typesPresents.has(t));
  const standardsARenouveler = DOCUMENTS_STANDARDS.filter(
    (t) => typesPresents.has(t) && !typesUtilisables.has(t)
  );

  return (
    <div>
      <PageHeader
        title="Documents administratifs"
        description={
          isAdmin
            ? "Kbis, attestations, assurances… toutes les pièces réutilisées dans vos dossiers d'appel d'offres."
            : "Les documents rattachés à votre fiche salarié (habilitations, CACES…)."
        }
      >
        <DocumentUploadDialog
          employees={isAdmin ? employees : []}
          hideEmployeeField={!isAdmin}
        />
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Documents valides" value={valides} icon={ShieldCheck} tone="success" />
        <StatCard
          label="Expirent bientôt"
          value={expirentBientot}
          icon={Clock}
          tone={expirentBientot > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Documents expirés"
          value={expires}
          icon={TriangleAlert}
          tone={expires > 0 ? "danger" : "default"}
        />
      </div>

      {isAdmin && (standardsManquants.length > 0 || standardsARenouveler.length > 0) ? (
        <Alert className="mb-6 border border-warning/40 bg-warning/10">
          <CircleAlert className="text-warning" />
          <AlertTitle>
            {standardsManquants.length + standardsARenouveler.length > 1
              ? `${standardsManquants.length + standardsARenouveler.length} documents standards à traiter`
              : "1 document standard à traiter"}
          </AlertTitle>
          <AlertDescription>
            {standardsManquants.length > 0 ? (
              <span>
                À ajouter :{" "}
                {standardsManquants.map((t) => DOCUMENT_TYPE_LABELS[t]).join(", ")}.
              </span>
            ) : null}
            {standardsARenouveler.length > 0 ? (
              <span>
                À renouveler (expirés) :{" "}
                {standardsARenouveler.map((t) => DOCUMENT_TYPE_LABELS[t]).join(", ")}.
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun document pour le moment"
          description="Téléversez vos pièces administratives pour les retrouver dans tous vos dossiers."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Toutes les pièces</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Salarié lié</TableHead>
                  <TableHead>Émission</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">{doc.label}</span>
                      {doc.commentaireAdmin ? (
                        <p className="mt-0.5 max-w-56 text-xs text-warning">
                          {doc.commentaireAdmin}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {doc.employeeId ? employeeNames.get(doc.employeeId) ?? "—" : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(doc.dateEmission)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(doc.dateExpiration)}
                    </TableCell>
                    <TableCell>
                      <DocumentStatutBadge statut={doc.statut} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatFileSize(doc.sizeBytes)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <a href={`/api/files/document/${doc.id}`} target="_blank">
                            <Download className="size-3.5" />
                            Télécharger
                          </a>
                        </Button>
                        {isAdmin ? (
                          <DeleteDocumentButton documentId={doc.id} label={doc.label} />
                        ) : null}
                      </div>
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
