export interface TableauJourneeVehicule {
  id: number;
  code: string;
  matricule: string | null;
  type: string;
  statut: string;
  chauffeurNom: string | null;
}

export interface TableauJourneeStats {
  total: number;
  enService: number;
  workshop: number;
  maintenance: number;
  horsService: number;
}

export interface TableauJournee {
  date: string;
  vehicules: TableauJourneeVehicule[];
  stats: TableauJourneeStats;
}