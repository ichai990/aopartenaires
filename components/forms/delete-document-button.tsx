"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteDocument } from "@/actions/documents";

export function DeleteDocumentButton({
  documentId,
  label,
}: {
  documentId: string;
  label: string;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      title="Supprimer le document"
      description={`« ${label} » sera définitivement supprimé.`}
      confirmLabel="Supprimer"
      onConfirm={async () => {
        const result = await deleteDocument(documentId);
        if (result.ok) {
          toast.success("Document supprimé.");
          router.refresh();
        }
        return result;
      }}
    >
      <Trash2 className="size-3.5" />
      Supprimer
    </ConfirmButton>
  );
}
