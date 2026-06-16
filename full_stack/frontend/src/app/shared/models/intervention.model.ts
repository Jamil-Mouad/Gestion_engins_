export type InterventionStatut = 'ouvert' | 'en_cours' | 'cloture';
export type InterventionCategorie = 'preventive' | 'corrective' | 'depannage' | 'controle';

export interface TypeIntervention {
  id: number;
  libelle: string;
}

export interface Intervention {
  id: number;
  vehicule: { id: number; code: string };
  typeIntervention: TypeIntervention;
  composant: { id: number; designation: string } | null;
  categorie: InterventionCategorie;
  partie: string | null;
  nBs: string | null;
  dateDebut: string;
  dateFin: string | null;
  tempsHeures: number | null;
  coutPieces: number | null;
  coutMainOeuvre: number | null;
  coutSousTraitance: number | null;
  coutTotal: number | null;
  observations: string | null;
  demandeAchatId: number | null;
  statut: InterventionStatut;
  createdAt: string;
  photoUrl: string | null;
}

export interface NewInterventionForm {
  vehiculeId: number;
  typeInterventionId: number;
  composantId: number | null;
  categorie: InterventionCategorie;
  partie: string;
  nBs: string;
  dateDebut: string;
  observations: string;
  photoUrl: string | null;
}