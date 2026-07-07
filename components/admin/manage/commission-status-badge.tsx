import type { CommissionStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { COMMISSION_STATUS_LABELS } from "@/lib/constants";

const TONE_CLASSES: Record<CommissionStatus, string> = {
  POTENTIELLE: "bg-warning/15 text-warning",
  GAGNEE: "bg-success/15 text-success",
  FACTUREE: "bg-secondary text-secondary-foreground",
  ANNULEE: "bg-destructive/10 text-destructive",
};

const DOT_CLASSES: Record<CommissionStatus, string> = {
  POTENTIELLE: "bg-warning",
  GAGNEE: "bg-success",
  FACTUREE: "bg-primary",
  ANNULEE: "bg-destructive",
};

/** Badge coloré du statut d'une commission (espace admin uniquement). */
export function CommissionStatusBadge({
  status,
  className,
}: {
  status: CommissionStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES[status],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT_CLASSES[status])} />
      {COMMISSION_STATUS_LABELS[status]}
    </span>
  );
}
