import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { KpiSnapshot, DashboardConfig, KpiCostHistory, KpiInterventionByStatus } from '../../shared/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API_KPI = '/api/v1/kpis';
  private readonly API_CONFIG = '/api/v1/users/me/dashboard-config';
  private http = inject(HttpClient);

  getKpis(): Observable<KpiSnapshot> {
    return this.http.get<KpiSnapshot>(this.API_KPI);
  }

  getDashboardConfig(): Observable<DashboardConfig> {
    return this.http.get<DashboardConfig>(this.API_CONFIG);
  }

  saveDashboardConfig(config: DashboardConfig): Observable<DashboardConfig> {
    return this.http.put<DashboardConfig>(this.API_CONFIG, config);
  }

  getCostHistory(): Observable<KpiCostHistory[]> {
    return this.http.get<KpiCostHistory[]>(`${this.API_KPI}/cost-history`);
  }

  getInterventionsByStatus(): Observable<KpiInterventionByStatus[]> {
    return this.http.get<KpiInterventionByStatus[]>(`${this.API_KPI}/interventions-by-status`);
  }
}