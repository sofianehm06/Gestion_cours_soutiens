"""Interface graphique (Tkinter) de la gestion des cours de soutien."""

import tkinter as tk
from datetime import date, datetime, timedelta
from tkinter import filedialog, messagebox, ttk

from . import __version__
from .db import Base

TITRE = "Gestion des cours de soutien"


# ---------- utilitaires ----------

def fmt_da(montant):
    return f"{montant:,.0f} DA".replace(",", " ")


def fmt_date(iso):
    return datetime.strptime(iso, "%Y-%m-%d").strftime("%d/%m/%Y")


def lire_date(texte):
    texte = texte.strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(texte, fmt).date()
        except ValueError:
            pass
    raise ValueError("Date invalide. Utilisez le format JJ/MM/AAAA.")


def lire_montant(texte):
    try:
        return float(texte.replace(" ", "").replace(",", "."))
    except ValueError:
        raise ValueError("Montant invalide.") from None


def detail_seances(nb, par_mois):
    mois, reste = divmod(nb, par_mois)
    parts = []
    if mois:
        parts.append(f"{mois} mois")
    if reste:
        parts.append(f"{reste} séance{'s' if reste > 1 else ''}")
    return " + ".join(parts) or "—"


class ChampDate(ttk.Frame):
    """Saisie de date JJ/MM/AAAA avec boutons jour précédent / suivant / aujourd'hui."""

    def __init__(self, parent, commande=None):
        super().__init__(parent)
        self.commande = commande
        self.var = tk.StringVar(value=date.today().strftime("%d/%m/%Y"))
        ttk.Button(self, text="◀", width=3, command=lambda: self.decaler(-1)).pack(side="left")
        e = ttk.Entry(self, textvariable=self.var, width=12, justify="center")
        e.pack(side="left", padx=2)
        e.bind("<Return>", lambda _: self._notifier())
        ttk.Button(self, text="▶", width=3, command=lambda: self.decaler(1)).pack(side="left")
        ttk.Button(self, text="Aujourd'hui", command=self.aujourdhui).pack(side="left", padx=(6, 0))

    def get(self):
        return lire_date(self.var.get())

    def set(self, jour):
        self.var.set(jour.strftime("%d/%m/%Y"))
        self._notifier()

    def decaler(self, jours):
        try:
            self.set(self.get() + timedelta(days=jours))
        except ValueError as e:
            messagebox.showerror(TITRE, str(e))

    def aujourdhui(self):
        self.set(date.today())

    def _notifier(self):
        if self.commande:
            self.commande()


class Dialogue(tk.Toplevel):
    """Fenêtre modale simple avec boutons Valider / Annuler."""

    def __init__(self, parent, titre):
        super().__init__(parent)
        self.title(titre)
        self.transient(parent)
        self.resizable(False, False)
        self.resultat = None
        self.corps = ttk.Frame(self, padding=14)
        self.corps.pack(fill="both", expand=True)
        self.construire(self.corps)
        boutons = ttk.Frame(self, padding=(14, 0, 14, 14))
        boutons.pack(fill="x")
        ttk.Button(boutons, text="Annuler", command=self.destroy).pack(side="right")
        ttk.Button(boutons, text="Valider", style="Accent.TButton",
                   command=self._valider).pack(side="right", padx=6)
        self.bind("<Return>", lambda _: self._valider())
        self.bind("<Escape>", lambda _: self.destroy())
        self.wait_visibility()
        self.grab_set()
        self.focus_premier()

    def construire(self, corps):
        raise NotImplementedError

    def valider(self):
        raise NotImplementedError

    def focus_premier(self):
        pass

    def _valider(self):
        try:
            self.resultat = self.valider()
        except ValueError as e:
            messagebox.showerror(TITRE, str(e), parent=self)
            return
        self.destroy()


