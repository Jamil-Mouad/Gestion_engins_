import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardService } from '../../dashboard.service';
import { KpiInterventionByStatus } from '../../../../shared/models/dashboard.model';
import { StatusLabelPipe } from '../../../../shared/pipes/status-label.pipe';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-intervention-donut-widget',
  standalone: true,
  imports: [CommonModule, StatusLabelPipe, CardComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-card title="Interventions par statut">
      @if (loading()) {
        <app-skeleton [rows]="3" height="24px" />
      } @else if (data().length > 0) {
        <div class="donut__list">
          @for (item of data(); track item.statut) {
            <div class="donut__row">
              <span class="donut__dot" [class]="'donut__dot--' + getDotClass(item.statut)"></span>
              <span class="donut__label">{{ item.statut | statusLabel }}</span>
              <span class="donut__count">{{ item.count }}</span>
            </div>
          }
        </div>
      } @else {
        <app-empty-state message="Aucune donnée d'intervention disponible" />
      }
    </app-card>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    app-card { height: 100%; }
    .donut__list { display: flex; flex-direction: column; gap: 8px; }
    .donut__row { display: flex; align-items: center; gap: 8px; }
    .donut__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .donut__dot--info { background: var(--color-info); }
    .donut__dot--warning { background: var(--color-warning); }
    .donut__dot--success { background: var(--color-success); }
    .donut__dot--secondary { background: var(--color-text-muted); }
    .donut__label { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); flex: 1; }
    .donut__count { font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 600; color: var(--color-text); }
  `],
})
export class InterventionDonutWidgetComponent {
  private dashboardService = inject(DashboardService);

  data = signal<KpiInterventionByStatus[]>([]);
  loading = signal(true);

  constructor() {
    this.dashboardService.getInterventionsByStatus().pipe(
      takeUntilDestroyed(),
    ).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getDotClass(statut: string): string {
    switch (statut) {
      case 'ouvert': return 'info';
      case 'en_cours': return 'warning';
      case 'cloture': return 'success';
      default: return 'secondary';
    }
  }
}