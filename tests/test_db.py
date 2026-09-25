import os
import tempfile
import unittest
from datetime import date

from soutien.db import Base


class TestBase(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.db = Base(os.path.join(self.dir.name, "t.db"))

    def tearDown(self):
        self.db.fermer()
        self.dir.cleanup()

    def test_tarif_par_defaut(self):
        self.assertEqual(self.db.tarif_mensuel, 1500)
        self.assertEqual(self.db.seances_par_mois, 4)
        self.assertEqual(self.db.prix_seance, 375)

    def test_calcul_du_et_reste(self):
        eid = self.db.ajouter_eleve("Benali", "Yanis")
        for j in range(1, 7):  # 6 séances = 1 mois + 2 séances
            self.db.ajouter_seance(eid, date(2026, 9, j))
        self.db.ajouter_paiement(eid, 1500, date(2026, 9, 5))
        b = self.db.bilan(eid)
        self.assertEqual(b.seances, 6)
        self.assertEqual(b.du, 2250)
        self.assertEqual(b.paye, 1500)
        self.assertEqual(b.reste, 750)

    def test_seance_en_double_ignoree(self):
        eid = self.db.ajouter_eleve("A", "B")
        self.assertTrue(self.db.ajouter_seance(eid, date(2026, 9, 1)))
        self.assertFalse(self.db.ajouter_seance(eid, date(2026, 9, 1)))
        self.assertEqual(self.db.bilan(eid).seances, 1)

    def test_presence_synchronisee(self):
        a = self.db.ajouter_eleve("A", "A")
        b = self.db.ajouter_eleve("B", "B")
        jour = date(2026, 9, 10)
        self.db.enregistrer_presence(jour, [a, b])
        self.assertEqual(self.db.presents(jour), {a, b})
        self.db.enregistrer_presence(jour, [b])
        self.assertEqual(self.db.presents(jour), {b})
        self.assertEqual(self.db.bilan(a).seances, 0)

    def test_changement_tarif_garde_ancien_prix(self):
        eid = self.db.ajouter_eleve("A", "B")
        self.db.ajouter_seance(eid, date(2026, 9, 1))
        self.db.definir_tarif(2000, 4)
        self.db.ajouter_seance(eid, date(2026, 9, 2))
        self.assertEqual(self.db.bilan(eid).du, 375 + 500)

    def test_suppression_eleve_en_cascade(self):
        eid = self.db.ajouter_eleve("A", "B")
        self.db.ajouter_seance(eid, date(2026, 9, 1))
        self.db.ajouter_paiement(eid, 100, date(2026, 9, 1))
        self.db.supprimer_eleve(eid)
        self.assertEqual(self.db.paiements(), [])
        self.assertEqual(self.db.cx.execute("SELECT COUNT(*) FROM seances").fetchone()[0], 0)

    def test_recherche_et_inactifs(self):
        a = self.db.ajouter_eleve("Benali", "Yanis")
        self.db.ajouter_eleve("Hamdi", "Sara")
        self.assertEqual([b.id for b in self.db.bilans(recherche="zzz")], [])
        self.assertEqual([b.id for b in self.db.bilans(recherche="yanis ben")], [a])
        self.assertEqual([b.id for b in self.db.bilans(recherche="Yanis")], [a])
        self.assertEqual([b.id for b in self.db.bilans(recherche="Benali Yanis")], [a])
        self.db.modifier_eleve(a, "Benali", "Yanis", actif=False)
        self.assertEqual(len(self.db.bilans(actifs_seulement=True)), 1)

    def test_validation(self):
        with self.assertRaises(ValueError):
            self.db.ajouter_eleve("", "X")
        eid = self.db.ajouter_eleve("A", "B")
        with self.assertRaises(ValueError):
            self.db.ajouter_paiement(eid, 0, date.today())

    def test_export_sauvegarde_restauration(self):
        eid = self.db.ajouter_eleve("Benali", "Yanis")
        self.db.ajouter_seance(eid, date(2026, 9, 1))
        csv_path = os.path.join(self.dir.name, "e.csv")
        self.db.exporter_csv(csv_path)
        with open(csv_path, encoding="utf-8-sig") as f:
            self.assertIn("Benali;Yanis", f.read())
        sauv = os.path.join(self.dir.name, "s.db")
        self.db.sauvegarder(sauv)
        self.db.supprimer_eleve(eid)
        self.db.restaurer(sauv)
        self.assertEqual(self.db.bilan(eid).seances, 1)


if __name__ == "__main__":
    unittest.main()
