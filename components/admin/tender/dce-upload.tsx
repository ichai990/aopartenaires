"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Téléversement d'une pièce du DCE (PDF ou ZIP) sur un appel d'offres. */
export function DceUpload({ tenderId }: { tenderId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "tenderFile");
      formData.append("tenderId", tenderId);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        toast.error(json?.error ?? "Échec du téléversement.");
        return;
      }
      toast.success("Pièce du DCE ajoutée.");
      router.refresh();
    } catch {
      toast.error("Échec du téléversement.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.zip,application/pdf,application/zip,application/x-zip-compressed"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        Ajouter une pièce du DCE
      </Button>
      <span className="text-xs text-muted-foreground">PDF ou ZIP, 25 Mo max.</span>
    </div>
  );
}
