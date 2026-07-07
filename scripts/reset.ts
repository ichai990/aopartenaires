/**
 * Réinitialisation complète : schéma recréé + seed.
 * Usage : npm run db:reset
 */
import { execSync } from "node:child_process";

function run(cmd: string) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

run("tsx scripts/db.ts start");
run("npx prisma migrate reset --force --skip-seed");
run("npx prisma db seed");
console.log("\n✓ Base réinitialisée et re-seedée");
