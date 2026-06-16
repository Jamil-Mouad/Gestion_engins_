import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TableauJourneesComponent } from './tableau-journees.component';

describe('TableauJourneesComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders by-date table from GET /api/v1/tableau-journees', () => {
    const fixture = TestBed.createComponent(TableauJourneesComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/tableau-journees');
    expect(req.request.method).toBe('GET');
    req.flush({
      date: '2026-05-05',
      vehicules: [
        { id: 1, code: 'CAM-001', matricule: '123-A-1', type: 'camion', statut: 'in-service', chauffeurNom: 'Benali Ahmed' },
      ],
      stats: { total: 1, enService: 1, workshop: 0, maintenance: 0, horsService: 0 },
    });

    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.tj-trow');
    expect(rows.length).toBe(1);
  });

  it('shows skeleton while loading', () => {
    const fixture = TestBed.createComponent(TableauJourneesComponent);
    fixture.detectChanges();

    // Before flushing — loading state
    const skeleton = fixture.nativeElement.querySelector('app-skeleton');
    expect(skeleton).toBeTruthy();

    // Clean up pending request
    httpMock.expectOne((r) => r.url === '/api/v1/tableau-journees').flush({
      date: '2026-05-05',
      vehicules: [],
      stats: { total: 0, enService: 0, workshop: 0, maintenance: 0, horsService: 0 },
    });
  });

  it('shows footer stats after data loads', () => {
    const fixture = TestBed.createComponent(TableauJourneesComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === '/api/v1/tableau-journees').flush({
      date: '2026-05-05',
      vehicules: [
        { id: 1, code: 'CAM-001', matricule: '123-A-1', type: 'camion', statut: 'in-service', chauffeurNom: 'Benali Ahmed' },
        { id: 2, code: 'CAM-002', matricule: '456-B-6', type: 'camion', statut: 'workshop', chauffeurNom: null },
      ],
      stats: { total: 2, enService: 1, workshop: 1, maintenance: 0, horsService: 0 },
    });

    fixture.detectChanges();
    const statChips = fixture.nativeElement.querySelectorAll('.tj-stat-chip');
    expect(statChips.length).toBe(4);
  });

  it('filters rows by search query', () => {
    const fixture = TestBed.createComponent(TableauJourneesComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === '/api/v1/tableau-journees').flush({
      date: '2026-05-05',
      vehicules: [
        { id: 1, code: 'CAM-001', matricule: '123-A-1', type: 'camion', statut: 'in-service', chauffeurNom: 'Benali Ahmed' },
        { id: 2, code: 'CAM-002', matricule: '456-B-6', type: 'camion', statut: 'workshop', chauffeurNom: null },
      ],
      stats: { total: 2, enService: 1, workshop: 1, maintenance: 0, horsService: 0 },
    });
    fixture.detectChanges();

    comp.searchQuery.set('456');
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.tj-trow');
    expect(rows.length).toBe(1);
  });

  it('reloads data on date change', () => {
    const fixture = TestBed.createComponent(TableauJourneesComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    // Flush initial request
    httpMock.expectOne((r) => r.url === '/api/v1/tableau-journees').flush({
      date: '2026-05-05',
      vehicules: [],
      stats: { total: 0, enService: 0, workshop: 0, maintenance: 0, horsService: 0 },
    });
    fixture.detectChanges();

    // Trigger date change
    comp.loadTableau('2026-05-10');
    fixture.detectChanges();

    const req2 = httpMock.expectOne((r) => r.urlWithParams === '/api/v1/tableau-journees?date=2026-05-10');
    expect(req2.request.method).toBe('GET');
    req2.flush({
      date: '2026-05-10',
      vehicules: [],
      stats: { total: 0, enService: 0, workshop: 0, maintenance: 0, horsService: 0 },
    });
  });
});
