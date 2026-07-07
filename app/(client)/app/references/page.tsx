import { Building2, CalendarDays, Clock, Phone, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin } from "@/lib/auth/guards";
import { toReferenceDTO } from "@/lib/dto";
import { deleteReference } from "@/actions/references";
import { DOMAINE_LABELS } from "@/lib/constants";
import { formatEuros } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmButton } from "@/components/confirm-button";
import { ReferenceDialog } from "@/components/forms/reference-dialog";

export const metadata = { title: "Références chantiers" };

export default async function ReferencesPage() {
  const { companyId } = await requireCompanyAdmin();

  const references = await prisma.reference.findMany({
    where: { companyId },
    orderBy: [{ annee: "desc" }, { montantHT: "desc" }],
  });
  const rows = references.map(toReferenceDTO);

  return (
    <div>
      <PageHeader
        title="Références chantiers"
        description="Vos chantiers passés : les plus pertinents sont sélectionnés automatiquement pour chaque dossier."
      >
        <ReferenceDialog />
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune référence pour le moment"
          description="Ajoutez vos chantiers passés : ils valorisent votre expérience auprès des acheteurs."
        >
          <ReferenceDialog />
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((reference) => (
            <Card key={reference.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-primary">{reference.nomChantier}</CardTitle>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {reference.client}
                    </p>
                  </div>
                  <Badge variant="secondary">{DOMAINE_LABELS[reference.domaine]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-semibold text-primary">
                    {formatEuros(reference.montantHT)} HT
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {reference.annee}
                  </span>
                  {reference.dureeMois ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3.5" />
                      {reference.dureeMois} mois
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-medium text-foreground">
                  {reference.prestation}
                </p>
                {reference.description ? (
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {reference.description}
                  </p>
                ) : null}
                {reference.contactAutorise ? (
                  <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5 text-sm">
                    <Phone className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        Contact : {reference.contactNom ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[reference.contactTelephone, reference.contactEmail]
                          .filter(Boolean)
                          .join(" · ") || "Coordonnées à compléter"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <ReferenceDialog reference={reference} />
                <ConfirmButton
                  title="Supprimer la référence"
                  description={`« ${reference.nomChantier} » sera définitivement supprimée.`}
                  confirmLabel="Supprimer"
                  onConfirm={deleteReference.bind(null, reference.id)}
                >
                  <Trash2 className="size-3.5" />
                  Supprimer
                </ConfirmButton>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
