import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuiviVidange } from '../../../../shared/models/vidange.model';
import { StatusLabelPipe } from '../../../../shared/pipes/status-label.pipe';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { DataTableHeaderComponent } from '../../../../shared/ui/data-table/data-table-header.component';
import { DataTableRowComponent } from '../../../../shared/ui/data-table/data-table-row.component';

@Component({
  selector: 'app-vidanges-tab',
  standalone: true,
  imports: [
    CommonModule, StatusLabelPipe, BadgeComponent, EmptyStateComponent,
    CardComponent, DataTableHeaderComponent, DataTableRowComponent,
  ],
  template: `
    <app-card title="Vidanges & suivi lubrifiants">
      @if (vidanges && vidanges.length > 0) {
        <div class="vid-table-wrap">
          <app-data-table-header [cols]="cols" />
          @for (v of vidanges; track v.id; let i = $index) {
            <app-data-table-row [idx]="i">
              <div class="td td--w2">{{ v.composant?.designation ?? '—' }}</div>
              <div class="td td--w1 mono">{{ v.intervalleNbh }}</div>
              <div class="td td--w1 mono">{{ v.compteurNbhActuel }}</div>
              <div class="td td--w1 mono">{{ v.nbhRestant ?? '—' }}</div>
              <div class="td td--w1">
                <span class="badge badge--{{ getStatusVariant(v.statut) }}">{{ v.statut | statusLabel }}</span>
              </div>
            </app-data-table-row>
          }
        </div>
      } @else {
        <app-empty-state message="Aucune vidange enregistrée" />
      }
    </app-card>
  `,
  styles: [`
    .vid-table-wrap { margin: -24px; }
    .td { display: flex; align-items: center; height: 52px; padding: 0 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; }
    .td.mono { font-family: 'JetBrains Mono', monospace; }
    .td--w1 { flex: 1; }
    .td--w2 { flex: 2; }
    .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 600; }
    .badge--success { background: #dcfce7; color: #166534; }
    .badge--warning { background: #fef3c7; color: #92400e; }
    .badge--danger  { background: #fee2e2; color: #991b1b; }
    .badge--info    { background: #dbeafe; color: #1e40af; }
    .badge--secondary { background: #F3F4F6; color: #6B7280; }
  `],
})
export class VidangesTabComponent {
  @Input() vidanges: SuiviVidange[] = [];

  cols = [
    { label: 'Composant', flex: 2 },
    { label: 'Intervalle (h)', flex: 1 },
    { label: 'Actuel (h)', flex: 1 },
    { label: 'Restant (h)', flex: 1 },
    { label: 'Statut', flex: 1 },
  ];

  getStatusVariant(statut: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    switch (statut) {
      case 'fait': return 'success';
      case 'en_cours': return 'info';
      case 'a_faire': return 'warning';
      case 'depasse': return 'danger';
      default: return 'secondary';
    }
  }
}
