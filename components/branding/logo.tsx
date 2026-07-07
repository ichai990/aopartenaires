import { cn } from "@/lib/utils";

/**
 * Marque BTPilot — casque de chantier stylisé + maillon vert
 * (dérivé de la charte AO Partenaires : bleu nuit / vert énergie).
 */
export function LogoMark({
  className,
  color = "currentColor",
  accent = "#15A37A",
}: {
  className?: string;
  color?: string;
  accent?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* casque */}
      <path
        d="M8 30c0-9 7-16 16-16s16 7 16 16"
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path d="M24 14v-4" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
      {/* visière */}
      <path d="M5 33h38" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
      {/* maillon vert : la trajectoire vers le marché gagné */}
      <path
        d="M18 41h12"
        stroke={accent}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  dark = false,
}: {
  className?: string;
  /** true sur fond bleu nuit (sidebar) */
  dark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark
        className="size-8 shrink-0"
        color={dark ? "#FFFFFF" : "#0E2A47"}
      />
      <div className="leading-none">
        <span
          className={cn(
            "font-heading text-lg font-extrabold tracking-wide",
            dark ? "text-white" : "text-primary"
          )}
        >
          BTPilot
        </span>
        <span
          className={cn(
            "block text-[0.6rem] font-medium tracking-[0.18em] uppercase",
            dark ? "text-sidebar-muted" : "text-muted-foreground"
          )}
        >
          Appels d&apos;offres BTP
        </span>
      </div>
    </div>
  );
}
