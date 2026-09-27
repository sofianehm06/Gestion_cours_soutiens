import { useState, type FormEvent } from "react";
import { correspond, origineTarif, prixSeanceEleve, tarifEleve } from "../lib/calculs";
import { aujourdhui, da } from "../lib/format";
import type { Eleve } from "../lib/types";
import { useStore } from "../store";
import { SelectGroupe } from "./groupes";
import { Avatar, Bouton, Champ, Modale, cx, useUi } from "./ui";

export function DialogueEleve({ eleve, groupeInitial = "", onFermer, onCree }: { eleve?: Eleve; groupeInitial?: string; onFermer(): void; onCree?(id: string): void }) {
  const store = useStore();
  const { notifier } = useUi();
  const [c, setC] = useState({
    nom: eleve?.nom ?? "", prenom: eleve?.prenom ?? "", telephone: eleve?.telephone ?? "", niveau: eleve?.niveau ?? "",
    groupeId: eleve?.groupeId ?? groupeInitial,
    tarif: eleve?.tarifMensuel != null ? String(eleve.tarifMensuel) : "",
  });
  const p = store.donnees.parametres;
  const avecGroupes = store.donnees.groupes.length > 0;
  // Tarif vide = tarif général
  const tarifSaisi = c.tarif.replace(/\s/g, "");
  const tarifMensuel = tarifSaisi === "" ? null : Number(tarifSaisi);
  const tarifValide = tarifMensuel === null || (Number.isFinite(tarifMensuel) && tarifMensuel >= 0);
  const valide = c.nom.trim() && c.prenom.trim() && tarifValide;
  const tarifChange = !!eleve && (eleve.tarifMensuel ?? null) !== tarifMensuel;
  // Tarif appliqué si le champ reste vide : celui du groupe choisi, sinon le tarif général.
  const defaut = origineTarif(store.donnees, { tarifMensuel: null, groupeId: c.groupeId });
  const libDefaut = defaut.origine === "groupe" ? "tarif du groupe" : "tarif général";

  function valider(e: FormEvent) {
    e.preventDefault();
    if (!valide) return;
    if (eleve) {
      store.modifierEleve(eleve.id, {
        nom: c.nom.trim(), prenom: c.prenom.trim(), telephone: c.telephone.trim(), niveau: c.niveau.trim(), groupeId: c.groupeId, tarifMensuel,
      });
      notifier("Élève modifié");
    } else {
      const id = store.ajouterEleve({ ...c, tarifMensuel });
      notifier(`${c.prenom.trim()} ${c.nom.trim()} ajouté(e)`);
      onCree?.(id);
    }
    onFermer();
  }

  return (
    <Modale titre={eleve ? "Modifier l'élève" : "Nouvel élève"} sousTitre={eleve ? undefined : "Nom et prénom obligatoires"} onFermer={onFermer}>
      <form onSubmit={valider} className="grid grid-cols-2 gap-4">
        <Champ label="Nom *" value={c.nom} onChange={(e) => setC({ ...c, nom: e.target.value })} autoFocus />
        <Champ label="Prénom *" value={c.prenom} onChange={(e) => setC({ ...c, prenom: e.target.value })} />
        <Champ label="Téléphone (parent)" value={c.telephone} onChange={(e) => setC({ ...c, telephone: e.target.value })} placeholder="0550 12 34 56" />
        <Champ label="Niveau / classe" value={c.niveau} onChange={(e) => setC({ ...c, niveau: e.target.value })} placeholder="ex. 4AM" />
        {avecGroupes && <div className="col-span-2"><SelectGroupe label="Groupe" value={c.groupeId} onChange={(groupeId) => setC({ ...c, groupeId })} /></div>}
        <div className="col-span-2 flex flex-col gap-1.5">
          <Champ
            label="Tarif personnel (DA / mois)"
            value={c.tarif}
            onChange={(e) => setC({ ...c, tarif: e.target.value })}
            inputMode="numeric"
            placeholder={`Vide = ${libDefaut} (${da(defaut.tarif)})`}
          />
          <span className={cx("text-xs", tarifValide ? "text-brun-400" : "text-rouge")}>
            {!tarifValide
              ? "Montant invalide"
              : tarifMensuel === null
                ? `${libDefaut[0].toUpperCase()}${libDefaut.slice(1)} : ${da(defaut.tarif)} / mois, soit ${da(defaut.tarif / p.seancesParMois)} la séance`
                : `${da(tarifMensuel)} / mois, soit ${da(tarifMensuel / p.seancesParMois)} la séance (ex. cours individuel)`}
            {tarifChange && tarifValide && " · s'applique aux prochaines séances, les séances déjà faites gardent leur prix"}
          </span>
        </div>
        <div className="col-span-2 mt-2 flex justify-end gap-2">
          <Bouton type="button" onClick={onFermer}>Annuler</Bouton>
          <Bouton type="submit" variante="vert" disabled={!valide}>{eleve ? "Enregistrer" : "Ajouter l'élève"}</Bouton>
        </div>
      </form>
    </Modale>
  );
}

