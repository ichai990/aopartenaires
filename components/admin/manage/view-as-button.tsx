"use client";

import { useTransition } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startImpersonation } from "@/actions/admin";

/** Bascule le super admin sur l'espace client de l'entreprise. */
export function ViewAsButton({
  companyId,
  size = "sm",
  label = "Voir l'espace client",
}: {
  companyId: string;
  size?: "xs" | "sm" | "default";
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={pending}
      onClick={() => startTransition(() => startImpersonation(companyId))}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
      {label}
    </Button>
  );
}
