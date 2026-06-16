import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, firstValueFrom, throwError } from 'rxjs';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 1,
    email: 'test@intersig.ma',
    prenom: 'Test',
    nom: 'User',
    role: 'USER' as const,
    dashboardConfig: null,
    actif: true,
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('user signal starts as null', () => {
    expect(service.user()).toBeNull();
  });

  it('isAuthenticated returns false when no user', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('refresh() shares a single in-flight request for parallel 401s', async () => {
    localStorage.setItem('refresh_token', 'valid-refresh-token');
    localStorage.setItem('access_token', 'expired-token');

    const spiedPost = spyOn((service as any).http, 'post').and.returnValue(
      new Subject()
    );

    const result1 = service.refresh();
    const result2 = service.refresh();

    expect(spiedPost).toHaveBeenCalledTimes(1);

    spiedPost.calls.reset();
    localStorage.clear();
  });

  it('hasExpiredToken returns true when no token stored', () => {
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
    expect(service.hasExpiredToken()).toBeTrue();
  });

  it('hasExpiredToken returns true when token is expired', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }));
    const fakeToken = `${header}.${payload}.signature`;
    localStorage.setItem('access_token', fakeToken);
    expect(service.hasExpiredToken()).toBeTrue();
  });

  it('hasExpiredToken returns false when token is valid', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    const fakeToken = `${header}.${payload}.signature`;
    localStorage.setItem('access_token', fakeToken);
    expect(service.hasExpiredToken()).toBeFalse();
  });

  it('hasExpiredToken returns true on malformed token (catch branch)', () => {
    localStorage.setItem('access_token', 'not-a-jwt-token');
    expect(service.hasExpiredToken()).toBeTrue();
  });

  it('hasExpiredToken returns true when payload has no exp', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: 'user' }));
    const fakeToken = `${header}.${payload}.signature`;
    localStorage.setItem('access_token', fakeToken);
    expect(service.hasExpiredToken()).toBeTrue();
  });

  it('hasExpiredToken falls back to sessionStorage when localStorage empty', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    const fakeToken = `${header}.${payload}.signature`;
    sessionStorage.setItem('access_token', fakeToken);
    expect(service.hasExpiredToken()).toBeFalse();
  });

  it('clearTokens() clears both storages and user signal', () => {
    localStorage.setItem('access_token', 'a');
    localStorage.setItem('refresh_token', 'b');
    localStorage.setItem('auth.user', '{"id":1}');
    sessionStorage.setItem('access_token', 'c');
    sessionStorage.setItem('refresh_token', 'd');
    sessionStorage.setItem('auth.user', '{"id":2}');
    service.clearTokens();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('auth.user')).toBeNull();
    expect(sessionStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(sessionStorage.getItem('auth.user')).toBeNull();
    expect(service.user()).toBeNull();
  });

  it('refresh() returns error when no refresh token stored', (done) => {
    service.refresh().subscribe({
      next: () => fail('expected error'),
      error: (err) => {
        expect(err.message).toBe('No refresh token');
        done();
      },
    });
  });
});

