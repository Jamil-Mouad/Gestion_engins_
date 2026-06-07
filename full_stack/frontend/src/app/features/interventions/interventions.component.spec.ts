import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { LucideAngularModule, Search, Download, Settings, ChevronRight, ChevronDown } from 'lucide-angular';

import { InterventionsComponent } from './interventions.component';
import { Intervention, InterventionStatut } from '../../shared/models/intervention.model';
import { Page } from '../../shared/models/pagination.model';

function makeIntervention(overrides: Partial<Intervention> = {}): Intervention {
  return {
    id: 1,
    vehicule: { id: 1, code: 'CAM-001' },
    typeIntervention: { id: 1, code: 'VID', libelle: 'Vidange' },
    composant: null,
    categorie: 'preventive',
    partie: null,
    nBs: null,
    dateDebut: '2026-05-01T00:00:00Z',
    dateFin: null,
    tempsHeures: null,
    coutPieces: null,
    coutMainOeuvre: null,
    coutSousTraitance: null,
    coutTotal: null,
    observations: null,
    demandeAchatId: null,
    statut: 'ouvert' as InterventionStatut,
    createdAt: '2026-05-01T00:00:00Z',
    photoUrl: null,
    ...overrides,
  } as Intervention;
}

describe('InterventionsComponent', () => {
  let httpMock: HttpTestingController;

  const mockPage: Page<Intervention> = {
    content: [makeIntervention({ id: 1 }), makeIntervention({ id: 2, statut: 'en_cours' as InterventionStatut })],
    page: 0,
    size: 6,
    totalElements: 2,
    totalPages: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LucideAngularModule.pick({ Search, Download, Settings, ChevronRight, ChevronDown })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideToastr(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(InterventionsComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads interventions on init via GET /api/v1/interventions', () => {
    const fixture = TestBed.createComponent(InterventionsComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);

    expect(component.interventions().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('renders page header with "Interventions" text', () => {
    const fixture = TestBed.createComponent(InterventionsComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Interventions');
  });

  it('shows skeleton while loading', () => {
    const fixture = TestBed.createComponent(InterventionsComponent);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);
  });

  it('sets loading to false on error', () => {
    const fixture = TestBed.createComponent(InterventionsComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.loading()).toBe(false);
    expect(component.loadError()).toBe(true);
  });

  it('showNewModal signal defaults to false', () => {
    const fixture = TestBed.createComponent(InterventionsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);
    expect(component.showNewModal()).toBe(false);
  });

  it('onTabChange() reloads interventions and changes active tab', () => {
    const fixture = TestBed.createComponent(InterventionsComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    initReq.flush(mockPage);

    component.onTabChange(1); // tab 1 = "Terminées" (statut=closed)
    const tabReq = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    expect(component.activeTabIndex()).toBe(1);
    tabReq.flush({ ...mockPage, content: [] });
  });

  it('onCategorieFilter() reloads interventions with categorie filter', () => {
    const fixture = TestBed.createComponent(InterventionsComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    initReq.flush(mockPage);

    component.onCategorieFilter('preventive');
    const filterReq = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    expect(filterReq.request.params.get('categorie')).toBe('preventive');
    filterReq.flush({ ...mockPage, content: [] });
  });

  it('onCloturer() sets cloturerIntervention signal', () => {
    const fixture = TestBed.createComponent(InterventionsComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    initReq.flush(mockPage);

    const intervention = makeIntervention({ id: 1 });
    component.onCloturer(intervention);
    expect(component.cloturerIntervention()).toEqual(intervention);
  });

  it('hasMore computed is false when all loaded', () => {
    const fixture = TestBed.createComponent(InterventionsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);
    expect(component.hasMore()).toBe(false);
  });

  it('chargerPlus() triggers next page fetch', () => {
    const fixture = TestBed.createComponent(InterventionsComponent);
    const component = fixture.componentInstance;
    // First page has more items
    const bigPage = { ...mockPage, totalElements: 20 };
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    initReq.flush(bigPage);

    component.chargerPlus();
    const pageReq = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    expect(pageReq.request.params.get('page')).toBe('1');
    pageReq.flush({ ...mockPage, page: 1 });
  });
});
