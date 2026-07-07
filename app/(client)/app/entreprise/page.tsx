import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin } from "@/lib/auth/guards";
import { toCompanyDTO } from "@/lib/dto";
import { PageHeader } from "@/components/page-header";
import { CompanyForm } from "@/components/forms/company-form";

export const metadata = { title: "Profil de l'entreprise" };

export default async function EntreprisePage() {
  const { companyId } = await requireCompanyAdmin();

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
  });

  return (
    <div>
      <PageHeader
        title="Profil de l'entreprise"
        description="Ces informations alimentent automatiquement vos dossiers de candidature : plus elles sont complètes, meilleurs sont vos dossiers."
      />
      <CompanyForm company={toCompanyDTO(company)} />
    </div>
  );
}
