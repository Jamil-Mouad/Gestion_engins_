import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        toastr.error('Connexion perdue — vérifiez votre réseau.', undefined, {
          disableTimeOut: true,
          tapToDismiss: true,
        });
        return throwError(() => error);
      }

      const backendMsg: string | null =
        (error.error as { message?: string; error?: string } | null)?.message
          ?? (error.error as { message?: string; error?: string } | null)?.error
          ?? null;

      const staticMessages: Record<number, string> = {
        403: 'Accès refusé.',
        404: 'Ressource introuvable.',
      };

      const message =
        backendMsg
          ?? staticMessages[error.status]
          ?? (error.status >= 500 ? 'Erreur serveur — réessayez dans quelques instants.' : null);

      if (message) {
        toastr.error(message);
      }

      return throwError(() => error);
    })
  );
};