import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { NotificationsComponent } from './notifications.component';
import { Notification } from '../../shared/models/notification.model';
import { Page } from '../../shared/models/pagination.model';

describe('NotificationsComponent', () => {
  let httpMock: HttpTestingController;

  const mockNotifications: Notification[] = [
    {
      id: 1,
      user: { id: 1 },
      vehicule: { id: 1, code: 'CAM-001' },
      severite: 'critical',
      categorie: 'seuil_pneu',
      titre: 'Seuil pneu dépassé',
      detail: 'Pression basse détectée',
      targetScreen: null,
      targetId: null,
      lu: false,
      dateLecture: null,
      emailEnvoye: false,
      createdAt: '2026-05-19T10:00:00Z',
    },
    {
      id: 2,
      user: { id: 1 },
      vehicule: null,
      severite: 'info',
      categorie: 'systeme',
      titre: 'Mise à jour système',
      detail: null,
      targetScreen: null,
      targetId: null,
      lu: true,
      dateLecture: '2026-05-19T12:00:00Z',
      emailEnvoye: true,
      createdAt: '2026-05-18T08:00:00Z',
    },
    {
      id: 3,
      user: { id: 1 },
      vehicule: { id: 2, code: 'CAM-002' },
      severite: 'warning',
      categorie: 'seuil_nbh',
      titre: 'Compteur élevé',
      detail: 'Intervention recommandée',
      targetScreen: null,
      targetId: null,
      lu: false,
      dateLecture: null,
      emailEnvoye: false,
      createdAt: '2026-05-20T14:00:00Z',
    },
  ];

  const mockPage: Page<Notification> = {
    content: mockNotifications,
    page: 0,
    size: 20,
    totalElements: 3,
    totalPages: 1,
  };

  /** Flush any pending unread-count polling requests from NotificationService constructor. */
  function flushUnreadCount(): void {
    const countReqs = httpMock.match((r) => r.url === '/api/v1/notifications/non-lues/count');
    countReqs.forEach((req) => req.flush({ count: 0 }));
  }

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
    flushUnreadCount();
    httpMock.verify();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    req.flush(mockPage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads notifications on init via GET /api/v1/notifications', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);

    expect(component.notifications().length).toBe(3);
    expect(component.loading()).toBe(false);
  });

  it('renders notification titles', fakeAsync(() => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    req.flush(mockPage);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Seuil pneu dépassé');
    expect(nativeEl.textContent).toContain('Mise à jour système');
    flush();
  }));

  it('renders notification detail when present', fakeAsync(() => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    req.flush(mockPage);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const details = nativeEl.querySelectorAll('.notifications__detail');
    expect(details.length).toBe(2);
    flush();
  }));

  it('shows empty state when no notifications', () => {
    const emptyPage: Page<Notification> = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
    const fixture = TestBed.createComponent(NotificationsComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    req.flush(emptyPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('.notifications__empty')?.textContent).toContain('Aucune notification');
  });

  it('renders tabs for filtering', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const tabs = nativeEl.querySelectorAll('.notifications__tab');
    expect(tabs.length).toBe(4);
    expect(tabs[0].textContent).toContain('Tous');
    expect(tabs[1].textContent).toContain('Non lues');
    expect(tabs[2].textContent).toContain('Seuils');
    expect(tabs[3].textContent).toContain('Système');
  });

  it('setTab reloads with correct params for unread', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    initReq.flush(mockPage);

    component.setTab('unread');

    const tabReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    expect(tabReq.request.params.get('lu')).toBe('false');
    tabReq.flush(mockPage);

    expect(component.activeTab()).toBe('unread');
  });

  it('setTab reloads with correct params for seuils', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    initReq.flush(mockPage);

    component.setTab('seuils');

    const tabReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    expect(tabReq.request.params.get('categorie')).toBe('seuil_pneu');
    tabReq.flush(mockPage);

    expect(component.activeTab()).toBe('seuils');
  });

  it('setTab reloads with correct params for systeme', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    initReq.flush(mockPage);

    component.setTab('systeme');

    const tabReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    expect(tabReq.request.params.get('categorie')).toBe('systeme');
    tabReq.flush(mockPage);

    expect(component.activeTab()).toBe('systeme');
  });

  it('markAllRead calls PATCH /api/v1/notifications/lire-tout and reloads', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    initReq.flush(mockPage);

    component.markAllRead();

    const markReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications/lire-tout');
    expect(markReq.request.method).toBe('PATCH');
    markReq.flush({ count: 2 });

    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    reloadReq.flush(mockPage);

    expect(component.markingAll()).toBe(false);
    expect(component.notifications().length).toBe(3);
  });

  it('markAllRead handles error', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const component = fixture.componentInstance;

    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    initReq.flush(mockPage);

    component.markAllRead();

    const markReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications/lire-tout');
    markReq.error(new ProgressEvent('error'));

    expect(component.markingAll()).toBe(false);
  });

  it('getSeveriteVariant maps severities correctly', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    initReq.flush(mockPage);

    expect(component.getSeveriteVariant('critical')).toBe('danger');
    expect(component.getSeveriteVariant('warning')).toBe('warning');
    expect(component.getSeveriteVariant('success')).toBe('success');
    expect(component.getSeveriteVariant('info')).toBe('info');
    expect(component.getSeveriteVariant('unknown')).toBe('info');
  });

  it('shows skeleton while loading', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    req.flush(mockPage);
  });

  it('renders mark all read button', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');
    req.flush(mockPage);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const btn = nativeEl.querySelector('.notifications__mark-all');
    expect(btn?.textContent).toContain('Tout marquer lu');
  });
});