export function DialoguePaiement({ eleveId, onFermer }: { eleveId?: string; onFermer(): void }) {
  const store = useStore();
  const { notifier } = useUi();
  const [choisi, setChoisi] = useState(eleveId);
  const [recherche, setRecherche] = useState("");
  const b = choisi ? store.bilanDe(choisi) : undefined;
  const tarif = b ? tarifEleve(store.donnees, b.eleve) : store.donnees.parametres.tarifMensuel;
  const [montant, setMontant] = useState(() => (b ? String(Math.round(b.reste > 0 ? b.reste : tarif)) : ""));
  const [date, setDate] = useState(aujourdhui());
  const [note, setNote] = useState("");
  const valeur = Number(montant.replace(/\s/g, "").replace(",", "."));
  const valide = b && valeur > 0 && date;

  function choisir(id: string) {
    setChoisi(id);
    const x = store.bilanDe(id);
    const r = x?.reste ?? 0;
    setMontant(String(Math.round(r > 0 ? r : x ? tarifEleve(store.donnees, x.eleve) : tarif)));
  }

  function valider(e: FormEvent) {
    e.preventDefault();
    if (!valide) return;
    store.ajouterPaiement(b.eleve.id, valeur, date, note);
    notifier(`Paiement de ${da(valeur)} enregistré`);
    onFermer();
  }

  const candidats = store.bilans.filter((x) => x.eleve.actif && correspond(x.eleve, recherche));

  return (
    <Modale titre="Encaisser un paiement" sousTitre={b ? `${b.eleve.prenom} ${b.eleve.nom}` : "Choisissez l'élève"} onFermer={onFermer} largeur={480}>
      {!b ? (
        <div className="flex flex-col gap-3">
          <Champ placeholder="Rechercher un élève…" value={recherche} onChange={(e) => setRecherche(e.target.value)} autoFocus />
          <div className="max-h-80 overflow-auto rounded-2xl border border-creme-300">
            {candidats.map((x) => (
              <button key={x.eleve.id} onClick={() => choisir(x.eleve.id)} className="flex w-full items-center gap-3 border-b border-creme-300/60 px-3 py-2.5 text-left last:border-0 hover:bg-creme-200 cursor-pointer">
                <Avatar nom={x.eleve.nom} prenom={x.eleve.prenom} taille={32} />
                <span className="flex-1 text-sm font-semibold">{x.eleve.nom} {x.eleve.prenom}</span>
                <span className={cx("text-xs font-semibold", x.reste > 0.5 ? "text-rouge" : "text-vert")}>
                  {x.reste > 0.5 ? `doit ${da(x.reste)}` : "à jour"}
                </span>
              </button>
            ))}
            {!candidats.length && <p className="p-4 text-center text-sm text-brun-400">Aucun élève trouvé.</p>}
          </div>
        </div>
      ) : (
        <form onSubmit={valider} className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-2xl bg-creme-200 px-4 py-3">
            <span className="text-sm text-brun-600">Reste à payer</span>
            <span className={cx("text-lg font-bold", b.reste > 0.5 ? "text-rouge" : "text-vert")}>{da(Math.max(b.reste, 0))}</span>
          </div>
          <Champ label="Montant (DA)" value={montant} onChange={(e) => setMontant(e.target.value)} inputMode="numeric" autoFocus onFocus={(e) => e.target.select()} />
          <div className="flex flex-wrap gap-2">
            {[tarif / 2, tarif, tarif * 2, ...(b.reste > 0.5 ? [b.reste] : [])]
              .filter((v, i, t) => t.indexOf(v) === i)
              .map((v) => (
                <Bouton key={v} type="button" taille="sm" variante={valeur === v ? "sombre" : "clair"} onClick={() => setMontant(String(Math.round(v)))}>
                  {v === b.reste ? `Tout (${da(v)})` : da(v)}
                </Bouton>
              ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Champ label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. mois d'octobre" />
          </div>
          <div className="mt-1 flex justify-end gap-2">
            {!eleveId && <Bouton type="button" variante="fantome" onClick={() => setChoisi(undefined)}>Changer d'élève</Bouton>}
            <Bouton type="button" onClick={onFermer}>Annuler</Bouton>
            <Bouton type="submit" variante="vert" disabled={!valide}>Encaisser {valeur > 0 ? da(valeur) : ""}</Bouton>
          </div>
        </form>
      )}
    </Modale>
  );
}

export function DialogueSeance({ eleveId, onFermer }: { eleveId: string; onFermer(): void }) {
  const store = useStore();
  const { notifier } = useUi();
  const b = store.bilanDe(eleveId)!;
  const [date, setDate] = useState(aujourdhui());
  function valider(e: FormEvent) {
    e.preventDefault();
    if (store.ajouterSeance(eleveId, date)) {
      notifier("Séance ajoutée");
      onFermer();
    } else notifier("Une séance existe déjà à cette date", "erreur");
  }
  return (
    <Modale titre="Ajouter une séance" sousTitre={`${b.eleve.prenom} ${b.eleve.nom} · ${da(prixSeanceEleve(store.donnees, b.eleve))} la séance`} onFermer={onFermer} largeur={400}>
      <form onSubmit={valider} className="flex flex-col gap-4">
        <Champ label="Date de la séance" type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
        <div className="flex justify-end gap-2">
          <Bouton type="button" onClick={onFermer}>Annuler</Bouton>
          <Bouton type="submit" variante="vert" disabled={!date}>Ajouter</Bouton>
        </div>
      </form>
    </Modale>
  );
}
