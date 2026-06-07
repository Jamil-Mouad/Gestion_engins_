import { provideHttpClient } from '@angular/common/http';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';

import { VehiculeDetailComponent } from './vehicule-detail.component';
import { VehiculeDetail } from '../../../shared/models/vehicule.model';

const mockVehiculeDetail: VehiculeDetail = {
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
  camionDetails: null,
  currentAttelage: null,
  configAxleSemi: null,
};

describe('VehiculeDetailComponent', () => {
  let httpMock: HttpTestingController;

  function createComponentWithId(id: string = '1') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id })),
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(VehiculeDetailComponent);
  }

  afterEach(() => {
    httpMock?.verify();
  });

  it('creates the component', () => {
    const fixture = createComponentWithId('1');
    const req = httpMock.expectOne('/api/v1/vehicules/1');
    req.flush(mockVehiculeDetail);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads vehicule via GET /api/v1/vehicules/:id on init', () => {
    const fixture = createComponentWithId('1');
    const component = fixture.componentInstance;

    const req = httpMock.expectOne('/api/v1/vehicules/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockVehiculeDetail);

    expect(component.vehicule()?.code).toBe('CAM-001');
    expect(component.loading()).toBe(false);
  });

  it('sets loading=false and vehicule=null when API returns 404', () => {
    const fixture = createComponentWithId('999');
    const component = fixture.componentInstance;

    const req = httpMock.expectOne('/api/v1/vehicules/999');
    req.flush('not found', { status: 404, statusText: 'Not Found' });

    expect(component.vehicule()).toBeNull();
    expect(component.loading()).toBe(false);
  });

  it('activeTabIndex defaults to 0', () => {
    const fixture = createComponentWithId('1');
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/vehicules/1');
    req.flush(mockVehiculeDetail);
    expect(component.activeTabIndex()).toBe(0);
  });

  it('showDelete and showEdit default to false', () => {
    const fixture = createComponentWithId('1');
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/vehicules/1');
    req.flush(mockVehiculeDetail);
    expect(component.showDelete()).toBe(false);
    expect(component.showEdit()).toBe(false);
  });

  it('tabDefs computed returns correct tabs for camion type', () => {
    const fixture = createComponentWithId('1');
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/vehicules/1');
    req.flush({ ...mockVehiculeDetail, type: 'camion' });

    expect(component.tabDefs().length).toBeGreaterThan(0);
    expect(component.isCamion()).toBe(true);
  });

  it('tabDefs computed returns correct tabs for non-camion type', () => {
    const fixture = createComponentWithId('1');
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/vehicules/1');
    req.flush({ ...mockVehiculeDetail, type: 'voiture' });

    expect(component.isCamion()).toBe(false);
  });
});
