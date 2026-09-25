"""Couche de données (SQLite) : élèves, séances, paiements et paramètres."""

import csv
import os
import shutil
import sqlite3
import sys
from dataclasses import dataclass
from datetime import date

TARIF_MENSUEL_DEFAUT = 1500
SEANCES_PAR_MOIS_DEFAUT = 4

SCHEMA = """
CREATE TABLE IF NOT EXISTS eleves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    telephone TEXT NOT NULL DEFAULT '',
    niveau TEXT NOT NULL DEFAULT '',
    actif INTEGER NOT NULL DEFAULT 1,
    date_inscription TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS seances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    prix REAL NOT NULL,
    UNIQUE (eleve_id, date)
);
CREATE TABLE IF NOT EXISTS paiements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    montant REAL NOT NULL,
    note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS parametres (
    cle TEXT PRIMARY KEY,
    valeur TEXT NOT NULL
);
"""


def chemin_par_defaut():
    """Emplacement de la base : dossier de données de l'utilisateur."""
    if sys.platform.startswith("win"):
        base = os.environ.get("APPDATA") or os.path.expanduser("~")
        dossier = os.path.join(base, "GestionSoutien")
    else:
        dossier = os.path.join(os.path.expanduser("~"), ".gestion_soutien")
    os.makedirs(dossier, exist_ok=True)
    return os.path.join(dossier, "soutien.db")


@dataclass
class Bilan:
    """Situation d'un élève : séances faites, montant dû, payé, reste."""

    id: int
    nom: str
    prenom: str
    telephone: str
    niveau: str
    actif: bool
    seances: int
    du: float
    paye: float

    @property
    def reste(self):
        return self.du - self.paye