describe('AuthService (rehydrate)', () => {
  // Helper to build a valid non-expired JWT-shaped token
  function makeValidToken(): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, sub: 'user' }));
    return `${header}.${payload}.signature`;
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('rehydrate() with no token sets isBootstrapping to false immediately', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const svc = TestBed.inject(AuthService);
    expect(svc.isBootstrapping()).toBeFalse();
  });

  it('rehydrate() with valid token calls /me and clears tokens on error', () => {
    localStorage.setItem('access_token', makeValidToken());
    localStorage.setItem('refresh_token', 'stored-refresh');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const svc = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);
    const req = httpMock.expectOne('/api/v1/auth/me');
    req.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(svc.isBootstrapping()).toBeFalse();
    expect(localStorage.getItem('access_token')).toBeNull();
    httpMock.verify();
  });

  it('rehydrate() with valid token calls /me and sets user on success', () => {
    localStorage.setItem('access_token', makeValidToken());
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const svc = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);
    const req = httpMock.expectOne('/api/v1/auth/me');
    req.flush({ id: 1, email: 'x@y.z', prenom: 'A', nom: 'B', role: 'USER', dashboardConfig: null, actif: true });
    expect(svc.user()?.email).toBe('x@y.z');
    expect(svc.isBootstrapping()).toBeFalse();
    httpMock.verify();
  });

  it('rehydrate() seeds user synchronously from cached auth.user when valid token present', () => {
    localStorage.setItem('access_token', makeValidToken());
    localStorage.setItem('auth.user', JSON.stringify({
      id: 99, email: 'cached@intersig.ma', prenom: 'Cached', nom: 'User',
      role: 'USER', dashboardConfig: null, actif: true,
    }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const svc = TestBed.inject(AuthService);
    // Top bar fix: isAuthenticated must be true immediately, before /me resolves
    expect(svc.isAuthenticated()).toBeTrue();
    expect(svc.user()?.email).toBe('cached@intersig.ma');

    // Clean up the in-flight /me request
    const httpMock = TestBed.inject(HttpTestingController);
    const req = httpMock.expectOne('/api/v1/auth/me');
    req.flush({ id: 99, email: 'cached@intersig.ma', prenom: 'Cached', nom: 'User', role: 'USER', dashboardConfig: null, actif: true });
    httpMock.verify();
  });

  it('rehydrate() keeps cached user when /me returns 500 (transient backend error)', () => {
    localStorage.setItem('access_token', makeValidToken());
    localStorage.setItem('auth.user', JSON.stringify({
      id: 99, email: 'cached@intersig.ma', prenom: 'Cached', nom: 'User',
      role: 'USER', dashboardConfig: null, actif: true,
    }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const svc = TestBed.inject(AuthService);
    expect(svc.isAuthenticated()).toBeTrue();

    const httpMock = TestBed.inject(HttpTestingController);
    const req = httpMock.expectOne('/api/v1/auth/me');
    req.flush('Internal server error', { status: 500, statusText: 'Server Error' });

    // 500 must not clear the user or tokens
    expect(svc.isAuthenticated()).toBeTrue();
    expect(svc.user()?.email).toBe('cached@intersig.ma');
    expect(localStorage.getItem('access_token')).not.toBeNull();
    httpMock.verify();
  });

  it('rehydrate() with expired token calls /refresh then /me', () => {
    // expired token (exp in the past)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600, sub: 'user' }));
    const expiredToken = `${header}.${payload}.signature`;
    localStorage.setItem('access_token', expiredToken);
    localStorage.setItem('refresh_token', 'stored-refresh');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const svc = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);

    // First request should be refresh
    const refreshReq = httpMock.expectOne('/api/v1/auth/refresh');
    expect(refreshReq.request.method).toBe('POST');
    refreshReq.flush({ access_token: 'new-at' });

    // Then /me
    const meReq = httpMock.expectOne('/api/v1/auth/me');
    meReq.flush({ id: 1, email: 'x@y.z', prenom: 'A', nom: 'B', role: 'USER', dashboardConfig: null, actif: true });

    expect(svc.user()?.email).toBe('x@y.z');
    expect(svc.isBootstrapping()).toBeFalse();
    httpMock.verify();
  });
});

describe('AuthService (HTTP)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('login(remember=true) stores tokens and user cache in localStorage', () => {
    service.login({ email: 'a@b.c', password: 'p', remember: true }).subscribe();
    const req = httpMock.expectOne('/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({
      access_token: 'at',
      refresh_token: 'rt',
      user: { id: 1, email: 'a@b.c', prenom: 'A', nom: 'B', role: 'USER', dashboardConfig: null, actif: true },
    });
    expect(localStorage.getItem('access_token')).toBe('at');
    expect(localStorage.getItem('auth.user')).toBeTruthy();
    expect(sessionStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('auth.user')).toBeNull();
  });

  it('login(remember=false) stores tokens and user cache in sessionStorage', () => {
    service.login({ email: 'a@b.c', password: 'p' }).subscribe();
    const req = httpMock.expectOne('/api/v1/auth/login');
    req.flush({
      access_token: 'at',
      refresh_token: 'rt',
      user: { id: 1, email: 'a@b.c', prenom: 'A', nom: 'B', role: 'USER', dashboardConfig: null, actif: true },
    });
    expect(sessionStorage.getItem('access_token')).toBe('at');
    expect(sessionStorage.getItem('auth.user')).toBeTruthy();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('auth.user')).toBeNull();
  });

  it('register() stores tokens and sets user', () => {
    service.register({ prenom: 'A', nom: 'B', email: 'a@b.c', password: 'p' }).subscribe();
    const req = httpMock.expectOne('/api/v1/auth/register');
    req.flush({
      access_token: 'at',
      refresh_token: 'rt',
      user: { id: 1, email: 'a@b.c', prenom: 'A', nom: 'B', role: 'USER', dashboardConfig: null, actif: true },
    });
    expect(service.user()?.email).toBe('a@b.c');
  });

  it('logout() clears tokens (success path)', () => {
    localStorage.setItem('access_token', 'a');
    service.logout().subscribe();
    const req = httpMock.expectOne('/api/v1/auth/logout');
    req.flush({});
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('logout() clears tokens even on error (catchError branch)', () => {
    localStorage.setItem('access_token', 'a');
    service.logout().subscribe();
    const req = httpMock.expectOne('/api/v1/auth/logout');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('refresh() uses sessionStorage when not remembered', () => {
    sessionStorage.setItem('refresh_token', 'rt-sess');
    service.refresh().subscribe();
    const req = httpMock.expectOne('/api/v1/auth/refresh');
    expect(req.request.body).toEqual({ refresh_token: 'rt-sess' });
    req.flush({ access_token: 'new-at' });
    expect(sessionStorage.getItem('access_token')).toBe('new-at');
  });

  it('refresh() stores new token in localStorage when remembered', () => {
    localStorage.setItem('refresh_token', 'rt-local');
    localStorage.setItem('access_token', 'old-at');
    service.refresh().subscribe();
    const req = httpMock.expectOne('/api/v1/auth/refresh');
    req.flush({ access_token: 'new-at' });
    expect(localStorage.getItem('access_token')).toBe('new-at');
  });

  it('changePassword() PUTs /api/v1/auth/me/password', () => {
    service.changePassword({ current_password: 'old', new_password: 'new' }).subscribe();
    const req = httpMock.expectOne('/api/v1/auth/me/password');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('requestPasswordReset() POSTs', () => {
    service.requestPasswordReset('x@y.z').subscribe();
    const req = httpMock.expectOne('/api/v1/auth/password-reset/request');
    expect(req.request.body).toEqual({ email: 'x@y.z' });
    req.flush({});
  });

  it('verifyPasswordReset() POSTs and returns token', () => {
    service.verifyPasswordReset('x@y.z', '123456').subscribe((res) => {
      expect(res.reset_token).toBe('rt-x');
    });
    const req = httpMock.expectOne('/api/v1/auth/password-reset/verify');
    req.flush({ reset_token: 'rt-x' });
  });

  it('confirmPasswordReset() POSTs', () => {
    service.confirmPasswordReset({ email: 'x@y.z', reset_token: 'rt', new_password: 'p' }).subscribe();
    const req = httpMock.expectOne('/api/v1/auth/password-reset/confirm');
    req.flush({});
  });
});