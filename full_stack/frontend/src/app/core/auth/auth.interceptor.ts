import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError, switchMap, throwError, EMPTY } from 'rxjs';

const getToken = (key: string): string | null =>
  localStorage.getItem(key) ?? sessionStorage.getItem(key);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isRefreshRequest = req.url.includes('/auth/refresh');
  const accessToken = getToken('access_token');

  let authReq = req;
  if (accessToken) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (!isRefreshRequest && error.status === 401 && getToken('refresh_token')) {
        return authService.refresh().pipe(
          switchMap((res) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.access_token}` },
            });
            return next(retryReq);
          }),
          catchError(() => {
            authService.clearTokens();
            router.navigate(['/login']);
            return EMPTY;
          })
        );
      }
      return throwError(() => error);
    })
  );
};