export type VidangeStatut = 'a_faire' | 'en_cours' | 'fait' | 'depasse';

export interface SuiviVidange {
  id: number;
  vehicule: { id: number; code: string; marque: string; modele: string };
  composant: { id: number; designation: string } | null;
  intervalleNbh: number;
  compteurNbhActuel: number;
  nbhRestant: number | null;
  dateDernierEntretien: string | null;
  prochainEntretienEstime: string | null;
  statut: VidangeStatut;
  createdAt: string;
  updatedAt: string;
}

export interface VidangePlanningWeek {
  semaine: string;
  dateDebut: string;
  dateFin: string;
  vidanges: { id?: number; vehiculeCode: string; composant: string; statut: VidangeStatut }[];
}