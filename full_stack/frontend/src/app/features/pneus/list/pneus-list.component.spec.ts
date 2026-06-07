import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { PneusListComponent } from './pneus-list.component';
import { Pneu } from '../../../shared/models/pneu.model';

describe('PneusListComponent', () => {
  let httpMock: HttpTestingController;

  const mockPneus: Pneu[] = [
    {
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
    },
    {
      id: 2,
      vehiculeId: 2,
      vehiculeCode: 'CAM-002',
      position: 2,
      nSerie: 'SN-002',
      marque: 'Bridgestone',
      dateMontage: '2024-01-01',
      kmMontage: 50000,
      kmParcourus: 130000,
      expectedLifeKm: 150000,
      kmRestant: 20000,
      pressionPsi: 110,
      profondeur32e: 8,
      status: 'warn',
      actif: true,
    },
  ];

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
    httpMock.verify();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(PneusListComponent);
    const req = httpMock.expectOne('/api/v1/pneus');
    req.flush(mockPneus);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads pneus on init via GET /api/v1/pneus', () => {
    const fixture = TestBed.createComponent(PneusListComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne('/api/v1/pneus');
    expect(req.request.method).toBe('GET');
    req.flush(mockPneus);

    expect(component.pneus().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('renders page header with "Gestion des pneus" title', () => {
    const fixture = TestBed.createComponent(PneusListComponent);
    const req = httpMock.expectOne('/api/v1/pneus');
    req.flush(mockPneus);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Gestion des pneus');
  });

  it('renders table rows for each pneu', () => {
    const fixture = TestBed.createComponent(PneusListComponent);
    const req = httpMock.expectOne('/api/v1/pneus');
    req.flush(mockPneus);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const rows = nativeEl.querySelectorAll('app-data-table-row');
    expect(rows.length).toBe(2);
  });

  it('shows empty state when no pneus', () => {
    const fixture = TestBed.createComponent(PneusListComponent);
    const req = httpMock.expectOne('/api/v1/pneus');
    req.flush([]);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-empty-state')).toBeTruthy();
  });

  it('shows skeleton while loading', () => {
    const fixture = TestBed.createComponent(PneusListComponent);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();

    const req = httpMock.expectOne('/api/v1/pneus');
    req.flush(mockPneus);
  });

  it('sets loading to false on error', () => {
    const fixture = TestBed.createComponent(PneusListComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne('/api/v1/pneus');
    req.flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.loading()).toBe(false);
  });

  it('navigateToDetail() navigates to /pneus/:id', () => {
    const fixture = TestBed.createComponent(PneusListComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    const req = httpMock.expectOne('/api/v1/pneus');
    req.flush(mockPneus);

    component.navigateToDetail(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/pneus', 1]);
  });

  it('displays vehicle codes in the table', () => {
    const fixture = TestBed.createComponent(PneusListComponent);
    const req = httpMock.expectOne('/api/v1/pneus');
    req.flush(mockPneus);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('CAM-001');
    expect(nativeEl.textContent).toContain('CAM-002');
  });
});
