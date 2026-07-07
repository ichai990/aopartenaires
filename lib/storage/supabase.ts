import "server-only";
import type { StorageAdapter } from "./index";

/**
 * Stockage Supabase Storage (API REST, aucune dépendance) — pour les
 * environnements serverless (Vercel) et la production VPS.
 *
 * Activation par variables d'environnement :
 *   STORAGE_PROVIDER=supabase
 *   SUPABASE_URL=https://xxxx.supabase.co        (ou l'URL self-hosted)
 *   SUPABASE_SERVICE_ROLE_KEY=...                (clé service_role, JAMAIS côté client)
 *   SUPABASE_BUCKET=btpilot                      (bucket PRIVÉ, créé au préalable)
 */
export class SupabaseStorage implements StorageAdapter {
  private baseUrl: string;
  private key: string;
  private bucket: string;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Stockage Supabase : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis."
      );
    }
    this.baseUrl = url.replace(/\/$/, "");
    this.key = key;
    this.bucket = process.env.SUPABASE_BUCKET ?? "btpilot";
  }

  private objectUrl(key: string): string {
    const encoded = key.split("/").map(encodeURIComponent).join("/");
    return `${this.baseUrl}/storage/v1/object/${this.bucket}/${encoded}`;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { Authorization: `Bearer ${this.key}`, ...extra };
  }

  async put(key: string, content: Buffer, mimeType: string): Promise<void> {
    const res = await fetch(this.objectUrl(key), {
      method: "POST",
      headers: this.headers({ "Content-Type": mimeType, "x-upsert": "true" }),
      body: new Uint8Array(content),
    });
    if (!res.ok) {
      throw new Error(`Supabase Storage (écriture) : ${res.status} ${await res.text()}`);
    }
  }

  async get(key: string): Promise<Buffer> {
    const res = await fetch(this.objectUrl(key), { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Supabase Storage (lecture) : ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    await fetch(this.objectUrl(key), {
      method: "DELETE",
      headers: this.headers(),
    }).catch(() => {
      /* silencieux, comme le disque local */
    });
  }

  async exists(key: string): Promise<boolean> {
    const res = await fetch(this.objectUrl(key), {
      method: "GET",
      headers: this.headers({ Range: "bytes=0-0" }),
    });
    return res.ok;
  }
}
