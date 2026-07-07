import { Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompanyAdmin } from "@/lib/auth/guards";
import { toPricingDTO } from "@/lib/dto";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { PricingForm } from "@/components/forms/pricing-form";

export const metadata = { title: "Prix types" };

export default async function PrixPage() {
  const { companyId } = await requireCompanyAdmin();

  const profile = await prisma.pricingProfile.findUnique({
    where: { companyId },
    include: { items: true },
  });
  const pricing = toPricingDTO(profile);

  return (
    <div>
      <PageHeader
        title="Prix types"
        description="Vos taux, marges et prix unitaires de référence pour accélérer le chiffrage des offres."
      />

      <Alert className="mb-6 border border-primary/20 bg-secondary/50">
        <Info className="text-primary" />
        <AlertTitle>Aide au chiffrage uniquement</AlertTitle>
        <AlertDescription>
          Ces prix aident au chiffrage. Le prix final de chaque offre est toujours validé
          par vous avant dépôt.
        </AlertDescription>
      </Alert>

      <PricingForm pricing={pricing} />
    </div>
  );
}
