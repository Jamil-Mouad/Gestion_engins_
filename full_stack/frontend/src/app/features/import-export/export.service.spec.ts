import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ExportService } from './export.service';

describe('ExportService', () => {
  let service: ExportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ExportService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(ExportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('exportVehicules() calls GET /api/v1/export/vehicules with blob responseType', () => {
    const mockBlob = new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    service.exportVehicules().subscribe((blob) => {
      expect(blob).toBeTruthy();
    });

    const req = httpMock.expectOne((r) => r.url === '/api/v1/export/vehicules');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });

  it('exportVehicules() sends vehiculeIds, dateFrom, dateTo params', () => {
    service.exportVehicules({ vehiculeIds: [1, 2], dateFrom: '2026-01-01', dateTo: '2026-12-31' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/export/vehicules');
    expect(req.request.params.get('vehiculeIds')).toBe('1,2');
    expect(req.request.params.get('dateFrom')).toBe('2026-01-01');
    expect(req.request.params.get('dateTo')).toBe('2026-12-31');
    req.flush(new Blob());
  });

  it('exportInterventions() calls GET /api/v1/export/interventions', () => {
    service.exportInterventions().subscribe((blob) => {
      expect(blob).toBeTruthy();
    });

    const req = httpMock.expectOne((r) => r.url === '/api/v1/export/interventions');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });

  it('exportInterventions() sends dateFrom and dateTo params', () => {
    service.exportInterventions({ dateFrom: '2026-01-01', dateTo: '2026-06-30' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/export/interventions');
    expect(req.request.params.get('dateFrom')).toBe('2026-01-01');
    expect(req.request.params.get('dateTo')).toBe('2026-06-30');
    req.flush(new Blob());
  });

  it('exportVehicules() handles network error', () => {
    let errored = false;
    service.exportVehicules().subscribe({
      next: () => fail('expected error'),
      error: () => { errored = true; },
    });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/export/vehicules');
    req.error(new ProgressEvent('error'));
    expect(errored).toBeTrue();
  });

  it('exportInterventions() handles network error', () => {
    let errored = false;
    service.exportInterventions().subscribe({
      next: () => fail('expected error'),
      error: () => { errored = true; },
    });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/export/interventions');
    req.error(new ProgressEvent('error'));
    expect(errored).toBeTrue();
  });
});
