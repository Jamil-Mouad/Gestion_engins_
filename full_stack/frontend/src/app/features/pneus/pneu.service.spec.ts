import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PneuService } from './pneu.service';
import { Pneu, PneuStatus, PneuInspection, InspectionActivity, InspectionForm } from '../../shared/models/pneu.model';

describe('PneuService', () => {
  let service: PneuService;
  let httpMock: HttpTestingController;

  const mockPneu: Pneu = {
    id: 1,
    vehicule: { id: 1, code: 'CAM-001' },
    position: 1,
    composant: { id: 11, designation: 'Pneu avant gauche' },
    nSerie: 'SN-2026-001',
    marque: 'Michelin',
    dateMontage: '2026-01-15',
    kmMontage: 0,
    kmParcourus: 15000,
    expectedLifeKm: 60000,
    kmRestant: 45000,
    pressionPsi: 110,
    profondeur32e: 28,
    status: 'ok' as PneuStatus,
    actif: true,
  };

  const mockInspection: PneuInspection = {
    id: 1,
    pneuId: 1,
    dateInspection: '2026-05-10',
    tireMeter: 15000,
    activity: 'Inspection' as InspectionActivity,
    user: { id: 1, prenom: 'Admin', nom: 'Fleet' },
    pressionPsi: 108,
    profondeur32e: 28,
    methode: 'Manuelle',
    notes: 'Bonne usure',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PneuService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(PneuService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listByVehicule(vehiculeId) calls GET /api/v1/vehicules/:id/pneus', () => {
    service.listByVehicule(1).subscribe((pneus: Pneu[]) => {
      expect(pneus.length).toBe(1);
      expect(pneus[0].marque).toBe('Michelin');
    });

    const req = httpMock.expectOne('/api/v1/vehicules/1/pneus');
    expect(req.request.method).toBe('GET');
    req.flush([mockPneu]);
  });

  it('get(id) calls GET /api/v1/pneus/:id', () => {
    service.get(1).subscribe((pneu: Pneu) => {
      expect(pneu.id).toBe(1);
      expect(pneu.nSerie).toBe('SN-2026-001');
    });

    const req = httpMock.expectOne('/api/v1/pneus/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockPneu);
  });

  it('getInspections(id) calls GET /api/v1/pneus/:id/inspections', () => {
    service.getInspections(1).subscribe((inspections: PneuInspection[]) => {
      expect(inspections.length).toBe(1);
      expect(inspections[0].activity).toBe('Inspection');
    });

    const req = httpMock.expectOne('/api/v1/pneus/1/inspections');
    expect(req.request.method).toBe('GET');
    req.flush([mockInspection]);
  });

  it('listByVehicule() handles 500 error', () => {
    let errored = false;
    service.listByVehicule(1).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(500); },
    });
    const req = httpMock.expectOne('/api/v1/vehicules/1/pneus');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('get() handles 404 error', () => {
    let errored = false;
    service.get(999).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(404); },
    });
    const req = httpMock.expectOne('/api/v1/pneus/999');
    req.flush('not found', { status: 404, statusText: 'Not Found' });
    expect(errored).toBeTrue();
  });

  it('getInspections() handles 500 error', () => {
    let errored = false;
    service.getInspections(1).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(500); },
    });
    const req = httpMock.expectOne('/api/v1/pneus/1/inspections');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('createInspection(pneuId, form) calls POST /api/v1/pneus/:id/inspections', () => {
    const form: InspectionForm = {
      activity: 'Inspection' as InspectionActivity,
      dateInspection: '2026-05-10',
      pressionPsi: 108,
      profondeur32e: 28,
      methode: 'Manuelle',
      notes: 'Bonne usure',
    };

    service.createInspection(1, form).subscribe((inspection: PneuInspection) => {
      expect(inspection.activity).toBe('Inspection');
    });

    const req = httpMock.expectOne('/api/v1/pneus/1/inspections');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(form);
    req.flush(mockInspection);
  });

  it('createInspection() handles 400 error', () => {
    const form: InspectionForm = {
      activity: 'Inspection' as InspectionActivity,
      dateInspection: '2026-05-10',
      pressionPsi: 0,
      profondeur32e: 0,
      methode: 'Manuelle',
      notes: '',
    };
    let errored = false;
    service.createInspection(1, form).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(400); },
    });
    const req = httpMock.expectOne('/api/v1/pneus/1/inspections');
    req.flush({ message: 'bad' }, { status: 400, statusText: 'Bad Request' });
    expect(errored).toBeTrue();
  });
});