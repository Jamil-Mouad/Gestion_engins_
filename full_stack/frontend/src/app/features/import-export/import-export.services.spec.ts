import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ImportService } from './import.service';
import { ExportService } from './export.service';
import { ImportPreview, ImportType } from '../../shared/models/import.model';
import { Page } from '../../shared/models/pagination.model';
import { ImportsHistorique } from '../../shared/models/import.model';

describe('ImportService', () => {
  let service: ImportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ImportService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(ImportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('uploadExcel() calls POST /api/v1/import/excel with FormData', () => {
    const mockPreview: ImportPreview = {
      type: 'excel_general',
      fileName: 'test.xlsx',
      lignesTotal: 10,
      sampleRows: [],
      errors: [],
    };

    service.uploadExcel(new File([], 'test.xlsx'), 'excel_general').subscribe((preview) => {
      expect(preview.fileName).toBe('test.xlsx');
    });

    const req = httpMock.expectOne('/api/v1/import/excel');
    expect(req.request.method).toBe('POST');
    req.flush(mockPreview);
  });

  it('getHistorique() calls GET /api/v1/import/historique', () => {
    const mockPage: Page<ImportsHistorique> = {
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    };

    service.getHistorique().subscribe((page) => {
      expect(page.content.length).toBe(0);
    });

    const req = httpMock.expectOne('/api/v1/import/historique');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });
});

describe('ExportService', () => {
  let service: ExportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExportService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(ExportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('exportVehicules() calls GET /api/v1/export/vehicules with blob response', () => {
    service.exportVehicules({}).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/export/vehicules');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  });
});