# Guide Supabase — SkillPVP Faction Dashboard

Ce guide explique comment configurer la base de données gratuite pour le dashboard.

## 1. Créer un projet Supabase

1. Va sur [https://supabase.com](https://supabase.com) et crée un compte gratuit
2. Clique sur **New Project**
3. Choisis un nom (ex: `skillpvp-dashboard`), un mot de passe Postgres (note-le), une région proche (ex: `West EU`)
4. Attends ~2 minutes que le projet soit prêt

**Coût : 0 €/mois** (plan Free : 500 Mo de stockage, largement suffisant)

## 2. Exécuter la migration SQL

1. Dans Supabase, va dans **SQL Editor** (menu gauche)
2. Clique **New query**
3. Copie-colle tout le contenu de `supabase/migrations/001_initial_schema.sql`
4. Clique **Run**
5. Crée une nouvelle query, copie-colle `supabase/seed.sql`, puis **Run**
6. Crée une nouvelle query, copie-colle `supabase/migrations/002_realtime_activity.sql`, puis **Run**

Cela crée :
- Les tables (users, factions, membres, rôles, permissions, métiers)
- La table **activity_log** (fil d'activité en direct)
- Le **Realtime** Supabase (mises à jour live sans rafraîchir)
- Les factions **v1** et **v2**
- Les 6 métiers (Mineur, Agriculteur, etc.)
- Les 3 rôles système par faction (Recrue, Membre, AdminFaction)

## 3. Récupérer les clés API

1. Va dans **Project Settings** → **API**
2. Note ces 3 valeurs :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secret !) → `SUPABASE_SERVICE_ROLE_KEY`

## 4. Configurer les variables d'environnement

### En local

Copie `.env.example` vers `.env.local` et remplis :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
AUTH_SECRET=une-chaine-aleatoire-de-32-caracteres-minimum
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=ton-mot-de-passe-admin
```

Génère `AUTH_SECRET` avec : `openssl rand -base64 32` (ou une phrase longue aléatoire)

### Sur Netlify

1. Va dans ton site Netlify → **Site configuration** → **Environment variables**
2. Ajoute les mêmes variables
3. Redéploie le site

## 5. Lancer l'application

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

Au premier login, le super admin est créé automatiquement avec les identifiants de `.env.local`.

## 6. Déployer sur Netlify

1. Pousse le code sur GitHub/GitLab
2. Connecte le repo à Netlify
3. Build command : `npm run build`
4. Ajoute les variables d'environnement
5. Installe le plugin Next.js (déjà dans `netlify.toml`)

## 7. Backup (optionnel)

Dans Supabase → **Database** → **Backups** : les backups quotidiens sont inclus gratuitement (7 jours de rétention).

Pour un export manuel : **Database** → **Tables** → export CSV par table.

## Schéma résumé

```
users ──────────────┐
                    ├── faction_members ── factions (v1, v2)
roles ──────────────┘         │
  └── role_permissions        ├── metiers
      └── permissions         └── users (lien optionnel)
```

## Dépannage

| Problème | Solution |
|----------|----------|
| "Missing SUPABASE_SERVICE_ROLE_KEY" | Vérifie `.env.local` ou variables Netlify |
| Login échoue | Vérifie que seed.sql a bien été exécuté |
| Tables manquantes | Re-exécute `001_initial_schema.sql` |
| Erreur RLS | Normal : l'app utilise la service_role key côté serveur |
| Temps réel ne marche pas | Exécute `002_realtime_activity.sql` + vérifie Database → Replication |
| Indicateur "Hors ligne" | Vérifie `NEXT_PUBLIC_SUPABASE_URL` et `ANON_KEY` côté client |

## Sécurité

- **Ne jamais** exposer `SUPABASE_SERVICE_ROLE_KEY` côté client ou dans le code source public
- Change le mot de passe super admin après le premier login
- `AUTH_SECRET` doit être unique et long (32+ caractères)
