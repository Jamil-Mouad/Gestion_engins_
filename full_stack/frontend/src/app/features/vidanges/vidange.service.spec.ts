import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { VidangeService } from './vidange.service';
import { SuiviVidange, VidangeStatut } from '../../shared/models/vidange.model';
import { Page } from '../../shared/models/pagination.model';

describe('VidangeService', () => {
  let service: VidangeService;
  let httpMock: HttpTestingController;

  const mockVidange: SuiviVidange = {
    id: 1,
    vehicule: { id: 1, code: 'CAM-001', marque: 'Volvo', modele: 'FH16' },
    composant: { id: 11, designation: 'Filtre huile' },
    intervalleNbh: 500,
    compteurNbhActuel: 480,
    nbhRestant: 20,
    dateDernierEntretien: '2026-01-10',
    prochainEntretienEstime: '2026-06-10',
    statut: 'a_faire' as VidangeStatut,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  };

  const mockPage: Page<SuiviVidange> = {
    content: [mockVidange],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        VidangeService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(VidangeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('list() calls GET /api/v1/vidanges', () => {
    service.list().subscribe((page) => {
      expect(page.content.length).toBe(1);
      expect(page.content[0].statut).toBe('a_faire');
    });

    const req = httpMock.expectOne('/api/v1/vidanges');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('list() sends statut param', () => {
    service.list({ statut: 'a_faire' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges');
    expect(req.request.params.get('statut')).toBe('a_faire');
    req.flush(mockPage);
  });

  it('cloturer() calls PATCH /api/v1/vidanges/:id/cloturer', () => {
    service.cloturer(1).subscribe((v) => {
      expect(v.id).toBe(1);
      expect(v.statut).toBe('fait');
    });

    const req = httpMock.expectOne('/api/v1/vidanges/1/cloturer');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockVidange, statut: 'fait' as VidangeStatut });
  });

  it('planning() calls GET /api/v1/vidanges/planning', () => {
    service.planning(4).subscribe((weeks) => {
      expect(weeks.length).toBe(4);
    });

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('semaines')).toBe('4');
    req.flush([
      { semaine: '2026-W19', dateDebut: '2026-05-06', dateFin: '2026-05-12', vidanges: [{ vehiculeCode: 'CAM-001', composant: 'Filtre huile', statut: 'a_faire' }] },
      { semaine: '2026-W20', dateDebut: '2026-05-13', dateFin: '2026-05-19', vidanges: [] },
      { semaine: '2026-W21', dateDebut: '2026-05-20', dateFin: '2026-05-26', vidanges: [] },
      { semaine: '2026-W22', dateDebut: '2026-05-27', dateFin: '2026-05-30', vidanges: [] },
    ]);
  });

  it('listByVehicule() calls GET /api/v1/vehicules/:id/vidanges', () => {
    service.listByVehicule(1).subscribe((list) => {
      expect(list.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/vehicules/1/vidanges');
    expect(req.request.method).toBe('GET');
    req.flush([mockVidange]);
  });

  it('list() sends pagination params', () => {
    service.list({ page: 2, size: 50 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('50');
    req.flush(mockPage);
  });

  it('planning() uses default semaines=4 when no argument', () => {
    service.planning().subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning');
    expect(req.request.params.get('semaines')).toBe('4');
    req.flush([]);
  });

  it('list() handles 500 error', () => {
    let errored = false;
    service.list().subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(500); } });
    httpMock.expectOne('/api/v1/vidanges').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('listByVehicule() handles 404 error', () => {
    let errored = false;
    service.listByVehicule(999).subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(404); } });
    httpMock.expectOne('/api/v1/vehicules/999/vidanges').flush('not found', { status: 404, statusText: 'Not Found' });
    expect(errored).toBeTrue();
  });

  it('cloturer() handles 409 error', () => {
    let errored = false;
    service.cloturer(1).subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(409); } });
    httpMock.expectOne('/api/v1/vidanges/1/cloturer').flush('conflict', { status: 409, statusText: 'Conflict' });
    expect(errored).toBeTrue();
  });

  it('planning() handles 500 error', () => {
    let errored = false;
    service.planning(2).subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(500); } });
    httpMock.expectOne((r) => r.url === '/api/v1/vidanges/planning').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });
});