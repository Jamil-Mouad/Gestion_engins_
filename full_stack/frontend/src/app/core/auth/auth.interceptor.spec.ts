import { HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { of, throwError, Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['refresh', 'clearTokens', 'hasExpiredToken'], {
      user: signal(null) as any,
      isAuthenticated: signal(false) as any,
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
  });

  it('should add Authorization header with Bearer token from localStorage', () => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'access_token') return 'test-jwt-token';
      if (key === 'refresh_token') return 'test-refresh-token';
      return null;
    });

    let capturedAuth: string | null = null;

    const handler: HttpHandlerFn = (req) => {
      capturedAuth = req.headers.get('Authorization');
      return of({} as any);
    };

    const req = new HttpRequest('GET', '/api/v1/auth/me');

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, handler).subscribe();
    });

    expect(capturedAuth as unknown as string).toEqual('Bearer test-jwt-token');
  });

  it('should not add Authorization header when no access token exists', () => {
    spyOn(localStorage, 'getItem').and.returnValue(null);

    let capturedAuth: string | null = null;

    const handler: HttpHandlerFn = (req) => {
      capturedAuth = req.headers.get('Authorization');
      return of({} as any);
    };

    const req = new HttpRequest('GET', '/api/v1/auth/me');

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, handler).subscribe();
    });

    expect(capturedAuth).toBeNull();
  });

  it('should refresh token and retry on 401 response', (done: DoneFn) => {
    const newAccessToken = 'refreshed-jwt';
    let attempt = 0;

    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'access_token') return 'expired-jwt';
      if (key === 'refresh_token') return 'some-refresh-token';
      return null;
    });
    spyOn(localStorage, 'setItem');

    authServiceSpy.refresh.and.returnValue(of(newAccessToken));

    const handler: HttpHandlerFn = (req) => {
      attempt++;
      if (attempt === 1) {
        return throwError(() => new HttpErrorResponse({ status: HttpStatusCode.Unauthorized }));
      }
      expect(req.headers.get('Authorization')).toBe(`Bearer ${newAccessToken}`);
      return of({} as any);
    };

    const req = new HttpRequest('GET', '/api/v1/auth/me');

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, handler).subscribe({
        complete: () => {
          expect(authServiceSpy.refresh).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  it('should propagate error to caller when refresh fails (not force-navigate)', (done: DoneFn) => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'access_token') return 'expired-jwt';
      if (key === 'refresh_token') return 'bad-refresh-token';
      return null;
    });

    const refreshError = new HttpErrorResponse({ status: HttpStatusCode.Unauthorized });
    authServiceSpy.refresh.and.returnValue(throwError(() => refreshError));

    const handler: HttpHandlerFn = () => {
      return throwError(() => new HttpErrorResponse({ status: HttpStatusCode.Unauthorized }));
    };

    const req = new HttpRequest('GET', '/api/v1/test');

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, handler).subscribe({
        error: (err) => {
          // Interceptor propagates the error — caller (rehydrate / guard) decides what to do.
          expect(err).toBeDefined();
          expect(authServiceSpy.clearTokens).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  it('should not attach Authorization header to the refresh request itself', () => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'access_token') return 'stale-jwt';
      return null;
    });

    let capturedAuth: string | null = null;

    const handler: HttpHandlerFn = (req) => {
      capturedAuth = req.headers.get('Authorization');
      return of({} as any);
    };

    const refreshReq = new HttpRequest('POST', '/api/v1/auth/refresh', {});

    TestBed.runInInjectionContext(() => {
      authInterceptor(refreshReq, handler).subscribe();
    });

    expect(capturedAuth).toBeNull();
  });
});