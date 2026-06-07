import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { LucideAngularModule, Plus, Search, Truck, Download, Settings, Table2, LayoutGrid } from 'lucide-angular';

import { VehiculesListComponent } from './vehicules-list.component';
import { Vehicule } from '../../../shared/models/vehicule.model';
import { Page } from '../../../shared/models/pagination.model';

function makeVehicule(overrides: Partial<Vehicule> = {}): Vehicule {
  return {
    id: 1,
    code: 'CAM-001',
    type: 'camion',
    marque: 'Volvo',
    modele: 'FH16',
    matricule: '12345-A-1',
    nChassis: null,
    annee: 2020,
    carburant: 'diesel',
    statut: 'in-service',
    dateMiseService: '2020-01-01',
    photoUrl: null,
    actif: true,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2020-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('VehiculesListComponent', () => {
  let httpMock: HttpTestingController;

  const mockPage: Page<Vehicule> = {
    content: [makeVehicule({ id: 1 }), makeVehicule({ id: 2, code: 'CAM-002' })],
    page: 0,
    size: 20,
    totalElements: 2,
    totalPages: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LucideAngularModule.pick({ Plus, Search, Truck, Download, Settings, Table2, LayoutGrid })],
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
    httpMock.verify();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    req.flush(mockPage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads vehicules on init via GET /api/v1/vehicules', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);

    expect(component.vehicles().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('renders page header with "Véhicules" title', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Véhicules');
  });

  it('shows skeleton while loading', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    req.flush(mockPage);
  });

  it('sets loading to false on error', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    req.flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.loading()).toBe(false);
  });

  it('navigateToDetail() navigates to /vehicules/:id', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    req.flush(mockPage);

    component.navigateToDetail(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/vehicules', 1]);
  });

  it('shows empty state when no vehicles returned', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    req.flush({ ...mockPage, content: [], totalElements: 0 });
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-empty-state')).toBeTruthy();
  });

  it('showAddModal defaults to false', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    req.flush(mockPage);
    expect(component.showAddModal()).toBe(false);
  });

  it('onTypeFilter() triggers reload with type param', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    initReq.flush(mockPage);

    component.onTypeFilter('camion');
    const filterReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    expect(filterReq.request.params.get('type')).toBe('camion');
    filterReq.flush({ ...mockPage, content: [] });
  });

  it('onStatutFilter() triggers reload with statut param', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    initReq.flush(mockPage);

    component.onStatutFilter('in-service');
    const filterReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    expect(filterReq.request.params.get('statut')).toBe('in-service');
    filterReq.flush({ ...mockPage, content: [] });
  });

  it('onTypeFilter() changes typeFilter signal correctly', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    initReq.flush(mockPage);

    expect(component.typeFilter()).toBe('all');
    component.onTypeFilter('camion');
    expect(component.typeFilter()).toBe('camion');

    component.onTypeFilter('camion'); // toggle off
    expect(component.typeFilter()).toBe('all');

    // Both onTypeFilter calls may have triggered 1 or 2 requests (switchMap cancels prior)
    const pendingReqs = httpMock.match((r) => r.url === '/api/v1/vehicules');
    pendingReqs.forEach(r => r.flush(mockPage));
  });

  it('hasMore is false when totalElements equals loaded count', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    req.flush(mockPage);
    expect(component.hasMore()).toBe(false);
  });

  it('chargerPlus() triggers next page fetch', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const component = fixture.componentInstance;
    const bigPage = { ...mockPage, totalElements: 50 };
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    initReq.flush(bigPage);

    component.chargerPlus();
    const pageReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    expect(pageReq.request.params.get('page')).toBe('1');
    pageReq.flush({ ...mockPage, page: 1 });
  });

  it('onVehiculeAdded() reloads the list', () => {
    const fixture = TestBed.createComponent(VehiculesListComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    initReq.flush(mockPage);

    component.onVehiculeAdded(makeVehicule());
    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/vehicules');
    reloadReq.flush(mockPage);

    expect(component.vehicles().length).toBe(2);
  });
});
