# Gestion Soutien

Logiciel de bureau pour gérer des cours de soutien : présence des élèves, séances faites
et ce que chaque élève doit.

Technologies : **React + TypeScript + Tailwind CSS** (la même pile que les interfaces
générées par Lovable), emballées en application de bureau avec **Electron**.

## Principe

- **1 mois = 4 séances = 1500 DA**, soit **375 DA la séance** (modifiable dans *Paramètres*).
- Montant dû = somme des séances faites. Reste à payer = montant dû − paiements.
- Si le tarif change, les séances déjà enregistrées gardent leur prix.

## Écrans

| Écran | Rôle |
|---|---|
| **Tableau de bord** | Élèves actifs, séances et encaissements du mois, reste à encaisser, liste des élèves qui doivent (bouton *Encaisser*), présence des dernières séances, derniers paiements. |
| **Présence** | On choisit la date, on clique sur les cartes des élèves présents (le panneau de droite récapitule la séance), puis *Enregistrer la présence*. On peut revenir sur une date pour corriger. |
| **Élèves** | Tableau avec filtres (actifs / doivent / à jour / inactifs) et recherche. Un clic ouvre la fiche : dû, payé, reste, historique des séances et paiements, encaisser, ajouter une séance, modifier, archiver, supprimer. |
| **Paiements** | Paiements mois par mois, total encaissé. |
| **Paramètres** | Nom affiché, tarif, export Excel (CSV), sauvegarde / restauration. |

## Données

Les données sont enregistrées automatiquement dans un fichier `donnees.json` (et une copie
`donnees.json.bak` de la version précédente) :

- Windows : `%APPDATA%\Gestion Soutien\`
- Linux : `~/.config/Gestion Soutien/`

Faites régulièrement une sauvegarde (Paramètres → *Faire une sauvegarde*) sur une clé USB.

## Obtenir le programme Windows

À chaque push, GitHub Actions construit :

- `GestionSoutien-…-nsis.exe` : installateur (crée un raccourci sur le bureau) ;
- `GestionSoutien-…-portable.exe` : version sans installation.

Onglet **Actions** du dépôt → dernier run → artefact *GestionSoutien-windows*.

Construction manuelle sous Windows : `npm ci` puis `npm run dist:win` (résultat dans `release/`).

## Développement

```bash
npm install
npm run electron:dev   # application avec rechargement à chaud
npm run dev            # interface seule dans le navigateur (données dans localStorage)
npm test               # tests des calculs
npm start              # build + lancement Electron
```
