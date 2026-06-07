import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, finalize, shareReplay, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User } from '../../shared/models/user.model';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

interface RefreshResponse {
  access_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = '/api/v1/auth';
  private readonly USER_CACHE_KEY = 'auth.user';
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isBootstrapping = signal(true);

  private refreshInFlight$: Observable<string> | null = null;
  private me$: Observable<User> | null = null;

  private getStoredToken(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  private setStoredToken(key: string, value: string, remember: boolean): void {
    if (remember) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  }

  private isRemembered(): boolean {
    return localStorage.getItem('access_token') !== null;
  }

  private loadCachedUser(): void {
    try {
      const raw = localStorage.getItem(this.USER_CACHE_KEY) ?? sessionStorage.getItem(this.USER_CACHE_KEY);
      if (raw) {
        this._user.set(JSON.parse(raw) as User);
      }
    } catch {
      // corrupt cache — ignore, /me will repopulate it
    }
  }

  private rehydrate(): void {
    if (!this.getStoredToken('access_token')) {
      this.isBootstrapping.set(false);
      return;
    }
    // Don't block the login page with a bootstrap round-trip
    if (window.location.pathname === '/login') {
      this.isBootstrapping.set(false);
      return;
    }
    // Restore the user object from storage so the top bar renders immediately on F5
    // before the async /auth/me round-trip completes.
    this.loadCachedUser();
    const source$ = this.hasExpiredToken()
      ? this.refresh().pipe(switchMap(() => this.getMe()))
      : this.getMe();
    source$.pipe(
      finalize(() => this.isBootstrapping.set(false))
    ).subscribe({
      next: () => {},
      // Only wipe tokens on a definitive auth failure (401/403).
      // Leave tokens intact for transient network errors so a hard-reload
      // during a backend blip doesn't log the user out.
      error: (err: HttpErrorResponse) => {
        if (err?.status === 401 || err?.status === 403) {
          this.clearTokens();
        }
        // Reset so the next call retries fresh instead of replaying the cached failure.
        this.me$ = null;
      },
    });
  }

  constructor() {
    this.rehydrate();
  }

  register(data: { prenom: string; nom: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/register`, data).pipe(
      tap(res => this.storeTokens(res, false))
    );
  }

  login(data: { email: string; password: string; remember?: boolean }): Observable<AuthResponse> {
    const remember = data.remember ?? false;
    return this.http.post<AuthResponse>(`${this.API}/login`, { email: data.email, password: data.password }).pipe(
      tap(res => this.storeTokens(res, remember))
    );
  }

  refresh(): Observable<string> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }
    const refreshToken = this.getStoredToken('refresh_token');
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    const remember = this.isRemembered();
    this.refreshInFlight$ = this.http.post<RefreshResponse>(`${this.API}/refresh`, { refresh_token: refreshToken }).pipe(
      tap(res => {
        this.setStoredToken('access_token', res.access_token, remember);
      }),
      map(res => res.access_token),
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.refreshInFlight$ = null;
      })
    );
    return this.refreshInFlight$;
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.API}/logout`, {}).pipe(
      catchError(() => of(void 0)),
      finalize(() => this.clearTokens())
    );
  }

  getMe(): Observable<User> {
    if (!this.me$) {
      this.me$ = this.http.get<User>(`${this.API}/me`).pipe(
        tap(user => this._user.set(user)),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.me$;
  }

  changePassword(data: { current_password: string; new_password: string }): Observable<void> {
    return this.http.put<void>(`${this.API}/me/password`, data);
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(`${this.API}/password-reset/request`, { email });
  }

  verifyPasswordReset(email: string, code: string): Observable<{ reset_token: string }> {
    return this.http.post<{ reset_token: string }>(`${this.API}/password-reset/verify`, { email, code });
  }

  confirmPasswordReset(data: { email: string; reset_token: string; new_password: string }): Observable<void> {
    return this.http.post<void>(`${this.API}/password-reset/confirm`, data);
  }

  hasStoredToken(): boolean {
    return this.getStoredToken('access_token') !== null;
  }

  hasExpiredToken(): boolean {
    const token = this.getStoredToken('access_token');
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (!exp) return true;
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  }

  private storeTokens(res: AuthResponse, remember: boolean): void {
    this.setStoredToken('access_token', res.access_token, remember);
    this.setStoredToken('refresh_token', res.refresh_token, remember);
    this.setStoredToken(this.USER_CACHE_KEY, JSON.stringify(res.user), remember);
    this._user.set(res.user);
  }

  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem(this.USER_CACHE_KEY);
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem(this.USER_CACHE_KEY);
    this._user.set(null);
    this.me$ = null;
  }
}