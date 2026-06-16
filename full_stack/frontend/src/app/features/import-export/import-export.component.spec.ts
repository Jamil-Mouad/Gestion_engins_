import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import {
  LucideAngularModule,
  CircleAlert,
  CloudUpload,
  CircleCheck,
  TriangleAlert,
} from 'lucide-angular';

import { ImportExportComponent } from './import-export.component';
import { ImportsHistorique, ImportType } from '../../shared/models/import.model';
import { Page } from '../../shared/models/pagination.model';

describe('ImportExportComponent', () => {
  let httpMock: HttpTestingController;

  const mockHistorique: ImportsHistorique[] = [
    {
      id: 1,
      user: { id: 1, prenom: 'Admin', nom: 'System' },
      fichier: 'import_2026_05.xlsx',
      type: 'excel_general' as ImportType,
      lignesTotal: 150,
      lignesOk: 148,
      lignesErreur: 2,
      rapportUrl: '/reports/import_1.xlsx',
      createdAt: '2026-05-18T10:00:00Z',
    },
    {
      id: 2,
      user: null,
      fichier: null,
      type: 'releves_compteurs' as ImportType,
      lignesTotal: null,
      lignesOk: null,
      lignesErreur: null,
      rapportUrl: null,
      createdAt: '2026-05-17T08:00:00Z',
    },
  ];

  const mockPage: Page<ImportsHistorique> = {
    content: mockHistorique,
    page: 0,
    size: 20,
    totalElements: 2,
    totalPages: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        LucideAngularModule.pick({ CircleAlert, CloudUpload, CircleCheck, TriangleAlert }),
      ],
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
    const fixture = TestBed.createComponent(ImportExportComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    req.flush(mockPage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads historique on init via GET /api/v1/import/historique', () => {
    const fixture = TestBed.createComponent(ImportExportComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);

    expect(component.historique().length).toBe(2);
    expect(component.loadingHistorique()).toBe(false);
  });

  it('renders page header with title "Import"', () => {
    const fixture = TestBed.createComponent(ImportExportComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Import');
  });

  it('renders import card with dropzone', () => {
    const fixture = TestBed.createComponent(ImportExportComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Import Excel');
    expect(nativeEl.querySelector('app-dropzone')).toBeTruthy();
  });

  it('does not render export card', () => {
    const fixture = TestBed.createComponent(ImportExportComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).not.toContain('Export données');
  });

  it('renders historique section with table', () => {
    const fixture = TestBed.createComponent(ImportExportComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Historique des imports');
    expect(nativeEl.querySelector('app-historique-imports-table')).toBeTruthy();
  });

  it('shows skeleton while loading historique', () => {
    const fixture = TestBed.createComponent(ImportExportComponent);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    req.flush(mockPage);
  });

  it('sets loadingHistorique to false on error', () => {
    const fixture = TestBed.createComponent(ImportExportComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    req.error(new ProgressEvent('error'));

    expect(component.loadingHistorique()).toBe(false);
  });

  it('onFileSelected uploads file and reloads historique', () => {
    const fixture = TestBed.createComponent(ImportExportComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    initReq.flush(mockPage);
    fixture.detectChanges();

    const fakeFile = new File(['data'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    component.onFileSelected(fakeFile);

    expect(component.uploading()).toBe(true);

    const uploadReq = httpMock.expectOne((r) => r.url === '/api/v1/import/excel');
    expect(uploadReq.request.method).toBe('POST');
    uploadReq.flush({
      type: 'excel_general',
      fileName: 'test.xlsx',
      lignesTotal: 10,
      sampleRows: [],
      errors: [],
    });

    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    reloadReq.flush(mockPage);

    expect(component.uploading()).toBe(false);
  });

  it('onFileSelected sets uploadError on upload failure', () => {
    const fixture = TestBed.createComponent(ImportExportComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    initReq.flush(mockPage);
    fixture.detectChanges();

    const fakeFile = new File(['data'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    component.onFileSelected(fakeFile);

    const uploadReq = httpMock.expectOne((r) => r.url === '/api/v1/import/excel');
    uploadReq.error(new ProgressEvent('error'));

    expect(component.uploading()).toBe(false);
    expect(component.uploadError()).toContain('Erreur');
  });

  it('shows uploading indicator while in progress', () => {
    const fixture = TestBed.createComponent(ImportExportComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    initReq.flush(mockPage);
    fixture.detectChanges();

    const fakeFile = new File(['data'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    component.onFileSelected(fakeFile);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('.ie-status--loading')).toBeTruthy();

    const uploadReq = httpMock.expectOne((r) => r.url === '/api/v1/import/excel');
    uploadReq.flush({
      type: 'excel_general',
      fileName: 'test.xlsx',
      lignesTotal: 10,
      sampleRows: [],
      errors: [],
    });

    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    reloadReq.flush(mockPage);
  });

  it('shows upload error message', () => {
    const fixture = TestBed.createComponent(ImportExportComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/import/historique');
    initReq.flush(mockPage);
    fixture.detectChanges();

    const fakeFile = new File(['data'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    component.onFileSelected(fakeFile);

    const uploadReq = httpMock.expectOne((r) => r.url === '/api/v1/import/excel');
    uploadReq.error(new ProgressEvent('error'));
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('.ie-status--error')?.textContent).toContain('Erreur');
  });
});
