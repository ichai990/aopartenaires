import { redirect } from "next/navigation";
import { Download, UserRound } from "lucide-react";
import type { Disponibilite } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/auth/guards";
import { toDocumentDTO, toEmployeeDTO } from "@/lib/dto";
import { DISPONIBILITE_LABELS, DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DocumentStatutBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { SelfProfileForm } from "@/components/forms/self-profile-form";
import { DocumentUploadDialog } from "@/components/forms/document-upload-dialog";

export const metadata = { title: "Mon profil" };

const DISPONIBILITE_CLASSES: Record<Disponibilite, string> = {
  DISPONIBLE: "bg-success/15 text-success",
  PARTIELLE: "bg-warning/15 text-warning",
  INDISPONIBLE: "bg-destructive/10 text-destructive",
};

export default async function MonProfilPage() {
  const { user, companyId } = await requireCompany();
  if (user.role === "COMPANY_ADMIN") redirect("/app/equipe");

  const employee = await prisma.employee.findFirst({
    where: { userId: user.id, companyId },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });

  if (!employee) {
    return (
      <div>
        <PageHeader
          title="Mon profil"
          description="Complétez votre fiche : elle alimente les dossiers d'appel d'offres de votre entreprise."
        />
        <EmptyState
          icon={UserRound}
          title="Aucune fiche salarié liée à votre compte"
          description="Demandez à votre dirigeant de créer votre fiche salarié pour compléter votre profil."
        />
      </div>
    );
  }

  const dto = toEmployeeDTO(employee);
  const documents = employee.documents.map(toDocumentDTO);

  return (
    <div>
      <PageHeader
        title="Mon profil"
        description="Complétez vos compétences, habilitations et formations : elles alimentent les dossiers d'appel d'offres."
      />

      <div className="space-y-6">
        {/* ── Identité (lecture seule) ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Ma fiche</CardTitle>
            <CardDescription>
              Ces informations sont gérées par votre dirigeant.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
              {`${employee.prenom.charAt(0)}${employee.nom.charAt(0)}`.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-primary">
                {employee.prenom} {employee.nom}
              </p>
              <p className="text-sm text-muted-foreground">{employee.poste}</p>
            </div>
            <span
              className={cn(
                "ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                DISPONIBILITE_CLASSES[employee.disponibilite]
              )}
            >
              {DISPONIBILITE_LABELS[employee.disponibilite]}
            </span>
          </CardContent>
        </Card>

        <SelfProfileForm employee={dto} />

        {/* ── CV court ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">CV court auto-généré</CardTitle>
            <CardDescription>
              Généré à partir de votre fiche, ce CV est joint aux dossiers d&apos;appel
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
                Le CV sera généré au premier enregistrement de votre profil.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Documents liés ── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-primary">Mes documents</CardTitle>
                <CardDescription className="mt-1">
                  Habilitations, CACES, attestations… rattachés à votre fiche.
                </CardDescription>
              </div>
              <DocumentUploadDialog hideEmployeeField />
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun document rattaché à votre fiche pour le moment.
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
