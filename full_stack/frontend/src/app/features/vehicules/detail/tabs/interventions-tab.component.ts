import { Component, Input, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, take } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Intervention, InterventionStatut } from '../../../../shared/models/intervention.model';
import { InterventionService } from '../../../interventions/intervention.service';
import { StatusLabelPipe } from '../../../../shared/pipes/status-label.pipe';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { CurrencyMadPipe } from '../../../../shared/pipes/currency-mad.pipe';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { DataTableHeaderComponent, DataTableCol } from '../../../../shared/ui/data-table/data-table-header.component';
import { DataTableRowComponent } from '../../../../shared/ui/data-table/data-table-row.component';
import { FilterChipComponent } from '../../../../shared/ui/filter-chip/filter-chip.component';
import { ColumnManagerModalComponent, ColumnDef } from '../../../vehicules/list/column-manager-modal.component';
import { NewInterventionModalComponent } from '../../../interventions/new-intervention-modal.component';
import { ImageLightboxComponent } from '../../../../shared/ui/image-lightbox/image-lightbox.component';
import { ExcelExportService } from '../../../../shared/services/excel-export.service';
import { downloadBlobAs } from '../../../../shared/utils/download-blob';
import { ExportExcelModalComponent, ExportColDef, ExportFilterDef, ExportResult } from '../../../../shared/ui/export-excel-modal/export-excel-modal.component';

const LS_KEY = 'fleet.interventions-tab.columns';

const ALL_INT_COLS: ColumnDef[] = [
  { id: 'nBs',       label: 'N° BS',      flex: 1.5 },
  { id: 'type',      label: 'Type',       flex: 2   },
  { id: 'categorie', label: 'Catégorie',  flex: 1.5 },
  { id: 'date',      label: 'Date',       flex: 1.5 },
  { id: 'cout',      label: 'Coût',       flex: 1.5 },
  { id: 'statut',    label: 'Statut',     flex: 1   },
  { id: 'photo',     label: 'Image',      flex: 0.6 },
];
const DEFAULT_INT_COL_IDS = ['nBs', 'type', 'categorie', 'date', 'statut', 'photo'];

function loadColIds(): string[] {
  try { const v = localStorage.getItem(LS_KEY); return v ? JSON.parse(v) : DEFAULT_INT_COL_IDS; }
  catch { return DEFAULT_INT_COL_IDS; }
}

