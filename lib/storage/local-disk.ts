import "server-only";
import { mkdir, readFile, writeFile, unlink, access } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import type { StorageAdapter } from "./index";

const ROOT = join(process.cwd(), "var", "uploads");

/** Refuse toute clé qui tenterait de sortir du répertoire racine. */
function resolveSafe(key: string): string {
  const path = normalize(join(ROOT, key));
  if (!path.startsWith(ROOT)) {
    throw new Error("Clé de stockage invalide");
  }
  return path;
}

export class LocalDiskStorage implements StorageAdapter {
  async put(key: string, content: Buffer): Promise<void> {
    const path = resolveSafe(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(resolveSafe(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(resolveSafe(key));
    } catch {
      /* déjà absent */
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(resolveSafe(key));
      return true;
    } catch {
      return false;
    }
  }
}
