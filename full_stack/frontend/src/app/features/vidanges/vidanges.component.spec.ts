import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { VidangesComponent } from './vidanges.component';
import { VidangePlanningWeek } from '../../shared/models/vidange.model';

describe('VidangesComponent', () => {
  let httpMock: HttpTestingController;

  const mockPlanning: VidangePlanningWeek[] = [
    {
      semaine: 'S24',
      dateDebut: '2026-06-08',
      dateFin: '2026-06-14',
      vidanges: [
        { id: 1, vehiculeCode: 'CAM-001', composant: 'Huile moteur', statut: 'a_faire' },
        { id: 2, vehiculeCode: 'CAM-002', composant: 'Filtre à huile', statut: 'fait' },
      ],
    },
    {
      semaine: 'S25',
      dateDebut: '2026-06-15',
      dateFin: '2026-06-21',
      vidanges: [
        { id: 3, vehiculeCode: 'CAM-003', composant: 'Huile moteur', statut: 'en_cours' },
      ],
    },
  ];

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

  it('creates the component', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.flush(mockPlanning);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads planning on init via GET /api/v1/vidanges/planning', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('semaines')).toBe('4');
    req.flush(mockPlanning);

    expect(component.planning().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('renders page header with "Vidanges" title', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.flush(mockPlanning);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Vidanges');
  });

  it('renders filter chips for état filtering', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.flush(mockPlanning);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const chips = nativeEl.querySelectorAll('app-filter-chip');
    expect(chips.length).toBeGreaterThanOrEqual(4);
  });

  it('renders vidange rows with vehicle code and composant', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.flush(mockPlanning);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const rows = nativeEl.querySelectorAll('app-data-table-row');
    expect(rows.length).toBe(3);
    expect(nativeEl.textContent).toContain('CAM-001');
    expect(nativeEl.textContent).toContain('Huile moteur');
  });

  it('shows Effectuer button for non-fait statuts', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.flush(mockPlanning);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const effectuerBtns = nativeEl.querySelectorAll('.btn-effectuer');
    expect(effectuerBtns.length).toBe(2);
  });

  it('hides Effectuer button for fait statut', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.flush(mockPlanning);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const rows = nativeEl.querySelectorAll('app-data-table-row');
    // Row at index 1 is CAM-002 with statut 'fait' — no Effectuer button
    const faitRow = rows[1];
    expect(faitRow.querySelector('.btn-effectuer')).toBeNull();
  });

  it('shows empty state when all weeks have no vidanges', () => {
    const emptyPlanning: VidangePlanningWeek[] = [
      { semaine: 'S24', dateDebut: '2026-06-08', dateFin: '2026-06-14', vidanges: [] },
    ];
    const fixture = TestBed.createComponent(VidangesComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.flush(emptyPlanning);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-empty-state')).toBeTruthy();
  });

  it('shows skeleton while loading', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.flush(mockPlanning);
  });

  it('sets loading to false on error', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.error(new ProgressEvent('error'));

    expect(component.loading()).toBe(false);
  });

  it('onCloturer calls PATCH then reloads planning', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    initReq.flush(mockPlanning);
    fixture.detectChanges();

    component.onCloturer({ id: 1, vehiculeCode: 'CAM-001', composant: 'Huile moteur', statut: 'a_faire', semaine: 'S24', dernierKm: '—', prochainKm: '—', reste: '—', etat: 'proche' });

    const patchReq = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/1/cloturer');
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({});

    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    reloadReq.flush(mockPlanning);

    expect(component.planning().length).toBe(2);
  });

  it('allRows computed signal flattens all planning weeks', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.flush(mockPlanning);

    expect(component.allRows().length).toBe(3);
  });

  it('etatFilter signal filters rows correctly', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.flush(mockPlanning);

    component.etatFilter.set('ok');
    expect(component.filteredRows().length).toBe(1); // only 'fait' → 'ok'

    component.etatFilter.set('proche');
    expect(component.filteredRows().length).toBe(2); // 'a_faire' and 'en_cours'

    component.etatFilter.set('all');
    expect(component.filteredRows().length).toBe(3);
  });

  it('renders état sev-badges for each row', () => {
    const fixture = TestBed.createComponent(VidangesComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    req.flush(mockPlanning);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const badges = nativeEl.querySelectorAll('app-sev-badge');
    expect(badges.length).toBe(3);
  });
});
