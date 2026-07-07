import { cn } from "@/lib/utils";
import { TENDER_STATUS_LABELS, TENDER_STATUS_TONE } from "@/lib/constants";
import {
  DOCUMENT_STATUT_LABELS,
  DOCUMENT_STATUT_TONE,
  type DocumentStatut,
} from "@/lib/services/documents";
import type { TenderStatus } from "@prisma/client";

const TONE_CLASSES = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-secondary text-secondary-foreground",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  danger: "bg-destructive/10 text-destructive",
} as const;

function Pill({
  tone,
  children,
  className,
}: {
  tone: keyof typeof TONE_CLASSES;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", {
          "bg-muted-foreground": tone === "neutral",
          "bg-primary": tone === "info",
          "bg-warning": tone === "warning",
          "bg-success": tone === "success",
          "bg-destructive": tone === "danger",
        })}
      />
      {children}
    </span>
  );
}

export function TenderStatusBadge({
  status,
  className,
}: {
  status: TenderStatus;
  className?: string;
}) {
  return (
    <Pill tone={TENDER_STATUS_TONE[status]} className={className}>
      {TENDER_STATUS_LABELS[status]}
    </Pill>
  );
}

export function DocumentStatutBadge({
  statut,
  className,
}: {
  statut: DocumentStatut;
  className?: string;
}) {
  return (
    <Pill tone={DOCUMENT_STATUT_TONE[statut]} className={className}>
      {DOCUMENT_STATUT_LABELS[statut]}
    </Pill>
  );
}
