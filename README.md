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
| **Présence** | On choisit la date (et éventuellement un groupe), on clique sur les cartes des élèves présents, puis *Enregistrer la présence* (barre en bas). On peut revenir sur une date pour corriger. |
| **Élèves** | Tableau avec filtres (actifs / doivent / à jour / inactifs), filtre par groupe et recherche. Un clic ouvre la fiche : dû, payé, reste, historique des séances et paiements, encaisser, ajouter une séance, modifier, archiver, supprimer. |
| **Groupes** | Les groupes sont aussi listés dans le menu de gauche (« Mes groupes ») : un clic lance l'appel du groupe, le **+** en crée un nouveau. Sur la page : créer des groupes (nom + horaire, ex. « 4AM Maths – samedi 14h »), y ajouter / retirer des élèves, voir l'effectif, les séances du mois et le reste à encaisser du groupe, *Faire l'appel* du groupe. Supprimer un groupe ne supprime pas ses élèves. |
| **Paiements** | Paiements mois par mois, total encaissé. |
| **Paramètres** | Nom affiché, tarif, export Excel (CSV), sauvegarde / restauration. **Fin d'année** : *Remettre les compteurs à zéro* (efface séances et paiements, garde élèves et groupes) ou *Tout supprimer* ; une sauvegarde est faite juste avant et il faut taper SUPPRIMER pour confirmer. |

## Données

Les données sont enregistrées automatiquement dans un fichier `donnees.json` (et une copie
`donnees.json.bak` de la version précédente) :

- Windows : `%APPDATA%\Gestion Soutien\`
- Linux : `~/.config/Gestion Soutien/`

Faites régulièrement une sauvegarde (Paramètres → *Faire une sauvegarde*) sur une clé USB.

## Obtenir le programme Windows

À chaque push, GitHub Actions construit :

- `GestionSoutien-Installation-….exe` : installateur (crée un raccourci sur le bureau) ;
- `GestionSoutien-Portable-….exe` : version sans installation.

Onglet **Actions** du dépôt → dernier run → artefact *GestionSoutien-portable* (à lancer
directement) **ou** *GestionSoutien-installation* : un seul des deux suffit.

### Sans rien télécharger à chaque mise à jour

Installer une fois [Node.js](https://nodejs.org) (version LTS) et [Git](https://git-scm.com), puis :

```bash
git clone https://github.com/sofianehm06/dyhia_gestion.git
cd dyhia_gestion
npm install        # une seule fois (télécharge Electron)
npm start          # lance l'application
```

Pour les mises à jour suivantes : `git pull` puis `npm start` (quelques Ko seulement ;
refaire `npm install` seulement si `package.json` a changé). Pour tester une branche :
`git checkout nom-de-la-branche` puis `npm start`.

Construction manuelle sous Windows : `npm ci` puis `npm run dist:win` (résultat dans `release/`).

## Développement

```bash
npm install
npm run electron:dev   # application avec rechargement à chaud
npm run dev            # interface seule dans le navigateur (données dans localStorage)
npm test               # tests des calculs
npm start              # build + lancement Electron
```
