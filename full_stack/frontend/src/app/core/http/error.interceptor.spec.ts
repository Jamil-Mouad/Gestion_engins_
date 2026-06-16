import { TestBed } from '@angular/core/testing';
import { HttpHandlerFn, HttpRequest, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { provideRouter } from '@angular/router';

import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  beforeEach(() => {
    toastrSpy = jasmine.createSpyObj('ToastrService', ['error', 'warning', 'info']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ToastrService, useValue: toastrSpy },
        provideRouter([]),
      ],
    });
  });

  // ── status 0 ─────────────────────────────────────────────────────────────

  it('status 0 (offline) shows persistent "Connexion perdue" toast', (done: DoneFn) => {
    const handler: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: 0 }));

    const req = new HttpRequest('GET', '/api/v1/test');

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, handler).subscribe({
        error: () => {
          expect(toastrSpy.error).toHaveBeenCalledWith(
            'Connexion perdue — vérifiez votre réseau.',
            undefined,
            jasmine.objectContaining({ disableTimeOut: true, tapToDismiss: true })
          );
          done();
        },
      });
    });
  });

  // ── static fallback messages ──────────────────────────────────────────────

  it('403 with no backend body shows static "Accès refusé." toast', (done: DoneFn) => {
    const handler: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: HttpStatusCode.Forbidden }));

    const req = new HttpRequest('GET', '/api/v1/test');

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, handler).subscribe({
        error: () => {
          expect(toastrSpy.error).toHaveBeenCalledWith('Accès refusé.');
          done();
        },
      });
    });
  });

  it('404 with no backend body shows static "Ressource introuvable." toast', (done: DoneFn) => {
    const handler: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: HttpStatusCode.NotFound }));

    const req = new HttpRequest('GET', '/api/v1/test');

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, handler).subscribe({
        error: () => {
          expect(toastrSpy.error).toHaveBeenCalledWith('Ressource introuvable.');
          done();
        },
      });
    });
  });

  it('5xx with no backend body shows "Erreur serveur" toast', (done: DoneFn) => {
    const handler: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: 500 }));

    const req = new HttpRequest('GET', '/api/v1/test');

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, handler).subscribe({
        error: () => {
          expect(toastrSpy.error).toHaveBeenCalledWith(
            'Erreur serveur — réessayez dans quelques instants.'
          );
          done();
        },
      });
    });
  });

  // ── M2: backend error field surfacing (FR-005) ────────────────────────────

  it('404 with backend { message } prefers that message over static fallback', (done: DoneFn) => {
    const handler: HttpHandlerFn = () =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: HttpStatusCode.NotFound,
            error: { message: 'Véhicule introuvable.' },
          })
      );

    const req = new HttpRequest('GET', '/api/v1/vehicles/999');

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, handler).subscribe({
        error: () => {
          expect(toastrSpy.error).toHaveBeenCalledWith('Véhicule introuvable.');
          done();
        },
      });
    });
  });

  it('403 with backend { error } prefers that message over static fallback', (done: DoneFn) => {
    const handler: HttpHandlerFn = () =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: HttpStatusCode.Forbidden,
            error: { error: 'Accès non autorisé.' },
          })
      );

    const req = new HttpRequest('GET', '/api/v1/admin');

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, handler).subscribe({
        error: () => {
          expect(toastrSpy.error).toHaveBeenCalledWith('Accès non autorisé.');
          done();
        },
      });
    });
  });

  it('500 with no backend body shows static "Erreur serveur" message', (done: DoneFn) => {
    const handler: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: 500 }));

    const req = new HttpRequest('GET', '/api/v1/vehicles');

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, handler).subscribe({
        error: () => {
          expect(toastrSpy.error).toHaveBeenCalledWith(
            'Erreur serveur — réessayez dans quelques instants.'
          );
          done();
        },
      });
    });
  });

  it('401 is NOT handled by errorInterceptor — no toast is shown', (done: DoneFn) => {
    const handler: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: HttpStatusCode.Unauthorized }));

    const req = new HttpRequest('GET', '/api/v1/test');

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, handler).subscribe({
        error: () => {
          expect(toastrSpy.error).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
