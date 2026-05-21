import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReleveCompteur } from '../../../../shared/models/releve-compteur.model';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { DataTableHeaderComponent } from '../../../../shared/ui/data-table/data-table-header.component';
import { DataTableRowComponent } from '../../../../shared/ui/data-table/data-table-row.component';

@Component({
  selector: 'app-historique-tab',
  standalone: true,
  imports: [
    CommonModule, DateFrPipe, EmptyStateComponent,
    CardComponent, DataTableHeaderComponent, DataTableRowComponent,
  ],
  template: `
    <app-card title="Historique des relevés compteur">
      @if (releves && releves.length > 0) {
        <div class="hist-table-wrap">
          <app-data-table-header [cols]="cols" />
          @for (r of releves; track r.id; let i = $index) {
            <app-data-table-row [idx]="i">
              <div class="td td--w2 mono">{{ r.dateReleve | dateFr:'short' }}</div>
              <div class="td td--w2 mono">{{ r.compteurKm ?? '—' }} km</div>
              <div class="td td--w2 mono">{{ r.compteurHeures ? r.compteurHeures + ' h' : '—' }}</div>
              <div class="td td--w1">
                <span class="source-chip">{{ r.source }}</span>
              </div>
            </app-data-table-row>
          }
        </div>
      } @else {
        <app-empty-state message="Aucun relevé de compteur" />
      }
    </app-card>
  `,
  styles: [`
    .hist-table-wrap { margin: -24px; }
    .td { display: flex; align-items: center; height: 52px; padding: 0 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; }
    .td.mono { font-family: 'JetBrains Mono', monospace; }
    .td--w1 { flex: 1; }
    .td--w2 { flex: 2; }
    .source-chip { font-family: 'Open Sans', sans-serif; font-size: 12px; color: #6B7280; background: #F3F4F6; padding: 2px 8px; border-radius: 6px; }
  `],
})
export class HistoriqueTabComponent {
  @Input() releves: ReleveCompteur[] = [];

  cols = [
    { label: 'Date', flex: 2 },
    { label: 'Compteur km', flex: 2 },
    { label: 'Compteur heures', flex: 2 },
    { label: 'Source', flex: 1 },
  ];
}
