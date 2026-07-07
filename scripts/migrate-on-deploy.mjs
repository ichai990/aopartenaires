/**
 * Migrations au déploiement (Vercel/VPS) — version qui ne casse pas le build
 * pour une simple variable manquante, mais qui échoue FRANCHEMENT si la base
 * est configurée et injoignable (déployer sans schéma serait pire).
 */
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.warn(
    "\n⚠️  DATABASE_URL absente : migrations Prisma IGNORÉES.\n" +
      "   L'application ne fonctionnera pas tant que la base n'est pas configurée.\n" +
      "   → Ajoutez DATABASE_URL (PostgreSQL/Supabase) dans les variables\n" +
      "     d'environnement du déploiement, puis redéployez.\n"
  );
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
