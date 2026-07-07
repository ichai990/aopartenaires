import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "LOGIN"
  | "COMPANY_CREATED"
  | "COMPANY_UPDATED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DELETED"
  | "EMPLOYEE_UPSERTED"
  | "EQUIPMENT_UPSERTED"
  | "REFERENCE_UPSERTED"
  | "PRICING_UPDATED"
  | "TENDER_CREATED"
  | "TENDER_ANALYSED"
  | "TENDER_STATUS_CHANGED"
  | "TENDER_VISIT_PLANNED"
  | "PROPOSAL_GENERATED"
  | "PROPOSAL_VALIDATED"
  | "TENDER_DEPOSITED"
  | "TENDER_WON"
  | "TENDER_LOST"
  | "INVITATION_CREATED"
  | "INVITATION_REVOKED"
  | "USER_CREATED"
  | "PASSWORD_CHANGED";

type WriteAuditLogParams = {
  action: AuditAction;
  userId?: string | null;
  companyId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  tx?: Prisma.TransactionClient;
};

/** Trace append-only. Passer `tx` pour écrire dans la même transaction que la mutation. */
export async function writeAuditLog({
  action,
  userId,
  companyId,
  entityType,
  entityId,
  metadata,
  ipAddress,
  tx,
}: WriteAuditLogParams) {
  const db = tx ?? prisma;
  await db.auditLog.create({
    data: {
      action,
      userId: userId ?? null,
      companyId: companyId ?? null,
      entityType,
      entityId,
      metadata,
      ipAddress: ipAddress ?? null,
    },
  });
}
