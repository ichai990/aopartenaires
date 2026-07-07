import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { SidebarNav, SidebarUser, MobileSidebar } from "./sidebar-nav";

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof import("./nav-icons").NAV_ICONS;
  /** correspondance exacte du chemin (sinon préfixe) */
  exact?: boolean;
};

export type ShellUser = {
  name: string;
  email: string;
  roleLabel: string;
};

/**
 * Coquille commune aux espaces client et admin :
 * sidebar bleu nuit fixe (desktop) / Sheet (mobile), contenu off-white.
 */
export function AppShell({
  items,
  user,
  badge,
  children,
}: {
  items: NavItem[];
  user: ShellUser;
  /** étiquette sous le logo (ex. « Espace admin ») */
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Logo dark />
        </div>
        {badge ? (
          <div className="mx-5 mt-4 rounded-md bg-sidebar-accent px-3 py-1.5 text-xs font-semibold tracking-wide text-sidebar-accent-foreground uppercase">
            {badge}
          </div>
        ) : null}
        <SidebarNav items={items} className="flex-1 overflow-y-auto px-3 py-4" />
        <SidebarUser user={user} />
      </aside>

      {/* Contenu */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Topbar mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <MobileSidebar items={items} user={user} badge={badge} />
          <Logo />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export type { LucideIcon };
