import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { InterventionService } from './intervention.service';
import { Intervention, InterventionStatut, InterventionCategorie, TypeIntervention, NewInterventionForm } from '../../shared/models/intervention.model';
import { Page } from '../../shared/models/pagination.model';

describe('InterventionService', () => {
  let service: InterventionService;
  let httpMock: HttpTestingController;

  const mockTypeIntervention: TypeIntervention = { id: 1, libelle: 'Maintenance préventive' };

  const mockIntervention: Intervention = {
    id: 1,
    vehicule: { id: 1, code: 'CAM-001' },
    typeIntervention: mockTypeIntervention,
    composant: { id: 11, designation: 'Filtre huile' },
    categorie: 'corrective' as InterventionCategorie,
    partie: 'Moteur',
    nBs: 'BS-2026-001',
    dateDebut: '2026-05-05T08:00:00Z',
    dateFin: null,
    tempsHeures: null,
    coutPieces: 1500,
    coutMainOeuvre: 300,
    coutSousTraitance: 0,
    coutTotal: 1800,
    observations: 'Remplacement filtre huile',
    demandeAchatId: null,
    statut: 'ouvert' as InterventionStatut,
    createdAt: '2026-05-05T08:00:00Z',
    photoUrl: null,
  };

  const mockPage: Page<Intervention> = {
    content: [mockIntervention],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InterventionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(InterventionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('list() calls GET /api/v1/interventions', () => {
    service.list().subscribe((page: Page<Intervention>) => {
      expect(page.content.length).toBe(1);
      expect(page.content[0].nBs).toBe('BS-2026-001');
    });

    const req = httpMock.expectOne('/api/v1/interventions');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('list() sends filter params', () => {
    service.list({ statut: 'ouvert', categorie: 'corrective' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    expect(req.request.params.get('statut')).toBe('ouvert');
    expect(req.request.params.get('categorie')).toBe('corrective');
    req.flush(mockPage);
  });

  it('get(id) calls GET /api/v1/interventions/:id', () => {
    service.get(1).subscribe((intervention: Intervention) => {
      expect(intervention.id).toBe(1);
      expect(intervention.statut).toBe('ouvert');
    });

    const req = httpMock.expectOne('/api/v1/interventions/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockIntervention);
  });

  it('create() calls POST /api/v1/interventions', () => {
    const form: NewInterventionForm = {
      vehiculeId: 1,
      typeInterventionId: 1,
      composantId: null,
      categorie: 'corrective' as InterventionCategorie,
      partie: 'Moteur',
      nBs: 'BS-2026-001',
      dateDebut: '2026-05-05T08:00:00Z',
      observations: 'Remplacement filtre huile',
      photoUrl: null,
    };

    service.create(form).subscribe((intervention: Intervention) => {
      expect(intervention.categorie).toBe('corrective');
    });

    const req = httpMock.expectOne('/api/v1/interventions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(form);
    req.flush(mockIntervention);
  });

  it('cloturer(id) calls PATCH /api/v1/interventions/:id/cloturer', () => {
    service.cloturer(1).subscribe((intervention: Intervention) => {
      expect(intervention.statut).toBe('cloture');
    });

    const req = httpMock.expectOne('/api/v1/interventions/1/cloturer');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockIntervention, statut: 'cloture' as InterventionStatut, dateFin: '2026-05-05T16:00:00Z' });
  });

  it('list() sends pagination params', () => {
    service.list({ page: 2, size: 50, vehiculeId: 7 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('50');
    expect(req.request.params.get('vehicule_id')).toBe('7');
    req.flush(mockPage);
  });

  it('list() handles 500 error', () => {
    let errored = false;
    service.list().subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(500); },
    });
    const req = httpMock.expectOne('/api/v1/interventions');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('get() handles 404 error', () => {
    let errored = false;
    service.get(999).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(404); },
    });
    const req = httpMock.expectOne('/api/v1/interventions/999');
    req.flush('not found', { status: 404, statusText: 'Not Found' });
    expect(errored).toBeTrue();
  });

  it('create() handles 400 error', () => {
    const form: NewInterventionForm = {
      vehiculeId: 1,
      typeInterventionId: 1,
      composantId: null,
      categorie: 'corrective' as InterventionCategorie,
      partie: 'X',
      nBs: '',
      dateDebut: '2026-05-05T08:00:00Z',
      observations: '',
      photoUrl: null,
    };
    let errored = false;
    service.create(form).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(400); },
    });
    const req = httpMock.expectOne('/api/v1/interventions');
    req.flush({ message: 'bad' }, { status: 400, statusText: 'Bad Request' });
    expect(errored).toBeTrue();
  });

  it('cloturer() handles 409 error', () => {
    let errored = false;
    service.cloturer(1).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(409); },
    });
    const req = httpMock.expectOne('/api/v1/interventions/1/cloturer');
    req.flush('conflict', { status: 409, statusText: 'Conflict' });
    expect(errored).toBeTrue();
  });

  it('list(params, force=true) bypasses cache and adds _ param', () => {
    // First call — populates cache
    service.list({ page: 0, size: 6 }).subscribe();
    const req1 = httpMock.expectOne((r) => r.url === '/api/v1/interventions' && r.params.has('page'));
    req1.flush(mockPage);

    // Second call with force=true — must fire a new HTTP request with _ param
    service.list({ page: 0, size: 6 }, true).subscribe();
    const req2 = httpMock.expectOne((r) => r.url === '/api/v1/interventions' && r.params.has('_'));
    expect(req2.request.params.has('_')).toBeTrue();
    req2.flush(mockPage);
  });

  it('list() evicts cache entry on error so next call retries', () => {
    // First call triggers error — tap({error}) deletes the cache key
    service.list({ page: 0 }).subscribe({ error: () => {} });
    const req1 = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req1.flush('error', { status: 500, statusText: 'Server Error' });

    // invalidate() to clear the shareReplay'd error observable, then retry
    service.invalidate();

    // After invalidation a fresh call must go to the network
    let got: Page<Intervention> | null = null;
    service.list({ page: 0 }).subscribe(p => { got = p; });
    const req2 = httpMock.expectOne((r) => r.url === '/api/v1/interventions');
    req2.flush(mockPage);
    expect(got).not.toBeNull();
  });

  it('getTypes() calls GET /api/v1/interventions/types', () => {
    service.getTypes().subscribe((types: TypeIntervention[]) => {
      expect(types.length).toBe(1);
      expect(types[0].libelle).toBe('Maintenance préventive');
    });

    const req = httpMock.expectOne('/api/v1/interventions/types');
    expect(req.request.method).toBe('GET');
    req.flush([mockTypeIntervention]);
  });
});