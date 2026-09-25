import { describe, expect, it } from "vitest";
import { bilans, correspond, detailSeances, donneesVides, exporterCsv, normaliser, prixSeance, progressionMois, statsMois, statut } from "../src/lib/calculs";
import type { Donnees } from "../src/lib/types";

function exemple(): Donnees {
  const d = donneesVides();
  d.eleves.push(
    { id: "a", nom: "Benali", prenom: "Yanis", telephone: "0550", niveau: "4AM", actif: true, dateInscription: "2026-09-01" },
    { id: "b", nom: "Hamdi", prenom: "Sara", telephone: "", niveau: "", actif: true, dateInscription: "2026-09-01" },
  );
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
    expect(csv).toContain("Benali;Yanis;0550;4AM;oui;6;2250;1500;750");
  });

  it("normalise et rejette les fichiers invalides", () => {
    const d = normaliser({ eleves: [], seances: [], paiements: [], parametres: { tarifMensuel: 2000 } });
    expect(d.parametres.seancesParMois).toBe(4);
    expect(d.parametres.tarifMensuel).toBe(2000);
    expect(() => normaliser({ foo: 1 })).toThrow();
  });
});
