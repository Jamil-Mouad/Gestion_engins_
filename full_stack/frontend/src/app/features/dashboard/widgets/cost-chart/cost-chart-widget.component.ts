import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardService } from '../../dashboard.service';
import { KpiCostHistory } from '../../../../shared/models/dashboard.model';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-cost-chart-widget',
  standalone: true,
  imports: [CommonModule, CardComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-card title="Coût — 12 mois">
      @if (loading()) {
        <app-skeleton [rows]="4" height="24px" />
      } @else if (data().length > 0) {
        <div class="cost-chart__placeholder">
          <div class="cost-chart__bars">
            @for (item of data(); track item.month) {
              <div class="cost-chart__bar-col">
                <div class="cost-chart__bar" [style.height.%]="getBarHeight(item.coutTotal)"></div>
                <span class="cost-chart__month">{{ item.month | date:'MMM' }}</span>
              </div>
            }
          </div>
        </div>
      } @else {
        <app-empty-state message="Aucune donnée de coût disponible" />
      }
    </app-card>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    app-card { height: 100%; }
    .cost-chart__placeholder { height: 160px; display: flex; align-items: flex-end; }
    .cost-chart__bars { display: flex; align-items: flex-end; gap: 4px; width: 100%; height: 130px; }
    .cost-chart__bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
    .cost-chart__bar { width: 100%; max-width: 28px; background: var(--color-primary); border-radius: 4px 4px 0 0; min-height: 4px; }
    .cost-chart__month { font-family: 'Open Sans', sans-serif; font-size: 10px; color: var(--color-text-muted); margin-top: 4px; }
  `],
})
export class CostChartWidgetComponent {
  private dashboardService = inject(DashboardService);

  data = signal<KpiCostHistory[]>([]);
  loading = signal(true);

  private maxCost = 0;

  constructor() {
    this.dashboardService.getCostHistory().pipe(
      takeUntilDestroyed(),
    ).subscribe({
      next: (data) => {
        this.data.set(data);
        this.maxCost = Math.max(...data.map(d => d.coutTotal), 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getBarHeight(cost: number): number {
    if (!this.maxCost) return 0;
    return (cost / this.maxCost) * 100;
  }
}