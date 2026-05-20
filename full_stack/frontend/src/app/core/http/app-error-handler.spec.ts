import { TestBed } from '@angular/core/testing';
import { AppErrorHandler } from './app-error-handler';
import { AuthService } from '../auth/auth.service';
import { ENVIRONMENT } from '../../../environments/environment.token';
import { signal, WritableSignal } from '@angular/core';
import { User } from '../../shared/models/user.model';

describe('AppErrorHandler', () => {
  let handler: AppErrorHandler;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const _user = signal(null);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['clearTokens', 'hasExpiredToken'], {
      user: _user.asReadonly(),
    });
  });

  it('logs to console.error in dev', () => {
    TestBed.configureTestingModule({
      providers: [
        AppErrorHandler,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ENVIRONMENT, useValue: { production: false, apiBase: '' } },
      ],
    });

    handler = TestBed.inject(AppErrorHandler);

    const consoleSpy = spyOn(console, 'error');
    handler.handleError(new Error('test error'));

    expect(consoleSpy).toHaveBeenCalledWith('[AppErrorHandler]', jasmine.any(Error));
  });

  it('POSTs to /api/v1/client-logs in production with correct payload fields', () => {
    TestBed.configureTestingModule({
      providers: [
        AppErrorHandler,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ENVIRONMENT, useValue: { production: true, apiBase: '' } },
      ],
    });

    handler = TestBed.inject(AppErrorHandler);

    const fetchSpy = spyOn(window, 'fetch').and.resolveTo({ ok: true } as Response);
    spyOn(console, 'error');

    handler.handleError(new Error('production error'));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/client-logs',
      jasmine.objectContaining({
        method: 'POST',
        headers: jasmine.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );

    const callArgs = fetchSpy.calls.mostRecent().args[1] as RequestInit;
    const body = JSON.parse(callArgs.body as string);
    expect(body.timestamp).toBeDefined();
    expect(body.url).toBeDefined();
    expect(body.message).toBe('production error');
    expect(body.user_agent).toBeDefined();
  });

  it('wraps non-Error values in an Error object (string input)', () => {
    TestBed.configureTestingModule({
      providers: [
        AppErrorHandler,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ENVIRONMENT, useValue: { production: false, apiBase: '' } },
      ],
    });
    handler = TestBed.inject(AppErrorHandler);
    const consoleSpy = spyOn(console, 'error');
    handler.handleError('string error message');
    expect(consoleSpy).toHaveBeenCalledWith('[AppErrorHandler]', jasmine.any(Error));
  });

  it('includes user_id in production log payload when user is authenticated', () => {
    const mockUser: User = { id: 42, email: 'test@intersig.ma', prenom: 'T', nom: 'U', role: 'USER', dashboardConfig: null, actif: true };
    const userSignal: WritableSignal<User | null> = signal(mockUser);
    const authSpyWithUser = jasmine.createSpyObj('AuthService', ['clearTokens', 'hasExpiredToken'], {
      user: userSignal.asReadonly(),
    });

    TestBed.configureTestingModule({
      providers: [
        AppErrorHandler,
        { provide: AuthService, useValue: authSpyWithUser },
        { provide: ENVIRONMENT, useValue: { production: true, apiBase: '' } },
      ],
    });
    handler = TestBed.inject(AppErrorHandler);
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo({ ok: true } as Response);
    spyOn(console, 'error');

    handler.handleError(new Error('test'));

    const callArgs = fetchSpy.calls.mostRecent().args[1] as RequestInit;
    const body = JSON.parse(callArgs.body as string);
    expect(body.user_id).toBe(42);
  });
});