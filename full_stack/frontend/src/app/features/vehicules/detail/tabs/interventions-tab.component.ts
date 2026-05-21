import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Intervention, InterventionStatut } from '../../../../shared/models/intervention.model';
import { StatusLabelPipe } from '../../../../shared/pipes/status-label.pipe';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { CurrencyMadPipe } from '../../../../shared/pipes/currency-mad.pipe';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { DataTableHeaderComponent } from '../../../../shared/ui/data-table/data-table-header.component';
import { DataTableRowComponent } from '../../../../shared/ui/data-table/data-table-row.component';

@Component({
  selector: 'app-interventions-tab',
  standalone: true,
  imports: [
    CommonModule, StatusLabelPipe, DateFrPipe, CurrencyMadPipe,
    BadgeComponent, EmptyStateComponent,
    CardComponent, DataTableHeaderComponent, DataTableRowComponent,
  ],
  template: `
    <app-card title="Interventions">
      @if (interventions && interventions.length > 0) {
        <div class="int-table-wrap">
          <app-data-table-header [cols]="cols" />
          @for (intervention of interventions; track intervention.id; let i = $index) {
            <app-data-table-row [idx]="i">
              <div class="td td--w15 mono">{{ intervention.nBs ?? '—' }}</div>
              <div class="td td--w2">{{ intervention.typeIntervention.libelle }}</div>
              <div class="td td--w15">{{ intervention.categorie | statusLabel }}</div>
              <div class="td td--w15 mono">{{ intervention.dateDebut | dateFr:'short' }}</div>
              <div class="td td--w15 mono">{{ intervention.coutTotal | currencyMad }}</div>
              <div class="td td--w1">
                <span class="badge badge--{{ getStatusVariant(intervention.statut) }}">
                  {{ intervention.statut | statusLabel }}
                </span>
              </div>
            </app-data-table-row>
          }
        </div>
      } @else {
        <app-empty-state message="Aucune intervention pour ce véhicule" />
      }
    </app-card>
  `,
  styles: [`
    .int-table-wrap { margin: -24px; }
    .td { display: flex; align-items: center; height: 52px; padding: 0 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; }
    .td.mono { font-family: 'JetBrains Mono', monospace; }
    .td--w1 { flex: 1; }
    .td--w15 { flex: 1.5; }
    .td--w2 { flex: 2; }
    .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 600; }
    .badge--success { background: #dcfce7; color: #166534; }
    .badge--warning { background: #fef3c7; color: #92400e; }
    .badge--danger  { background: #fee2e2; color: #991b1b; }
    .badge--info    { background: #dbeafe; color: #1e40af; }
    .badge--secondary { background: #F3F4F6; color: #6B7280; }
  `],
})
export class InterventionsTabComponent {
  @Input() interventions: Intervention[] = [];

  cols = [
    { label: 'N° BS', flex: 1.5 },
    { label: 'Type', flex: 2 },
    { label: 'Catégorie', flex: 1.5 },
    { label: 'Date', flex: 1.5 },
    { label: 'Coût', flex: 1.5 },
    { label: 'Statut', flex: 1 },
  ];

  getStatusVariant(statut: InterventionStatut): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    switch (statut) {
      case 'cloture': return 'success';
      case 'en_cours': return 'info';
      case 'ouvert': return 'warning';
      default: return 'secondary';
    }
  }
}
