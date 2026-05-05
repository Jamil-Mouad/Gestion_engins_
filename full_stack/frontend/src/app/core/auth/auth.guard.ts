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
      if (auth.isLoggedIn()) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};