class DialogueEleve(Dialogue):
    def __init__(self, parent, eleve=None):
        self.eleve = eleve
        super().__init__(parent, "Modifier l'élève" if eleve else "Nouvel élève")

    def construire(self, c):
        e = self.eleve
        self.vars = {
            "nom": tk.StringVar(value=e["nom"] if e else ""),
            "prenom": tk.StringVar(value=e["prenom"] if e else ""),
            "telephone": tk.StringVar(value=e["telephone"] if e else ""),
            "niveau": tk.StringVar(value=e["niveau"] if e else ""),
        }
        libelles = [("nom", "Nom *"), ("prenom", "Prénom *"),
                    ("telephone", "Téléphone"), ("niveau", "Niveau / classe")]
        self.entrees = []
        for i, (cle, lib) in enumerate(libelles):
            ttk.Label(c, text=lib).grid(row=i, column=0, sticky="w", pady=4)
            en = ttk.Entry(c, textvariable=self.vars[cle], width=32)
            en.grid(row=i, column=1, pady=4, padx=(10, 0))
            self.entrees.append(en)
        self.actif = tk.BooleanVar(value=bool(e["actif"]) if e else True)
        if e:
            ttk.Checkbutton(c, text="Élève actif (décocher s'il a arrêté)",
                            variable=self.actif).grid(row=4, column=1, sticky="w", pady=4)

    def focus_premier(self):
        self.entrees[0].focus_set()

    def valider(self):
        v = {k: var.get().strip() for k, var in self.vars.items()}
        if not v["nom"] or not v["prenom"]:
            raise ValueError("Le nom et le prénom sont obligatoires.")
        v["actif"] = self.actif.get()
        return v


class DialoguePaiement(Dialogue):
    def __init__(self, parent, bilan, montant_propose):
        self.bilan = bilan
        self.montant_propose = montant_propose
        super().__init__(parent, "Enregistrer un paiement")

    def construire(self, c):
        b = self.bilan
        ttk.Label(c, text=f"{b.nom} {b.prenom}", style="Titre.TLabel").grid(
            row=0, column=0, columnspan=2, sticky="w")
        ttk.Label(c, text=f"Reste à payer : {fmt_da(max(b.reste, 0))}").grid(
            row=1, column=0, columnspan=2, sticky="w", pady=(0, 10))
        ttk.Label(c, text="Montant (DA)").grid(row=2, column=0, sticky="w", pady=4)
        self.montant = tk.StringVar(value=f"{self.montant_propose:.0f}")
        self.e_montant = ttk.Entry(c, textvariable=self.montant, width=14)
        self.e_montant.grid(row=2, column=1, sticky="w", padx=(10, 0))
        ttk.Label(c, text="Date").grid(row=3, column=0, sticky="w", pady=4)
        self.date = ChampDate(c)
        self.date.grid(row=3, column=1, sticky="w", padx=(10, 0))
        ttk.Label(c, text="Note").grid(row=4, column=0, sticky="w", pady=4)
        self.note = tk.StringVar()
        ttk.Entry(c, textvariable=self.note, width=32).grid(row=4, column=1, sticky="w", padx=(10, 0))

    def focus_premier(self):
        self.e_montant.focus_set()
        self.e_montant.select_range(0, "end")

    def valider(self):
        montant = lire_montant(self.montant.get())
        if montant <= 0:
            raise ValueError("Le montant doit être positif.")
        return montant, self.date.get(), self.note.get()


class DialogueSeance(Dialogue):
    def __init__(self, parent, bilan):
        self.bilan = bilan
        super().__init__(parent, "Ajouter une séance")

    def construire(self, c):
        ttk.Label(c, text=f"{self.bilan.nom} {self.bilan.prenom}", style="Titre.TLabel").grid(
            row=0, column=0, columnspan=2, sticky="w", pady=(0, 10))
        ttk.Label(c, text="Date de la séance").grid(row=1, column=0, sticky="w")
        self.date = ChampDate(c)
        self.date.grid(row=1, column=1, padx=(10, 0))

    def valider(self):
        return self.date.get()


