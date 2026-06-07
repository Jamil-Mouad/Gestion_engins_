import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

import { PneusTableTabComponent } from './pneus-table-tab.component';
import { Pneu } from '../../shared/models/pneu.model';

function makePneu(position: number, status: Pneu['status'] = 'ok'): Pneu {
  return {
    id: position,
    vehiculeId: 1,
    vehiculeCode: 'CAM-001',
    position,
    nSerie: `SN-${position}`,
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

describe('PneusTableTabComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LucideAngularModule.pick({})],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideToastr(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.match(() => true).forEach(r => r.flush([]));
    httpMock.verify();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads pneus on ngOnInit', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.ngOnInit();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([makePneu(1), makePneu(2)]);

    expect(comp.pneus().length).toBe(2);
    expect(comp.loading()).toBe(false);
  });

  it('sets loading=false on error', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('showAdd defaults to false', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);
    expect(fixture.componentInstance.showAdd()).toBe(false);
  });

  it('openEdit sets editTarget', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);

    const pneu = makePneu(1);
    comp.openEdit(pneu);
    expect(comp.editTarget()?.id).toBe(1);
  });

  it('openDelete sets deleteTarget', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);

    const pneu = makePneu(2);
    comp.openDelete(pneu);
    expect(comp.deleteTarget()?.position).toBe(2);
  });

  it('deleteTargetLabel returns formatted label', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);

    comp.deleteTarget.set(makePneu(1));
    expect(comp.deleteTargetLabel()).toContain('P1');
    expect(comp.deleteTargetLabel()).toContain('SN-1');
    expect(comp.deleteTargetLabel()).toContain('Michelin');
  });

  it('deleteTargetLabel returns empty string when deleteTarget is null', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);
    expect(fixture.componentInstance.deleteTargetLabel()).toBe('');
  });

  it('getStatusVariant returns "success" for ok', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);
    expect(fixture.componentInstance.getStatusVariant('ok')).toBe('success');
  });

  it('getStatusVariant returns "warning" for warn', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);
    expect(fixture.componentInstance.getStatusVariant('warn')).toBe('warning');
  });

  it('getStatusVariant returns "secondary" for empty', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);
    expect(fixture.componentInstance.getStatusVariant('empty')).toBe('secondary');
  });

  it('statusLabel returns correct labels', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    fixture.componentInstance.vehiculeId = 1;
    fixture.componentInstance.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    req.flush([]);
    const comp = fixture.componentInstance;
    expect(comp.statusLabel('ok')).toBe('OK');
    expect(comp.statusLabel('warn')).toBe('Avertissement');
    expect(comp.statusLabel('empty')).toBe('Vide');
  });

  it('onAdded closes add modal and reloads', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.ngOnInit();
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    initReq.flush([]);

    comp.showAdd.set(true);
    comp.onAdded();
    expect(comp.showAdd()).toBe(false);

    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    reloadReq.flush([makePneu(1)]);
    expect(comp.pneus().length).toBe(1);
  });

  it('onEdited clears editTarget and reloads', () => {
    const fixture = TestBed.createComponent(PneusTableTabComponent);
    const comp = fixture.componentInstance;
    comp.vehiculeId = 1;
    comp.ngOnInit();
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    initReq.flush([]);

    comp.editTarget.set(makePneu(1));
    comp.onEdited();
    expect(comp.editTarget()).toBeNull();

    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules/1/pneus');
    reloadReq.flush([]);
  });
});
