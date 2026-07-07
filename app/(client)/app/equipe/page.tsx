import Link from "next/link";
import { ArrowRight, Plus, Users } from "lucide-react";
import type { Disponibilite } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin } from "@/lib/auth/guards";
import { DISPONIBILITE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Équipe" };

const DISPONIBILITE_CLASSES: Record<Disponibilite, string> = {
  DISPONIBLE: "bg-success/15 text-success",
  PARTIELLE: "bg-warning/15 text-warning",
  INDISPONIBLE: "bg-destructive/10 text-destructive",
};

function initiales(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export default async function EquipePage() {
  const { companyId } = await requireCompanyAdmin();

  const employees = await prisma.employee.findMany({
    where: { companyId },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Équipe"
        description="Les fiches de vos salariés alimentent les CV courts et les moyens humains de vos dossiers."
      >
        <Button asChild>
          <Link href="/app/equipe/nouveau">
            <Plus className="size-4" />
            Ajouter un salarié
          </Link>
        </Button>
      </PageHeader>

      {employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun salarié pour le moment"
          description="Ajoutez vos salariés : compétences, habilitations et disponibilités seront reprises dans vos dossiers."
        >
          <Button asChild>
            <Link href="/app/equipe/nouveau">
              <Plus className="size-4" />
              Ajouter un salarié
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {employees.map((employee) => {
            const extra = employee.competences.length - 3;
            return (
              <Card key={employee.id}>
                <CardContent className="flex h-full flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
                      {initiales(employee.prenom, employee.nom)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-primary">
                        {employee.prenom} {employee.nom}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {employee.poste}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                        DISPONIBILITE_CLASSES[employee.disponibilite]
                      )}
                    >
                      {DISPONIBILITE_LABELS[employee.disponibilite]}
                    </span>
                  </div>

                  {employee.competences.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {employee.competences.slice(0, 3).map((competence) => (
                        <Badge key={competence} variant="secondary">
                          {competence}
                        </Badge>
                      ))}
                      {extra > 0 ? <Badge variant="outline">+{extra}</Badge> : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucune compétence renseignée.
                    </p>
                  )}

                  <div className="mt-auto">
                    <Link
                      href={`/app/equipe/${employee.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Voir la fiche
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
