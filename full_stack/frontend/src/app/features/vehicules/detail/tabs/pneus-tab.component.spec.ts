import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SimpleChange } from '@angular/core';

import { PneusTabComponent } from './pneus-tab.component';
import { Pneu } from '../../../../shared/models/pneu.model';

function makePneu(position: number, status: Pneu['status'] = 'ok'): Pneu {
  return {
    id: position,
    vehiculeId: 1,
    vehiculeCode: 'CAM-001',
    position,
    nSerie: `SN-${position}`,
    reference: `REF-${position}`,
    marque: 'Michelin',
    dateMontage: '2025-01-01',
    kmMontage: 0,
    kmParcourus: 50000,
    expectedLifeKm: 150000,
    kmRestant: 100000,
    pressionPsi: 110,
    profondeur32e: 18,
    status,
    actif: true,
  };
}

describe('PneusTabComponent', () => {
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
    httpMock.match(() => true).forEach(r => r.flush([]));
    httpMock.verify();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.vehiculeType = 'camion';
    fixture.componentInstance.configAxle = '4x2';
    fixture.componentInstance.ngOnChanges({
      vehiculeId: new SimpleChange(undefined, 1, true),
    });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads tires via GET /api/v1/pneus?vehiculeId=1', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.vehiculeType = 'camion';
    comp.configAxle = '4x2';
    comp.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    expect(req.request.method).toBe('GET');
    req.flush([makePneu(1), makePneu(2)]);

    expect(comp.tires().length).toBe(2);
    expect(comp.loading()).toBe(false);
  });

  it('selectedPneu is null when no position selected', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([makePneu(1)]);
    expect(fixture.componentInstance.selectedPneu()).toBeNull();
  });

  it('selectedPneu returns tire at selected position', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([makePneu(1)]);
    comp.selectedPosition.set(1);
    expect(comp.selectedPneu()?.position).toBe(1);
  });

  it('showToggle is true for camion type (isCamionType)', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    fixture.componentInstance.vehiculeType = 'camion';
    expect(fixture.componentInstance.showToggle()).toBe(false); // camion is not camion_tracteur
  });

  it('showToggle is true for camion_tracteur type', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    fixture.componentInstance.vehiculeType = 'camion_tracteur';
    expect(fixture.componentInstance.showToggle()).toBe(true);
  });

  it('effectiveConfigAxle returns configAxle for tracteur partie', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    fixture.componentInstance.vehiculeType = 'camion';
    fixture.componentInstance.configAxle = '4x2';
    fixture.componentInstance.activePartie.set('tracteur');
    expect(fixture.componentInstance.effectiveConfigAxle()).toBe('4x2');
  });

  it('onTireClick toggles selected position', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([makePneu(1)]);

    comp.onTireClick(1);
    expect(comp.selectedPosition()).toBe(1);
    comp.onTireClick(1); // toggle off
    expect(comp.selectedPosition()).toBeNull();
  });

  it('openAjouter sets showAjouterModal to true', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);

    fixture.componentInstance.openAjouter();
    expect(fixture.componentInstance.showAjouterModal()).toBe(true);
  });

  it('openPermuter does nothing when no selectedPneu', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);

    fixture.componentInstance.openPermuter();
    expect(fixture.componentInstance.showPermuterModal()).toBe(false);
  });

  it('openRemplacer does nothing when no selectedPosition', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);

    fixture.componentInstance.openRemplacer();
    expect(fixture.componentInstance.showRemplacerModal()).toBe(false);
  });

  it('onModalSaved closes all modals and reloads', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    initReq.flush([]);

    comp.showPermuterModal.set(true);
    comp.showRemplacerModal.set(true);
    comp.showAjouterModal.set(true);
    comp.onModalSaved();

    expect(comp.showPermuterModal()).toBe(false);
    expect(comp.showRemplacerModal()).toBe(false);
    expect(comp.showAjouterModal()).toBe(false);

    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    reloadReq.flush([]);
  });

  it('setPartie reloads when partie changes', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.vehiculeType = 'camion_tracteur';
    comp.currentAttelage = { id: 1, tracteurId: 1, tracteurCode: 'CAM-001', semiId: 2, semiCode: 'SR-001', semiConfigAxle: '4x2', dateDebut: '2026-01-01', dateFin: null, actif: true, createdAt: '2026-01-01T00:00:00Z' };
    comp.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    initReq.flush([]);

    comp.setPartie('remorque');
    expect(comp.activePartie()).toBe('remorque');

    const remorqueReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/2/pneus');
    remorqueReq.flush([]);
  });

  it('resume computed returns correct summary', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.configAxle = '4x2';
    comp.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([makePneu(1, 'ok'), makePneu(2, 'warn')]);

    const resume = comp.resume();
    expect(resume.montees).toBe(2);
    expect(resume.alertes).toBe(1);
  });

  it('availablePositionsForPermuter excludes current selected pneu position', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([makePneu(1), makePneu(2), makePneu(3)]);

    comp.selectedPosition.set(1);
    const available = comp.availablePositionsForPermuter();
    expect(available).not.toContain(1);
    expect(available).toContain(2);
    expect(available).toContain(3);
  });

  it('emptyPositions excludes occupied positions', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.configAxle = '4x2';
    comp.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([makePneu(1), makePneu(2)]);

    const empty = comp.emptyPositions();
    expect(empty).not.toContain(1);
    expect(empty).not.toContain(2);
    expect(empty).toContain(3); // 4x2 has positions 1-4
  });

  it('exportFilterDefs includes the partie filter only for camion_tracteur', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.configAxle = '4x2';
    comp.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus').flush([]);

    comp.vehiculeType = 'camion';
    expect(comp.exportFilterDefs().map(f => f.key)).toEqual(['statut']);

    comp.vehiculeType = 'camion_tracteur';
    const defs = comp.exportFilterDefs();
    expect(defs.map(f => f.key)).toEqual(['partie', 'statut']);
    expect(defs[0].options.map(o => o.value)).toEqual(['camion_tracteur', 'semi_remorque']);
  });

  it('onExportConfirmed forwards the partie filter as vehiculeType', () => {
    const fixture = TestBed.createComponent(PneusTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.vehiculeType = 'camion_tracteur';
    comp.configAxle = '4x2';
    comp.ngOnChanges({ vehiculeId: new SimpleChange(undefined, 1, true) });
    httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus').flush([]);

    comp.onExportConfirmed({ columns: ['position'], filters: { partie: 'semi_remorque', statut: 'ok' } });

    const req = httpMock.expectOne((r) => r.url === '/api/v1/export/excel');
    expect(req.request.params.get('entites')).toBe('pneus');
    expect(req.request.params.get('vehiculeId')).toBe('1');
    expect(req.request.params.get('vehiculeType')).toBe('semi_remorque');
    expect(req.request.params.get('statut')).toBe('ok');
    req.flush(new Blob());
    expect(comp.exporting()).toBe(false);
  });
});
