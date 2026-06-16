import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiSnapshot } from '../../../../shared/models/dashboard.model';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-fleet-overview-widget',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (kpis) {
      <app-kpi-card
        label="Disponibilité"
        [value]="enServicePct"
        [variation]="enServiceDetail"
        varType="positive"
        [accent]="true"
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
export class FleetOverviewWidgetComponent {
  @Input() kpis: KpiSnapshot | null = null;

  get enServicePct(): string {
    if (!this.kpis || !this.kpis.totalVehicules) return '—';
    const pct = Math.round((this.kpis.enService / this.kpis.totalVehicules) * 100);
    return pct + '%';
  }

  get enServiceDetail(): string {
    if (!this.kpis) return '';
    return `${this.kpis.enService} / ${this.kpis.totalVehicules} véhicules`;
  }
}