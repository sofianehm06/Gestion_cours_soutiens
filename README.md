# SoutienPro

Application de bureau pour les professeurs de cours de soutien scolaire : gestion des groupes,
des élèves, de la présence et des paiements mensuels. Interface en français (par défaut) et en arabe.

## Fonctionnalités

- **Tableau de bord** : élèves actifs, revenu attendu du mois, revenu encaissé, reste à encaisser,
  liste des élèves en retard de paiement (avec les mois impayés et le montant dû).
- **Groupes** : nom, niveau scolaire, tarif mensuel en DA (chaque groupe a son propre tarif).
- **Élèves** : fiche (nom, prénom, téléphone du parent, date d'inscription), rattachement à un ou
  plusieurs groupes avec tarif personnalisé optionnel, filtre par groupe / statut, recherche,
  arrêt des cours (actif / inactif), fiche détaillée avec historique des paiements et des présences.
- **Présence** : appel du jour en un clic par élève (tout le monde est présent par défaut),
  historique par groupe ou par élève.
- **Paiements** : vue mensuelle par groupe (payé / non payé / en retard), encaissement avec
  montant et date, annulation.

Un mois non payé est considéré **en retard** après le 10 du mois (`PAYMENT_DUE_DAY` dans
`shared/types.ts`), ou dès que le mois est passé.

## Stack

- Electron + React + TypeScript (Vite pour l'interface)
- SQLite via `better-sqlite3` (binaires précompilés, aucune compilation native nécessaire)
- `react-i18next` pour le français et l'arabe (mise en page RTL automatique)

Les données sont stockées localement dans `soutienpro.sqlite`, dans le dossier de données de
l'application (`%APPDATA%\SoutienPro` sous Windows).

## Structure

```
electron/   processus principal : fenêtre, base SQLite (database.ts), requêtes (repository.ts), preload
shared/     types et règles métier partagés (statut de paiement, dates)
src/        interface React : pages, composants, traductions (locales/)
tests/      tests de la couche de données (Vitest, base en mémoire)
```

## Commandes

```bash
npm install          # installer les dépendances
npm run dev          # lancer en développement (rechargement à chaud de l'interface)
npm start            # construire puis lancer l'application
npm test             # tests
npm run typecheck    # vérification TypeScript
npm run dist:win     # installateur + version portable Windows dans release/
```

Le workflow GitHub Actions `build-windows.yml` construit automatiquement l'installateur Windows
à chaque push (artefact « SoutienPro-windows »).

## Prévu pour une version future

- Rappels de paiement par SMS / WhatsApp.
