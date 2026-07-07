import { Trash2, Wrench } from "lucide-react";
import type { Disponibilite } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin } from "@/lib/auth/guards";
import { toEquipmentDTO } from "@/lib/dto";
import { deleteEquipment } from "@/actions/equipment";
import {
  DISPONIBILITE_LABELS,
  EQUIPMENT_CATEGORY_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
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
import { EmptyState } from "@/components/empty-state";
import { ConfirmButton } from "@/components/confirm-button";
import { EquipmentDialog } from "@/components/forms/equipment-dialog";

export const metadata = { title: "Matériel" };

const DISPONIBILITE_CLASSES: Record<Disponibilite, string> = {
  DISPONIBLE: "bg-success/15 text-success",
  PARTIELLE: "bg-warning/15 text-warning",
  INDISPONIBLE: "bg-destructive/10 text-destructive",
};

export default async function MaterielPage() {
  const { companyId } = await requireCompanyAdmin();

  const equipments = await prisma.equipment.findMany({
    where: { companyId },
    orderBy: [{ categorie: "asc" }, { nom: "asc" }],
  });
  const rows = equipments.map(toEquipmentDTO);

  return (
    <div>
      <PageHeader
        title="Matériel"
        description="Vos moyens matériels sont repris dans la partie « moyens » de vos dossiers d'appel d'offres."
      >
        <EquipmentDialog />
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Aucun matériel pour le moment"
          description="Ajoutez véhicules, machines et équipements pour compléter vos dossiers."
        >
          <EquipmentDialog />
        </EmptyState>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Parc matériel</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Disponibilité</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((equipment) => (
                  <TableRow key={equipment.id}>
                    <TableCell className="whitespace-nowrap">
                      {EQUIPMENT_CATEGORY_LABELS[equipment.categorie]}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {equipment.nom}
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">
                      {equipment.description ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{equipment.quantite}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                          DISPONIBILITE_CLASSES[equipment.disponibilite]
                        )}
                      >
                        {DISPONIBILITE_LABELS[equipment.disponibilite]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {equipment.photoKey ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/files/equipment/${equipment.id}`}
                          alt={equipment.nom}
                          className="h-10 rounded"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <EquipmentDialog equipment={equipment} />
                        <ConfirmButton
                          title="Supprimer le matériel"
                          description={`« ${equipment.nom} » sera définitivement supprimé.`}
                          confirmLabel="Supprimer"
                          onConfirm={deleteEquipment.bind(null, equipment.id)}
                        >
                          <Trash2 className="size-3.5" />
                          Supprimer
                        </ConfirmButton>
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