class Base:
    def __init__(self, chemin=None):
        self.chemin = chemin or chemin_par_defaut()
        self.cx = sqlite3.connect(self.chemin)
        self.cx.row_factory = sqlite3.Row
        self.cx.execute("PRAGMA foreign_keys = ON")
        self.cx.executescript(SCHEMA)
        self.cx.commit()

    def fermer(self):
        self.cx.close()

    # ---------- paramètres ----------

    def _param(self, cle, defaut):
        row = self.cx.execute(
            "SELECT valeur FROM parametres WHERE cle = ?", (cle,)
        ).fetchone()
        return row["valeur"] if row else str(defaut)

    @property
    def tarif_mensuel(self):
        return float(self._param("tarif_mensuel", TARIF_MENSUEL_DEFAUT))

    @property
    def seances_par_mois(self):
        return int(self._param("seances_par_mois", SEANCES_PAR_MOIS_DEFAUT))

    @property
    def prix_seance(self):
        return self.tarif_mensuel / self.seances_par_mois

    def definir_tarif(self, tarif_mensuel, seances_par_mois):
        if tarif_mensuel < 0 or seances_par_mois <= 0:
            raise ValueError("Tarif ou nombre de séances invalide.")
        with self.cx:
            for cle, val in (
                ("tarif_mensuel", tarif_mensuel),
                ("seances_par_mois", seances_par_mois),
            ):
                self.cx.execute(
                    "INSERT INTO parametres (cle, valeur) VALUES (?, ?) "
                    "ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur",
                    (cle, str(val)),
                )

    # ---------- élèves ----------

    def ajouter_eleve(self, nom, prenom, telephone="", niveau=""):
        nom, prenom = nom.strip(), prenom.strip()
        if not nom or not prenom:
            raise ValueError("Le nom et le prénom sont obligatoires.")
        with self.cx:
            cur = self.cx.execute(
                "INSERT INTO eleves (nom, prenom, telephone, niveau, date_inscription) "
                "VALUES (?, ?, ?, ?, ?)",
                (nom, prenom, telephone.strip(), niveau.strip(), date.today().isoformat()),
            )
        return cur.lastrowid

    def modifier_eleve(self, eleve_id, nom, prenom, telephone="", niveau="", actif=True):
        nom, prenom = nom.strip(), prenom.strip()
        if not nom or not prenom:
            raise ValueError("Le nom et le prénom sont obligatoires.")
        with self.cx:
            self.cx.execute(
                "UPDATE eleves SET nom = ?, prenom = ?, telephone = ?, niveau = ?, actif = ? "
                "WHERE id = ?",
                (nom, prenom, telephone.strip(), niveau.strip(), int(actif), eleve_id),
            )

    def supprimer_eleve(self, eleve_id):
        with self.cx:
            self.cx.execute("DELETE FROM eleves WHERE id = ?", (eleve_id,))

    def eleve(self, eleve_id):
        return self.cx.execute("SELECT * FROM eleves WHERE id = ?", (eleve_id,)).fetchone()

    def eleves(self, actifs_seulement=True):
        sql = "SELECT * FROM eleves"
        if actifs_seulement:
            sql += " WHERE actif = 1"
        return self.cx.execute(sql + " ORDER BY nom COLLATE NOCASE, prenom COLLATE NOCASE").fetchall()

    def bilans(self, actifs_seulement=False, recherche=""):
        sql = """
            SELECT e.*,
                   (SELECT COUNT(*) FROM seances s WHERE s.eleve_id = e.id) AS nb,
                   (SELECT COALESCE(SUM(prix), 0) FROM seances s WHERE s.eleve_id = e.id) AS du,
                   (SELECT COALESCE(SUM(montant), 0) FROM paiements p WHERE p.eleve_id = e.id) AS paye
            FROM eleves e WHERE 1 = 1
        """
        args = []
        if actifs_seulement:
            sql += " AND e.actif = 1"
        if recherche.strip():
            sql += " AND (e.nom || ' ' || e.prenom || ' ' || e.prenom || ' ' || e.nom) LIKE ?"
            args.append(f"%{recherche.strip()}%")
        sql += " ORDER BY e.nom COLLATE NOCASE, e.prenom COLLATE NOCASE"
        return [
            Bilan(r["id"], r["nom"], r["prenom"], r["telephone"], r["niveau"],
                  bool(r["actif"]), r["nb"], r["du"], r["paye"])
            for r in self.cx.execute(sql, args)
        ]

    def bilan(self, eleve_id):
        for b in self.bilans():
            if b.id == eleve_id:
                return b
        return None

    # ---------- séances / présence ----------

    def ajouter_seance(self, eleve_id, jour):
        """Marque l'élève présent à la date donnée. Retourne False si déjà noté."""
        with self.cx:
            cur = self.cx.execute(
                "INSERT OR IGNORE INTO seances (eleve_id, date, prix) VALUES (?, ?, ?)",
                (eleve_id, jour.isoformat(), self.prix_seance),
            )
        return cur.rowcount == 1

    def supprimer_seance(self, seance_id):
        with self.cx:
            self.cx.execute("DELETE FROM seances WHERE id = ?", (seance_id,))

    def presents(self, jour):
        """Ensemble des ids d'élèves présents à la date donnée."""
        rows = self.cx.execute(
            "SELECT eleve_id FROM seances WHERE date = ?", (jour.isoformat(),)
        )
        return {r["eleve_id"] for r in rows}

    def enregistrer_presence(self, jour, eleve_ids):
        """Synchronise la présence d'un jour : ajoute les nouveaux, retire les décochés."""
        voulus = set(eleve_ids)
        actuels = self.presents(jour)
        with self.cx:
            for eid in voulus - actuels:
                self.cx.execute(
                    "INSERT INTO seances (eleve_id, date, prix) VALUES (?, ?, ?)",
                    (eid, jour.isoformat(), self.prix_seance),
                )
            for eid in actuels - voulus:
                self.cx.execute(
                    "DELETE FROM seances WHERE eleve_id = ? AND date = ?",
                    (eid, jour.isoformat()),
                )

    def seances(self, eleve_id):
        return self.cx.execute(
            "SELECT * FROM seances WHERE eleve_id = ? ORDER BY date DESC", (eleve_id,)
        ).fetchall()

    # ---------- paiements ----------

    def ajouter_paiement(self, eleve_id, montant, jour, note=""):
        if montant <= 0:
            raise ValueError("Le montant doit être positif.")
        with self.cx:
            cur = self.cx.execute(
                "INSERT INTO paiements (eleve_id, date, montant, note) VALUES (?, ?, ?, ?)",
                (eleve_id, jour.isoformat(), montant, note.strip()),
            )
        return cur.lastrowid

    def supprimer_paiement(self, paiement_id):
        with self.cx:
            self.cx.execute("DELETE FROM paiements WHERE id = ?", (paiement_id,))

    def paiements(self, eleve_id=None):
        sql = (
            "SELECT p.*, e.nom, e.prenom FROM paiements p "
            "JOIN eleves e ON e.id = p.eleve_id"
        )
        args = []
        if eleve_id is not None:
            sql += " WHERE p.eleve_id = ?"
            args.append(eleve_id)
        return self.cx.execute(sql + " ORDER BY p.date DESC, p.id DESC", args).fetchall()

    # ---------- export / sauvegarde ----------

    def exporter_csv(self, chemin):
        with open(chemin, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f, delimiter=";")
            w.writerow(["Nom", "Prénom", "Téléphone", "Niveau", "Séances",
                        "Montant dû (DA)", "Payé (DA)", "Reste (DA)"])
            for b in self.bilans():
                w.writerow([b.nom, b.prenom, b.telephone, b.niveau, b.seances,
                            f"{b.du:.0f}", f"{b.paye:.0f}", f"{b.reste:.0f}"])

    def sauvegarder(self, destination):
        """Copie de sauvegarde cohérente de la base."""
        self.cx.commit()
        if os.path.abspath(destination) == os.path.abspath(self.chemin):
            raise ValueError("La sauvegarde doit être un fichier différent.")
        dest = sqlite3.connect(destination)
        with dest:
            self.cx.backup(dest)
        dest.close()

    def restaurer(self, source):
        """Remplace la base actuelle par une sauvegarde."""
        test = sqlite3.connect(source)
        try:
            test.execute("SELECT COUNT(*) FROM eleves").fetchone()
        except sqlite3.DatabaseError as e:
            raise ValueError("Ce fichier n'est pas une sauvegarde valide.") from e
        finally:
            test.close()
        self.cx.close()
        shutil.copyfile(source, self.chemin)
        self.__init__(self.chemin)
