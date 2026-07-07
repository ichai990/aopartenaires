"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TenderStatus } from "@prisma/client";
import {
  ArchiveX,
  CalendarCheck,
  FileCog,
  Loader2,
  Send,
  Sparkles,
  Trophy,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import {
  changeTenderStatus,
  depositTender,
  generateProposal,
  planVisite,
  runAnalysis,
  sendToDirigeant,
  setTenderResult,
} from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ActionResult = { ok: boolean; error?: string; data?: unknown };

/**
 * Boutons d'action contextuels du poste de pilotage d'un AO.
 * Chaque action affiche un toast de succès/erreur puis rafraîchit la page.
 */
export function TenderActions({
  tenderId,
  status,
  hasAnalysis,
}: {
  tenderId: string;
  status: TenderStatus;
  hasAnalysis: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [visiteDate, setVisiteDate] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [prixPropose, setPrixPropose] = useState("");
  const [delaiPropose, setDelaiPropose] = useState("");
  const [wonOpen, setWonOpen] = useState(false);
  const [montantFinal, setMontantFinal] = useState("");

  function runAction(
    action: () => Promise<ActionResult>,
    successMessage: string,
    onSuccess?: () => void
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Une erreur est survenue.");
        return;
      }
      toast.success(successMessage);
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Analyse IA — toujours disponible */}
        <Button
          type="button"
          size="sm"
          variant={hasAnalysis ? "outline" : "default"}
          disabled={pending}
          onClick={() =>
            runAction(() => runAnalysis(tenderId), "Analyse IA terminée.")
          }
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {hasAnalysis ? "Relancer l'analyse IA" : "Lancer l'analyse IA"}
        </Button>

        {/* Génération du dossier — analyse requise, dossier non figé
            (le serveur refuse aussi DEPOSE/GAGNE/PERDU) */}
        {hasAnalysis && !["DEPOSE", "GAGNE", "PERDU"].includes(status) ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => setGenerateOpen(true)}
          >
            <FileCog className="size-4" />
            Générer le dossier
          </Button>
        ) : null}

        {/* Renvoi en préparation (retire le dossier de la validation) */}
        {["PRET_POUR_VALIDATION", "EN_ATTENTE_DIRIGEANT"].includes(status) ? (
          <ConfirmButton
            title="Renvoyer en préparation"
            description="Le dossier repasse en préparation : il n'est plus proposé à la validation du dirigeant."
            confirmLabel="Renvoyer"
            variant="outline"
            onConfirm={async () => {
              const result = await changeTenderStatus(tenderId, "EN_PREPARATION");
              if (result.ok) {
                toast.success("Dossier renvoyé en préparation.");
                router.refresh();
              }
              return result;
            }}
          >
            <Undo2 className="size-4" />
            Renvoyer en préparation
          </ConfirmButton>
        ) : null}

        {/* Classement sans suite (no-go avant dépôt) */}
        {!["DEPOSE", "GAGNE", "PERDU"].includes(status) ? (
          <ConfirmButton
            title="Classer sans suite"
            description="L'appel d'offres sera marqué « Perdu » (non poursuivi) et retiré du pipeline actif. Cette action est définitive."
            confirmLabel="Classer sans suite"
            variant="destructive"
            onConfirm={async () => {
              const result = await changeTenderStatus(tenderId, "PERDU");
              if (result.ok) {
                toast.success("Appel d'offres classé sans suite.");
                router.refresh();
              }
              return result;
            }}
          >
            <ArchiveX className="size-4" />
            Classer sans suite
          </ConfirmButton>
        ) : null}

        {/* Envoi au dirigeant */}
        {status === "PRET_POUR_VALIDATION" ? (
          <ConfirmButton
            title="Envoyer au dirigeant"
            description="Le dossier sera transmis au dirigeant de l'entreprise pour validation et signature. Confirmer l'envoi ?"
            confirmLabel="Envoyer"
            variant="default"
            onConfirm={async () => {
              const result = await sendToDirigeant(tenderId);
              if (result.ok) {
                toast.success("Dossier envoyé au dirigeant pour validation.");
                router.refresh();
              }
              return result;
            }}
          >
            <Send className="size-4" />
            Envoyer au dirigeant
          </ConfirmButton>
        ) : null}

        {/* Dépôt — le serveur exige une validation dirigeant sur la version courante */}
        {status === "VALIDE" ? (
          <ConfirmButton
            title="Marquer l'offre comme déposée"
            description="Confirmez que l'offre a été déposée sur la plateforme de l'acheteur. Le dépôt est refusé sans validation du dirigeant sur la version courante du dossier."
            confirmLabel="Marquer déposé"
            variant="default"
            onConfirm={async () => {
              const result = await depositTender(tenderId);
              if (result.ok) {
                toast.success("Appel d'offres marqué comme déposé.");
                router.refresh();
              }
              return result;
            }}
          >
            <Send className="size-4" />
            Marquer déposé
          </ConfirmButton>
        ) : null}

        {/* Résultat du marché */}
        {status === "DEPOSE" ? (
          <>
            <Button
              type="button"
              size="sm"
              className="bg-success text-success-foreground hover:bg-success/90"
              disabled={pending}
              onClick={() => setWonOpen(true)}
            >
              <Trophy className="size-4" />
              Marché gagné
            </Button>
            <ConfirmButton
              title="Marché perdu"
              description="L'appel d'offres sera classé comme perdu et la commission potentielle annulée. Cette action est définitive."
              confirmLabel="Marquer perdu"
              variant="destructive"
              onConfirm={async () => {
                const result = await setTenderResult(tenderId, false);
                if (result.ok) {
                  toast.success("Appel d'offres marqué comme perdu.");
                  router.refresh();
                }
                return result;
              }}
            >
              Marché perdu
            </ConfirmButton>
          </>
        ) : null}
      </div>

      {/* Planification de la visite */}
      {status === "VISITE_A_PLANIFIER" ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="visite-date">Date de la visite de site</Label>
            <Input
              id="visite-date"
              type="datetime-local"
              value={visiteDate}
              onChange={(e) => setVisiteDate(e.target.value)}
              className="w-56"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={pending || !visiteDate}
            onClick={() =>
              runAction(
                () => planVisite(tenderId, new Date(visiteDate).toISOString()),
                "Visite planifiée.",
                () => setVisiteDate("")
              )
            }
          >
            <CalendarCheck className="size-4" />
            Planifier la visite
          </Button>
        </div>
      ) : null}

      {/* Dialog : génération du dossier */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer le dossier de réponse</DialogTitle>
            <DialogDescription>
              L&apos;IA prépare le mémoire technique, les checklists et la sélection des
              moyens. Le prix et le délai sont optionnels et pourront être ajustés.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prix-propose">Prix proposé HT (€)</Label>
              <Input
                id="prix-propose"
                type="number"
                min="0"
                step="0.01"
                placeholder="Optionnel"
                value={prixPropose}
                onChange={(e) => setPrixPropose(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delai-propose">Délai proposé (jours)</Label>
              <Input
                id="delai-propose"
                type="number"
                min="1"
                step="1"
                placeholder="Optionnel"
                value={delaiPropose}
                onChange={(e) => setDelaiPropose(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setGenerateOpen(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                runAction(
                  () =>
                    generateProposal(tenderId, {
                      prixProposeHT: prixPropose ? Number(prixPropose) : null,
                      delaiProposeJours: delaiPropose ? Number(delaiPropose) : null,
                    }),
                  "Dossier généré.",
                  () => setGenerateOpen(false)
                )
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Générer le dossier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : marché gagné */}
      <Dialog open={wonOpen} onOpenChange={setWonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marché gagné</DialogTitle>
            <DialogDescription>
              Félicitations ! Indiquez le montant final du marché si vous le connaissez —
              sinon le prix proposé (ou le montant estimé) sera utilisé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="montant-final">Montant final du marché HT (€)</Label>
            <Input
              id="montant-final"
              type="number"
              min="0"
              step="0.01"
              placeholder="Optionnel"
              value={montantFinal}
              onChange={(e) => setMontantFinal(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWonOpen(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-success text-success-foreground hover:bg-success/90"
              disabled={pending}
              onClick={() =>
                runAction(
                  () =>
                    setTenderResult(
                      tenderId,
                      true,
                      montantFinal ? Number(montantFinal) : undefined
                    ),
                  "Appel d'offres marqué comme gagné.",
                  () => setWonOpen(false)
                )
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmer la victoire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
