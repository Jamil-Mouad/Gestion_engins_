import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { KpiSnapshot, DashboardConfig, KpiCostHistory, KpiInterventionByStatus, DashboardSnapshot } from '../../shared/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API_DASHBOARD = '/api/v1/dashboard/snapshot';
  private readonly API_CONFIG = '/api/v1/users/me/dashboard-config';
  private http = inject(HttpClient);

  private snapshot$: Observable<DashboardSnapshot> | null = null;
  private dashboardConfig$: Observable<DashboardConfig> | null = null;

  private getSnapshot(): Observable<DashboardSnapshot> {
    if (!this.snapshot$) {
      this.snapshot$ = this.http.get<DashboardSnapshot>(this.API_DASHBOARD).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.snapshot$;
  }

  getKpis(): Observable<KpiSnapshot> {
    return this.getSnapshot().pipe(map(s => s.kpis));
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
    return this.getSnapshot().pipe(map(s => s.costHistory));
  }

  getInterventionsByStatus(): Observable<KpiInterventionByStatus[]> {
    return this.getSnapshot().pipe(map(s => s.interventionsByStatus));
  }

  invalidate(): void {
    this.snapshot$ = null;
    this.dashboardConfig$ = null;
  }
}
