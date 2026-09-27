# Gestion Soutien

Logiciel de bureau pour gérer des cours de soutien : présence des élèves, séances faites
et ce que chaque élève doit.

Technologies : **React + TypeScript + Tailwind CSS** (la même pile que les interfaces
générées par Lovable), emballées en application de bureau avec **Electron**.

## Principe

- **1 mois = 4 séances = 1500 DA**, soit **375 DA la séance** : c'est le tarif général (modifiable dans *Paramètres*).
- Un **groupe** peut avoir son propre tarif (Groupes → Modifier) et un **élève** aussi, par ex. un cours
  individuel à 7000 DA/mois (fiche de l'élève → Modifier). Priorité : tarif de l'élève, sinon celui de
  son groupe, sinon le tarif général. Prix d'une séance = tarif mensuel ÷ séances par mois.
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

## Vendre le logiciel : premier lancement et licences

**Premier lancement.** Sur un nouvel ordinateur, le logiciel affiche un écran de bienvenue où
l'enseignant(e) saisit son nom, le nom affiché et son tarif. Pour redonner un ordinateur déjà
utilisé : Paramètres → *Tout supprimer* en cochant « Effacer aussi le nom de l'enseignant(e) ».

**Activation par clé.** Chaque ordinateur a un code (ex. `3F2A-91C0-7B5D-E842`) affiché sur
l'écran d'activation. Vous fabriquez une clé pour ce code ; elle ne fonctionne sur aucun autre
ordinateur, donc un enseignant ne peut pas donner le logiciel à un collègue.

Mise en place, **une seule fois, sur votre ordinateur** (Node.js installé, dans le dossier du projet) :

```bash
npm run licence:init
git add electron/cle-publique.cjs && git commit -m "Clé publique des licences" && git push
```

`licence:init` crée une **clé privée** dans `%USERPROFILE%\.gestion-soutien\cle-privee.pem`
(jamais dans le projet ni sur GitHub). Gardez-la secrète et faites-en une copie sur clé USB : sans
elle, impossible de fabriquer de nouvelles clés. Tant que `electron/cle-publique.cjs` est vide,
l'activation est désactivée (le logiciel s'ouvre sans clé).
Si la clé privée existe déjà (autre dossier, nouveau téléchargement), `npm run licence:publique`
réécrit `electron/cle-publique.cjs` à partir d'elle.

Pour chaque vente, l'enseignant(e) vous envoie son code, vous lancez :

```bash
npm run licence:cle -- 3F2A-91C0-7B5D-E842 "Mme Amrani"
```

et vous lui renvoyez la clé affichée (par WhatsApp, SMS, e-mail…) ; elle la colle et clique sur *Activer*.
Si l'enseignant(e) change d'ordinateur, le code change : il faut lui fabriquer une nouvelle clé.

## Développement

```bash
npm install
npm run electron:dev   # application avec rechargement à chaud
npm run dev            # interface seule dans le navigateur (données dans localStorage)
npm test               # tests des calculs
npm start              # build + lancement Electron
```
