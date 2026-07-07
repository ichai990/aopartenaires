"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus, MessageSquareText } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { setDocumentAdminComment } from "@/actions/documents";

/**
 * Édition du commentaire admin d'un document (visible par le client),
 * ex. « À renouveler avant le dépôt du dossier X ».
 */
export function DocCommentPopover({
  documentId,
  comment,
}: {
  documentId: string;
  comment: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(comment ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await setDocumentAdminComment(documentId, value);
      if (!result.ok) {
        toast.error(result.error ?? "Enregistrement impossible.");
        return;
      }
      toast.success("Commentaire enregistré.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="max-w-48 justify-start"
        onClick={() => {
          setValue(comment ?? "");
          setOpen(true);
        }}
      >
        {comment ? (
          <>
            <MessageSquareText className="size-3.5 shrink-0 text-primary" />
            <span className="truncate font-normal">{comment}</span>
          </>
        ) : (
          <>
            <MessageSquarePlus className="size-3.5 shrink-0" />
            <span className="text-muted-foreground">Ajouter</span>
          </>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Commentaire admin</DialogTitle>
            <DialogDescription>
              Note visible par le client sur ce document (laisser vide pour supprimer).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            placeholder="Ex. Attestation à renouveler avant le 15 du mois."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
