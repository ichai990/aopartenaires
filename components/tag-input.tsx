"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/**
 * Saisie de listes libres (compétences, zones, qualifications…) :
 * Entrée ou virgule pour ajouter, croix pour retirer.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const cleaned = draft.trim().replace(/,$/, "");
    if (cleaned && !value.includes(cleaned)) {
      onChange([...value, cleaned]);
    }
    setDraft("");
  }

  return (
    <div>
      <Input
        id={id}
        value={draft}
        placeholder={placeholder ?? "Saisir puis Entrée…"}
        onChange={(e) => {
          if (e.target.value.endsWith(",")) {
            setDraft(e.target.value);
            commit();
          } else {
            setDraft(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
      />
      {value.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                aria-label={`Retirer ${tag}`}
                className="rounded-full p-0.5 hover:bg-primary/10"
                onClick={() => onChange(value.filter((t) => t !== tag))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
