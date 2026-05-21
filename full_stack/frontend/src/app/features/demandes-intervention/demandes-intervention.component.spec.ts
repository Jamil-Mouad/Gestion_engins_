import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import {
  DemandesInterventionComponent,
  DemandeIntervention,
  DemandeInterventionStatut,
  DemandeInterventionUrgence,
} from './demandes-intervention.component';

const MOCK_ITEMS: DemandeIntervention[] = [
  {
    id: 1,
    code: 'DI-2026-0041',
    vehiculeCode: 'CHG-003',
    symptome: 'Bruit anormal moteur au démarrage',
    urgence: 'Haute' as DemandeInterventionUrgence,
    statut: 'Nouvelle' as DemandeInterventionStatut,
    dateCreation: '2026-04-22T00:00:00Z',
    demandeur: { prenom: 'Khalid', nom: 'Benali' },
  },
  {
    id: 2,
    code: 'DI-2026-0040',
    vehiculeCode: 'CAM-002',
    symptome: 'Fuite huile moteur côté droit',
    urgence: 'Haute' as DemandeInterventionUrgence,
    statut: 'Approuvée' as DemandeInterventionStatut,
    dateCreation: '2026-04-21T00:00:00Z',
    demandeur: { prenom: 'Fatima', nom: 'Zahra' },
  },
  {
    id: 3,
    code: 'DI-2026-0039',
    vehiculeCode: 'CHR-042',
    symptome: 'Voyant moteur allumé',
    urgence: 'Moyenne' as DemandeInterventionUrgence,
    statut: 'Clôturée' as DemandeInterventionStatut,
    dateCreation: '2026-04-20T00:00:00Z',
    demandeur: { prenom: 'Rachid', nom: 'Tazi' },
  },
];

describe('DemandesInterventionComponent', () => {
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

  it('renders the page heading', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush(MOCK_ITEMS);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain("Demandes d'intervention");
  });

  it('loads demandes on init via GET /api/v1/demandes-intervention', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/v1/demandes-intervention');
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_ITEMS);
    fixture.detectChanges();

    expect(comp.demandes().length).toBe(3);
    expect(comp.loading()).toBe(false);
  });

  it('sets demandes to [] and loading to false on HTTP error', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/v1/demandes-intervention')
      .flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(comp.demandes()).toEqual([]);
    expect(comp.loading()).toBe(false);
  });

  it('shows the "Nouvelle demande" button', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush([]);
    fixture.detectChanges();

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    const labels = Array.from(buttons).map(b => b.textContent?.trim());
    expect(labels.some(l => l?.includes('Nouvelle demande'))).toBeTrue();
  });

  it('newCount() returns number of Nouvelle items', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush(MOCK_ITEMS);
    fixture.detectChanges();

    expect(comp.newCount()).toBe(1);
  });

  it('filteredDemandes() returns all items when filters are default', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush(MOCK_ITEMS);
    fixture.detectChanges();

    expect(comp.filteredDemandes().length).toBe(3);
  });

  it('filterByStatut() filters to Nouvelle items only', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush(MOCK_ITEMS);
    fixture.detectChanges();

    comp.filterByStatut('Nouvelle');
    fixture.detectChanges();

    expect(comp.filteredDemandes().length).toBe(1);
    expect(comp.filteredDemandes()[0].statut).toBe('Nouvelle');
  });

  it('filterByUrgence() filters by urgence level', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush(MOCK_ITEMS);
    fixture.detectChanges();

    comp.filterByUrgence('Moyenne');
    fixture.detectChanges();

    expect(comp.filteredDemandes().length).toBe(1);
    expect(comp.filteredDemandes()[0].urgence).toBe('Moyenne');
  });

  it('updateStatut() changes a demande statut in the signal', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush(MOCK_ITEMS);
    fixture.detectChanges();

    comp.updateStatut(MOCK_ITEMS[0], 'Approuvée');
    fixture.detectChanges();

    const updated = comp.demandes().find(d => d.id === 1);
    expect(updated?.statut).toBe('Approuvée');
  });

  it('toStatusKey() maps French labels to badge keys', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush([]);

    expect(comp.toStatusKey('Nouvelle')).toBe('nouvelle');
    expect(comp.toStatusKey('Approuvée')).toBe('approuvee');
    expect(comp.toStatusKey('Rejetée')).toBe('rejetee');
    expect(comp.toStatusKey('Clôturée')).toBe('cloturee');
  });

  it('shows empty state when filteredDemandes is empty', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Aucune demande');
  });

  it('shows loading skeleton while HTTP request is in-flight', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    // Before the request is flushed, loading should be true
    expect(comp.loading()).toBeTrue();

    // Clean up
    httpMock.expectOne('/api/v1/demandes-intervention').flush([]);
  });

  it('renders demande codes when data loads', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush(MOCK_ITEMS);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('DI-2026-0041');
    expect(el.textContent).toContain('CHG-003');
  });

  it('submitNew() does nothing if vehicule or symptome is empty', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush(MOCK_ITEMS);
    fixture.detectChanges();

    const initialCount = comp.demandes().length;
    comp.newVehicule = '';
    comp.newSymptome = '';
    comp.submitNew();

    expect(comp.demandes().length).toBe(initialCount);
  });

  it('toUrgenceKey() maps urgence labels to badge keys', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush([]);

    expect(comp.toUrgenceKey('Haute')).toBe('haute');
    expect(comp.toUrgenceKey('Moyenne')).toBe('moyenne');
    expect(comp.toUrgenceKey('Basse')).toBe('basse');
    expect(comp.toUrgenceKey('unknown')).toBe('basse');
  });

  it('submitNew() adds a Nouvelle item when both fields are filled', () => {
    const fixture = TestBed.createComponent(DemandesInterventionComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/demandes-intervention').flush(MOCK_ITEMS);
    fixture.detectChanges();

    const initialCount = comp.demandes().length;
    comp.newVehicule = 'BUS-007';
    comp.newSymptome = 'Vibrations anormales';
    comp.newUrgence = 'Basse';
    comp.submitNew();

    expect(comp.demandes().length).toBe(initialCount + 1);
    expect(comp.demandes()[0].vehiculeCode).toBe('BUS-007');
    expect(comp.demandes()[0].statut).toBe('Nouvelle');
    expect(comp.showNewModal()).toBeFalse();
  });
});
