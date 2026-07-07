"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteEmployee } from "@/actions/employees";

export function DeleteEmployeeButton({
  employeeId,
  name,
}: {
  employeeId: string;
  name: string;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      title="Supprimer la fiche salarié"
      description={`La fiche de ${name} sera définitivement supprimée.`}
      confirmLabel="Supprimer"
      onConfirm={async () => {
        const result = await deleteEmployee(employeeId);
        if (result.ok) {
          toast.success("Fiche salarié supprimée.");
          router.push("/app/equipe");
          router.refresh();
        }
        return result;
      }}
    >
      <Trash2 className="size-3.5" />
      Supprimer la fiche
    </ConfirmButton>
  );
}
