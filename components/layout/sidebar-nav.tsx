"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/branding/logo";
import { logoutAction } from "@/actions/auth";
import { NAV_ICONS } from "./nav-icons";
import type { NavItem, ShellUser } from "./app-shell";

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({
  items,
  className,
  onNavigate,
}: {
  items: NavItem[];
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className={className}>
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                {active ? (
                  <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-sidebar-primary" />
                ) : null}
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SidebarUser({ user }: { user: ShellUser }) {
  return (
    <div className="border-t border-sidebar-border p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
          {user.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
            {user.name}
          </p>
          <p className="truncate text-xs text-sidebar-muted">{user.roleLabel}</p>
        </div>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            className="text-sidebar-muted hover:bg-sidebar-accent hover:text-white"
            title="Se déconnecter"
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export function MobileSidebar({
  items,
  user,
  badge,
}: {
  items: NavItem[];
  user: ShellUser;
  badge?: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="border-b border-sidebar-border px-5 py-4">
          <SheetTitle asChild>
            <div>
              <Logo dark />
            </div>
          </SheetTitle>
        </SheetHeader>
        {badge ? (
          <div className="mx-5 mt-4 rounded-md bg-sidebar-accent px-3 py-1.5 text-xs font-semibold tracking-wide text-sidebar-accent-foreground uppercase">
            {badge}
          </div>
        ) : null}
        <SidebarNav items={items} className="flex-1 overflow-y-auto px-3 py-4" />
        <SidebarUser user={user} />
      </SheetContent>
    </Sheet>
  );
}
