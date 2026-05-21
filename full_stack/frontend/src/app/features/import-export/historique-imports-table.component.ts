import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ImportsHistorique } from '../../shared/models/import.model';
import {
  DataTableHeaderComponent,
  DataTableRowComponent,
  EmptyStateComponent,
} from '../../shared/ui';

@Component({
  selector: 'app-historique-imports-table',
  standalone: true,
  imports: [LucideAngularModule, DataTableHeaderComponent, DataTableRowComponent, EmptyStateComponent],
  template: `
    @if (rows.length === 0) {
      <app-empty-state message="Aucun historique d'import disponible." />
    } @else {
      <app-data-table-header [cols]="cols" />
      @for (row of rows; track row.id; let i = $index) {
        <app-data-table-row [idx]="i">
          <!-- Date -->
          <div class="hit-cell" style="flex:0.8; min-width:90px">
            <span class="hit-mono">{{ formatDate(row.createdAt) }}</span>
          </div>
          <!-- Fichier -->
          <div class="hit-cell" style="flex:2.5; min-width:160px">
            <span class="hit-file">{{ row.fichier ?? '—' }}</span>
          </div>
          <!-- Lignes -->
          <div class="hit-cell" style="flex:0.6; min-width:60px">
            <span class="hit-count">{{ row.lignesTotal ?? '—' }}</span>
          </div>
          <!-- Erreurs -->
          <div class="hit-cell hit-cell--err" style="flex:0.7; min-width:70px">
            @if ((row.lignesErreur ?? 0) > 0) {
              <lucide-icon name="triangle-alert" [size]="14" class="hit-warn-icon" />
            }
            <span [class.hit-warn-text]="(row.lignesErreur ?? 0) > 0">
              {{ (row.lignesErreur ?? 0) > 0 ? (row.lignesErreur ?? 0) : '—' }}
            </span>
          </div>
          <!-- Statut -->
          <div class="hit-cell" style="flex:0.9; min-width:80px">
            @if ((row.lignesErreur ?? 0) === 0) {
              <span class="hit-badge hit-badge--ok">✓ OK</span>
            } @else {
              <span class="hit-badge hit-badge--partial">⚠ Partiel</span>
            }
          </div>
        </app-data-table-row>
      }
    }
  `,
  styles: [`
    .hit-cell {
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
    }
    .hit-mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--color-text-muted, #6b7280);
    }
    .hit-file {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: var(--color-text, #374151);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .hit-count {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text, #111);
    }
    .hit-cell--err {
      gap: 6px;
    }
    .hit-warn-icon {
      color: #d97706;
      flex-shrink: 0;
    }
    .hit-warn-text {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #d97706;
    }
    .hit-badge {
      display: inline-flex;
      padding: 3px 10px;
      border-radius: 9999px;
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .hit-badge--ok {
      background: #DCFCE7;
      color: #16a34a;
    }
    .hit-badge--partial {
      background: #FEF9C3;
      color: #92400E;
    }
  `],
})
export class HistoriqueImportsTableComponent {
  @Input() rows: ImportsHistorique[] = [];

  cols = [
    { label: 'Date', flex: 0.8, minWidth: 90 },
    { label: 'Fichier', flex: 2.5, minWidth: 160 },
    { label: 'Lignes', flex: 0.6, minWidth: 60 },
    { label: 'Erreurs', flex: 0.7, minWidth: 70 },
    { label: 'Statut', flex: 0.9, minWidth: 80 },
  ];

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
}
