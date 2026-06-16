import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { NotificationService } from './notification.service';
import { Notification, NotificationSeverite, NotificationCategorie } from '../../shared/models/notification.model';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  const mockNotification: Notification = {
    id: 1,
    user: { id: 1 },
    vehicule: { id: 1, code: 'CAM-001' },
    severite: 'warning' as NotificationSeverite,
    categorie: 'seuil_pneu' as NotificationCategorie,
    titre: 'Seuil pneu bas',
    detail: 'Le pneu avant gauche est en dessous du seuil.',
    targetScreen: '/pneus/1',
    targetId: 1,
    lu: false,
    dateLecture: null,
    emailEnvoye: false,
    createdAt: '2026-05-01T00:00:00Z',
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);

    // startPolling() defers via setTimeout(0) — wait one real tick then flush
    await new Promise(resolve => setTimeout(resolve, 0));
    const initReqs = httpMock.match('/api/v1/notifications/non-lues/count');
    initReqs.forEach(r => r.flush({ count: 0 }));
  });

  afterEach(() => {
    // drain any pending deferred count requests before verify
    httpMock.match('/api/v1/notifications/non-lues/count').forEach(r => r.flush({ count: 0 }));
    httpMock.verify();
  });

  it('list() calls GET /api/v1/notifications', () => {
    service.list().subscribe((page) => {
      expect(page.content.length).toBe(1);
      expect(page.content[0].titre).toBe('Seuil pneu bas');
    });

    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    expect(req.request.method).toBe('GET');
    req.flush({ content: [mockNotification], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  });

  it('list() sends lu and categorie params', () => {
    service.list({ lu: false, categorie: 'seuil_pneu' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    expect(req.request.params.get('lu')).toBe('false');
    expect(req.request.params.get('categorie')).toBe('seuil_pneu');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('marquerLu() calls PATCH /api/v1/notifications/:id/marquer-lue', () => {
    service.marquerLu(1).subscribe((n) => {
      expect(n.lu).toBe(true);
    });

    const req = httpMock.expectOne('/api/v1/notifications/1/marquer-lue');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockNotification, lu: true });
  });

  it('marquerToutLu() calls PATCH /api/v1/notifications/lire-tout', () => {
    service.marquerToutLu().subscribe((result) => {
      expect(result.count).toBe(7);
    });

    const req = httpMock.expectOne('/api/v1/notifications/lire-tout');
    expect(req.request.method).toBe('PATCH');
    req.flush({ count: 7 });
  });

  it('getUnreadCount() calls GET /api/v1/notifications/non-lues/count', () => {
    service.getUnreadCount().subscribe((result) => {
      expect(result.count).toBe(3);
    });

    const reqs = httpMock.match('/api/v1/notifications/non-lues/count');
    expect(reqs.length).toBeGreaterThanOrEqual(1);
    const testReq = reqs[reqs.length - 1];
    expect(testReq.request.method).toBe('GET');
    reqs.slice(0, -1).forEach(r => r.flush({ count: 0 }));
    testReq.flush({ count: 3 });
  });

  it('list() sends pagination params', () => {
    service.list({ page: 1, size: 50 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('50');
    req.flush({ content: [], page: 1, size: 50, totalElements: 0, totalPages: 0 });
  });

  it('list() handles 500 error', () => {
    let errored = false;
    service.list().subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(500); },
    });
    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('marquerLu() handles 404 error', () => {
    let errored = false;
    service.marquerLu(999).subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(404); },
    });
    const req = httpMock.expectOne('/api/v1/notifications/999/marquer-lue');
    req.flush('not found', { status: 404, statusText: 'Not Found' });
    expect(errored).toBeTrue();
  });

  it('marquerToutLu() handles 500 error', () => {
    let errored = false;
    service.marquerToutLu().subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(500); },
    });
    const req = httpMock.expectOne('/api/v1/notifications/lire-tout');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('getUnreadCount() handles 500 error', () => {
    let errored = false;
    service.getUnreadCount().subscribe({
      next: () => fail('expected error'),
      error: (err) => { errored = true; expect(err.status).toBe(500); },
    });
    const reqs = httpMock.match('/api/v1/notifications/non-lues/count');
    expect(reqs.length).toBeGreaterThanOrEqual(1);
    reqs.slice(0, -1).forEach(r => r.flush({ count: 0 }));
    reqs[reqs.length - 1].flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

});