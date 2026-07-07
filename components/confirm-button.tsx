"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Bouton avec dialogue de confirmation pour les actions destructives ou engageantes. */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Confirmer",
  variant = "destructive",
  size = "sm",
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "destructive" | "default" | "outline";
  size?: "xs" | "sm" | "default";
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button
              variant={variant}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await onConfirm();
                  if (result.ok) {
                    setOpen(false);
                  } else {
                    toast.error(result.error ?? "Une erreur est survenue.");
                  }
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
