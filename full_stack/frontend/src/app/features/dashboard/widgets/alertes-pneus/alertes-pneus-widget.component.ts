import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiSnapshot } from '../../../../shared/models/dashboard.model';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-alertes-pneus-widget',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (kpis) {
      <app-kpi-card
        label="Alertes pneus"
        [value]="kpis.pneusWarnEmpty + ''"
        variation="pneus en attention"
        varType="warning"
      />
    } @else {
      <div class="widget-card">
        <app-skeleton [rows]="2" height="24px" />
      </div>
    }
  `,
  styles: [`
    :host { display: block; height: 100%; }
    app-kpi-card { height: 100%; }
    .widget-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 20px 24px; height: 100%; box-sizing: border-box; }
  `],
})
export class AlertesPneusWidgetComponent {
  @Input() kpis: KpiSnapshot | null = null;
}