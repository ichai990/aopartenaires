import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_STEPS } from "@/lib/workflow/tender-status";
import type { TenderStatus } from "@prisma/client";

/**
 * Frise du workflow : DCE importé → Analyse → Dossier → Validation → Dépôt → Résultat.
 */
export function WorkflowStepper({ status }: { status: TenderStatus }) {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.status.includes(status));
  const lost = status === "PERDU";

  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {WORKFLOW_STEPS.map((step, i) => {
        const done = i < currentIndex || status === "GAGNE";
        const current = i === currentIndex;
        return (
          <li key={step.label} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold",
                  done && !lost && "bg-success text-success-foreground",
                  current && !lost && "bg-primary text-primary-foreground",
                  current && lost && "bg-destructive text-white",
                  !done && !current && "bg-muted text-muted-foreground"
                )}
              >
                {done && !lost ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  current ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < WORKFLOW_STEPS.length - 1 ? (
              <span
                className={cn(
                  "mx-2 h-px w-6 sm:w-10",
                  i < currentIndex ? "bg-success" : "bg-border"
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
