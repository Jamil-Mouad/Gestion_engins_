import { Component, inject, signal, computed } from '@angular/core';
import { NotificationService } from '../../core/notifications/notification.service';
import { Notification, NotificationCategorie } from '../../shared/models/notification.model';
import {
  PageHeaderComponent,
  FilterChipComponent,
  SkeletonComponent,
  EmptyStateComponent,
} from '../../shared/ui';

type NotificationTab = 'all' | 'unread' | 'seuils' | 'systeme';

interface SevConfig {
  bg: string;
  iconColor: string;
  icon: string;
}

const SEV_CFG: Record<string, SevConfig> = {
  critical: { bg: '#FEE2E2', iconColor: '#EF4444', icon: '⚠' },
  warning:  { bg: '#FEF3C7', iconColor: '#F59E0B', icon: '⚠' },
  info:     { bg: '#DBEAFE', iconColor: '#3B82F6', icon: 'ℹ' },
  success:  { bg: '#D1FAE5', iconColor: '#10B981', icon: '✓' },
};

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    PageHeaderComponent,
    FilterChipComponent,
    SkeletonComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="notif-screen">

      <!-- ── Header bar ── -->
      <div class="notif-header-bar">
        <div class="notif-header-top">
          <div class="notif-header-left">
            <h1 class="notif-title">Notifications</h1>
            @if (unreadCount() > 0) {
              <span class="notif-unread-badge">{{ unreadCount() }} non lues</span>
            }
            <span class="notif-total-hint">/ {{ notifications().length }} total</span>
          </div>
          <div class="notif-header-actions">
            <button
              class="notifications__mark-all"
              (click)="markAllRead()"
              [disabled]="markingAll()">
              {{ markingAll() ? 'Marquage…' : 'Tout marquer lu' }}
            </button>
          </div>
        </div>

        <!-- ── Filter tabs ── -->
        <div class="notif-tabs">
          @for (tab of tabs; track tab.id) {
            <button
              class="notifications__tab"
              [class.notifications__tab--active]="activeTab() === tab.id"
              (click)="setTab(tab.id)">
              {{ tab.label }}
              @if (tab.badge && tab.badge > 0) {
                <span class="notif-tab-badge">{{ tab.badge }}</span>
              }
            </button>
          }
        </div>
      </div>

      <!-- ── Content ── -->
      <div class="notif-content">
        @if (loading()) {
          <app-skeleton [rows]="5" height="72px" />
        } @else if (notifications().length === 0) {
          <div class="notifications__empty">
            <app-empty-state
              icon="🔔"
              message="Aucune notification." />
          </div>
        } @else {
          <!-- Today group -->
          @if (todayNotifs().length > 0) {
            <div class="notif-group-label">Aujourd'hui</div>
            @for (notif of todayNotifs(); track notif.id; let i = $index) {
              <div
                class="notif-item"
                [class.notif-item--unread]="!notif.lu"
                [style.animation-delay]="i * 30 + 'ms'"
                (click)="onItemClick(notif)">
                <!-- Unread dot -->
                <div class="notif-item-dot-wrapper">
                  @if (!notif.lu) {
                    <span class="notif-unread-dot"></span>
                  }
                </div>
                <!-- Icon circle -->
                <div
                  class="notif-icon-circle"
                  [style.background]="getSevConfig(notif.severite).bg">
                  <span
                    class="notif-icon-glyph"
                    [style.color]="getSevConfig(notif.severite).iconColor">
                    {{ getSevConfig(notif.severite).icon }}
                  </span>
                </div>
                <!-- Text -->
                <div class="notif-item-body">
                  <div
                    class="notif-item-title"
                    [class.notif-item-title--bold]="!notif.lu">
                    {{ notif.titre }}
                  </div>
                  @if (notif.detail) {
                    <div class="notifications__detail notif-item-detail">
                      {{ notif.detail }}
                    </div>
                  }
                </div>
                <!-- Right meta -->
                <div class="notif-item-meta">
                  <span class="notif-item-time">{{ timeAgo(notif.createdAt) }}</span>
                </div>
              </div>
            }
          }

          <!-- Older group -->
          @if (olderNotifs().length > 0) {
            <div class="notif-group-label notif-group-label--spaced">Précédemment</div>
            @for (notif of olderNotifs(); track notif.id; let i = $index) {
              <div
                class="notif-item"
                [class.notif-item--unread]="!notif.lu"
                [style.animation-delay]="i * 30 + 'ms'"
                (click)="onItemClick(notif)">
                <div class="notif-item-dot-wrapper">
                  @if (!notif.lu) {
                    <span class="notif-unread-dot"></span>
                  }
                </div>
                <div
                  class="notif-icon-circle"
                  [style.background]="getSevConfig(notif.severite).bg">
                  <span
                    class="notif-icon-glyph"
                    [style.color]="getSevConfig(notif.severite).iconColor">
                    {{ getSevConfig(notif.severite).icon }}
                  </span>
                </div>
                <div class="notif-item-body">
                  <div
                    class="notif-item-title"
                    [class.notif-item-title--bold]="!notif.lu">
                    {{ notif.titre }}
                  </div>
                  @if (notif.detail) {
                    <div class="notifications__detail notif-item-detail">
                      {{ notif.detail }}
                    </div>
                  }
                </div>
                <div class="notif-item-meta">
                  <span class="notif-item-time">{{ timeAgo(notif.createdAt) }}</span>
                </div>
              </div>
            }
          }
        }
      </div>
    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes rowEnter {
      from { opacity: 0; transform: translateX(-6px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .notif-screen {
      background: #F5F5F5;
      min-height: calc(100vh - 72px);
      animation: screenEnter 300ms ease-out both;
    }

    /* ── Header bar ── */
    .notif-header-bar {
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      padding: 20px 32px 0;
    }
    .notif-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .notif-header-left {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .notif-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .notif-unread-badge {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      background: var(--color-primary);
      border-radius: 9999px;
      padding: 2px 10px;
    }
    .notif-total-hint {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text-muted);
    }
    .notif-header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    /* ── Buttons ── */
    .notifications__mark-all {
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 8px;
      border: 1px solid var(--color-primary);
      color: var(--color-primary);
      background: transparent;
      cursor: pointer;
      transition: all 150ms;
    }
    .notifications__mark-all:hover {
      background: var(--color-primary);
      color: #fff;
    }
    .notifications__mark-all:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ── Tabs ── */
    .notif-tabs {
      display: flex;
      gap: 0;
    }
    .notifications__tab {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 18px;
      border: none;
      border-bottom: 3px solid transparent;
      background: transparent;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 150ms;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .notifications__tab:hover {
      color: var(--color-primary);
    }
    .notifications__tab--active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }
    .notif-tab-badge {
      font-size: 11px;
      font-weight: 700;
      background: var(--color-primary);
      color: #fff;
      border-radius: 9999px;
      padding: 1px 7px;
      line-height: 1.4;
    }

    /* ── Content ── */
    .notif-content {
      padding: 24px 32px 40px;
    }
    .notifications__empty {
      display: flex;
      justify-content: center;
      padding: 48px 0;
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      color: var(--color-text-muted);
      text-align: center;
    }

    /* ── Group label ── */
    .notif-group-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 12px;
    }
    .notif-group-label--spaced {
      margin-top: 24px;
    }

    /* ── Notification item ── */
    .notif-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      border-radius: 8px;
      border: 1px solid #F3F4F6;
      background: #fff;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 150ms ease-out;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      animation: rowEnter 240ms ease-out both;
    }
    .notif-item:hover {
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
      transform: translateX(2px);
    }
    .notif-item--unread {
      border-color: #FCD34D;
      background: #FFFBF5;
    }

    /* Unread dot */
    .notif-item-dot-wrapper {
      width: 8px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .notif-unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-primary);
      display: block;
    }

    /* Icon circle */
    .notif-icon-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .notif-icon-glyph {
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
    }

    /* Body */
    .notif-item-body {
      flex: 1;
      min-width: 0;
    }
    .notif-item-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 400;
      color: #111827;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .notif-item-title--bold {
      font-weight: 700;
    }
    .notif-item-detail,
    .notifications__detail {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Meta */
    .notif-item-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .notif-item-time {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: #9CA3AF;
    }
  `],
})
export class NotificationsComponent {
  private notificationService = inject(NotificationService);

  notifications = signal<Notification[]>([]);
  loading = signal(true);
  markingAll = signal(false);
  activeTab = signal<NotificationTab>('all');

  readonly tabs = [
    { id: 'all' as NotificationTab,    label: 'Tous',         badge: 0 },
    { id: 'unread' as NotificationTab, label: 'Non lues',     badge: 0 },
    { id: 'seuils' as NotificationTab, label: 'Seuils',       badge: 0 },
    { id: 'systeme' as NotificationTab, label: 'Système',     badge: 0 },
  ];

  unreadCount = computed(() =>
    this.notifications().filter(n => !n.lu).length
  );

  todayNotifs = computed(() => {
    const today = new Date();
    return this.notifications().filter(n => {
      const d = new Date(n.createdAt);
      return d.getFullYear() === today.getFullYear()
          && d.getMonth() === today.getMonth()
          && d.getDate() === today.getDate();
    });
  });

  olderNotifs = computed(() => {
    const today = new Date();
    return this.notifications().filter(n => {
      const d = new Date(n.createdAt);
      return !(d.getFullYear() === today.getFullYear()
            && d.getMonth() === today.getMonth()
            && d.getDate() === today.getDate());
    });
  });

  constructor() {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    const params = this.getTabParams();
    this.notificationService.list(params).subscribe({
      next: (page) => {
        this.notifications.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setTab(tab: NotificationTab): void {
    this.activeTab.set(tab);
    this.loadNotifications();
  }

  markAllRead(): void {
    this.markingAll.set(true);
    this.notificationService.marquerToutLu().subscribe({
      next: () => {
        this.markingAll.set(false);
        this.notificationService.unreadCount.set(0);
        this.loadNotifications();
      },
      error: () => this.markingAll.set(false),
    });
  }

  onItemClick(notif: Notification): void {
    if (!notif.lu) {
      this.notificationService.marquerLu(notif.id).subscribe({
        next: (updated) => {
          this.notifications.update(list =>
            list.map(n => n.id === updated.id ? updated : n)
          );
          this.notificationService.unreadCount.update(c => Math.max(0, c - 1));
        },
      });
    }
  }

  getSeveriteVariant(severite: string): string {
    switch (severite) {
      case 'critical': return 'danger';
      case 'warning':  return 'warning';
      case 'success':  return 'success';
      default:         return 'info';
    }
  }

  getSevConfig(severite: string): SevConfig {
    return SEV_CFG[severite] ?? SEV_CFG['info'];
  }

  timeAgo(isoDate: string): string {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    const diffMs = now - then;
    if (diffMs < 0) return 'à l\'instant';
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1)  return 'à l\'instant';
    if (diffMin < 60) return `il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)   return `il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7)    return `il y a ${diffD}j`;
    const diffW = Math.floor(diffD / 7);
    return `il y a ${diffW}sem`;
  }

  private getTabParams(): { lu?: boolean; categorie?: NotificationCategorie } {
    switch (this.activeTab()) {
      case 'unread':  return { lu: false };
      case 'seuils':  return { categorie: 'seuil_pneu' };
      case 'systeme': return { categorie: 'systeme' };
      default:        return {};
    }
  }
}
