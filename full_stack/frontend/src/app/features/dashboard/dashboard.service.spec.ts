import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DashboardService } from './dashboard.service';
import { KpiSnapshot, DashboardConfig, DashboardWidgetConfig, KpiCostHistory, KpiInterventionByStatus } from '../../shared/models/dashboard.model';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  const mockKpi: KpiSnapshot = {
    totalVehicules: 50,
    enService: 42,
    enAtelier: 3,
    enMaintenance: 2,
    horsService: 3,
    coutInterventionsMois: 24750,
    coutMainOeuvre: 8200,
    coutPieces: 14500,
    coutSousTraitance: 2050,
    interventionsOuvertes: 7,
    vidangesEnRetard: 4,
    pneusWarnEmpty: 6,
    demandesEnAttente: 2,
  };

  const mockConfig: DashboardConfig = [
    { id: 'fleet-overview', x: 0, y: 0, cols: 2, rows: 1, visible: true },
    { id: 'cost-month', x: 2, y: 0, cols: 2, rows: 1, visible: true },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getKpis() calls GET /api/v1/kpis', () => {
    service.getKpis().subscribe((kpi) => {
      expect(kpi.totalVehicules).toBe(50);
      expect(kpi.enService).toBe(42);
      expect(kpi.coutInterventionsMois).toBe(24750);
    });

    const req = httpMock.expectOne('/api/v1/kpis');
    expect(req.request.method).toBe('GET');
    req.flush(mockKpi);
  });

  it('getDashboardConfig() calls GET /api/v1/users/me/dashboard-config', () => {
    service.getDashboardConfig().subscribe((config) => {
      expect(config.length).toBe(2);
      expect(config[0].id).toBe('fleet-overview');
    });

    const req = httpMock.expectOne('/api/v1/users/me/dashboard-config');
    expect(req.request.method).toBe('GET');
    req.flush(mockConfig);
  });

  it('saveDashboardConfig() calls PUT /api/v1/users/me/dashboard-config', () => {
    const newConfig: DashboardConfig = [
      { id: 'fleet-overview', x: 0, y: 0, cols: 2, rows: 1, visible: true },
      { id: 'cost-month', x: 2, y: 0, cols: 2, rows: 1, visible: false },
    ];

    service.saveDashboardConfig(newConfig).subscribe((result: DashboardConfig) => {
      expect(result).toEqual(newConfig);
    });

    const req = httpMock.expectOne('/api/v1/users/me/dashboard-config');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(newConfig);
    req.flush(newConfig);
  });

  it('getCostHistory() calls GET /api/v1/kpis/cost-history', () => {
    const mockHistory: KpiCostHistory[] = [
      { month: '2026-01', coutTotal: 22000 },
      { month: '2026-02', coutTotal: 23500 },
    ];

    service.getCostHistory().subscribe((data: KpiCostHistory[]) => {
      expect(data.length).toBe(2);
      expect(data[0].month).toBe('2026-01');
    });

    const req = httpMock.expectOne('/api/v1/kpis/cost-history');
    expect(req.request.method).toBe('GET');
    req.flush(mockHistory);
  });

  it('getInterventionsByStatus() calls GET /api/v1/kpis/interventions-by-status', () => {
    const mockData: KpiInterventionByStatus[] = [
      { statut: 'ouvert', count: 3 },
      { statut: 'en_cours', count: 4 },
    ];

    service.getInterventionsByStatus().subscribe((data: KpiInterventionByStatus[]) => {
      expect(data.length).toBe(2);
      expect(data[0].statut).toBe('ouvert');
    });

    const req = httpMock.expectOne('/api/v1/kpis/interventions-by-status');
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('getKpis() handles 500 error', () => {
    let errored = false;
    service.getKpis().subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(500); },
    });
    const req = httpMock.expectOne('/api/v1/kpis');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('getDashboardConfig() handles 404 error', () => {
    let errored = false;
    service.getDashboardConfig().subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(404); },
    });
    const req = httpMock.expectOne('/api/v1/users/me/dashboard-config');
    req.flush('not found', { status: 404, statusText: 'Not Found' });
    expect(errored).toBeTrue();
  });

  it('saveDashboardConfig() handles 400 error', () => {
    const config: DashboardConfig = [{ id: 'fleet-overview', x: 0, y: 0, cols: 2, rows: 1, visible: true }];
    let errored = false;
    service.saveDashboardConfig(config).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(400); },
    });
    const req = httpMock.expectOne('/api/v1/users/me/dashboard-config');
    req.flush('bad', { status: 400, statusText: 'Bad Request' });
    expect(errored).toBeTrue();
  });

  it('getCostHistory() handles 500 error', () => {
    let errored = false;
    service.getCostHistory().subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(500); },
    });
    const req = httpMock.expectOne('/api/v1/kpis/cost-history');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('getInterventionsByStatus() handles 500 error', () => {
    let errored = false;
    service.getInterventionsByStatus().subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(500); },
    });
    const req = httpMock.expectOne('/api/v1/kpis/interventions-by-status');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('saveDashboardConfig() can be called multiple times', () => {
    const config: DashboardConfig = [
      { id: 'fleet-overview', x: 0, y: 0, cols: 2, rows: 1, visible: true },
    ];

    service.saveDashboardConfig(config).subscribe();
    service.saveDashboardConfig(config).subscribe();

    const requests = httpMock.match(req => req.url === '/api/v1/users/me/dashboard-config');
    expect(requests.length).toBe(2);
    expect(requests.every(r => r.request.method === 'PUT')).toBeTrue();
    requests.forEach(r => r.flush(config));
  });
});