import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { signal } from '@angular/core';

import { roleGuard } from './role.guard';
import { AuthService } from './auth.service';
import { User, UserRole } from '../../shared/models/user.model';

describe('roleGuard', () => {
  function setup(role: UserRole | null, hasValidToken = false) {
    const user = signal<User | null>(
      role ? ({ id: 1, prenom: 'T', nom: 'U', email: 't@u.ma', role } as User) : null);
    const authSpy = jasmine.createSpyObj('AuthService',
      ['hasStoredToken', 'hasExpiredToken'], {
        user: user.asReadonly(),
        isBootstrapping: signal(false),
      });
    authSpy.hasStoredToken.and.returnValue(hasValidToken);
    authSpy.hasExpiredToken.and.returnValue(!hasValidToken);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authSpy }],
    });
    return authSpy;
  }

  async function runGuard(allowed: UserRole[]): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() =>
      firstValueFrom(roleGuard(allowed)(null as never, null as never) as Observable<boolean | UrlTree>));
  }

  it('allows a user whose role is in the allowed list', async () => {
    setup('MAGASIN');
    expect(await runGuard(['MAGASIN', 'FLEET_MANAGER'])).toBeTrue();
  });

  it('always allows ADMIN', async () => {
    setup('ADMIN');
    expect(await runGuard(['MAGASIN'])).toBeTrue();
  });

  it('redirects an authenticated user with a disallowed role to /vehicules', async () => {
    setup('USER');
    const result = await runGuard(['MAGASIN']);
    expect(result instanceof UrlTree).toBeTrue();
    expect(result.toString()).toContain('/vehicules');
  });

  it('redirects an unauthenticated visitor to /login', async () => {
    setup(null, false);
    const result = await runGuard(['MAGASIN']);
    expect(result instanceof UrlTree).toBeTrue();
    expect(result.toString()).toContain('/login');
  });

  it('lets a valid token through during a rehydration blip', async () => {
    setup(null, true);
    expect(await runGuard(['MAGASIN'])).toBeTrue();
  });
});
