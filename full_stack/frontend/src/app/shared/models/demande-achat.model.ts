export type DemandeStatut = 'Nouvelle' | 'Approuvée' | 'Rejetée' | 'Clôturée';
export type DemandeUrgence = 'Haute' | 'Moyenne' | 'Basse';

export interface DemandeAchat {
  id: number;
  code: string;
  dateDemande: string;
  demandeur: Pick<import('./user.model').User, 'id' | 'prenom' | 'nom'>;
  composant: Pick<import('./composant.model').Composant, 'id' | 'designation'> | null;
  pieceLibre: string | null;
  reference: string | null;
  quantite: number;
  motif: string | null;
  urgence: DemandeUrgence | null;
  statut: DemandeStatut;
  approbateur: Pick<import('./user.model').User, 'id' | 'prenom' | 'nom'> | null;
  dateApprobation: string | null;
  raisonRejet: string | null;
  bonCommandeUrl: string | null;
  createdAt: string;
  updatedAt: string;
  /** Free-text name of the actual worker submitting the request (may differ from the logged-in admin). */
  demandeurNom: string | null;
  /** URL of a proof/archive photo of the purchase order. */
  photoUrl: string | null;
}

export interface NewDemandeForm {
  composantId: number | null;
  pieceLibre: string | null;
  reference: string | null;
  quantite: number;
  motif: string;
  urgence: DemandeUrgence | null;
  demandeurNom: string | null;
  photoUrl: string | null;
}