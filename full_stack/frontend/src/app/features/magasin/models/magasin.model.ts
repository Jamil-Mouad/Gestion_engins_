export interface Citerne {
  id: number;
  nom: string;
  capaciteLitres: number;
  densiteKgParLitre: number;
  hauteurMaxCm: number | null;
  stockInitialLitres: number;
  stockInitialDate: string;
}

export interface BaremeRow {
  id?: number;
  hauteurCm: number;
  litres: number;
}

export interface Conversion {
  hauteurCm: number;
  litres: number;
  tonnes: number;
}

export interface Arrivage {
  id: number;
  dateArrivage: string;
  numeroBl: string | null;
  quantiteLitres: number;
  prixUnitaireHt: number | null;
  valeurHt: number | null;
  fournisseur: string | null;
  source: 'SAISIE' | 'IMPORT';
}

export interface ArrivagePayload {
  dateArrivage: string;
  numeroBl?: string | null;
  quantiteLitres: number;
  prixUnitaireHt?: number | null;
  fournisseur?: string | null;
}

export type TypeMouvement = 'SORTIE' | 'RETOUR';

export interface Sortie {
  id: number;
  dateSortie: string;
  totaliseur: number | null;
  quantiteLitres: number;
  typeMouvement: TypeMouvement;
  destination: string;
  vehiculeId: number | null;
  vehiculeCode: string | null;
  tiers: boolean;
  compteur: number | null;
  demandeur: string | null;
  numeroBs: string | null;
  source: 'SAISIE' | 'IMPORT';
}

export interface SortiePayload {
  dateSortie: string;
  totaliseur?: number | null;
  quantiteLitres: number;
  typeMouvement: TypeMouvement;
  destination: string;
  vehiculeId?: number | null;
  vehiculeCode?: string | null;
  tiers?: boolean;
  compteur?: number | null;
  demandeur?: string | null;
  numeroBs?: string | null;
}

export interface Jaugeage {
  id: number;
  dateJaugeage: string;
  hauteurCm: number;
  litresMesures: number;
  litresTheoriques: number;
  ecartLitres: number;
}

export interface LastTotaliseur {
  totaliseur: number | null;
  dateSortie: string | null;
}

export interface VehiculeSuggest {
  id: number;
  code: string;
  type: string;
  marque: string | null;
  modele: string | null;
  matricule: string | null;
}

export interface DernierJaugeage {
  date: string;
  hauteurCm: number;
  litresMesures: number;
  litresTheoriques: number;
  ecartLitres: number;
  ecartPct: number | null;
}

export interface DernierArrivage {
  date: string;
  quantiteLitres: number;
  fournisseur: string | null;
}

export interface TopConsommateur {
  label: string;
  vehiculeId: number | null;
  litres: number;
  nbSorties: number;
}

export interface ConsoMois {
  mois: string;
  litres: number;
}

export interface RepartitionType {
  categorie: string;
  litres: number;
}

export interface DashboardKpi {
  month: string;
  stockActuelLitres: number;
  stockActuelTonnes: number;
  capaciteLitres: number;
  pctRemplissage: number | null;
  hauteurMaxCm: number | null;
  densiteKgParLitre: number;
  dernierJaugeage: DernierJaugeage | null;
  consoMoisLitres: number;
  consoMoisValeurHt: number | null;
  consoMoyenneJourLitres: number;
  autonomieJours: number | null;
  dernierArrivage: DernierArrivage | null;
  arrivagesAnneeLitres: number;
  topConsommateurs: TopConsommateur[];
  consoParMois: ConsoMois[];
  repartitionParType: RepartitionType[];
}

export interface ImportGasoilReport {
  sortiesImportees: number;
  arrivagesImportes: number;
  sortiesSupprimees: number;
  arrivagesSupprimes: number;
  lignesIgnorees: number;
  codesNonResolus: Record<string, number>;
  anomalies: string[];
}

export interface VehiculeKpi {
  vehiculeId: number;
  code: string;
  type: string;
  month: string;
  voyagesMois: number;
  kmParcourusMois: number | null;
  kmCumules: number | null;
  consoLitresMois: number;
  consoMoyenneL100: number | null;
  pctConsoVsFlotte: number | null;
}
