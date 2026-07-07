import { Download, FileCheck2 } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_EXPIRY_WARNING_DAYS } from "@/lib/constants";
import { formatDate, formatRelative } from "@/lib/format";
import { computeDocumentStatut } from "@/lib/services/documents";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DocumentStatutBadge } from "@/components/status-badge";
import { DocCommentPopover } from "@/components/admin/manage/doc-comment-popover";
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

export const metadata = { title: "Documents expirés — Admin BTPilot" };

export default async function AdminDocumentsExpiresPage() {
  await requireSuperAdmin();

  const limite = new Date();
  limite.setDate(limite.getDate() + DOCUMENT_EXPIRY_WARNING_DAYS);

  const documents = await prisma.document.findMany({
    where: { dateExpiration: { not: null, lt: limite } },
    include: { company: true, employee: true },
    orderBy: { dateExpiration: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Documents expirés"
        description={`Tous clients confondus : documents expirés ou expirant sous ${DOCUMENT_EXPIRY_WARNING_DAYS} jours.`}
      />

      {documents.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="Aucun document à surveiller"
          description="Tous les documents clients sont à jour : aucune expiration sous 30 jours."
        />
      ) : (
        <Card className="py-0">
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Salarié lié</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Commentaire admin</TableHead>
                  <TableHead className="text-right">Télécharger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="whitespace-nowrap font-medium text-primary">
                      {document.company.raisonSociale}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {DOCUMENT_TYPE_LABELS[document.type]}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="block truncate" title={document.label}>
                        {document.label}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {document.employee
                        ? `${document.employee.prenom} ${document.employee.nom}`
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-medium">{formatDate(document.dateExpiration)}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        ({formatRelative(document.dateExpiration)})
                      </span>
                    </TableCell>
                    <TableCell>
                      <DocumentStatutBadge
                        statut={computeDocumentStatut(document.dateExpiration)}
                      />
                    </TableCell>
                    <TableCell>
                      <DocCommentPopover
                        documentId={document.id}
                        comment={document.commentaireAdmin}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <a href={`/api/files/document/${document.id}`}>
                          <Download className="size-3.5" />
                          Télécharger
                        </a>
                      </Button>
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
