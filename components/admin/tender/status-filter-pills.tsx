import Link from "next/link";
import type { TenderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { TENDER_STATUS_LABELS } from "@/lib/constants";

const PILL_CLASSES =
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors";

/** Filtres rapides par statut d'AO (liens-pills basés sur ?statut=). */
export function StatusFilterPills({
  basePath,
  current,
}: {
  basePath: string;
  current: TenderStatus | null;
}) {
  const statuses = Object.keys(TENDER_STATUS_LABELS) as TenderStatus[];
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      <Link
        href={basePath}
        className={cn(
          PILL_CLASSES,
          current === null
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground hover:text-primary"
        )}
      >
        Tous
      </Link>
      {statuses.map((status) => (
        <Link
          key={status}
          href={`${basePath}?statut=${status}`}
          className={cn(
            PILL_CLASSES,
            current === status
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-primary"
          )}
        >
          {TENDER_STATUS_LABELS[status]}
        </Link>
      ))}
    </div>
  );
}
