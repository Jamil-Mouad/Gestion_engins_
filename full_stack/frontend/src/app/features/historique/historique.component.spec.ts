import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { HistoriqueComponent } from './historique.component';
import { ReleveCompteur, ReleveSource } from '../../shared/models/releve-compteur.model';
import { Page } from '../../shared/models/pagination.model';

describe('HistoriqueComponent', () => {
  let httpMock: HttpTestingController;

  const mockReleves: ReleveCompteur[] = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    vehicule: { id: 1, code: 'CAM-001' },
    dateReleve: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    compteurKm: 140000 + i * 100,
    compteurHeures: 5000 + i * 10,
    source: 'manual' as ReleveSource,
    importHistoriqueId: null,
    createdBy: { id: 1, prenom: 'Admin', nom: 'System' },
  }));

  const mockPage: Page<ReleveCompteur> = {
    content: mockReleves,
    page: 0,
    size: 20,
    totalElements: 10,
    totalPages: 1,
  };

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

  it('loads releves on init via GET /api/v1/releves-compteur', () => {
    const fixture = TestBed.createComponent(HistoriqueComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/releves-compteur');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);

    fixture.detectChanges();
    expect(component.releves().length).toBe(10);
  });

  it('renders all entries using plain @for (no virtual scroll) for large datasets', () => {
    const fixture = TestBed.createComponent(HistoriqueComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/releves-compteur');
    const bigPage: Page<ReleveCompteur> = {
      ...mockPage,
      content: Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        vehicule: { id: 1, code: 'CAM-001' },
        dateReleve: '2026-01-01T00:00:00Z',
        compteurKm: 140000 + i,
        compteurHeures: 5000 + i,
        source: 'manual' as ReleveSource,
        importHistoriqueId: null,
        createdBy: { id: 1, prenom: 'Admin', nom: 'System' },
      })),
      totalElements: 500,
    };
    req.flush(bigPage);

    fixture.detectChanges();
    const viewport = fixture.nativeElement.querySelector('cdk-virtual-scroll-viewport');
    expect(viewport).toBeNull();
    const entries = fixture.nativeElement.querySelectorAll('.hist-entry');
    expect(entries.length).toBe(500);
  });

  it('loadReleves() sets loading to false on HTTP error', () => {
    const fixture = TestBed.createComponent(HistoriqueComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/releves-compteur');
    req.flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.loading()).toBe(false);
  });

  it('getSourceVariant() returns correct badge variant for all source types', () => {
    const fixture = TestBed.createComponent(HistoriqueComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/releves-compteur');
    req.flush(mockPage);

    expect(component.getSourceVariant('manual')).toBe('info');
    expect(component.getSourceVariant('excel_import')).toBe('warning');
    expect(component.getSourceVariant('intervention')).toBe('success');
    expect(component.getSourceVariant('unknown_source')).toBe('neutral');
  });

  it('onVehicleFilter() with a vehicle code reloads with vehiculeId', () => {
    const fixture = TestBed.createComponent(HistoriqueComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/releves-compteur');
    initReq.flush(mockPage);

    const event = { target: { value: 'CAM-001' } } as unknown as Event;
    component.onVehicleFilter(event);

    const filterReq = httpMock.expectOne((r) => r.url === '/api/v1/releves-compteur');
    filterReq.flush(mockPage);

    expect(component.releves().length).toBe(10);
  });

  it('onVehicleFilter() with empty value reloads without vehiculeId filter', () => {
    const fixture = TestBed.createComponent(HistoriqueComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/releves-compteur');
    initReq.flush(mockPage);

    const event = { target: { value: '' } } as unknown as Event;
    component.onVehicleFilter(event);

    const filterReq = httpMock.expectOne((r) => r.url === '/api/v1/releves-compteur');
    expect(filterReq.request.params.get('vehicule_id')).toBeNull();
    filterReq.flush(mockPage);
  });

  it('shows empty state message when no releves found', () => {
    const fixture = TestBed.createComponent(HistoriqueComponent);
    fixture.detectChanges();

    const emptyPage: Page<ReleveCompteur> = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
    const req = httpMock.expectOne((r) => r.url === '/api/v1/releves-compteur');
    req.flush(emptyPage);

    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Aucun relevé trouvé');
  });
});