import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin } from "@/lib/auth/guards";
import { toDocumentDTO, toEmployeeDTO } from "@/lib/dto";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { formatFileSize } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DocumentStatutBadge } from "@/components/status-badge";
import { EmployeeForm } from "@/components/forms/employee-form";
import { DeleteEmployeeButton } from "@/components/forms/delete-employee-button";

export const metadata = { title: "Fiche salarié" };

export default async function FicheSalariePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { companyId } = await requireCompanyAdmin();
  const { id } = await params;

  const employee = await prisma.employee.findFirst({
    where: { id, companyId },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!employee) notFound();

  const dto = toEmployeeDTO(employee);
  const documents = employee.documents.map(toDocumentDTO);

  return (
    <div>
      <PageHeader
        title={`${employee.prenom} ${employee.nom}`}
        description={employee.poste}
      >
        <DeleteEmployeeButton
          employeeId={employee.id}
          name={`${employee.prenom} ${employee.nom}`}
        />
      </PageHeader>

      <div className="space-y-6">
        <EmployeeForm employee={dto} />

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">CV court auto-généré</CardTitle>
            <CardDescription>
              Généré à partir de la fiche, ce CV est joint aux dossiers d&apos;appel
              d&apos;offres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employee.cvGenere ? (
              <p className="text-sm whitespace-pre-wrap text-foreground">
                {employee.cvGenere}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Le CV sera généré au premier enregistrement de la fiche.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Documents liés</CardTitle>
            <CardDescription>
              Habilitations, CACES, attestations… rattachés à ce salarié.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun document rattaché à ce salarié pour le moment.
              </p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <a
                      href={`/api/files/document/${doc.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                    >
                      <Download className="size-3.5 shrink-0" />
                      {doc.label}
                      <span className="text-xs text-muted-foreground">
                        ({DOCUMENT_TYPE_LABELS[doc.type]} · {formatFileSize(doc.sizeBytes)})
                      </span>
                    </a>
                    <DocumentStatutBadge statut={doc.statut} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
