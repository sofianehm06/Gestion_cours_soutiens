import { describe, expect, it } from "vitest";
import { bilans, correspond, origineTarif, prixSeanceEleve, tarifEleve, dansGroupe, SANS_GROUPE, detailSeances, donneesVides, exporterCsv, normaliser, prixSeance, progressionMois, statsMois, statut } from "../src/lib/calculs";
import type { Donnees } from "../src/lib/types";

function exemple(): Donnees {
  const d = donneesVides();
  d.eleves.push(
    { id: "a", nom: "Benali", prenom: "Yanis", telephone: "0550", niveau: "4AM", actif: true, dateInscription: "2026-09-01", groupeId: "g1", tarifMensuel: null },
    { id: "b", nom: "Hamdi", prenom: "Sara", telephone: "", niveau: "", actif: true, dateInscription: "2026-09-01", groupeId: "", tarifMensuel: null },
  );
  d.groupes.push({ id: "g1", nom: "4AM Maths", horaire: "Samedi 14h", tarifMensuel: null });
  for (let j = 1; j <= 6; j++) d.seances.push({ id: `s${j}`, eleveId: "a", date: `2026-09-0${j}`, prix: 375 });
  d.paiements.push({ id: "p1", eleveId: "a", date: "2026-09-05", montant: 1500, note: "" });
  return d;
}

describe("calculs", () => {
  it("1 mois = 4 séances = 1500 DA → 375 DA la séance", () => {
    expect(prixSeance(donneesVides().parametres)).toBe(375);
  });

  it("calcule dû, payé et reste", () => {
    const [a, b] = bilans(exemple());
    expect(a).toMatchObject({ seances: 6, du: 2250, paye: 1500, reste: 750 });
    expect(b).toMatchObject({ seances: 0, du: 0, paye: 0, reste: 0 });
  });

  it("garde le prix figé de chaque séance", () => {
    const d = exemple();
    d.seances.push({ id: "x", eleveId: "a", date: "2026-09-20", prix: 500 });
    expect(bilans(d)[0].du).toBe(2750);
  });

  it("décompose les séances en mois", () => {
    expect(detailSeances(6, 4)).toBe("1 mois + 2 séances");
    expect(detailSeances(8, 4)).toBe("2 mois");
    expect(detailSeances(1, 4)).toBe("1 séance");
    expect(detailSeances(0, 4)).toBe("Aucune séance");
    expect(progressionMois(6, 4)).toBe(2);
    expect(progressionMois(8, 4)).toBe(4);
    expect(progressionMois(0, 4)).toBe(0);
  });

  it("statut", () => {
    expect(statut(750)).toBe("doit");
    expect(statut(0)).toBe("ajour");
    expect(statut(-375)).toBe("avance");
  });

  it("recherche sans accents et dans les deux ordres", () => {
    const e = { nom: "Benali", prenom: "Yanis" };
    expect(correspond(e, "yanis ben")).toBe(true);
    expect(correspond(e, "BENALI")).toBe(true);
    expect(correspond({ nom: "Aït", prenom: "Élodie" }, "ait elodie")).toBe(true);
    expect(correspond(e, "sara")).toBe(false);
  });

  it("statistiques du mois", () => {
    expect(statsMois(exemple(), "2026-09")).toEqual({ seances: 6, joursDeCours: 6, encaisse: 1500 });
    expect(statsMois(exemple(), "2026-10").seances).toBe(0);
  });

  it("export CSV", () => {
    const csv = exporterCsv(exemple());
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Benali;Yanis;0550;4AM;4AM Maths;1500;oui;6;2250;1500;750");
    expect(csv).toContain("Hamdi;Sara;;;;1500;oui;0;0;0;0");
  });

  it("normalise et rejette les fichiers invalides", () => {
    const d = normaliser({ eleves: [], seances: [], paiements: [], parametres: { tarifMensuel: 2000 } });
    expect(d.parametres.seancesParMois).toBe(4);
    expect(d.parametres.tarifMensuel).toBe(2000);
    expect(() => normaliser({ foo: 1 })).toThrow();
  });

  it("migre les anciennes données sans groupes", () => {
    const d = normaliser({ eleves: [{ id: "a", nom: "X", prenom: "Y" }], seances: [], paiements: [] });
    expect(d.groupes).toEqual([]);
    expect(d.eleves[0].groupeId).toBe("");
  });

  it("filtre par groupe", () => {
    expect(dansGroupe({ groupeId: "g1", tarifMensuel: null }, "")).toBe(true);
    expect(dansGroupe({ groupeId: "g1", tarifMensuel: null }, "g1")).toBe(true);
    expect(dansGroupe({ groupeId: "g1", tarifMensuel: null }, "g2")).toBe(false);
    expect(dansGroupe({ groupeId: "", tarifMensuel: null }, SANS_GROUPE)).toBe(true);
    expect(dansGroupe({ groupeId: "g1", tarifMensuel: null }, SANS_GROUPE)).toBe(false);
  });

  it("tarif : élève, sinon groupe, sinon général", () => {
    const d = donneesVides();
    d.parametres.tarifMensuel = 2000;
    d.groupes.push({ id: "g", nom: "Groupe", horaire: "", tarifMensuel: 3000 }, { id: "h", nom: "Sans tarif", horaire: "", tarifMensuel: null });
    expect(tarifEleve(d, { tarifMensuel: null, groupeId: "" })).toBe(2000);
    expect(tarifEleve(d, { tarifMensuel: null, groupeId: "h" })).toBe(2000);
    expect(origineTarif(d, { tarifMensuel: null, groupeId: "g" })).toEqual({ tarif: 3000, origine: "groupe" });
    expect(origineTarif(d, { tarifMensuel: 7000, groupeId: "g" })).toEqual({ tarif: 7000, origine: "eleve" });
    expect(prixSeanceEleve(d, { tarifMensuel: 7000, groupeId: "" })).toBe(1750);
    expect(prixSeanceEleve(d, { tarifMensuel: 0, groupeId: "g" })).toBe(0);
    const n = normaliser({ groupes: [{ id: "g", nom: "G" }], eleves: [{ id: "a", tarifMensuel: 7000 }, { id: "b" }], seances: [], paiements: [] });
    expect(n.eleves.map((e) => e.tarifMensuel)).toEqual([7000, null]);
    expect(n.groupes[0].tarifMensuel).toBeNull();
  });
});
