export interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  niveau: string;
  actif: boolean;
  dateInscription: string; // AAAA-MM-JJ
  groupeId: string; // "" = sans groupe
}

export interface Groupe {
  id: string;
  nom: string;
  horaire: string; // texte libre, ex. « Samedi 14h »
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
