import { cn } from "@/lib/utils";

function scoreTone(score: number) {
  if (score >= 70) return { text: "text-success", bar: "bg-success" };
  if (score >= 45) return { text: "text-warning", bar: "bg-warning" };
  return { text: "text-destructive", bar: "bg-destructive" };
}

/** Jauge de compatibilité IA (0–100). Affiche « — » si non analysé. */
export function CompatibilityGauge({
  score,
  className,
  compact = false,
}: {
  score: number | null;
  className?: string;
  compact?: boolean;
}) {
  if (score === null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
  }
  const tone = scoreTone(score);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", compact ? "w-12" : "w-20")}>
        <div
          className={cn("h-full rounded-full", tone.bar)}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className={cn("text-sm font-semibold tabular-nums", tone.text)}>{score}%</span>
    </div>
  );
}