@Component({
  selector: 'app-interventions-tab',
  standalone: true,
  imports: [
    CommonModule, StatusLabelPipe, DateFrPipe, CurrencyMadPipe, LucideAngularModule,
    BadgeComponent, EmptyStateComponent, SkeletonComponent,
    CardComponent, DataTableHeaderComponent, DataTableRowComponent,
    FilterChipComponent, ColumnManagerModalComponent, NewInterventionModalComponent,
    ImageLightboxComponent, ExportExcelModalComponent,
  ],
  template: `
    <app-card title="Interventions">
      <!-- Toolbar: search + statut chips + col manager -->
      <div class="int-toolbar">
        <div class="search-wrap">
          <lucide-icon name="search" class="search-icon" [size]="14" />
          <input class="search-input"
                 placeholder="Rechercher N° BS, type, statut…"
                 (input)="searchQuery.set($any($event.target).value)" />
        </div>
        <div class="chip-group">
          @for (f of statutFilters; track f.value) {
            <app-filter-chip
              [label]="f.label"
              [active]="statutFilter() === f.value"
              (clicked)="statutFilter.set(statutFilter() === f.value ? 'all' : f.value)" />
          }
        </div>
        <button class="btn-col-mgr" type="button" title="Gérer colonnes"
                (click)="showColMgr.set(true)">
          <lucide-icon name="settings-2" [size]="15" />
        </button>
        <button class="btn-export" type="button" title="Exporter en Excel" (click)="onExport()" [disabled]="exporting()">
          <lucide-icon name="download" [size]="14" />
          {{ exporting() ? 'Exportation…' : 'Export Excel' }}
        </button>
        <button class="btn-new-int" type="button" (click)="showNewModal.set(true)">
          <lucide-icon name="plus" [size]="14" />
          Nouvelle intervention
        </button>
      </div>

      @if (loading()) {
        <app-skeleton [rows]="4" height="52px" />
      } @else if (filtered().length > 0) {
        <div class="int-table-wrap">
          <!-- Header: chevron spacer col + data cols -->
          <app-data-table-header [cols]="headerCols()" />
          @for (iv of filtered(); track iv.id; let i = $index) {
            <app-data-table-row [idx]="i" [clickable]="true" (rowClicked)="toggleExpand(iv.id)">
              <!-- Expand chevron always visible as first item in each row -->
              <div class="chevron-cell">
                <lucide-icon
                  [name]="expandedIds().has(iv.id) ? 'chevron-down' : 'chevron-right'"
                  [size]="14" />
              </div>
              @for (col of visibleCols(); track col.id) {
                @switch (col.id) {
                  @case ('nBs') {
                    <div class="td mono" [style.flex]="col.flex">{{ iv.nBs ?? '—' }}</div>
                  }
                  @case ('type') {
                    <div class="td" [style.flex]="col.flex">{{ iv.typeIntervention.libelle }}</div>
                  }
                  @case ('categorie') {
                    <div class="td" [style.flex]="col.flex">{{ iv.categorie | statusLabel }}</div>
                  }
                  @case ('date') {
                    <div class="td mono" [style.flex]="col.flex">{{ iv.dateDebut | dateFr:'short' }}</div>
                  }
                  @case ('cout') {
                    <div class="td mono" [style.flex]="col.flex">{{ iv.coutTotal | currencyMad }}</div>
                  }
                  @case ('statut') {
                    <div class="td" [style.flex]="col.flex">
                      <span class="badge badge--{{ getStatusVariant(iv.statut) }}">
                        {{ iv.statut | statusLabel }}
                      </span>
                    </div>
                  }
                  @case ('photo') {
                    <div class="td" [style.flex]="col.flex">
                      <app-image-lightbox [src]="iv.photoUrl" />
                    </div>
                  }
                }
              }
            </app-data-table-row>
            @if (expandedIds().has(iv.id)) {
              <div class="int-detail int-detail--row">
                <div class="int-detail-item">
                  <span class="int-detail-label">Composant</span>
                  <span class="int-detail-value">{{ iv.composant?.designation ?? '—' }}</span>
                </div>
                <div class="int-detail-item">
                  <span class="int-detail-label">Observations</span>
                  <span class="int-detail-value">{{ iv.observations || '—' }}</span>
                </div>
              </div>
            }
          }
        </div>
      } @else {
        <app-empty-state message="Aucune intervention trouvée" />
      }
    </app-card>

    @if (showColMgr()) {
      <app-column-manager-modal
        [allColumnDefs]="allCols"
        [defaultVisibleIds]="defaultIntColIds"
        [currentVisible]="visibleIds()"
        (applied)="onColsApplied($event)"
        (cancel)="showColMgr.set(false)" />
    }

    @if (showNewModal()) {
      <app-new-intervention-modal
        [presetVehicule]="{ id: vehiculeId, code: vehiculeCode }"
        (saved)="onInterventionCreated()"
        (close)="showNewModal.set(false)" />
    }

    @if (showExportModal()) {
      <app-export-excel-modal
        [allColumns]="exportColDefs"
        [filterDefs]="exportFilterDefs"
        [initialVisible]="exportDefaultColIds"
        (exported)="onExportConfirmed($event)"
        (cancel)="showExportModal.set(false)" />
    }

  `,
  styles: [`
    .int-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: nowrap; margin-bottom: 16px; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; flex: 1 1 180px; }
    .search-icon { position: absolute; left: 10px; color: #9CA3AF; pointer-events: none; }
    .search-input {
      height: 34px; padding: 0 12px 0 34px; border: 1px solid var(--color-border);
      border-radius: 8px; font-family: 'Open Sans', sans-serif; font-size: 13px;
      color: var(--color-text); background: var(--color-surface); outline: none; width: 100%;
    }
    .search-input:focus { border-color: var(--color-primary); }
    .chip-group { display: flex; gap: 6px; flex-wrap: nowrap; flex-shrink: 0; }
    .btn-col-mgr {
      flex-shrink: 0; height: 34px; padding: 0 10px; border: 1px solid var(--color-border);
      border-radius: 8px; background: var(--color-surface); cursor: pointer;
      display: flex; align-items: center; color: var(--color-text-muted);
    }
    .btn-col-mgr:hover { background: #F9FAFB; color: var(--color-text); }
    .btn-export {
      flex-shrink: 0; height: 34px; padding: 0 12px; border: 1px solid var(--color-border);
      border-radius: 8px; background: var(--color-surface); cursor: pointer;
      display: flex; align-items: center; gap: 6px;
      font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 600;
      color: var(--color-text-muted);
    }
    .btn-export:hover { background: #F9FAFB; color: var(--color-text); }
    .btn-new-int {
      flex-shrink: 0; height: 34px; padding: 0 14px; border: none;
      border-radius: 8px; background: var(--color-primary); cursor: pointer;
      display: flex; align-items: center; gap: 6px;
      font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 600; color: #fff;
    }
    .btn-new-int:hover { opacity: 0.9; }
    @media (max-width: 900px) { .int-toolbar { flex-wrap: wrap; } .chip-group { flex-wrap: wrap; } }

    .int-table-wrap { margin: 0 -24px -24px; }

    .chevron-cell {
      width: 30px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: #9CA3AF; height: 52px;
    }

    .td { display: flex; align-items: center; height: 52px; padding: 0 16px;
          font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; }
    .td.mono { font-family: 'JetBrains Mono', monospace; }
    .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 6px;
             font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 600; }
    .badge--success  { background: #dcfce7; color: #166534; }
    .badge--warning  { background: #fef3c7; color: #92400e; }
    .badge--danger   { background: #fee2e2; color: #991b1b; }
    .badge--info     { background: #dbeafe; color: #1e40af; }
    .badge--secondary{ background: #F3F4F6; color: #6B7280; }

    .int-detail {
      background: #F9FAFB; border-top: 1px solid var(--color-border);
      border-bottom: 1px solid var(--color-border);
      padding: 12px 24px 12px 54px;
    }
    .int-detail-grid {
      display: flex; flex-wrap: wrap; gap: 16px 32px;
    }
    .int-detail-item {
      display: flex; flex-direction: column; gap: 2px;
    }
    .int-detail-label {
      font-family: 'Open Sans', sans-serif; font-size: 11px; font-weight: 600;
      color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.04em;
    }
    .int-detail-value {
      font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151;
    }
    .int-detail-value--bold { font-weight: 700; color: #111827; }
    .int-detail-obs {
      margin-top: 10px; display: flex; flex-direction: column; gap: 2px;
    }
    .int-detail--row { display: flex; flex-wrap: wrap; gap: 16px 32px; }
  `],
})
export class InterventionsTabComponent implements OnInit {
  @Input({ required: true }) vehiculeId!: number;
  @Input() vehiculeCode = '';

