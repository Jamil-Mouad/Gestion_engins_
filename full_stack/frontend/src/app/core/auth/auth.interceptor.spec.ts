import { HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { of, throwError, Subject, BehaviorSubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { User, RefreshResponse } from '../models/user.model';

describe('authInterceptor', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let refresh$: Subject<RefreshResponse>;

  beforeEach(() => {
    refresh$ = new Subject<RefreshResponse>();

    authServiceSpy = jasmine.createSpyObj('AuthService', ['refresh', 'clearTokens'], {
      currentUser: new BehaviorSubject<User | null>(null),
      isLoggedIn: new BehaviorSubject<boolean>(false),
    });

    authServiceSpy.refresh.and.returnValue(refresh$.asObservable());

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
        }
      });
    });

    refresh$.next({ access_token: newAccessToken });
    refresh$.complete();
  });

  it('should clear tokens and navigate to /login when refresh fails with 401', (done: DoneFn) => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'access_token') return 'expired-jwt';
      if (key === 'refresh_token') return 'bad-refresh-token';
      return null;
    });

    const handler: HttpHandlerFn = () => {
      return throwError(() => new HttpErrorResponse({ status: HttpStatusCode.Unauthorized }));
    };

    const req = new HttpRequest('GET', '/api/v1/auth/me');

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, handler).subscribe({
        error: () => {
          done.fail('Expected completion but got error');
        },
        complete: () => {
          expect(authServiceSpy.clearTokens).toHaveBeenCalled();
          done();
        }
      });
    });

    refresh$.error(new HttpErrorResponse({ status: HttpStatusCode.Unauthorized }));
  });
});