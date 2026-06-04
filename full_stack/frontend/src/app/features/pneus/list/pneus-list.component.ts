import { Component, inject, signal, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { PneuService } from '../pneu.service';
import { Pneu } from '../../../shared/models/pneu.model';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { DataTableHeaderComponent, DataTableCol } from '../../../shared/ui/data-table/data-table-header.component';
import { DataTableRowComponent } from '../../../shared/ui/data-table/data-table-row.component';

const COLUMNS: DataTableCol[] = [
  { label: 'Véhicule',      flex: 1.2, minWidth: 110 },
  { label: 'Pos.',          flex: 0.6, minWidth: 55  },
  { label: 'N° Série',      flex: 1.5, minWidth: 120 },
  { label: 'Marque',        flex: 1.2, minWidth: 100 },
  { label: 'Km parcourus',  flex: 1.2, minWidth: 110 },
  { label: 'Km restants',   flex: 1.2, minWidth: 100 },
  { label: 'Statut',        flex: 0.9, minWidth: 80  },
  { label: 'Actif',         flex: 0.7, minWidth: 60  },
];

@Component({
  selector: 'app-pneus-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    EmptyStateComponent,
    SkeletonComponent,
    PageHeaderComponent,
    DataTableHeaderComponent,
    DataTableRowComponent,
  ],
  template: `
    <div class="pneus-list-page">
      <app-page-header title="Gestion des pneus" [count]="pneus().length || undefined" />

      <div class="pneus-list-content">
        <div class="table-wrap">
          <app-data-table-header [cols]="columns" />
          @if (loading()) {
            <app-skeleton [rows]="8" height="52px" />
          } @else if (pneus().length === 0) {
            <app-empty-state icon="🛞" message="Aucun pneu enregistré." />
          } @else {
            @for (pneu of pneus(); track pneu.id; let i = $index) {
              <app-data-table-row [idx]="i" [clickable]="true" (rowClicked)="navigateToDetail(pneu.id)">
                <div class="td" [style.flex]="columns[0].flex">
                  <span class="code-chip">{{ pneu.vehiculeCode || '—' }}</span>
                </div>
                <div class="td" [style.flex]="columns[1].flex">{{ pneu.position }}</div>
                <div class="td mono" [style.flex]="columns[2].flex">{{ pneu.nSerie || '—' }}</div>
                <div class="td" [style.flex]="columns[3].flex">{{ pneu.marque || '—' }}</div>
                <div class="td mono" [style.flex]="columns[4].flex">{{ pneu.kmParcourus | number }} km</div>
                <div class="td mono" [style.flex]="columns[5].flex">
                  {{ pneu.kmRestant != null ? (pneu.kmRestant | number) + ' km' : '—' }}
                </div>
                <div class="td" [style.flex]="columns[6].flex">
                  <span [style.color]="pneu.status === 'ok' ? '#15803D' : pneu.status === 'warn' ? '#B45309' : '#B91C1C'"
                        [style.font-weight]="'600'">
                    {{ pneu.status === 'ok' ? 'OK' : pneu.status === 'warn' ? 'Alerte' : 'Épuisé' }}
                  </span>
                </div>
                <div class="td" [style.flex]="columns[7].flex">
                  <span [style.color]="pneu.actif ? '#15803D' : '#B91C1C'">
                    {{ pneu.actif ? 'Oui' : 'Non' }}
                  </span>
                </div>
              </app-data-table-row>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pneus-list-page { background: #F5F5F5; min-height: calc(100vh - 72px); }
    .pneus-list-content { padding: 20px 32px 32px; }
    .table-wrap { background: white; border-radius: 12px; border: 1px solid var(--color-border); box-shadow: 0 1px 2px rgba(17,24,39,.06); overflow: hidden; }
    .td { display: flex; align-items: center; height: 52px; padding: 0 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .code-chip { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; background: #F5F5F5; padding: 2px 8px; border-radius: 4px; border: 1px solid #E5E5E5; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  `],
})
export class PneusListComponent {
  private pneuService = inject(PneuService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly columns = COLUMNS;
  pneus = signal<Pneu[]>([]);
  loading = signal(true);

  constructor() {
    this.pneuService.listAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pneus.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/pneus', id]);
  }
}
