import { Logo } from "@/components/branding/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Logo className="mb-8" />
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        {children}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        BTPilot — Vos marchés publics du bâtiment, pilotés de A à Z.
      </p>
    </div>
  );
}
