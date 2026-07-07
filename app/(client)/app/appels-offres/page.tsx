import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/auth/guards";
import { toClientTenderDTO } from "@/lib/dto";
import { PageHeader } from "@/components/page-header";
import { TenderTable } from "@/components/tender/tender-table";

export const metadata = { title: "Appels d'offres" };

export default async function TendersListPage() {
  // Lecture autorisée à tous les membres de l'entreprise (dirigeant et employés).
  const { companyId } = await requireCompany();

  const tenders = await prisma.tender.findMany({
    where: { companyId },
    include: { analysis: true },
    orderBy: [{ dateLimite: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });

  const rows = tenders.map(toClientTenderDTO);

  return (
    <div>
      <PageHeader
        title="Appels d'offres"
        description="Tous les appels d'offres suivis pour votre entreprise."
      />
      <TenderTable tenders={rows} />
    </div>
  );
}
