# Gestion des cours de soutien

Logiciel de bureau (Windows / Linux / macOS) pour suivre la présence des élèves
et ce que chacun doit payer.

## Principe

- Liste des élèves : nom, prénom, téléphone, niveau.
- Chaque présence = 1 séance. **1 mois = 4 séances = 1500 DA**, soit **375 DA la séance**
  (modifiable dans l'onglet *Paramètres*).
- Montant dû = séances faites × prix d'une séance. Reste à payer = montant dû − paiements.
- Si le tarif change, les séances déjà enregistrées gardent l'ancien prix.

## Onglets

| Onglet | Rôle |
|---|---|
| **Élèves** | Liste avec séances, « soit X mois + Y séances », montant dû, payé, reste (en rouge si l'élève doit de l'argent, en vert s'il a payé d'avance). Ajouter / modifier / supprimer un élève, ajouter une séance, enregistrer un paiement, voir l'historique (double-clic). |
| **Présence** | Choisir la date, cocher les élèves présents, *Enregistrer la présence*. On peut revenir sur une date pour corriger. |
| **Paiements** | Tous les paiements, total encaissé du mois. |
| **Paramètres** | Tarif mensuel et nombre de séances par mois, export Excel (CSV), sauvegarde / restauration. |

Un élève qui arrête peut être marqué « inactif » (bouton *Modifier*) : il disparaît de la
feuille de présence mais son historique est conservé.

## Données

Tout est stocké localement dans un fichier SQLite :

- Windows : `%APPDATA%\GestionSoutien\soutien.db`
- Linux / macOS : `~/.gestion_soutien/soutien.db`

Pensez à faire régulièrement une sauvegarde (onglet *Paramètres*) sur une clé USB.

## Obtenir le `.exe` pour Windows

À chaque push, GitHub Actions construit `GestionSoutien.exe` (onglet **Actions** du dépôt →
dernier run → artefact *GestionSoutien-windows*). Aucune installation de Python n'est
nécessaire chez la cliente : il suffit de copier l'exe sur son PC.

Construction manuelle sous Windows :

```bat
pip install pyinstaller
pyinstaller --onefile --windowed --name GestionSoutien main.py
```

## Lancer depuis les sources

Python 3.9+ (Tkinter inclus dans l'installateur officiel Windows) :

```bash
python main.py
python -m unittest -v   # tests
```
