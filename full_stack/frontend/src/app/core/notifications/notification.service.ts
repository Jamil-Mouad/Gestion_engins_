import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, interval, filter, switchMap, take, map, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Notification, NotificationCategorie } from '../../shared/models/notification.model';
import { Page } from '../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly API = '/api/v1/notifications';
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  unreadCount = signal<number>(0);

  constructor() {
    this.startPolling();
    this.listenVisibilityChange();
  }

  list(params?: { lu?: boolean; categorie?: NotificationCategorie; page?: number; size?: number }): Observable<Page<Notification>> {
    let httpParams = new HttpParams();
    if (params?.lu !== undefined) httpParams = httpParams.set('lu', params.lu.toString());
    if (params?.categorie) httpParams = httpParams.set('categorie', params.categorie);
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    return this.http.get<Page<Notification>>(this.API, { params: httpParams });
  }

  marquerLu(id: number): Observable<Notification> {
    return this.http.patch<Notification>(`${this.API}/${id}/marquer-lue`, {});
  }

  marquerToutLu(): Observable<{ count: number }> {
    return this.http.patch<{ count: number }>(`${this.API}/lire-tout`, {});
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.API}/non-lues/count`);
  }

  getRecentUnread(limit: number): Observable<Notification[]> {
    const params = new HttpParams().set('lu', 'false').set('size', limit.toString());
    return this.http.get<Page<Notification>>(this.API, { params }).pipe(
      map(page => page.content),
    );
  }

  private startPolling(): void {
    setTimeout(() => {
      interval(60_000).pipe(
        filter(() => !document.hidden),
        switchMap(() => this.getUnreadCount().pipe(
          catchError((err) => { console.error('[NotificationService] poll error', err); return of({ count: this.unreadCount() }); }),
        )),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe({
        next: (result) => this.unreadCount.set(result.count),
      });

      this.getUnreadCount().pipe(take(1)).subscribe({
        next: (result) => this.unreadCount.set(result.count),
        error: (err) => console.error('[NotificationService] initial fetch error', err),
      });
    }, 0);
  }

  private readonly handleVisibilityChange = (): void => {
    if (!document.hidden) {
      this.getUnreadCount().pipe(take(1)).subscribe({
        next: (result) => this.unreadCount.set(result.count),
        error: (err) => console.error('[NotificationService] visibility fetch error', err),
      });
    }
  };

  private listenVisibilityChange(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    });
  }
}