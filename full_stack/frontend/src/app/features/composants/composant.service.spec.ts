import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ComposantService } from './composant.service';
import { ComposantNode, Composant, ComposantCategorie } from '../../shared/models/composant.model';

describe('ComposantService', () => {
  let service: ComposantService;
  let httpMock: HttpTestingController;

  const mockTree: ComposantNode[] = [
    {
      id: 1,
      designation: 'Moteur',
      niveau: 1,
      categorie: 'moteur',
      children: [
        {
          id: 11,
          designation: 'Filtre huile',
          niveau: 2,
          categorie: 'moteur',
          children: [
            { id: 111, designation: 'Filtre MANN HU 12 103 x', niveau: 3, categorie: 'moteur', children: [] },
          ],
        },
      ],
    },
  ];

  const mockComposant: Composant = {
    id: 1,
    parentId: null,
    niveau: 1,
    reference: 'REF-001',
    designation: 'Moteur',
    categorie: 'moteur' as ComposantCategorie,
    unite: 'unité',
    marque: 'Volvo',
    prixUnitaire: 5000,
    stock: 10,
    actif: true,
    imageUrl: null,
    creePar: { id: 1, prenom: 'Admin', nom: 'System' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ComposantService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(ComposantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('tree() calls GET /api/v1/composants/tree', () => {
    service.tree().subscribe((tree) => {
      expect(tree.length).toBe(1);
      expect(tree[0].designation).toBe('Moteur');
    });

    const req = httpMock.expectOne('/api/v1/composants/tree');
    expect(req.request.method).toBe('GET');
    req.flush(mockTree);
  });

  it('list() calls GET /api/v1/composants', () => {
    service.list().subscribe((page) => {
      expect(page.content.length).toBe(1);
      expect(page.content[0].designation).toBe('Moteur');
    });

    const req = httpMock.expectOne('/api/v1/composants');
    expect(req.request.method).toBe('GET');
    req.flush({ content: [mockComposant], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  });

  it('get(id) calls GET /api/v1/composants/:id', () => {
    service.get(1).subscribe((c) => {
      expect(c.id).toBe(1);
      expect(c.designation).toBe('Moteur');
    });

    const req = httpMock.expectOne('/api/v1/composants/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockComposant);
  });

  it('create() calls POST /api/v1/composants', () => {
    const form = { designation: 'Filtre gasoil', categorie: 'moteur' as ComposantCategorie, niveau: 2 as const, parentId: 1 };

    service.create(form).subscribe((c) => {
      expect(c.designation).toBe('Filtre gasoil');
    });

    const req = httpMock.expectOne('/api/v1/composants');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(form);
    req.flush({ ...mockComposant, designation: 'Filtre gasoil' });
  });

  it('search() calls GET /api/v1/composants/search with q param', () => {
    service.search('filtre').subscribe((results) => {
      expect(results.length).toBe(1);
    });

    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/search');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('filtre');
    req.flush([mockComposant]);
  });

  it('search() sends categorie when provided', () => {
    service.search('filtre', 'moteur').subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/search');
    expect(req.request.params.get('categorie')).toBe('moteur');
    req.flush([mockComposant]);
  });

  it('list() sends all params', () => {
    service.list({ categorie: 'moteur', page: 1, size: 25 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants');
    expect(req.request.params.get('categorie')).toBe('moteur');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('25');
    req.flush({ content: [], page: 1, size: 25, totalElements: 0, totalPages: 0 });
  });

  it('tree() handles 500 error', () => {
    let errored = false;
    service.tree().subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(500); } });
    httpMock.expectOne('/api/v1/composants/tree').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('list() handles 500 error', () => {
    let errored = false;
    service.list().subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(500); } });
    httpMock.expectOne('/api/v1/composants').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('get() handles 404 error', () => {
    let errored = false;
    service.get(999).subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(404); } });
    httpMock.expectOne('/api/v1/composants/999').flush('not found', { status: 404, statusText: 'Not Found' });
    expect(errored).toBeTrue();
  });

  it('create() handles 400 error', () => {
    let errored = false;
    service.create({ designation: '' }).subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(400); } });
    httpMock.expectOne('/api/v1/composants').flush('bad', { status: 400, statusText: 'Bad Request' });
    expect(errored).toBeTrue();
  });

  it('search() handles 500 error', () => {
    let errored = false;
    service.search('x').subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(500); } });
    httpMock.expectOne((r) => r.url === '/api/v1/composants/search').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });
});