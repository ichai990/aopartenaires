import "server-only";
import { LocalDiskStorage } from "./local-disk";

/**
 * Abstraction de stockage de fichiers privés.
 * En local : disque (var/uploads). En production : brancher un adaptateur
 * Supabase Storage en implémentant la même interface.
 */
export interface StorageAdapter {
  /** Écrit le contenu et retourne la clé de stockage. */
  put(key: string, content: Buffer, mimeType: string): Promise<void>;
  /** Lit le contenu d'une clé. Lève si absent. */
  get(key: string): Promise<Buffer>;
  /** Supprime (silencieux si absent). */
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

let storage: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!storage) {
    // Point d'extension : if (process.env.STORAGE_PROVIDER === "supabase") ...
    storage = new LocalDiskStorage();
  }
  return storage;
}

/** Construit une clé de stockage sûre, scoping tenant inclus. */
export function buildStorageKey(
  companyId: string,
  category: "documents" | "tenders" | "photos",
  fileName: string
): string {
  const safeName = fileName
    .normalize("NFD")
    // supprime les diacritiques (é → e) avant le filtrage strict
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-80);
  const unique = crypto.randomUUID();
  return `companies/${companyId}/${category}/${unique}-${safeName}`;
}
