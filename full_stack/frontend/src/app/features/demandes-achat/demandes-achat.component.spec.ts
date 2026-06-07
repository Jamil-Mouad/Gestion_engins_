import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LucideAngularModule, Search, Download, Settings, GripVertical } from 'lucide-angular';

import { DemandesAchatComponent } from './demandes-achat.component';
import { DemandeAchat, DemandeStatut } from '../../shared/models/demande-achat.model';
import { Page } from '../../shared/models/pagination.model';

describe('DemandesAchatComponent', () => {
  let httpMock: HttpTestingController;

  const mockDemandes: DemandeAchat[] = [
    {
      id: 1,
      code: 'DA-001',
      dateDemande: '2026-05-10',
      demandeur: { id: 1, prenom: 'Jean', nom: 'Dupont' },
      composant: { id: 10, designation: 'Filtre à huile' },
      pieceLibre: null,
      reference: null,
      quantite: 5,
      motif: 'Stock bas',
      urgence: 'Haute',
      statut: 'Nouvelle',
      approbateur: null,
      dateApprobation: null,
      raisonRejet: null,
      bonCommandeUrl: null,
      createdAt: '2026-05-10T08:00:00Z',
      updatedAt: '2026-05-10T08:00:00Z',
      demandeurNom: null,
      photoUrl: null,
    },
    {
      id: 2,
      code: 'DA-002',
      dateDemande: '2026-05-11',
      demandeur: { id: 2, prenom: 'Marie', nom: 'Martin' },
      composant: null,
      pieceLibre: 'Joint torique',
      reference: null,
      quantite: 20,
      motif: 'Remplacement',
      urgence: 'Moyenne',
      statut: 'Approuvée',
      approbateur: { id: 3, prenom: 'Admin', nom: 'System' },
      dateApprobation: '2026-05-12T10:00:00Z',
      raisonRejet: null,
      bonCommandeUrl: null,
      createdAt: '2026-05-11T09:00:00Z',
      updatedAt: '2026-05-12T10:00:00Z',
      demandeurNom: null,
      photoUrl: null,
    },
    {
      id: 3,
      code: 'DA-003',
      dateDemande: '2026-05-12',
      demandeur: { id: 1, prenom: 'Jean', nom: 'Dupont' },
      composant: { id: 11, designation: 'Courroie' },
      pieceLibre: null,
      reference: null,
      quantite: 3,
      motif: 'Usure',
      urgence: 'Basse',
      statut: 'Rejetée',
      approbateur: null,
      dateApprobation: null,
      raisonRejet: 'Budget insuffisant',
      bonCommandeUrl: null,
      createdAt: '2026-05-12T08:00:00Z',
      updatedAt: '2026-05-13T08:00:00Z',
      demandeurNom: null,
      photoUrl: null,
    },
    {
      id: 4,
      code: 'DA-004',
      dateDemande: '2026-05-13',
      demandeur: { id: 2, prenom: 'Marie', nom: 'Martin' },
      composant: null,
      pieceLibre: null,
      reference: null,
      quantite: 1,
      motif: 'Test',
      urgence: null,
      statut: 'Clôturée',
      approbateur: null,
      dateApprobation: null,
      raisonRejet: null,
      bonCommandeUrl: null,
      createdAt: '2026-05-13T08:00:00Z',
      updatedAt: '2026-05-14T08:00:00Z',
      demandeurNom: null,
      photoUrl: null,
    },
  ];

  const mockPage: Page<DemandeAchat> = {
    content: mockDemandes,
    page: 0,
    size: 20,
    totalElements: 4,
    totalPages: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        LucideAngularModule.pick({ Search, Download, Settings, GripVertical }),
      ],
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
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const req = httpMock.expectOne('/api/v1/demandes-achat');
    req.flush(mockPage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads demandes on init via GET /api/v1/demandes-achat', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne('/api/v1/demandes-achat');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);

    expect(component.demandes().length).toBe(4);
    expect(component.loading()).toBe(false);
  });

  it('renders demandes in table', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const req = httpMock.expectOne('/api/v1/demandes-achat');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('DA-001');
    // Columns: ID, Date, Demandeur, Pièce, Réf., Qté, Statut, Actions
    expect(nativeEl.textContent).toContain('Filtre à huile');
  });

  it('renders pieceLibre when composant is null', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const req = httpMock.expectOne('/api/v1/demandes-achat');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Joint torique');
  });

  it('shows empty state when no demandes', () => {
    const emptyPage: Page<DemandeAchat> = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const req = httpMock.expectOne('/api/v1/demandes-achat');
    req.flush(emptyPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    // Empty state is rendered by app-empty-state component
    expect(nativeEl.querySelector('app-empty-state')).toBeTruthy();
  });

  it('renders tab buttons', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const req = httpMock.expectOne('/api/v1/demandes-achat');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    // Filter chips rendered as app-filter-chip elements (one per tab: Toutes, Nouvelles, Approuvées, Rejetées, Clôturées)
    const tabs = nativeEl.querySelectorAll('app-filter-chip');
    expect(tabs.length).toBe(5);
  });

  it('filterByTab sends request with statut param', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne('/api/v1/demandes-achat');
    initReq.flush(mockPage);

    component.filterByTab('Nouvelle');

    const filterReq = httpMock.expectOne((r) => r.url === '/api/v1/demandes-achat');
    expect(filterReq.request.params.get('statut')).toBe('Nouvelle');
    filterReq.flush(mockPage);

    expect(component.activeTab()).toBe('Nouvelle');
  });

  it('filterByTab with all sends request without statut param', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne('/api/v1/demandes-achat');
    initReq.flush(mockPage);

    component.filterByTab('all');

    const filterReq = httpMock.expectOne((r) => r.url === '/api/v1/demandes-achat');
    expect(filterReq.request.params.get('statut')).toBeNull();
    filterReq.flush(mockPage);
  });

  it('approuver calls PATCH and reloads', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne('/api/v1/demandes-achat');
    initReq.flush(mockPage);

    component.approuver(1);

    const patchReq = httpMock.expectOne('/api/v1/demandes-achat/1/approuver');
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({ ...mockDemandes[0], statut: 'Approuvée' as DemandeStatut });

    const reloadReq = httpMock.expectOne('/api/v1/demandes-achat');
    reloadReq.flush(mockPage);
  });

  it('cloturer calls PATCH and reloads', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne('/api/v1/demandes-achat');
    initReq.flush(mockPage);

    component.cloturer(2);

    const patchReq = httpMock.expectOne('/api/v1/demandes-achat/2/cloturer');
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({ ...mockDemandes[1], statut: 'Clôturée' as DemandeStatut });

    const reloadReq = httpMock.expectOne('/api/v1/demandes-achat');
    reloadReq.flush(mockPage);
  });

  it('toRequestStatus maps statuts correctly', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne('/api/v1/demandes-achat');
    initReq.flush(mockPage);

    expect(component.toRequestStatus('Nouvelle')).toBe('nouvelle');
    expect(component.toRequestStatus('Approuvée')).toBe('approuvee');
    expect(component.toRequestStatus('Rejetée')).toBe('rejetee');
    expect(component.toRequestStatus('Clôturée')).toBe('cloturee');
    expect(component.toRequestStatus('other')).toBe('nouvelle');
  });

  it('shows skeleton while loading', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();

    const req = httpMock.expectOne('/api/v1/demandes-achat');
    req.flush(mockPage);
  });

  it('sets loading to false on error', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne('/api/v1/demandes-achat');
    req.error(new ProgressEvent('error'));

    expect(component.loading()).toBe(false);
  });

  it('displays em dash when composant and pieceLibre are null', () => {
    const noItemPage: Page<DemandeAchat> = {
      content: [{
        ...mockDemandes[0],
        id: 99,
        composant: null,
        pieceLibre: null,
      }],
      page: 0, size: 20, totalElements: 1, totalPages: 1,
    };
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const req = httpMock.expectOne('/api/v1/demandes-achat');
    req.flush(noItemPage);
    fixture.detectChanges();

    // The dynamic-column table renders cells with class "td".
    // Column order: 0=ID, 1=Date, 2=Demandeur, 3=Pièce, 4=Réf., 5=Qté, 6=Statut, 7=Actions (pinned)
    const nativeEl = fixture.nativeElement as HTMLElement;
    const cells = nativeEl.querySelectorAll('app-data-table-row .td');
    expect(cells[3]?.textContent?.trim()).toContain('—');
  });
});