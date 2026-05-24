import { InterventionStatut } from './intervention.model';

export interface KpiSnapshot {
  totalVehicules: number;
  enService: number;
  enAtelier: number;
  enMaintenance: number;
  horsService: number;
  coutInterventionsMois: number;
  coutMainOeuvre: number;
  coutPieces: number;
  coutSousTraitance: number;
  interventionsOuvertes: number;
  vidangesEnRetard: number;
  pneusWarnEmpty: number;
  demandesEnAttente: number;
}

export interface DashboardWidgetConfig {
  id: string;
  x: number;
  y: number;
  cols: number;
  rows: number;
  visible: boolean;
}

export type DashboardConfig = DashboardWidgetConfig[];

export interface KpiCostHistory {
  month: string;
  coutTotal: number;
}

export interface KpiInterventionByStatus {
  statut: InterventionStatut;
  count: number;
}

export interface DashboardSnapshot {
  kpis: KpiSnapshot;
  costHistory: KpiCostHistory[];
  interventionsByStatus: KpiInterventionByStatus[];
}