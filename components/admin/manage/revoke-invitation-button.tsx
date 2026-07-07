"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { revokeInvitation } from "@/actions/admin";

/** Révocation d'une invitation en attente (avec confirmation). */
export function RevokeInvitationButton({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const router = useRouter();

  return (
    <ConfirmButton
      title="Révoquer l'invitation"
      description={`Le lien d'invitation envoyé à ${email} cessera immédiatement de fonctionner. Cette action est définitive.`}
      confirmLabel="Révoquer"
      variant="destructive"
      size="sm"
      onConfirm={async () => {
        const result = await revokeInvitation(invitationId);
        if (result.ok) router.refresh();
        return result;
      }}
    >
      <Ban className="size-3.5" />
      Révoquer
    </ConfirmButton>
  );
}
