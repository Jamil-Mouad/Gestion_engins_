import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

import { KpiSnapshot, DashboardConfig, KpiCostHistory, KpiInterventionByStatus } from '../../shared/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API_KPIS = '/api/v1/kpis';
  private readonly API_COST_HISTORY = '/api/v1/kpis/cost-history';
  private readonly API_INTERVENTIONS_STATUS = '/api/v1/kpis/interventions-by-status';
  private readonly API_CONFIG = '/api/v1/users/me/dashboard-config';
  private http = inject(HttpClient);

  private kpis$: Observable<KpiSnapshot> | null = null;
  private dashboardConfig$: Observable<DashboardConfig> | null = null;

  getKpis(): Observable<KpiSnapshot> {
    if (!this.kpis$) {
      this.kpis$ = this.http.get<KpiSnapshot>(this.API_KPIS).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.kpis$;
  }

  getDashboardConfig(): Observable<DashboardConfig> {
    if (!this.dashboardConfig$) {
      this.dashboardConfig$ = this.http.get<DashboardConfig>(this.API_CONFIG).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.dashboardConfig$;
  }

  saveDashboardConfig(config: DashboardConfig): Observable<DashboardConfig> {
    this.dashboardConfig$ = null;
    return this.http.put<DashboardConfig>(this.API_CONFIG, config);
  }

  getCostHistory(): Observable<KpiCostHistory[]> {
    return this.http.get<KpiCostHistory[]>(this.API_COST_HISTORY);
  }

  getInterventionsByStatus(): Observable<KpiInterventionByStatus[]> {
    return this.http.get<KpiInterventionByStatus[]>(this.API_INTERVENTIONS_STATUS);
  }

  invalidate(): void {
    this.kpis$ = null;
    this.dashboardConfig$ = null;
  }
}
