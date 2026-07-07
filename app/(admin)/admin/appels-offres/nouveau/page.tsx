import { Info } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { TenderCreateForm } from "@/components/admin/tender/tender-create-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Importer un appel d'offres — Admin BTPilot" };

export default async function NewTenderPage() {
  await requireSuperAdmin();

  const companies = await prisma.company.findMany({
    select: { id: true, raisonSociale: true },
    orderBy: { raisonSociale: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Importer un appel d'offres"
        description="Saisissez les informations du marché pour l'entreprise cliente concernée."
      />

      <Alert className="mb-4">
        <Info className="size-4" />
        <AlertTitle>Import manuel</AlertTitle>
        <AlertDescription>
          Import manuel — le DCE (PDF/ZIP) s&apos;ajoute depuis la fiche de l&apos;AO.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent>
          <TenderCreateForm companies={companies} />
        </CardContent>
      </Card>
    </div>
  );
}
