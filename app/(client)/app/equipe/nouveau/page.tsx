import { requireCompanyAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/page-header";
import { EmployeeForm } from "@/components/forms/employee-form";

export const metadata = { title: "Ajouter un salarié" };

export default async function NouveauSalariePage() {
  await requireCompanyAdmin();

  return (
    <div>
      <PageHeader
        title="Ajouter un salarié"
        description="Renseignez la fiche : un CV court sera généré automatiquement pour vos dossiers."
      />
      <EmployeeForm />
    </div>
  );
}
