export type VehiculeType = 'camion' | 'camion_tracteur' | 'voiture' | 'semi_remorque' | 'chariot' | 'chargeur' | 'bus' | 'balayeuse' | 'pick_up';

export type VehiculeStatut =
  | 'in-service'
  | 'workshop'
  | 'maintenance'
  | 'out-of-service';

export interface Attelage {
  id: number;
  tracteurId: number;
  tracteurCode: string;
  semiId: number;
  semiCode: string;
  dateDebut: string;
  dateFin: string | null;
  actif: boolean;
  createdAt: string;
  semiConfigAxle: string | null;
}

export interface Vehicule {
  id: number;
  code: string;
  type: VehiculeType;
  marque: string;
  modele: string;
  matricule: string | null;
  nChassis: string | null;
  annee: number | null;
  carburant: string | null;
  statut: VehiculeStatut;
  dateMiseService: string | null;
  photoUrl: string | null;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CamionDetails {
  capaciteTonnes: number | null;
  configAxle: '4x2' | '6x4' | 'plateau-2x2' | null;
  visiteTechTracteurExpiration: string | null;
  visiteTechSemiExpiration: string | null;
  carnetCirculationExpiration: string | null;
  metrologieExpiration: string | null;
  extincteurExpiration: string | null;
  batterieModele: string | null;
  batterieDateAchat: string | null;
  batterieDateControle: string | null;
  consoGasoilLitresMois: number | null;
  compteurKm: number;
  compteurHeures: number;
  chauffeurPrenom: string | null;
  chauffeurNom: string | null;
  // KPI fields (editable)
  voyagesMois: number | null;
  kmParcourus: number | null;
  // Computed read-only (server-side, not sent in edit payload)
  pctConsoVsFlotte: number | null;
}

export interface VehiculeDetail extends Vehicule {
  camionDetails: CamionDetails | null;
  currentAttelage: Attelage | null;
  configAxleSemi: 'plateau-2x2' | 'semi-2-essieux' | 'semi-3-essieux' | null;
}

export function isCamionType(type: string | null | undefined): boolean {
  return type === 'camion' || type === 'camion_tracteur';
}

export function isCamionTracteur(type: string | null | undefined): boolean {
  return type === 'camion_tracteur';
}

export interface NewVehiculeForm {
  code: string;
  type: VehiculeType;
  marque: string;
  modele: string;
  matricule: string | null;
  nChassis: string | null;
  annee: number | null;
  carburant: string | null;
  statut: VehiculeStatut;
  dateMiseService: string | null;
  photoUrl?: string | null;
  camionDetails?: Partial<CamionDetails>;
}