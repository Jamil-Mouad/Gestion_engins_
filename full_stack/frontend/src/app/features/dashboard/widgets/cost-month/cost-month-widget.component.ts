import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiSnapshot } from '../../../../shared/models/dashboard.model';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { CurrencyMadPipe } from '../../../../shared/pipes/currency-mad.pipe';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-cost-month-widget',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, CurrencyMadPipe, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (kpis) {
      <app-kpi-card
        label="Coût du mois"
        [value]="costValue"
        [variation]="costDetail"
        varType="neutral"
      />
    } @else {
      <div class="widget-card">
        <app-skeleton [rows]="3" height="20px" />
      </div>
    }
  `,
  styles: [`
    :host { display: block; height: 100%; }
    app-kpi-card { height: 100%; }
    .widget-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 20px 24px; height: 100%; box-sizing: border-box; }
  `],
})
export class CostMonthWidgetComponent {
  @Input() kpis: KpiSnapshot | null = null;

  get costValue(): string {
    if (!this.kpis) return '—';
    return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(this.kpis.coutInterventionsMois) + ' MAD';
  }

  get costDetail(): string {
    if (!this.kpis) return '';
    const mo = new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(this.kpis.coutMainOeuvre);
    return `MO: ${mo} MAD`;
  }
}