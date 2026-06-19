# SkillPVP Faction Dashboard

Dashboard web de gestion des factions **v1** et **v2** pour SkillPVP.

## Fonctionnalités

- Vue globale des 2 factions avec répartition des métiers
- **Temps réel** : voir les changements des autres sans rafraîchir la page
- **Fil d'activité live** : qui a ajouté/modifié un membre, changé un métier, etc.
- **Présence en ligne** : qui est connecté au dashboard
- Tableau « qui est sur quel métier » (filtrable)
- Gestion des membres (pseudo MC, métier, niveau, rôle, notes)
- Gestion des comptes utilisateurs (création, mot de passe, reset)
- Rôles système : Recrue, Membre, AdminFaction + rôles custom avec permissions
- Super admin avec accès total

## Démarrage rapide

### Option 1 — Script automatique (Windows)

Double-clique sur `install.bat` ou dans PowerShell :

```powershell
.\install.ps1
```

Le script installe Node.js si besoin, puis `npm install` et crée `.env.local`.

### Option 2 — Manuel

Prérequis : [Node.js LTS](https://nodejs.org/) (v20+)

> **Chemin réseau (`\\serveur\...`)** : npm ne fonctionne pas directement sur les chemins UNC.
> Utilise `.\install.ps1` ou `npm-local.cmd run dev` à la place de `npm run dev`.

```bash
npm install
copy .env.example .env.local   # Windows
# Configurer Supabase (voir SUPABASE_SETUP.md)
npm-local.cmd run dev          # si projet sur \\serveur\...
```

## Configuration base de données

Voir le guide complet : **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**

## Déploiement Netlify

1. Connecter le repo Git
2. Ajouter les variables d'environnement (voir `.env.example`)
3. Déployer — `netlify.toml` est déjà configuré

## Stack

- Next.js 15 + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres gratuit)
- Recharts (graphiques métiers)
