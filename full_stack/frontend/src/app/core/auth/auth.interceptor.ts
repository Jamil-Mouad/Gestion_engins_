import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

const getToken = (key: string): string | null =>
  localStorage.getItem(key) ?? sessionStorage.getItem(key);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isRefreshRequest = req.url.includes('/auth/refresh');
  const accessToken = getToken('access_token');

  // Never attach a stale access token to the refresh request itself —
  // the refresh endpoint authenticates via the refresh_token body field.
  let authReq = req;
  if (accessToken && !isRefreshRequest) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (!isRefreshRequest && error.status === 401 && getToken('refresh_token')) {
        return authService.refresh().pipe(
          switchMap((newToken) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` },
            });
            return next(retryReq);
          }),
          // Let the caller (rehydrate / guard) decide what to do on refresh failure
          catchError(() => throwError(() => error))
        );
      }
      return throwError(() => error);
    })
  );
};