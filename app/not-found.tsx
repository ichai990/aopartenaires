import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/branding/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
        <FileQuestion className="size-7" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-primary">Page introuvable</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La page demandée n&apos;existe pas ou vous n&apos;y avez pas accès.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
