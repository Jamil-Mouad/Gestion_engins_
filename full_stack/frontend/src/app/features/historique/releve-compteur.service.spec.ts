import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ReleveCompteurService } from './releve-compteur.service';
import { ReleveCompteur } from '../../shared/models/releve-compteur.model';
import { Page } from '../../shared/models/pagination.model';

describe('ReleveCompteurService', () => {
  let service: ReleveCompteurService;
  let httpMock: HttpTestingController;

  const mockReleve: ReleveCompteur = {
    id: 1,
    vehicule: { id: 1, code: 'CAM-001' },
    dateReleve: '2026-05-01T00:00:00Z',
    compteurKm: 140000,
    compteurHeures: 5000,
    source: 'manual',
    importHistoriqueId: null,
    createdBy: { id: 1, prenom: 'Admin', nom: 'User' },
  };

  const mockPage: Page<ReleveCompteur> = {
    content: [mockReleve],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReleveCompteurService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(ReleveCompteurService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('list() calls GET /api/v1/releves-compteur', () => {
    service.list().subscribe((page) => {
      expect(page.content.length).toBe(1);
      expect(page.content[0].source).toBe('manual');
    });

    const req = httpMock.expectOne('/api/v1/releves-compteur');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('list() sends vehiculeId, page, size params', () => {
    service.list({ vehiculeId: 5, page: 1, size: 50 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/releves-compteur');
    expect(req.request.params.get('vehicule_id')).toBe('5');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('50');
    req.flush(mockPage);
  });

  it('list() does not send vehiculeId param when undefined', () => {
    service.list({ page: 0, size: 500 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/releves-compteur');
    expect(req.request.params.has('vehicule_id')).toBeFalse();
    req.flush(mockPage);
  });

  it('create() calls POST /api/v1/releves-compteur', () => {
    const form = { vehicule: { id: 1, code: 'CAM-001' }, compteurKm: 142000 };
    service.create(form as Partial<ReleveCompteur>).subscribe((r) => {
      expect(r.id).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/releves-compteur');
    expect(req.request.method).toBe('POST');
    req.flush(mockReleve);
  });

  it('list() handles 500 error', () => {
    let errored = false;
    service.list().subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(500); },
    });
    const req = httpMock.expectOne('/api/v1/releves-compteur');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });
});
