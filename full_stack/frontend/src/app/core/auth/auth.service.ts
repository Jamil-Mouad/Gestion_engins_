import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, finalize, shareReplay } from 'rxjs/operators';
import { User, AuthResponse, RefreshResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = '/api/v1/auth';
  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isBootstrapping = signal(true);

  private inflightRefresh$: Observable<RefreshResponse> | null = null;

  constructor(private http: HttpClient) {
    this.rehydrate();
  }

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

  private rehydrate(): void {
    if (this.getStoredToken('access_token')) {
      this.getMe().pipe(
        finalize(() => this.isBootstrapping.set(false))
      ).subscribe({
        next: () => {},
        error: () => this.clearTokens()
      });
    } else {
      this.isBootstrapping.set(false);
    }
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

  refresh(): Observable<RefreshResponse> {
    if (this.inflightRefresh$) {
      return this.inflightRefresh$;
    }
    const refreshToken = this.getStoredToken('refresh_token');
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    const remember = this.isRemembered();
    this.inflightRefresh$ = this.http.post<RefreshResponse>(`${this.API}/refresh`, { refresh_token: refreshToken }).pipe(
      tap(res => {
        this.setStoredToken('access_token', res.access_token, remember);
      }),
      shareReplay(1),
      finalize(() => {
        this.inflightRefresh$ = null;
      })
    );
    return this.inflightRefresh$;
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.API}/logout`, {}).pipe(
      catchError(() => of(void 0)),
      finalize(() => this.clearTokens())
    );
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.API}/me`).pipe(
      tap(user => this.currentUser.set(user))
    );
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

  private storeTokens(res: AuthResponse, remember: boolean): void {
    this.setStoredToken('access_token', res.access_token, remember);
    this.setStoredToken('refresh_token', res.refresh_token, remember);
    this.currentUser.set(res.user);
  }

  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    this.currentUser.set(null);
  }
}
