# BTPilot

Plateforme SaaS B2B qui aide les entreprises du bâtiment à répondre aux appels
d'offres publics : profil entreprise, documents administratifs, moyens humains
et matériels, références chantiers, prix types, analyse IA des DCE, génération
de dossiers de réponse et **validation dirigeant obligatoire avant tout dépôt**.

## Stack

- **Next.js 15** (App Router) · **TypeScript** · **Tailwind CSS v4** · **shadcn/ui**
- **Prisma** + **PostgreSQL** (embarqué en local, Supabase self-hosted en production)
- **Auth.js v5** (next-auth) — sessions JWT, rôles, multi-tenant strict
- Service IA à providers interchangeables : **mock** (règles déterministes),
  **Anthropic (Claude)**, **OpenAI** — clés lues côté serveur uniquement

## Démarrage rapide

Prérequis : **Node.js ≥ 20.19** (aucune autre installation — PostgreSQL est
téléchargé automatiquement par npm).

```bash
npm install        # dépendances + binaires PostgreSQL
npm run db:setup   # démarre la base + migrations + données de démo
npm run dev        # http://localhost:3000
```

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Super admin BTPilot | `admin@btpilot.fr` | `Admin1234!` |
| Dirigeant (Nova BTP) | `martin.sanchez@novabtp.fr` | `Nova1234!` |
| Employée (Nova BTP) | `julie.moreau@novabtp.fr` | `Nova1234!` |

Le seed crée l'entreprise **Nova BTP** (4 salariés, 8 matériels, 4 références,
10 documents dont 2 expirés) et **3 appels d'offres** à des stades différents :

1. *Rénovation sanitaires — Groupe scolaire Jules Ferry* — **À analyser**
   (lancez l'analyse IA depuis l'espace admin) ;
2. *Remplacement CVC — EHPAD Les Lilas* — **En attente dirigeant** (connectez-vous
   en dirigeant pour dérouler la validation) ;
3. *Maintenance multi-sites — Habitat 93* — **Gagné** (validation historisée,
   audit log, commission calculée : 300 000 € → 24 000 €).

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run db:start` / `db:stop` / `db:status` | Pilotage du PostgreSQL embarqué (port 5433) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Rejoue le seed (idempotent) |
| `npm run db:reset` | Recrée le schéma + seed |

## Variables d'environnement (`.env`)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | PostgreSQL. Local : `postgresql://btpilot:btpilot@localhost:5433/btpilot`. Production : l'URL de votre Supabase self-hosted. |
| `AUTH_SECRET` | Secret des sessions (générer : `openssl rand -base64 32`) |
| `APP_URL` | URL publique (liens d'invitation / réinitialisation) |
| `AI_PROVIDER` | `mock` (défaut), `anthropic` ou `openai` — modifiable aussi depuis *Admin → Paramètres IA* |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Clés IA — **jamais exposées côté client** |
| `SMTP_*`, `EMAIL_FROM` | Optionnel. Sans SMTP, les liens d'invitation/reset s'affichent dans l'interface. |

## Architecture

```
app/
  (auth)/            connexion, mot de passe oublié, réinitialisation, invitation
  (client)/app/      espace client : dashboard, AO, entreprise, documents,
                     équipe, matériel, références, prix, validation dirigeant
  (admin)/admin/     espace interne : clients, invitations, AO, dossiers,
                     validations, commissions, documents expirés, sources, IA
  api/auth           next-auth · api/upload · api/files (téléchargement contrôlé)
actions/             server actions (mutations, toutes gardées)
lib/
  auth/guards.ts     requireUser / requireCompany / requireCompanyAdmin / requireSuperAdmin
  ai/                interface provider + mock déterministe + Anthropic + OpenAI
  services/          commission (admin only), audit, pipeline AO, documents, CV
  workflow/          machine à états des AO (transitions par rôle)
  dto.ts             sérialisation Prisma → client (jamais de commission côté client)
prisma/              schéma, migrations, seed
scripts/db.ts        PostgreSQL embarqué (pg_ctl)
var/uploads/         fichiers privés (gitignoré) — servis via /api/files
```

### Règles métier clés

- **Multi-tenant strict** : chaque requête est scopée par le `companyId` du JWT ;
  une entreprise ne voit jamais les données d'une autre.
- **Commissions invisibles côté client** : table dédiée, requêtée uniquement
  dans l'espace admin (barème progressif : 10 % / 7 % / 4 % / 2,5 % par tranche).
- **L'IA prépare, le dirigeant valide** : aucun dépôt sans validation explicite
  des 6 volets (prix, délais, moyens humains, moyens matériels, engagements,
  autorisation de dépôt). Chaque validation est tracée (utilisateur, date, IP,
  hash SHA-256 de la version du dossier) ; toute régénération du dossier
  invalide la validation précédente.
- **L'IA n'invente pas** : elle n'utilise que le DCE et les données réelles de
  l'entreprise ; toute information absente est marquée « à compléter ».

## Workflow des appels d'offres

```
DCE importé → Analyse IA → Pièces vérifiées / Visite planifiée → Dossier généré
  → Prêt pour validation → En attente dirigeant → Validé → Déposé → Gagné / Perdu
```

Les transitions sont contrôlées par rôle dans `lib/workflow/tender-status.ts`.
Le passage à « Déposé » exige une validation dirigeant dont le hash correspond
à la version courante du dossier.

## Passer en production (VPS + Supabase self-hosted)

1. Pointez `DATABASE_URL` vers le PostgreSQL de votre Supabase self-hosted,
   puis `npx prisma migrate deploy`.
2. Renseignez `AUTH_SECRET`, `APP_URL` (https), et vos clés IA.
3. Stockage fichiers : le disque local (`var/uploads`) fonctionne sur un VPS ;
   pour passer à Supabase Storage, implémentez `StorageAdapter`
   (`lib/storage/index.ts`) — l'interface (put/get/delete/exists) est prête.
4. Emails : branchez SMTP ou Resend dans `actions/auth.ts` /
   `lib/services/invitations.ts` (points d'extension commentés).
5. `npm run build && npm start` derrière un reverse proxy (Caddy/Nginx).

## Brancher l'IA réelle

```bash
# .env
AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-…"
```

La variable `AI_PROVIDER` fait foi tant que rien n'a été enregistré dans
*Admin → Paramètres IA* ; dès qu'un réglage y est sauvegardé, c'est lui qui
prime (provider + modèle — défauts : `claude-opus-4-8` / `gpt-4o`). Le mock
reste utilisé automatiquement si la clé API manque. Les fonctions génératives
(analyse DCE, mémoire technique, questions, brief de validation) passent par
l'API ; les vérifications (compatibilité, pièces manquantes, sélection de
références) restent déterministes.

## Dépannage

- **Port 5433 occupé** : `npm run db:stop`, ou modifiez `PORT` dans
  `scripts/db.ts` + `DATABASE_URL`.
- **`.pgdata` corrompu** (coupure brutale) : `rm -rf .pgdata && npm run db:setup`.
- **`postmaster.pid` orphelin** : supprimé automatiquement par `npm run db:start`.
- **Réinitialiser les données de démo** : `npm run db:reset`.