  private interventionService = inject(InterventionService);
  private excelExportService = inject(ExcelExportService);
  private toastr = inject(ToastrService);
  private destroyRef = inject(DestroyRef);

  interventions = signal<Intervention[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  statutFilter = signal<string>('all');
  showColMgr = signal(false);
  showNewModal = signal(false);
  showExportModal = signal(false);
  expandedIds = signal<Set<number>>(new Set());
  exporting = signal(false);

  readonly allCols = ALL_INT_COLS;
  readonly defaultIntColIds = DEFAULT_INT_COL_IDS;
  visibleIds = signal<string[]>(loadColIds());
  visibleCols = computed<(ColumnDef & { id: string })[]>(() =>
    this.visibleIds()
      .map(id => ALL_INT_COLS.find(c => c.id === id))
      .filter((c): c is ColumnDef & { id: string } => !!c)
  );

  /** Header columns: chevron spacer + data columns */
  headerCols = computed<DataTableCol[]>(() => [
    { label: '', flex: 0, minWidth: 30 },
    ...this.visibleCols(),
  ]);

  readonly statutFilters = [
    { label: 'En cours', value: 'en_cours' },
    { label: 'Terminées', value: 'cloture' },
    { label: 'Ouvert',   value: 'ouvert' },
  ];

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const s = this.statutFilter();
    return this.interventions().filter(iv => {
      if (s !== 'all' && iv.statut !== s) return false;
      if (!q) return true;
      return (iv.nBs ?? '').toLowerCase().includes(q)
          || iv.typeIntervention.libelle.toLowerCase().includes(q)
          || iv.statut.toLowerCase().includes(q)
          || iv.categorie.toLowerCase().includes(q);
    });
  });

  ngOnInit(): void {
    this.reload(true);
  }

  private reload(force = false): void {
    this.loading.set(true);
    this.interventionService.list({ vehiculeId: this.vehiculeId, size: 200 }, force).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 200 })),
    ).subscribe(page => {
      this.interventions.set(page.content);
      this.loading.set(false);
    });
  }

  toggleExpand(id: number): void {
    const s = new Set(this.expandedIds());
    if (s.has(id)) { s.delete(id); } else { s.add(id); }
    this.expandedIds.set(s);
  }

  onInterventionCreated(): void {
    this.showNewModal.set(false);
    this.interventionService.invalidate();
    this.reload();
  }

  onColsApplied(ids: string[]): void {
    this.visibleIds.set(ids);
    try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch {}
    this.showColMgr.set(false);
  }

  readonly exportColDefs: ExportColDef[] = [
    { id: 'nBs',       label: 'N° BS' },
    { id: 'date',      label: 'Date' },
    { id: 'categorie', label: 'Type' },
    { id: 'composant', label: 'Composant' },
    { id: 'cout',      label: 'Coût (MAD)' },
    { id: 'statut',    label: 'Statut' },
  ];
  readonly exportDefaultColIds = ['nBs', 'date', 'categorie', 'composant', 'cout', 'statut'];
  readonly exportFilterDefs: ExportFilterDef[] = [
    {
      key: 'statut', label: 'Statut', type: 'select',
      options: [
        { value: 'en_cours', label: 'En cours' },
        { value: 'cloture',  label: 'Terminées' },
      ],
    },
  ];

  onExport(): void {
    this.showExportModal.set(true);
  }

  onExportConfirmed(result: ExportResult): void {
    this.showExportModal.set(false);
    if (this.exporting()) return;
    this.exporting.set(true);
    const filename = this.vehiculeCode
      ? `interventions-${this.vehiculeCode}.xlsx`
      : `interventions-${this.vehiculeId}.xlsx`;
    this.excelExportService.download({
      entites: 'interventions',
      vehiculeId: this.vehiculeId,
      columns: result.columns,
      statut: result.filters['statut'],
    }).pipe(take(1)).subscribe({
      next: blob => { downloadBlobAs(blob, filename); this.exporting.set(false); },
      error: () => { this.toastr.error('Erreur lors de l\'export Excel.'); this.exporting.set(false); },
    });
  }

  getStatusVariant(statut: InterventionStatut): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    switch (statut) {
      case 'cloture': return 'success';
      case 'en_cours': return 'info';
      case 'ouvert': return 'warning';
      default: return 'secondary';
    }
  }
}