class FenetreHistorique(tk.Toplevel):
    """Détail d'un élève : liste des séances et des paiements, avec suppression."""

    def __init__(self, app, eleve_id):
        super().__init__(app.root)
        self.app, self.db, self.eleve_id = app, app.db, eleve_id
        self.transient(app.root)
        self.geometry("760x480")
        corps = ttk.Frame(self, padding=12)
        corps.pack(fill="both", expand=True)
        self.entete = ttk.Label(corps, style="Titre.TLabel")
        self.entete.pack(anchor="w")
        self.resume = ttk.Label(corps)
        self.resume.pack(anchor="w", pady=(2, 10))

        cols = ttk.Frame(corps)
        cols.pack(fill="both", expand=True)
        cols.columnconfigure((0, 1), weight=1, uniform="c")
        cols.rowconfigure(1, weight=1)

        ttk.Label(cols, text="Séances", style="Section.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(cols, text="Paiements", style="Section.TLabel").grid(row=0, column=1, sticky="w", padx=(12, 0))
        self.t_seances = self._table(cols, ("date", "prix"), ("Date", "Prix"), 0)
        self.t_paiements = self._table(cols, ("date", "montant", "note"), ("Date", "Montant", "Note"), 1)

        ttk.Button(cols, text="Supprimer la séance", command=self.suppr_seance).grid(
            row=2, column=0, sticky="w", pady=(6, 0))
        ttk.Button(cols, text="Supprimer le paiement", command=self.suppr_paiement).grid(
            row=2, column=1, sticky="w", pady=(6, 0), padx=(12, 0))
        self.rafraichir()

    def _table(self, parent, cles, titres, col):
        cadre = ttk.Frame(parent)
        cadre.grid(row=1, column=col, sticky="nsew", padx=(12 if col else 0, 0))
        t = ttk.Treeview(cadre, columns=cles, show="headings", selectmode="browse")
        for k, titre in zip(cles, titres):
            t.heading(k, text=titre)
            t.column(k, width=90, anchor="center" if k != "note" else "w")
        sb = ttk.Scrollbar(cadre, orient="vertical", command=t.yview)
        t.configure(yscrollcommand=sb.set)
        t.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        return t

    def rafraichir(self):
        b = self.db.bilan(self.eleve_id)
        if b is None:
            self.destroy()
            return
        self.title(f"Historique — {b.nom} {b.prenom}")
        self.entete.config(text=f"{b.nom} {b.prenom}")
        self.resume.config(
            text=f"{b.seances} séances ({detail_seances(b.seances, self.db.seances_par_mois)})   •   "
                 f"Dû : {fmt_da(b.du)}   •   Payé : {fmt_da(b.paye)}   •   Reste : {fmt_da(b.reste)}")
        for t in (self.t_seances, self.t_paiements):
            t.delete(*t.get_children())
        for s in self.db.seances(self.eleve_id):
            self.t_seances.insert("", "end", iid=str(s["id"]),
                                  values=(fmt_date(s["date"]), fmt_da(s["prix"])))
        for p in self.db.paiements(self.eleve_id):
            self.t_paiements.insert("", "end", iid=str(p["id"]),
                                    values=(fmt_date(p["date"]), fmt_da(p["montant"]), p["note"]))

    def suppr_seance(self):
        sel = self.t_seances.selection()
        if sel and messagebox.askyesno(TITRE, "Supprimer cette séance ?", parent=self):
            self.db.supprimer_seance(int(sel[0]))
            self.app.tout_rafraichir()

    def suppr_paiement(self):
        sel = self.t_paiements.selection()
        if sel and messagebox.askyesno(TITRE, "Supprimer ce paiement ?", parent=self):
            self.db.supprimer_paiement(int(sel[0]))
            self.app.tout_rafraichir()


# ---------- onglets ----------

class OngletEleves(ttk.Frame):
    COLONNES = (
        ("nom", "Nom", 150, "w"),
        ("prenom", "Prénom", 150, "w"),
        ("telephone", "Téléphone", 120, "center"),
        ("niveau", "Niveau", 90, "center"),
        ("seances", "Séances", 70, "center"),
        ("detail", "Soit", 160, "center"),
        ("du", "Montant dû", 110, "e"),
        ("paye", "Payé", 110, "e"),
        ("reste", "Reste à payer", 120, "e"),
    )

    def __init__(self, parent, app):
        super().__init__(parent, padding=10)
        self.app, self.db = app, app.db

        barre = ttk.Frame(self)
        barre.pack(fill="x", pady=(0, 8))
        ttk.Label(barre, text="Rechercher :").pack(side="left")
        self.recherche = tk.StringVar()
        self.recherche.trace_add("write", lambda *_: self.rafraichir())
        ttk.Entry(barre, textvariable=self.recherche, width=28).pack(side="left", padx=6)
        self.voir_inactifs = tk.BooleanVar(value=False)
        ttk.Checkbutton(barre, text="Afficher les élèves inactifs", variable=self.voir_inactifs,
                        command=self.rafraichir).pack(side="left", padx=10)
        ttk.Button(barre, text="+ Nouvel élève", style="Accent.TButton",
                   command=self.ajouter).pack(side="right")

        cadre = ttk.Frame(self)
        cadre.pack(fill="both", expand=True)
        self.table = ttk.Treeview(cadre, columns=[c[0] for c in self.COLONNES],
                                  show="headings", selectmode="browse")
        for cle, titre, larg, ancre in self.COLONNES:
            self.table.heading(cle, text=titre)
            self.table.column(cle, width=larg, anchor=ancre, stretch=cle in ("nom", "prenom"))
        self.table.tag_configure("doit", foreground="#b3261e")
        self.table.tag_configure("avance", foreground="#1b7f3b")
        self.table.tag_configure("inactif", foreground="#8a8a8a")
        sb = ttk.Scrollbar(cadre, orient="vertical", command=self.table.yview)
        self.table.configure(yscrollcommand=sb.set)
        self.table.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        self.table.bind("<Double-1>", lambda _: self.historique())

        actions = ttk.Frame(self)
        actions.pack(fill="x", pady=(8, 0))
        for texte, cmd in (
            ("✓ Ajouter une séance", self.ajouter_seance),
            ("💰 Paiement", self.paiement),
            ("Historique", self.historique),
            ("Modifier", self.modifier),
            ("Supprimer", self.supprimer),
        ):
            ttk.Button(actions, text=texte, command=cmd).pack(side="left", padx=(0, 6))

        self.totaux = ttk.Label(self, style="Total.TLabel")
        self.totaux.pack(anchor="e", pady=(8, 0))

    def selection(self):
        sel = self.table.selection()
        if not sel:
            messagebox.showinfo(TITRE, "Sélectionnez d'abord un élève dans la liste.")
            return None
        return int(sel[0])

    def rafraichir(self):
        sel = self.table.selection()
        self.table.delete(*self.table.get_children())
        par_mois = self.db.seances_par_mois
        total_reste = 0
        bilans = self.db.bilans(actifs_seulement=not self.voir_inactifs.get(),
                                recherche=self.recherche.get())
        for b in bilans:
            tags = []
            if not b.actif:
                tags.append("inactif")
            elif b.reste > 0.5:
                tags.append("doit")
            elif b.reste < -0.5:
                tags.append("avance")
            reste = fmt_da(b.reste) if b.reste >= 0 else f"Avance {fmt_da(-b.reste)}"
            self.table.insert("", "end", iid=str(b.id), tags=tags, values=(
                b.nom, b.prenom, b.telephone, b.niveau, b.seances,
                detail_seances(b.seances, par_mois),
                fmt_da(b.du), fmt_da(b.paye), reste,
            ))
            total_reste += max(b.reste, 0)
        if sel and self.table.exists(sel[0]):
            self.table.selection_set(sel[0])
            self.table.see(sel[0])
        self.totaux.config(
            text=f"{len(bilans)} élève(s)   •   Total restant à encaisser : {fmt_da(total_reste)}")

    def ajouter(self):
        d = DialogueEleve(self.app.root)
        self.app.root.wait_window(d)
        if d.resultat:
            v = d.resultat
            eid = self.db.ajouter_eleve(v["nom"], v["prenom"], v["telephone"], v["niveau"])
            self.app.tout_rafraichir()
            self.table.selection_set(str(eid))
            self.table.see(str(eid))

    def modifier(self):
        eid = self.selection()
        if eid is None:
            return
        d = DialogueEleve(self.app.root, self.db.eleve(eid))
        self.app.root.wait_window(d)
        if d.resultat:
            v = d.resultat
            self.db.modifier_eleve(eid, v["nom"], v["prenom"], v["telephone"], v["niveau"], v["actif"])
            self.app.tout_rafraichir()

    def supprimer(self):
        eid = self.selection()
        if eid is None:
            return
        e = self.db.eleve(eid)
        if messagebox.askyesno(
            TITRE,
            f"Supprimer définitivement {e['nom']} {e['prenom']} ainsi que toutes ses séances "
            "et tous ses paiements ?\n\nAstuce : pour un élève qui a arrêté, utilisez plutôt "
            "« Modifier » et décochez « Élève actif ».",
            icon="warning",
        ):
            self.db.supprimer_eleve(eid)
            self.app.tout_rafraichir()

    def ajouter_seance(self):
        eid = self.selection()
        if eid is None:
            return
        d = DialogueSeance(self.app.root, self.db.bilan(eid))
        self.app.root.wait_window(d)
        if d.resultat:
            if not self.db.ajouter_seance(eid, d.resultat):
                messagebox.showinfo(TITRE, "Une séance est déjà enregistrée à cette date pour cet élève.")
            self.app.tout_rafraichir()

    def paiement(self):
        eid = self.selection()
        if eid is None:
            return
        b = self.db.bilan(eid)
        propose = b.reste if b.reste > 0 else self.db.tarif_mensuel
        d = DialoguePaiement(self.app.root, b, propose)
        self.app.root.wait_window(d)
        if d.resultat:
            montant, jour, note = d.resultat
            self.db.ajouter_paiement(eid, montant, jour, note)
            self.app.tout_rafraichir()

    def historique(self):
        eid = self.selection()
        if eid is not None:
            self.app.ouvrir_historique(eid)


class OngletPresence(ttk.Frame):
    """Feuille de présence d'une journée : cocher les élèves présents."""

    def __init__(self, parent, app):
        super().__init__(parent, padding=10)
        self.app, self.db = app, app.db
        self.coches = {}

        haut = ttk.Frame(self)
        haut.pack(fill="x", pady=(0, 8))
        ttk.Label(haut, text="Date de la séance :").pack(side="left")
        self.date = ChampDate(haut, commande=self.rafraichir)
        self.date.pack(side="left", padx=8)
        self.info = ttk.Label(haut)
        self.info.pack(side="left", padx=12)

        outils = ttk.Frame(self)
        outils.pack(fill="x", pady=(0, 6))
        ttk.Button(outils, text="Tout cocher", command=lambda: self.tout(True)).pack(side="left")
        ttk.Button(outils, text="Tout décocher", command=lambda: self.tout(False)).pack(side="left", padx=6)

        # Liste défilante de cases à cocher
        cadre = ttk.Frame(self, relief="solid", borderwidth=1)
        cadre.pack(fill="both", expand=True)
        self.canvas = tk.Canvas(cadre, highlightthickness=0, background="white")
        sb = ttk.Scrollbar(cadre, orient="vertical", command=self.canvas.yview)
        self.liste = ttk.Frame(self.canvas, style="Blanc.TFrame", padding=8)
        self.liste.bind("<Configure>",
                        lambda _: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.create_window((0, 0), window=self.liste, anchor="nw")
        self.canvas.configure(yscrollcommand=sb.set)
        self.canvas.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        self.canvas.bind("<Enter>", lambda _: self.canvas.bind_all("<MouseWheel>", self._molette))
        self.canvas.bind("<Leave>", lambda _: self.canvas.unbind_all("<MouseWheel>"))

        bas = ttk.Frame(self)
        bas.pack(fill="x", pady=(8, 0))
        self.compteur = ttk.Label(bas)
        self.compteur.pack(side="left")
        ttk.Button(bas, text="Enregistrer la présence", style="Accent.TButton",
                   command=self.enregistrer).pack(side="right")

    def _molette(self, event):
        self.canvas.yview_scroll(int(-event.delta / 120), "units")

    def rafraichir(self):
        try:
            jour = self.date.get()
        except ValueError as e:
            messagebox.showerror(TITRE, str(e))
            return
        for w in self.liste.winfo_children():
            w.destroy()
        self.coches.clear()
        presents = self.db.presents(jour)
        eleves = self.db.eleves(actifs_seulement=True)
        # Garder visibles les élèves inactifs déjà notés présents ce jour-là
        ids = {e["id"] for e in eleves}
        eleves += [self.db.eleve(i) for i in presents - ids]
        for e in eleves:
            var = tk.BooleanVar(value=e["id"] in presents)
            var.trace_add("write", lambda *_: self._compter())
            ttk.Checkbutton(self.liste, text=f"{e['nom']} {e['prenom']}", variable=var,
                            style="Blanc.TCheckbutton").pack(anchor="w", pady=2)
            self.coches[e["id"]] = var
        if not eleves:
            ttk.Label(self.liste, text="Aucun élève. Ajoutez d'abord des élèves dans l'onglet « Élèves ».",
                      style="Blanc.TLabel").pack(anchor="w")
        jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
        etat = "déjà enregistrée" if presents else "pas encore enregistrée"
        self.info.config(text=f"{jours[jour.weekday()].capitalize()} — présence {etat}")
        self._compter()

    def _compter(self):
        n = sum(v.get() for v in self.coches.values())
        self.compteur.config(text=f"{n} présent(s) sur {len(self.coches)}")

    def tout(self, valeur):
        for v in self.coches.values():
            v.set(valeur)

    def enregistrer(self):
        try:
            jour = self.date.get()
        except ValueError as e:
            messagebox.showerror(TITRE, str(e))
            return
        ids = [eid for eid, v in self.coches.items() if v.get()]
        self.db.enregistrer_presence(jour, ids)
        self.app.tout_rafraichir()
        messagebox.showinfo(TITRE, f"Présence du {jour.strftime('%d/%m/%Y')} enregistrée "
                                   f"({len(ids)} présent(s)).")


class OngletPaiements(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, padding=10)
        self.app, self.db = app, app.db
        cadre = ttk.Frame(self)
        cadre.pack(fill="both", expand=True)
        cols = (("date", "Date", 100, "center"), ("eleve", "Élève", 260, "w"),
                ("montant", "Montant", 120, "e"), ("note", "Note", 260, "w"))
        self.table = ttk.Treeview(cadre, columns=[c[0] for c in cols], show="headings",
                                  selectmode="browse")
        for cle, titre, larg, ancre in cols:
            self.table.heading(cle, text=titre)
            self.table.column(cle, width=larg, anchor=ancre)
        sb = ttk.Scrollbar(cadre, orient="vertical", command=self.table.yview)
        self.table.configure(yscrollcommand=sb.set)
        self.table.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        bas = ttk.Frame(self)
        bas.pack(fill="x", pady=(8, 0))
        ttk.Button(bas, text="Supprimer le paiement", command=self.supprimer).pack(side="left")
        self.total = ttk.Label(bas, style="Total.TLabel")
        self.total.pack(side="right")

    def rafraichir(self):
        self.table.delete(*self.table.get_children())
        total_mois = 0
        mois = date.today().strftime("%Y-%m")
        for p in self.db.paiements():
            self.table.insert("", "end", iid=str(p["id"]), values=(
                fmt_date(p["date"]), f"{p['nom']} {p['prenom']}", fmt_da(p["montant"]), p["note"]))
            if p["date"].startswith(mois):
                total_mois += p["montant"]
        self.total.config(text=f"Encaissé ce mois-ci : {fmt_da(total_mois)}")

    def supprimer(self):
        sel = self.table.selection()
        if sel and messagebox.askyesno(TITRE, "Supprimer ce paiement ?"):
            self.db.supprimer_paiement(int(sel[0]))
            self.app.tout_rafraichir()


class OngletParametres(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, padding=16)
        self.app, self.db = app, app.db

        ttk.Label(self, text="Tarif", style="Section.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(self, text="Prix d'un mois (DA)").grid(row=1, column=0, sticky="w", pady=4)
        self.tarif = tk.StringVar()
        ttk.Entry(self, textvariable=self.tarif, width=12).grid(row=1, column=1, sticky="w", padx=10)
        ttk.Label(self, text="Nombre de séances par mois").grid(row=2, column=0, sticky="w", pady=4)
        self.nb = tk.StringVar()
        ttk.Spinbox(self, from_=1, to=31, textvariable=self.nb, width=10).grid(
            row=2, column=1, sticky="w", padx=10)
        self.prix = ttk.Label(self)
        self.prix.grid(row=3, column=0, columnspan=2, sticky="w", pady=4)
        ttk.Button(self, text="Enregistrer le tarif", style="Accent.TButton",
                   command=self.enregistrer).grid(row=4, column=0, sticky="w", pady=(6, 0))
        ttk.Label(self, text="Le nouveau tarif s'applique aux prochaines séances ; "
                             "les séances déjà enregistrées gardent leur prix.",
                  foreground="#666").grid(row=5, column=0, columnspan=3, sticky="w", pady=(4, 0))

        ttk.Separator(self).grid(row=6, column=0, columnspan=3, sticky="ew", pady=18)
        ttk.Label(self, text="Données", style="Section.TLabel").grid(row=7, column=0, sticky="w")
        ttk.Button(self, text="Exporter la liste (Excel / CSV)", command=self.exporter).grid(
            row=8, column=0, sticky="w", pady=4)
        ttk.Button(self, text="Faire une sauvegarde", command=self.sauvegarder).grid(
            row=9, column=0, sticky="w", pady=4)
        ttk.Button(self, text="Restaurer une sauvegarde", command=self.restaurer).grid(
            row=10, column=0, sticky="w", pady=4)
        ttk.Label(self, text=f"Fichier de données : {self.db.chemin}", foreground="#666").grid(
            row=11, column=0, columnspan=3, sticky="w", pady=(10, 0))
        ttk.Label(self, text=f"Version {__version__}", foreground="#666").grid(
            row=12, column=0, columnspan=3, sticky="w")

    def rafraichir(self):
        self.tarif.set(f"{self.db.tarif_mensuel:.0f}")
        self.nb.set(str(self.db.seances_par_mois))
        self.prix.config(text=f"Prix d'une séance : {fmt_da(self.db.prix_seance)}")

    def enregistrer(self):
        try:
            tarif = lire_montant(self.tarif.get())
            nb = int(self.nb.get())
            self.db.definir_tarif(tarif, nb)
        except ValueError:
            messagebox.showerror(TITRE, "Valeurs invalides.")
            return
        self.app.tout_rafraichir()
        messagebox.showinfo(TITRE, "Tarif enregistré.")

    def exporter(self):
        chemin = filedialog.asksaveasfilename(
            title="Exporter", defaultextension=".csv",
            initialfile=f"eleves_{date.today():%Y-%m-%d}.csv",
            filetypes=[("Fichier CSV (Excel)", "*.csv")])
        if chemin:
            self.db.exporter_csv(chemin)
            messagebox.showinfo(TITRE, "Export terminé.")

    def sauvegarder(self):
        chemin = filedialog.asksaveasfilename(
            title="Sauvegarde", defaultextension=".db",
            initialfile=f"sauvegarde_soutien_{date.today():%Y-%m-%d}.db",
            filetypes=[("Sauvegarde", "*.db")])
        if chemin:
            try:
                self.db.sauvegarder(chemin)
            except (ValueError, OSError) as e:
                messagebox.showerror(TITRE, str(e))
                return
            messagebox.showinfo(TITRE, "Sauvegarde effectuée.")

    def restaurer(self):
        chemin = filedialog.askopenfilename(title="Restaurer", filetypes=[("Sauvegarde", "*.db")])
        if not chemin or not messagebox.askyesno(
                TITRE, "Les données actuelles seront remplacées par la sauvegarde. Continuer ?",
                icon="warning"):
            return
        try:
            self.db.restaurer(chemin)
        except (ValueError, OSError) as e:
            messagebox.showerror(TITRE, str(e))
            return
        self.app.tout_rafraichir()
        messagebox.showinfo(TITRE, "Sauvegarde restaurée.")


# ---------- application ----------

class Application:
    def __init__(self, root, db):
        self.root, self.db = root, db
        self.historiques = {}
        root.title(TITRE)
        root.geometry("1100x640")
        root.minsize(900, 500)
        self._styles()

        self.onglets = ttk.Notebook(root)
        self.onglets.pack(fill="both", expand=True, padx=8, pady=8)
        self.eleves = OngletEleves(self.onglets, self)
        self.presence = OngletPresence(self.onglets, self)
        self.paiements = OngletPaiements(self.onglets, self)
        self.parametres = OngletParametres(self.onglets, self)
        self.onglets.add(self.eleves, text="  Élèves  ")
        self.onglets.add(self.presence, text="  Présence  ")
        self.onglets.add(self.paiements, text="  Paiements  ")
        self.onglets.add(self.parametres, text="  Paramètres  ")
        self.tout_rafraichir()

    def _styles(self):
        s = ttk.Style(self.root)
        if "vista" in s.theme_names():
            s.theme_use("vista")
        elif "clam" in s.theme_names():
            s.theme_use("clam")
        s.configure("Treeview", rowheight=26)
        s.configure("Treeview.Heading", font=("Segoe UI", 10, "bold"))
        s.configure("Titre.TLabel", font=("Segoe UI", 13, "bold"))
        s.configure("Section.TLabel", font=("Segoe UI", 11, "bold"))
        s.configure("Total.TLabel", font=("Segoe UI", 11, "bold"))
        s.configure("Accent.TButton", font=("Segoe UI", 10, "bold"))
        s.configure("Blanc.TFrame", background="white")
        s.configure("Blanc.TLabel", background="white")
        s.configure("Blanc.TCheckbutton", background="white", font=("Segoe UI", 11))

    def tout_rafraichir(self):
        for onglet in (self.eleves, self.presence, self.paiements, self.parametres):
            onglet.rafraichir()
        for eid, fen in list(self.historiques.items()):
            if fen.winfo_exists():
                fen.rafraichir()
            else:
                del self.historiques[eid]

    def ouvrir_historique(self, eleve_id):
        fen = self.historiques.get(eleve_id)
        if fen is not None and fen.winfo_exists():
            fen.lift()
            return
        self.historiques[eleve_id] = FenetreHistorique(self, eleve_id)


def main():
    root = tk.Tk()
    Application(root, Base())
    root.mainloop()
