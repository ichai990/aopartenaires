import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 py-4", className)}>
      <CardContent className="flex items-center gap-4 px-4">
        <div
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", {
            "bg-secondary text-primary": tone === "default",
            "bg-success/15 text-success": tone === "success",
            "bg-warning/15 text-warning": tone === "warning",
            "bg-destructive/10 text-destructive": tone === "danger",
          })}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="font-heading text-2xl font-bold text-primary">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
