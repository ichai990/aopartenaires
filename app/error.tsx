"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <CircleAlert className="size-7" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-primary">Une erreur est survenue</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Réessayez ; si le problème persiste, contactez votre interlocuteur BTPilot.
          {error.digest ? ` (réf. ${error.digest})` : null}
        </p>
      </div>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
