"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, ShieldCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { requestChanges, submitValidation } from "@/actions/validation";

const ITEMS = [
  { key: "prixValide", label: "Je valide les prix" },
  { key: "delaisValides", label: "Je valide les délais" },
  { key: "moyensHumainsValides", label: "Je valide les moyens humains déclarés" },
  {
    key: "moyensMaterielsValides",
    label: "Je valide les moyens matériels déclarés",
  },
  { key: "engagementsValides", label: "Je valide les engagements techniques" },
  { key: "autorisationDepot", label: "J'autorise le dépôt de l'offre" },
] as const;

type CheckKey = (typeof ITEMS)[number]["key"];

const INITIAL_CHECKS: Record<CheckKey, boolean> = {
  prixValide: false,
  delaisValides: false,
  moyensHumainsValides: false,
  moyensMaterielsValides: false,
  engagementsValides: false,
  autorisationDepot: false,
};

export function ValidationForm({
  tenderId,
  proposalVersionId,
  versionNumber,
  contentHash,
}: {
  tenderId: string;
  proposalVersionId: string;
  versionNumber: number;
  contentHash: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>(INITIAL_CHECKS);
  const [commentaire, setCommentaire] = useState("");
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [motif, setMotif] = useState("");

  function onRequestChanges() {
    if (pending || motif.trim() === "") return;
    startTransition(async () => {
      const result = await requestChanges(tenderId, motif);
      if (!result.ok) {
        toast.error(result.error ?? "La demande n'a pas pu être transmise.");
        return;
      }
      toast.success("Demande de modifications transmise — le dossier repart en préparation.");
      router.push(`/app/appels-offres/${tenderId}`);
      router.refresh();
    });
  }

  const allChecked = ITEMS.every((item) => checks[item.key]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allChecked || pending) return;
    startTransition(async () => {
      const result = await submitValidation({
        tenderId,
        proposalVersionId,
        prixValide: true,
        delaisValides: true,
        moyensHumainsValides: true,
        moyensMaterielsValides: true,
        engagementsValides: true,
        autorisationDepot: true,
        commentaire: commentaire.trim() === "" ? null : commentaire.trim(),
      });
      if (!result.ok) {
        toast.error(result.error ?? "La validation n'a pas pu être enregistrée.");
        return;
      }
      toast.success("Dossier validé — le dépôt de l'offre est autorisé.");
      router.push(`/app/appels-offres/${tenderId}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Votre validation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <Checkbox
                  id={item.key}
                  checked={checks[item.key]}
                  onCheckedChange={(value) =>
                    setChecks((prev) => ({ ...prev, [item.key]: value === true }))
                  }
                  disabled={pending}
                />
                <Label htmlFor={item.key} className="cursor-pointer font-normal">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
            <Textarea
              id="commentaire"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Remarques éventuelles sur ce dossier…"
              disabled={pending}
            />
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Cette validation est enregistrée avec votre identité, la date,
              l&apos;adresse IP et l&apos;empreinte de la version {versionNumber} du
              dossier.
            </p>
            <p className="mt-1 font-mono text-[0.65rem] break-all text-muted-foreground">
              {contentHash}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={!allChecked || pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck data-icon="inline-start" />
              )}
              Valider et autoriser le dépôt
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={pending}
              onClick={() => setRefuseOpen(true)}
            >
              <Undo2 className="size-4" />
              Demander des modifications
            </Button>
          </div>
        </form>

        {/* Refus : le dossier repart en préparation avec le motif du dirigeant */}
        <Dialog open={refuseOpen} onOpenChange={setRefuseOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demander des modifications</DialogTitle>
              <DialogDescription>
                Le dossier ne sera pas validé en l&apos;état : il repart en
                préparation chez BTPilot avec votre motif (prix, délais, moyens…).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="motif">Ce qui doit être modifié</Label>
              <Textarea
                id="motif"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex. : le prix est trop bas par rapport à nos coûts réels sur ce type de chantier…"
                disabled={pending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefuseOpen(false)}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button
                type="button"
                disabled={pending || motif.trim() === ""}
                onClick={onRequestChanges}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Transmettre la demande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
