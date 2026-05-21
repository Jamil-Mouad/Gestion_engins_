import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Notification } from '../../../../shared/models/notification.model';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-notifications-recap-widget',
  standalone: true,
  imports: [CommonModule, DateFrPipe, RouterLink, CardComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-card title="Notifications récentes">
      @if (loading()) {
        <app-skeleton [rows]="3" height="24px" />
      } @else if (notifications().length > 0) {
        <div class="notif-list">
          @for (n of notifications(); track n.id) {
            <div class="notif-item" [class.notif-item--unread]="!n.lu">
              <span class="notif-item__message">{{ n.titre }}</span>
              <span class="notif-item__date">{{ n.createdAt | dateFr:'short' }}</span>
            </div>
          }
        </div>
        <a routerLink="/notifications" class="notif-list__link">Tout afficher</a>
      } @else {
        <app-empty-state message="Aucune notification non lue" />
      }
    </app-card>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    app-card { height: 100%; }
    .notif-list { display: flex; flex-direction: column; gap: 8px; }
    .notif-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--color-border); }
    .notif-item--unread { font-weight: 600; }
    .notif-item__message { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .notif-item__date { font-family: 'Open Sans', sans-serif; font-size: 11px; color: var(--color-text-muted); margin-left: 8px; white-space: nowrap; }
    .notif-list__link { display: block; margin-top: 8px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-primary); text-decoration: none; }
    .notif-list__link:hover { text-decoration: underline; }
  `],
})
export class NotificationsRecapWidgetComponent {
  private notificationService = inject(NotificationService);

  notifications = signal<Notification[]>([]);
  loading = signal(true);

  constructor() {
    this.notificationService.getRecentUnread(3).pipe(
      takeUntilDestroyed(),
    ).subscribe({
      next: (data) => {
        this.notifications.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}