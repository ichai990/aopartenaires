import { CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChecklistItemData = {
  libelle: string;
  fait: boolean;
  detail?: string | null;
};

/** Affichage d'une checklist (administrative / technique / financière). */
export function ChecklistView({ items }: { items: ChecklistItemData[] }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun élément.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          {item.fait ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          )}
          <div className="min-w-0">
            <p className={cn("text-sm", item.fait ? "text-foreground" : "font-medium")}>
              {item.libelle}
            </p>
            {item.detail ? (
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
