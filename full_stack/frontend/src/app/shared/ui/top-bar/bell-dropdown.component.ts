import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Notification } from '../../../shared/models/notification.model';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-bell-dropdown',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bell-dropdown">
      <button class="bell-dropdown__trigger" (click)="open.set(!open())" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        @if (unreadCount > 0) {
          <span class="bell-dropdown__badge">{{ unreadCount }}</span>
        }
      </button>

      @if (open()) {
        <div class="bell-dropdown__panel">
          <div class="bell-dropdown__header">
            <span class="bell-dropdown__title">Notifications</span>
            <a routerLink="/notifications" class="bell-dropdown__link" (click)="open.set(false)">Voir les notifications</a>
          </div>
          <div class="bell-dropdown__list">
            @for (notif of notifications(); track notif.id) {
              <div class="bell-dropdown__item" [class.bell-dropdown__item--unread]="!notif.lu">
                <span class="bell-dropdown__item-title">{{ notif.titre }}</span>
                <span class="bell-dropdown__item-detail">{{ notif.detail }}</span>
              </div>
            } @empty {
              <div class="bell-dropdown__empty">Aucune notification</div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .bell-dropdown { position: relative; }
    .bell-dropdown__trigger {
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted);
      position: relative;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .bell-dropdown__trigger:hover { color: var(--color-primary); }
    .bell-dropdown__badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--color-danger);
      color: #fff;
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 700;
      border-radius: 50%;
      min-width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }
    .bell-dropdown__panel {
      position: absolute;
      top: 44px;
      right: 0;
      width: 320px;
      max-height: 360px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      z-index: 300;
      overflow: hidden;
    }
    .bell-dropdown__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border);
    }
    .bell-dropdown__title {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text);
    }
    .bell-dropdown__link {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: var(--color-primary);
      text-decoration: none;
    }
    .bell-dropdown__link:hover { text-decoration: underline; }
    .bell-dropdown__list { overflow-y: auto; max-height: 300px; }
    .bell-dropdown__item {
      padding: 10px 16px;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    .bell-dropdown__item--unread { background: var(--color-primary-soft); }
    .bell-dropdown__item-title {
      display: block;
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text);
    }
    .bell-dropdown__item-detail {
      display: block;
      font-family: 'Open Sans', sans-serif;
      font-size: 11px;
      color: var(--color-text-muted);
    }
    .bell-dropdown__empty {
      padding: 24px;
      text-align: center;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text-muted);
    }
  `],
})
export class BellDropdownComponent {
  private notificationService = inject(NotificationService);

  @Input() unreadCount = 0;
  notifications = toSignal(
    this.notificationService.getRecentUnread(5),
    { initialValue: [] as Notification[] },
  );
  open = signal(false);
}