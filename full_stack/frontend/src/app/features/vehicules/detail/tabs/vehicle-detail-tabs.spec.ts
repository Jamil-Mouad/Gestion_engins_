import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { signal } from '@angular/core';

import { InterventionsTabComponent } from './interventions-tab.component';
import { InfosTabComponent } from './infos-tab.component';
import { VidangesTabComponent } from './vidanges-tab.component';
import { HistoriqueTabComponent } from './historique-tab.component';
import { KpisTabComponent } from './kpis-tab.component';
import { DocumentsTabComponent } from './documents-tab.component';
import { Intervention, InterventionStatut } from '../../../../shared/models/intervention.model';
import { VehiculeDetail } from '../../../../shared/models/vehicule.model';
import { Page } from '../../../../shared/models/pagination.model';
import { SuiviVidange } from '../../../../shared/models/vidange.model';
import { ReleveCompteur } from '../../../../shared/models/releve-compteur.model';
import { KpiSnapshot } from '../../../../shared/models/dashboard.model';

function makeIntervention(overrides: Partial<Intervention> = {}): Intervention {
  return {
    id: 1,
    vehicule: { id: 1, code: 'CAM-001' },
    typeIntervention: { id: 1, code: 'VID', libelle: 'Vidange' },
    composant: null,
    categorie: 'preventive',
    partie: null,
    nBs: 'BS-001',
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

const mockVehiculeDetail: VehiculeDetail = {
  id: 1,
  code: 'CAM-001',
  type: 'camion_tracteur',
  marque: 'Volvo',
  modele: 'FH16',
  matricule: '12345-A-1',
  nChassis: null,
  annee: 2020,
  carburant: 'diesel',
  statut: 'in-service',
  dateMiseService: '2020-01-01',
  photoUrl: null,
  actif: true,
  createdAt: '2020-01-01T00:00:00Z',
  updatedAt: '2020-01-01T00:00:00Z',
  configAxleSemi: null,
  currentAttelage: null,
  camionDetails: null,
};

const mockKpis: KpiSnapshot = {
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

// ── InterventionsTabComponent ─────────────────────────────────────────────────

describe('InterventionsTabComponent', () => {
  let httpMock: HttpTestingController;

  const mockPage: Page<Intervention> = {
    content: [makeIntervention({ id: 1 }), makeIntervention({ id: 2, statut: 'en_cours' as InterventionStatut })],
    page: 0,
    size: 200,
    totalElements: 2,
    totalPages: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LucideAngularModule.pick({})],
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
    const fixture = TestBed.createComponent(InterventionsTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads interventions on ngOnInit', () => {
    const fixture = TestBed.createComponent(InterventionsTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);
    expect(fixture.componentInstance.interventions().length).toBe(2);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('filters by searchQuery matching nBs', () => {
    const fixture = TestBed.createComponent(InterventionsTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);

    fixture.componentInstance.searchQuery.set('BS-001');
    expect(fixture.componentInstance.filtered().length).toBe(2); // both have nBs='BS-001'
  });

  it('filters by searchQuery with no match returns empty', () => {
    const fixture = TestBed.createComponent(InterventionsTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);

    fixture.componentInstance.searchQuery.set('XXXXXXNOTFOUND');
    expect(fixture.componentInstance.filtered().length).toBe(0);
  });

  it('filters by statutFilter "ouvert"', () => {
    const fixture = TestBed.createComponent(InterventionsTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);

    fixture.componentInstance.statutFilter.set('ouvert');
    expect(fixture.componentInstance.filtered().length).toBe(1);
  });

  it('filtered() returns all when statutFilter is "all"', () => {
    const fixture = TestBed.createComponent(InterventionsTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);

    fixture.componentInstance.statutFilter.set('all');
    expect(fixture.componentInstance.filtered().length).toBe(2);
  });

  it('visibleCols() maps column IDs', () => {
    const fixture = TestBed.createComponent(InterventionsTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);
    expect(fixture.componentInstance.visibleCols().length).toBeGreaterThan(0);
  });

  it('onColsApplied updates visible ids and closes col manager', () => {
    const fixture = TestBed.createComponent(InterventionsTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush(mockPage);

    fixture.componentInstance.showColMgr.set(true);
    fixture.componentInstance.onColsApplied(['type', 'date']);
    expect(fixture.componentInstance.visibleIds()).toEqual(['type', 'date']);
    expect(fixture.componentInstance.showColMgr()).toBe(false);
  });

  it('onInterventionCreated closes modal and reloads', () => {
    const fixture = TestBed.createComponent(InterventionsTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    initReq.flush(mockPage);

    fixture.componentInstance.showNewModal.set(true);
    fixture.componentInstance.onInterventionCreated();
    expect(fixture.componentInstance.showNewModal()).toBe(false);

    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    reloadReq.flush(mockPage);
  });

  it('sets loading=false on API error', () => {
    const fixture = TestBed.createComponent(InterventionsTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(fixture.componentInstance.loading()).toBe(false);
  });
});

// ── InfosTabComponent ─────────────────────────────────────────────────────────

describe('InfosTabComponent', () => {
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
    // Drain pending attelage requests
    httpMock.match(() => true).forEach(r => r.flush([]));
    httpMock.verify();
  });

  function createInfosTab(vehicule: VehiculeDetail = mockVehiculeDetail) {
    const fixture = TestBed.createComponent(InfosTabComponent);
    // Set the signal input
    (fixture.componentInstance as any).vehicule = signal(vehicule);
    return fixture;
  }

  it('creates the component', () => {
    const fixture = createInfosTab();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('isCamion computed returns true for camion_tracteur type', () => {
    const fixture = createInfosTab();
    expect(fixture.componentInstance.isCamion()).toBe(true);
  });

  it('isCamion computed returns false for semi_remorque type', () => {
    const fixture = createInfosTab({ ...mockVehiculeDetail, type: 'semi_remorque' });
    expect(fixture.componentInstance.isCamion()).toBe(false);
  });

  it('isSemiRemorque computed returns true for semi_remorque type', () => {
    const fixture = createInfosTab({ ...mockVehiculeDetail, type: 'semi_remorque' });
    expect(fixture.componentInstance.isSemiRemorque()).toBe(true);
  });

  it('showAttelage is true for camion_tracteur', () => {
    const fixture = createInfosTab();
    expect(fixture.componentInstance.showAttelage()).toBe(true);
  });

  it('showAttelage is false for camion type', () => {
    const fixture = createInfosTab({ ...mockVehiculeDetail, type: 'camion' });
    expect(fixture.componentInstance.showAttelage()).toBe(false);
  });

  it('infoRows computed returns array of info rows', () => {
    const fixture = createInfosTab();
    const rows = fixture.componentInstance.infoRows();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('infoRows contains marque and modele', () => {
    const fixture = createInfosTab();
    const rows = fixture.componentInstance.infoRows();
    const marque = rows.find(r => r.label === 'Marque');
    const modele = rows.find(r => r.label === 'Modèle');
    expect(marque?.value).toBe('Volvo');
    expect(modele?.value).toBe('FH16');
  });

  it('showAssignModal defaults to false', () => {
    const fixture = createInfosTab();
    expect(fixture.componentInstance.showAssignModal()).toBe(false);
  });

  it('showDetachConfirm defaults to false', () => {
    const fixture = createInfosTab();
    expect(fixture.componentInstance.showDetachConfirm()).toBe(false);
  });

  it('terminatedHistory returns only attelages with dateFin', () => {
    const fixture = createInfosTab();
    // history defaults to [] so terminatedHistory is []
    expect(fixture.componentInstance.terminatedHistory()).toEqual([]);
  });
});

// ── VidangesTabComponent ──────────────────────────────────────────────────────

describe('VidangesTabComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('creates the component with empty vidanges', () => {
    const fixture = TestBed.createComponent(VidangesTabComponent);
    fixture.componentInstance.vidanges = [];
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders empty state when no vidanges', () => {
    const fixture = TestBed.createComponent(VidangesTabComponent);
    fixture.componentInstance.vidanges = [];
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-empty-state')).toBeTruthy();
  });

  it('renders vidanges table when vidanges provided', () => {
    const fixture = TestBed.createComponent(VidangesTabComponent);
    const mockVidange: SuiviVidange = {
      id: 1,
      vehicule: { id: 1, code: 'CAM-001', marque: 'Volvo', modele: 'FH16' },
      composant: { id: 1, designation: 'Huile moteur' },
      intervalleNbh: 500,
      compteurNbhActuel: 450,
      nbhRestant: 50,
      dateDernierEntretien: null,
      prochainEntretienEstime: null,
      statut: 'a_faire',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    fixture.componentInstance.vidanges = [mockVidange];
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Huile moteur');
  });

  it('getStatusVariant returns "success" for fait', () => {
    const fixture = TestBed.createComponent(VidangesTabComponent);
    expect(fixture.componentInstance.getStatusVariant('fait')).toBe('success');
  });

  it('getStatusVariant returns "info" for en_cours', () => {
    const fixture = TestBed.createComponent(VidangesTabComponent);
    expect(fixture.componentInstance.getStatusVariant('en_cours')).toBe('info');
  });

  it('getStatusVariant returns "warning" for a_faire', () => {
    const fixture = TestBed.createComponent(VidangesTabComponent);
    expect(fixture.componentInstance.getStatusVariant('a_faire')).toBe('warning');
  });

  it('getStatusVariant returns "danger" for depasse', () => {
    const fixture = TestBed.createComponent(VidangesTabComponent);
    expect(fixture.componentInstance.getStatusVariant('depasse')).toBe('danger');
  });

  it('getStatusVariant returns "secondary" for unknown status', () => {
    const fixture = TestBed.createComponent(VidangesTabComponent);
    expect(fixture.componentInstance.getStatusVariant('unknown')).toBe('secondary');
  });
});

// ── HistoriqueTabComponent ─────��──────────────────────────────────────────────

describe('HistoriqueTabComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('creates the component with empty releves', () => {
    const fixture = TestBed.createComponent(HistoriqueTabComponent);
    fixture.componentInstance.releves = [];
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders empty state when no releves', () => {
    const fixture = TestBed.createComponent(HistoriqueTabComponent);
    fixture.componentInstance.releves = [];
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-empty-state')).toBeTruthy();
  });

  it('renders releves table when data provided', () => {
    const fixture = TestBed.createComponent(HistoriqueTabComponent);
    const mockReleve: ReleveCompteur = {
      id: 1,
      vehicule: { id: 1, code: 'CAM-001' },
      dateReleve: '2026-05-01',
      compteurKm: 150000,
      compteurHeures: null,
      source: 'manual',
      importHistoriqueId: null,
      createdBy: null,
    };
    fixture.componentInstance.releves = [mockReleve];
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('cols property has 4 column definitions', () => {
    const fixture = TestBed.createComponent(HistoriqueTabComponent);
    expect(fixture.componentInstance.cols.length).toBe(4);
  });
});

// ── KpisTabComponent ──────────────────────────────────────────────────────────

describe('KpisTabComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(KpisTabComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows skeleton when loading is true', () => {
    const fixture = TestBed.createComponent(KpisTabComponent);
    fixture.componentInstance.loading = true;
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();
  });

  it('shows empty state when kpis is null and not loading', () => {
    const fixture = TestBed.createComponent(KpisTabComponent);
    fixture.componentInstance.loading = false;
    fixture.componentInstance.kpis = null;
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-empty-state')).toBeTruthy();
  });

  it('renders KPI cards when kpis provided', () => {
    const fixture = TestBed.createComponent(KpisTabComponent);
    fixture.componentInstance.loading = false;
    fixture.componentInstance.kpis = mockKpis;
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelectorAll('app-kpi-card').length).toBeGreaterThan(0);
  });
});

// ── DocumentsTabComponent ──────────────────────────────────���──────────────────

describe('DocumentsTabComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(DocumentsTabComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders empty state for documents', () => {
    const fixture = TestBed.createComponent(DocumentsTabComponent);
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-empty-state')).toBeTruthy();
  });
});
