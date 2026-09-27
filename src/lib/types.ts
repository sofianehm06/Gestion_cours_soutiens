export interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  niveau: string;
  actif: boolean;
  dateInscription: string; // AAAA-MM-JJ
  groupeId: string; // "" = sans groupe
  tarifMensuel: number | null; // tarif personnel (ex. cours individuel) ; null = tarif général
}

export interface Groupe {
  id: string;
  nom: string;
  horaire: string; // texte libre, ex. « Samedi 14h »
  tarifMensuel: number | null; // tarif du groupe ; null = tarif général
}

export interface Seance {
  id: string;
  eleveId: string;
  date: string; // AAAA-MM-JJ
  prix: number; // prix figé au moment de la séance
}

export interface Paiement {
  id: string;
  eleveId: string;
  date: string;
  montant: number;
  note: string;
}

export interface Parametres {
  nomEtablissement: string;
  nomProf: string;
  tarifMensuel: number;
  seancesParMois: number;
  configure: boolean; // false = premier lancement, on affiche l'écran d'accueil
}

export interface Donnees {
  version: 1;
  parametres: Parametres;
  groupes: Groupe[];
  eleves: Eleve[];
  seances: Seance[];
  paiements: Paiement[];
}

export interface Bilan {
  eleve: Eleve;
  seances: number;
  du: number;
  paye: number;
  reste: number;
}
