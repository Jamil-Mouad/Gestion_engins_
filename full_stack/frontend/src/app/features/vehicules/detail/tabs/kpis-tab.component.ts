import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiSnapshot } from '../../../../shared/models/dashboard.model';
import { CurrencyMadPipe } from '../../../../shared/pipes/currency-mad.pipe';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';

@Component({
  selector: 'app-kpis-tab',
  standalone: true,
  imports: [CommonModule, CurrencyMadPipe, SkeletonComponent, EmptyStateComponent, CardComponent, KpiCardComponent],
  template: `
    <app-card title="Indicateurs clés de performance">
      @if (loading) {
        <app-skeleton [rows]="3" height="80px" />
      } @else if (kpis) {
        <div class="kpis-row">
          <app-kpi-card label="En service" [value]="kpis.enService + '' " [accent]="true" />
          <app-kpi-card label="Total véhicules" [value]="kpis.totalVehicules + '' " />
          <app-kpi-card label="Coût interventions (mois)" [value]="(kpis.coutInterventionsMois | currencyMad) ?? '—'" varType="warning" />
          <app-kpi-card label="Interventions ouvertes" [value]="kpis.interventionsOuvertes + '' " varType="negative" />
          <app-kpi-card label="Vidanges en retard" [value]="kpis.vidangesEnRetard + '' " varType="warning" />
          <app-kpi-card label="Alertes pneus" [value]="kpis.pneusWarnEmpty + '' " varType="negative" />
        </div>
      } @else {
        <app-empty-state message="Données KPI non disponibles" />
      }
    </app-card>
  `,
  styles: [`
    .kpis-row { display: flex; flex-wrap: wrap; gap: 16px; margin: -4px; }
  `],
})
export class KpisTabComponent {
  @Input() kpis: KpiSnapshot | null = null;
  @Input() loading = false;
}
