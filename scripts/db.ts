/**
 * Gestion du PostgreSQL embarqué (développement local).
 *
 * Utilise les binaires PostgreSQL téléchargés par le package `embedded-postgres`
 * et les pilote via pg_ctl, qui démonise le serveur : la base continue de
 * tourner après la fin du script (contrairement à l'API du package).
 *
 * Usage :
 *   npm run db:start   — démarre la base (initialise .pgdata/ au premier lancement)
 *   npm run db:stop    — arrête la base
 *   npm run db:status  — vérifie si la base répond
 *
 * En production (VPS + Supabase self-hosted), ce script devient inutile :
 * remplacer simplement DATABASE_URL dans .env.
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync, readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import net from "node:net";

const DATA_DIR = join(process.cwd(), ".pgdata");
const LOG_FILE = join(DATA_DIR, "postgres.log");
const PORT = 5433;
const USER = "btpilot";
const PASSWORD = "btpilot";
const DATABASE = "btpilot";

function findBinDir(): string {
  const base = join(process.cwd(), "node_modules", "@embedded-postgres");
  if (!existsSync(base)) {
    console.error("Binaires PostgreSQL introuvables — lancez d'abord `npm install`.");
    process.exit(1);
  }
  for (const platform of readdirSync(base)) {
    const bin = join(base, platform, "native", "bin");
    if (existsSync(join(bin, "pg_ctl"))) return bin;
  }
  console.error("Aucun binaire pg_ctl trouvé sous node_modules/@embedded-postgres.");
  process.exit(1);
}

function pg(binary: string, args: string[], opts: { quiet?: boolean } = {}) {
  return execFileSync(join(findBinDir(), binary), args, {
    stdio: opts.quiet ? "pipe" : "inherit",
    env: { ...process.env, LC_ALL: "C", PGPASSWORD: PASSWORD },
  });
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function cleanStalePidFile() {
  const pidFile = join(DATA_DIR, "postmaster.pid");
  if (!existsSync(pidFile)) return;
  try {
    const pid = parseInt(readFileSync(pidFile, "utf8").split("\n")[0], 10);
    process.kill(pid, 0); // lève si le process n'existe pas
  } catch {
    console.log("… suppression d'un postmaster.pid orphelin");
    rmSync(pidFile);
  }
}

async function start() {
  if (await isPortOpen(PORT)) {
    console.log(`✓ PostgreSQL répond déjà sur le port ${PORT}`);
    return;
  }
  const isNew = !existsSync(join(DATA_DIR, "PG_VERSION"));
  if (isNew) {
    console.log("Première initialisation de la base (.pgdata/)…");
    const pwfile = join(mkdtempSync(join(tmpdir(), "btpilot-pg-")), "pwfile");
    writeFileSync(pwfile, PASSWORD);
    pg("initdb", ["-D", DATA_DIR, "-U", USER, "-A", "password", `--pwfile=${pwfile}`, "-E", "UTF8"], { quiet: true });
    rmSync(pwfile);
  }
  cleanStalePidFile();
  console.log("Démarrage de PostgreSQL…");
  pg("pg_ctl", ["-D", DATA_DIR, "-l", LOG_FILE, "-o", `-p ${PORT}`, "-w", "start"], { quiet: true });
  if (isNew) {
    pg("createdb", ["-h", "127.0.0.1", "-p", String(PORT), "-U", USER, DATABASE], { quiet: true });
    console.log(`✓ Base « ${DATABASE} » créée`);
  } else {
    // au cas où l'initialisation précédente n'a pas créé la base
    try {
      pg("createdb", ["-h", "127.0.0.1", "-p", String(PORT), "-U", USER, DATABASE], { quiet: true });
    } catch {
      /* la base existe déjà — normal */
    }
  }
  console.log(`✓ PostgreSQL démarré — postgresql://${USER}:***@localhost:${PORT}/${DATABASE}`);
  console.log(`  (logs : ${LOG_FILE} — arrêt : npm run db:stop)`);
}

async function stop() {
  if (!(await isPortOpen(PORT))) {
    console.log("PostgreSQL n'est pas démarré.");
    return;
  }
  pg("pg_ctl", ["-D", DATA_DIR, "-m", "fast", "-w", "stop"], { quiet: true });
  console.log("✓ PostgreSQL arrêté");
}

async function status() {
  const up = await isPortOpen(PORT);
  console.log(up ? `✓ PostgreSQL répond sur le port ${PORT}` : "✗ PostgreSQL est arrêté");
  process.exit(up ? 0 : 1);
}

const cmd = process.argv[2];
if (cmd === "start") start();
else if (cmd === "stop") stop();
else if (cmd === "status") status();
else {
  console.log("Usage : tsx scripts/db.ts start|stop|status");
  process.exit(1);
}
