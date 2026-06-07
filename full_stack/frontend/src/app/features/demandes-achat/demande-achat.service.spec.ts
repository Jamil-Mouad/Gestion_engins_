import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DemandeAchatService } from './demande-achat.service';
import { DemandeAchat, DemandeStatut } from '../../shared/models/demande-achat.model';
import { Page } from '../../shared/models/pagination.model';

describe('DemandeAchatService', () => {
  let service: DemandeAchatService;
  let httpMock: HttpTestingController;

  const mockDemande: DemandeAchat = {
    id: 1,
    code: 'DA-2026-0001',
    dateDemande: '2026-05-05T10:00:00Z',
    demandeur: { id: 1, prenom: 'Ahmed', nom: 'Benali' },
    composant: { id: 12, designation: 'Filtre huile' },
    pieceLibre: null,
    reference: 'REF-001',
    quantite: 2,
    motif: 'Remplacement filtre usé',
    urgence: 'Haute',
    statut: 'Nouvelle' as DemandeStatut,
    approbateur: null,
    dateApprobation: null,
    raisonRejet: null,
    bonCommandeUrl: null,
    createdAt: '2026-05-05T10:00:00Z',
    updatedAt: '2026-05-05T10:00:00Z',
    demandeurNom: null,
    photoUrl: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DemandeAchatService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(DemandeAchatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() calls GET /api/v1/demandes-achat', () => {
    const mockPage: Page<DemandeAchat> = { content: [mockDemande], page: 0, size: 20, totalElements: 1, totalPages: 1 };
    service.list().subscribe((page) => expect(page.content.length).toBe(1));
    const req = httpMock.expectOne('/api/v1/demandes-achat');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('approuver() calls PATCH /api/v1/demandes-achat/:id/approuver', () => {
    service.approuver(1).subscribe((d) => expect(d.statut).toBe('Approuvée'));
    const req = httpMock.expectOne('/api/v1/demandes-achat/1/approuver');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockDemande, statut: 'Approuvée' as DemandeStatut });
  });

  it('rejeter() calls PATCH /api/v1/demandes-achat/:id/rejeter with raison', () => {
    service.rejeter(1, 'Hors budget').subscribe((d) => expect(d.statut).toBe('Rejetée'));
    const req = httpMock.expectOne('/api/v1/demandes-achat/1/rejeter');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ raison: 'Hors budget' });
    req.flush({ ...mockDemande, statut: 'Rejetée' as DemandeStatut });
  });

  it('cloturer() calls PATCH /api/v1/demandes-achat/:id/cloturer', () => {
    service.cloturer(1).subscribe((d) => expect(d.statut).toBe('Clôturée'));
    const req = httpMock.expectOne('/api/v1/demandes-achat/1/cloturer');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockDemande, statut: 'Clôturée' as DemandeStatut });
  });

  it('create() calls POST /api/v1/demandes-achat', () => {
    const form = { composantId: 12, pieceLibre: null, reference: 'REF-001', quantite: 2, motif: 'Remplacement', urgence: 'Haute' as const, demandeurNom: 'Ali Benali', photoUrl: null };
    service.create(form).subscribe((d) => expect(d.code).toBe('DA-2026-0001'));
    const req = httpMock.expectOne('/api/v1/demandes-achat');
    expect(req.request.method).toBe('POST');
    req.flush(mockDemande);
  });

  it('list() sends all filter params', () => {
    service.list({ statut: 'Nouvelle' as DemandeStatut, urgence: 'Haute', q: 'filtre', page: 1, size: 25 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/demandes-achat');
    expect(req.request.params.get('statut')).toBe('Nouvelle');
    expect(req.request.params.get('urgence')).toBe('Haute');
    expect(req.request.params.get('q')).toBe('filtre');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('25');
    req.flush({ content: [], page: 1, size: 25, totalElements: 0, totalPages: 0 });
  });

  it('list() handles 500 error', () => {
    let errored = false;
    service.list().subscribe({ next: () => fail('expected error'), error: (err) => { errored = true; expect(err.status).toBe(500); } });
    httpMock.expectOne('/api/v1/demandes-achat').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('create() handles 400 error', () => {
    const form = { composantId: 12, pieceLibre: null, reference: null, quantite: 0, motif: '', urgence: 'Haute' as const, demandeurNom: null, photoUrl: null };
    let errored = false;
    service.create(form).subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(400); } });
    httpMock.expectOne('/api/v1/demandes-achat').flush('bad', { status: 400, statusText: 'Bad Request' });
    expect(errored).toBeTrue();
  });

  it('approuver() handles 409 error', () => {
    let errored = false;
    service.approuver(1).subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(409); } });
    httpMock.expectOne('/api/v1/demandes-achat/1/approuver').flush('conflict', { status: 409, statusText: 'Conflict' });
    expect(errored).toBeTrue();
  });

  it('rejeter() handles 404 error', () => {
    let errored = false;
    service.rejeter(999, 'X').subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(404); } });
    httpMock.expectOne('/api/v1/demandes-achat/999/rejeter').flush('not found', { status: 404, statusText: 'Not Found' });
    expect(errored).toBeTrue();
  });

  it('cloturer() handles 409 error', () => {
    let errored = false;
    service.cloturer(1).subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(409); } });
    httpMock.expectOne('/api/v1/demandes-achat/1/cloturer').flush('conflict', { status: 409, statusText: 'Conflict' });
    expect(errored).toBeTrue();
  });
});