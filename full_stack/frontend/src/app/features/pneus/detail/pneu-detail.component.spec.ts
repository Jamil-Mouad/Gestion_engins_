import { provideHttpClient } from '@angular/common/http';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { PneuDetailComponent } from './pneu-detail.component';
import { Pneu } from '../../../shared/models/pneu.model';

const mockPneu: Pneu = {
  id: 1,
  vehiculeId: 1,
  vehiculeCode: 'CAM-001',
  position: 1,
  nSerie: 'SN-001',
  marque: 'Michelin',
  dateMontage: '2025-01-01',
  kmMontage: 0,
  kmParcourus: 45000,
  expectedLifeKm: 150000,
  kmRestant: 105000,
  pressionPsi: 110,
  profondeur32e: 20,
  status: 'ok',
  actif: true,
};

describe('PneuDetailComponent', () => {
  let httpMock: HttpTestingController;

  function createWithId(id: string = '1') {
    TestBed.configureTestingModule({
      imports: [LucideAngularModule.pick({})],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id })),
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(PneuDetailComponent);
  }

  afterEach(() => {
    httpMock?.verify();
  });

  it('creates the component', () => {
    const fixture = createWithId('1');
    const req = httpMock.expectOne('/api/v1/pneus/1');
    req.flush(mockPneu);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads pneu via GET /api/v1/pneus/:id', () => {
    const fixture = createWithId('1');
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/pneus/1');
    req.flush(mockPneu);
    expect(component.pneu()?.id).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('sets loading=false and pneu=null when API returns 404', () => {
    const fixture = createWithId('999');
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/pneus/999');
    req.flush('not found', { status: 404, statusText: 'Not Found' });
    expect(component.pneu()).toBeNull();
    expect(component.loading()).toBe(false);
  });

  it('activeTab defaults to "overview"', () => {
    const fixture = createWithId('1');
    const req = httpMock.expectOne('/api/v1/pneus/1');
    req.flush(mockPneu);
    expect(fixture.componentInstance.activeTab()).toBe('overview');
  });

  it('breadcrumbItems computed includes pneu info after load', () => {
    const fixture = createWithId('1');
    const req = httpMock.expectOne('/api/v1/pneus/1');
    req.flush(mockPneu);
    const items = fixture.componentInstance.breadcrumbItems();
    expect(items.length).toBeGreaterThan(0);
  });

  it('sevType computed returns "success" for ok status', () => {
    const fixture = createWithId('1');
    const req = httpMock.expectOne('/api/v1/pneus/1');
    req.flush({ ...mockPneu, status: 'ok' });
    expect(fixture.componentInstance.sevType()).toBe('success');
  });

  it('sevType computed returns "warning" for warn status', () => {
    const fixture = createWithId('1');
    const req = httpMock.expectOne('/api/v1/pneus/1');
    req.flush({ ...mockPneu, status: 'warn' });
    expect(fixture.componentInstance.sevType()).toBe('warning');
  });

  it('sevType computed returns "critical" for empty status', () => {
    const fixture = createWithId('1');
    const req = httpMock.expectOne('/api/v1/pneus/1');
    req.flush({ ...mockPneu, status: 'empty' });
    expect(fixture.componentInstance.sevType()).toBe('critical');
  });

  it('specRows computed returns rows array', () => {
    const fixture = createWithId('1');
    const req = httpMock.expectOne('/api/v1/pneus/1');
    req.flush(mockPneu);
    const rows = fixture.componentInstance.specRows();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('stateRows computed returns state rows array', () => {
    const fixture = createWithId('1');
    const req = httpMock.expectOne('/api/v1/pneus/1');
    req.flush(mockPneu);
    const rows = fixture.componentInstance.stateRows();
    expect(Array.isArray(rows)).toBe(true);
  });

  it('showEdit defaults to false', () => {
    const fixture = createWithId('1');
    const req = httpMock.expectOne('/api/v1/pneus/1');
    req.flush(mockPneu);
    expect(fixture.componentInstance.showEdit()).toBe(false);
  });

  it('handles invalid id gracefully', () => {
    const fixture = createWithId('abc');
    expect(fixture.componentInstance.loading()).toBe(false);
  });
});
