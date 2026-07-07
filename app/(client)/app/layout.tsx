import { Eye } from "lucide-react";
import { requireCompany } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/constants";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { stopImpersonation } from "@/actions/admin";

const ADMIN_ITEMS: NavItem[] = [
  { href: "/app", label: "Tableau de bord", icon: "dashboard", exact: true },
  { href: "/app/appels-offres", label: "Appels d'offres", icon: "tenders" },
  { href: "/app/entreprise", label: "Mon entreprise", icon: "company" },
  { href: "/app/documents", label: "Documents", icon: "documents" },
  { href: "/app/equipe", label: "Équipe", icon: "team" },
  { href: "/app/materiel", label: "Matériel", icon: "equipment" },
  { href: "/app/references", label: "Références", icon: "references" },
  { href: "/app/prix", label: "Prix types", icon: "pricing" },
  { href: "/app/parametres", label: "Paramètres", icon: "settings" },
];

const EMPLOYEE_ITEMS: NavItem[] = [
  { href: "/app/mon-profil", label: "Mon profil", icon: "profile" },
  { href: "/app/documents", label: "Mes documents", icon: "documents" },
  { href: "/app/parametres", label: "Paramètres", icon: "settings" },
];

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, companyId, impersonated } = await requireCompany();
  const items = user.role === "COMPANY_ADMIN" ? ADMIN_ITEMS : EMPLOYEE_ITEMS;

  const company = impersonated
    ? await prisma.company.findUnique({
        where: { id: companyId },
        select: { raisonSociale: true },
      })
    : null;

  return (
    <AppShell
      items={items}
      user={{
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        roleLabel: impersonated ? "Admin BTPilot · consultation" : ROLE_LABELS[user.role],
      }}
    >
      {impersonated ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Eye className="size-4 text-warning" />
            Vous consultez l&apos;espace client de{" "}
            <strong>{company?.raisonSociale ?? "cette entreprise"}</strong> en tant
            qu&apos;admin BTPilot. La validation dirigeant est désactivée dans ce mode.
          </p>
          <form action={stopImpersonation}>
            <Button type="submit" size="sm" variant="outline">
              Revenir à l&apos;espace admin
            </Button>
          </form>
        </div>
      ) : null}
      {children}
    </AppShell>
  );
}
