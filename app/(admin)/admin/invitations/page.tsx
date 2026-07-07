import { MailPlus } from "lucide-react";
import type { Invitation } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { InviteDialog } from "@/components/admin/manage/invite-dialog";
import { RevokeInvitationButton } from "@/components/admin/manage/revoke-invitation-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Invitations — Admin BTPilot" };

type InvitationStatut = "ACCEPTEE" | "REVOQUEE" | "EXPIREE" | "EN_ATTENTE";

function computeInvitationStatut(invitation: Invitation): InvitationStatut {
  if (invitation.acceptedAt) return "ACCEPTEE";
  if (invitation.revokedAt) return "REVOQUEE";
  if (invitation.expiresAt < new Date()) return "EXPIREE";
  return "EN_ATTENTE";
}

const STATUT_LABELS: Record<InvitationStatut, string> = {
  ACCEPTEE: "Acceptée",
  REVOQUEE: "Révoquée",
  EXPIREE: "Expirée",
  EN_ATTENTE: "En attente",
};

const STATUT_CLASSES: Record<InvitationStatut, string> = {
  ACCEPTEE: "bg-success/15 text-success",
  REVOQUEE: "bg-muted text-muted-foreground",
  EXPIREE: "bg-destructive/10 text-destructive",
  EN_ATTENTE: "bg-warning/15 text-warning",
};

function InvitationStatutBadge({ statut }: { statut: InvitationStatut }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STATUT_CLASSES[statut]
      )}
    >
      {STATUT_LABELS[statut]}
    </span>
  );
}

export default async function AdminInvitationsPage() {
  await requireSuperAdmin();

  const [invitations, companies] = await Promise.all([
    prisma.invitation.findMany({
      include: { company: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.company.findMany({
      select: { id: true, raisonSociale: true },
      orderBy: { raisonSociale: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Invitations"
        description="Liens d'invitation générés pour les dirigeants, employés et admins BTPilot."
      >
        <InviteDialog companies={companies} />
      </PageHeader>

      {invitations.length === 0 ? (
        <EmptyState
          icon={MailPlus}
          title="Aucune invitation"
          description="Générez un lien d'invitation sécurisé pour donner accès à la plateforme."
        >
          <InviteDialog companies={companies} />
        </EmptyState>
      ) : (
        <Card className="py-0">
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const statut = computeInvitationStatut(invitation);
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium text-primary">
                        {invitation.email}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {ROLE_LABELS[invitation.role]}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {invitation.company?.raisonSociale ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(invitation.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(invitation.expiresAt)}
                      </TableCell>
                      <TableCell>
                        <InvitationStatutBadge statut={statut} />
                      </TableCell>
                      <TableCell className="text-right">
                        {statut === "EN_ATTENTE" ? (
                          <RevokeInvitationButton
                            invitationId={invitation.id}
                            email={invitation.email}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
