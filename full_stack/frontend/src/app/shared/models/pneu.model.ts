export type PneuStatus = 'ok' | 'warn' | 'empty';

export interface Pneu {
  id: number;
  vehiculeId: number;           // flat id from PneuDto
  vehiculeCode: string | null;  // flat code from PneuDto
  vehicule?: Pick<import('./vehicule.model').Vehicule, 'id' | 'code'>; // optional, for backward compat
  position: number;
  composantId?: number | null;
  composant?: Pick<import('./composant.model').Composant, 'id' | 'designation'> | null;
  nSerie: string | null;
  marque: string | null;
  dateMontage: string | null;
  kmMontage: number | null;
  kmParcourus: number;
  expectedLifeKm: number;
  kmRestant: number | null;
  pressionPsi: number | null;
  profondeur32e: number | null;
  status: PneuStatus;
  actif: boolean;
  photoUrl?: string | null;
}

export interface RemonterPneuForm {
  vehiculeId: number;
  position: number;
}

export type InspectionActivity =
  | 'Installed' | 'Tread Depth Reading' | 'Inspection' | 'Rotation' | 'Replaced';

export interface PneuInspection {
  id: number;
  pneuId: number;
  dateInspection: string;
  tireMeter: number | null;
  activity: InspectionActivity;
  user: Pick<import('./user.model').User, 'id' | 'prenom' | 'nom'> | null;
  pressionPsi: number | null;
  profondeur32e: number | null;
  methode: string | null;
  notes: string | null;
}

export interface CreatePneuForm {
  position: number;
  nSerie?: string | null;
  marque?: string | null;
  dateMontage?: string | null;
  expectedLifeKm: number;
  pressionPsi?: number | null;
  profondeur32e?: number | null;
}

export interface InspectionForm {
  activity: InspectionActivity;
  dateInspection: string;
  pressionPsi: number | null;
  profondeur32e: number | null;
  methode: string | null;
  notes: string | null;
}