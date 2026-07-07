import { requireSuperAdmin } from "@/lib/auth/guards";
import { ROLE_LABELS } from "@/lib/constants";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: "dashboard", exact: true },
  { href: "/admin/leads", label: "Leads du site", icon: "leads" },
  { href: "/admin/clients", label: "Clients", icon: "clients" },
  { href: "/admin/invitations", label: "Invitations", icon: "invitations" },
  { href: "/admin/appels-offres", label: "Appels d'offres", icon: "tenders" },
  { href: "/admin/dossiers", label: "Dossiers", icon: "proposals" },
  { href: "/admin/validations", label: "Validations", icon: "validations" },
  { href: "/admin/commissions", label: "Commissions", icon: "commissions" },
  { href: "/admin/documents-expires", label: "Documents expirés", icon: "expiredDocs" },
  { href: "/admin/sources", label: "Veille & sources", icon: "sources" },
  { href: "/admin/parametres-ia", label: "Paramètres IA", icon: "ai" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperAdmin();

  return (
    <AppShell
      items={ADMIN_NAV}
      badge="Espace interne"
      user={{
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        roleLabel: ROLE_LABELS[user.role],
      }}
    >
      {children}
    </AppShell>
  );
}
