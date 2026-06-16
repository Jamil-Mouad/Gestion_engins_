import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { VehiculeService } from './vehicule.service';
import { Vehicule, VehiculeDetail, VehiculeType, VehiculeStatut } from '../../shared/models/vehicule.model';
import { Page } from '../../shared/models/pagination.model';

describe('VehiculeService', () => {
  let service: VehiculeService;
  let httpMock: HttpTestingController;

  const mockVehicule: Vehicule = {
    id: 1,
    code: 'CAM-001',
    type: 'camion',
    marque: 'Volvo',
    modele: 'FH16',
    matricule: 'A-123-456',
    nChassis: 'WVOLVO123456',
    annee: 2022,
    carburant: 'gasoil',
    statut: 'in-service',
    dateMiseService: '2022-01-15',
    photoUrl: null,
    actif: true,
    createdAt: '2022-01-15T00:00:00Z',
    updatedAt: '2022-01-15T00:00:00Z',
  };

  const mockPage: Page<Vehicule> = {
    content: [mockVehicule],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        VehiculeService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(VehiculeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('list() calls GET /api/v1/vehicules', () => {
    service.list().subscribe((page) => {
      expect(page.content.length).toBe(1);
      expect(page.content[0].code).toBe('CAM-001');
    });

    const req = httpMock.expectOne('/api/v1/vehicules');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('list() sends type and statut params', () => {
    service.list({ type: 'camion', statut: 'in-service' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    expect(req.request.params.get('type')).toBe('camion');
    expect(req.request.params.get('statut')).toBe('in-service');
    req.flush(mockPage);
  });

  it('get(id) calls GET /api/v1/vehicules/:id', () => {
    const mockDetail: VehiculeDetail = {
      ...mockVehicule,
      camionDetails: null,
      currentAttelage: null,
      configAxleSemi: null,
    };

    service.get(1).subscribe((detail) => {
      expect(detail.id).toBe(1);
      expect(detail.code).toBe('CAM-001');
    });

    const req = httpMock.expectOne('/api/v1/vehicules/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockDetail);
  });

  it('create() calls POST /api/v1/vehicules', () => {
    const form = {
      code: 'CAM-002',
      type: 'camion' as VehiculeType,
      marque: 'Scania',
      modele: 'R450',
      matricule: 'B-456-789',
      nChassis: '',
      annee: null,
      carburant: 'gasoil',
      statut: 'in-service' as VehiculeStatut,
      dateMiseService: null,
    };

    service.create(form).subscribe((v) => {
      expect(v.code).toBe('CAM-002');
    });

    const req = httpMock.expectOne('/api/v1/vehicules');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(form);
    req.flush({ ...mockVehicule, code: 'CAM-002' });
  });

  it('softDelete() calls DELETE /api/v1/vehicules/:id', () => {
    service.softDelete(1).subscribe();

    const req = httpMock.expectOne('/api/v1/vehicules/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('list() omits params when no filters provided (branch coverage)', () => {
    service.list({}).subscribe();
    const req = httpMock.expectOne('/api/v1/vehicules');
    expect(req.request.params.get('type')).toBeNull();
    expect(req.request.params.get('statut')).toBeNull();
    req.flush(mockPage);
  });

  it('list() handles 500 error', () => {
    let errored = false;
    service.list().subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(500); },
    });
    const req = httpMock.expectOne('/api/v1/vehicules');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('get() handles 404 error', () => {
    let errored = false;
    service.get(999).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(404); },
    });
    const req = httpMock.expectOne('/api/v1/vehicules/999');
    req.flush('not found', { status: 404, statusText: 'Not Found' });
    expect(errored).toBeTrue();
  });

  it('create() handles 400 error', () => {
    const form = {
      code: 'X',
      type: 'camion' as VehiculeType,
      marque: 'X',
      modele: 'X',
      matricule: 'X',
      nChassis: '',
      annee: null,
      carburant: 'gasoil',
      statut: 'in-service' as VehiculeStatut,
      dateMiseService: null,
    };
    let errored = false;
    service.create(form).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(400); },
    });
    const req = httpMock.expectOne('/api/v1/vehicules');
    req.flush({ message: 'bad' }, { status: 400, statusText: 'Bad Request' });
    expect(errored).toBeTrue();
  });

  it('update() calls PUT /api/v1/vehicules/:id', () => {
    service.update(1, { marque: 'Iveco' }).subscribe((v) => {
      expect(v.marque).toBe('Iveco');
    });
    const req = httpMock.expectOne('/api/v1/vehicules/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ marque: 'Iveco' });
    req.flush({ ...mockVehicule, marque: 'Iveco' });
  });

  it('update() handles 404 error', () => {
    let errored = false;
    service.update(999, { marque: 'X' }).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(404); },
    });
    const req = httpMock.expectOne('/api/v1/vehicules/999');
    req.flush('not found', { status: 404, statusText: 'Not Found' });
    expect(errored).toBeTrue();
  });

  it('softDelete() handles 404 error', () => {
    let errored = false;
    service.softDelete(999).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(404); },
    });
    const req = httpMock.expectOne('/api/v1/vehicules/999');
    req.flush('not found', { status: 404, statusText: 'Not Found' });
    expect(errored).toBeTrue();
  });
});