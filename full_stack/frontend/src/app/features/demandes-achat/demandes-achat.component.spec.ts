import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

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
      fournisseur: null,
      statut: 'Nouvelle',
      approbateur: null,
      dateApprobation: null,
      raisonRejet: null,
      bonCommandeUrl: null,
      createdAt: '2026-05-10T08:00:00Z',
      updatedAt: '2026-05-10T08:00:00Z',
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
      fournisseur: null,
      statut: 'Approuvée',
      approbateur: { id: 3, prenom: 'Admin', nom: 'System' },
      dateApprobation: '2026-05-12T10:00:00Z',
      raisonRejet: null,
      bonCommandeUrl: null,
      createdAt: '2026-05-11T09:00:00Z',
      updatedAt: '2026-05-12T10:00:00Z',
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
      fournisseur: null,
      statut: 'Rejetée',
      approbateur: null,
      dateApprobation: null,
      raisonRejet: 'Budget insuffisant',
      bonCommandeUrl: null,
      createdAt: '2026-05-12T08:00:00Z',
      updatedAt: '2026-05-13T08:00:00Z',
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
      fournisseur: null,
      statut: 'Clôturée',
      approbateur: null,
      dateApprobation: null,
      raisonRejet: null,
      bonCommandeUrl: null,
      createdAt: '2026-05-13T08:00:00Z',
      updatedAt: '2026-05-14T08:00:00Z',
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
    // S19 prototype columns: N° Demande, Désignation article, Quantité, Date demande, Urgence, Statut
    // Demandeur column not shown in new design — check designation instead
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
    expect(nativeEl.querySelector('.demandes__empty')?.textContent).toContain('Aucune demande d\'achat trouvée');
  });

  it('renders tab buttons', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const req = httpMock.expectOne('/api/v1/demandes-achat');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    // Filter chips rendered as app-filter-chip elements (one per tab: Toutes, Nouvelles, Approuvées, Rejetées, Clôturées)
    const tabs = nativeEl.querySelectorAll('.demandes__tab');
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

  it('getUrgenceVariant maps urgences correctly', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne('/api/v1/demandes-achat');
    initReq.flush(mockPage);

    expect(component.getUrgenceVariant('Haute')).toBe('danger');
    expect(component.getUrgenceVariant('Moyenne')).toBe('warning');
    expect(component.getUrgenceVariant('Basse')).toBe('info');
    expect(component.getUrgenceVariant(null)).toBe('neutral');
    expect(component.getUrgenceVariant('other')).toBe('neutral');
  });

  it('getStatutVariant maps statuts correctly', () => {
    const fixture = TestBed.createComponent(DemandesAchatComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne('/api/v1/demandes-achat');
    initReq.flush(mockPage);

    expect(component.getStatutVariant('Nouvelle')).toBe('info');
    expect(component.getStatutVariant('Approuvée')).toBe('success');
    expect(component.getStatutVariant('Rejetée')).toBe('danger');
    expect(component.getStatutVariant('Clôturée')).toBe('neutral');
    expect(component.getStatutVariant('other')).toBe('neutral');
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

    // The new design uses flexbox rows (dtr-cell divs) instead of table td elements.
    // The designation column is the 2nd dtr-cell (index 1) inside the data-table-row.
    const nativeEl = fixture.nativeElement as HTMLElement;
    const cells = nativeEl.querySelectorAll('app-data-table-row .dtr-cell');
    expect(cells[1]?.textContent?.trim()).toContain('—');
  });
});