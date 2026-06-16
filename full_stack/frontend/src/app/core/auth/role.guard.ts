import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { UserRole } from '../../shared/models/user.model';

/**
 * Restricts a route to the given roles. ADMIN always passes.
 * Mirrors authGuard's transient-failure policy: with a valid token but no
 * user yet (rehydration blip), the user is let through and the backend's
 * 403 takes over.
 */
export function roleGuard(allowed: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return toObservable(auth.isBootstrapping).pipe(
      filter(isBootstrapping => !isBootstrapping),
      take(1),
      map(() => {
        const user = auth.user();
        if (user) {
          if (user.role === 'ADMIN' || allowed.includes(user.role)) {
            return true;
          }
          return router.createUrlTree(['/vehicules']);
        }
        if (auth.hasStoredToken() && !auth.hasExpiredToken()) {
          return true;
        }
        return router.createUrlTree(['/login'], { queryParams: { redirect: location.pathname } });
      })
    );
  };
}
