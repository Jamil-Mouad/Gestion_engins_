import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.isBootstrapping).pipe(
    filter(isBootstrapping => !isBootstrapping),
    take(1),
    map(() => {
      if (auth.isAuthenticated()) {
        return true;
      }
      // Allow through when a valid (non-expired) token exists even if rehydration
      // failed transiently — the interceptor will attach the token and downstream
      // pages show their own error state; the interceptor's refresh logic handles 401.
      if (auth.hasStoredToken() && !auth.hasExpiredToken()) {
        return true;
      }
      void router.navigate(['/login'], { queryParams: { redirect: location.pathname } });
      return false;
    })
  );
};