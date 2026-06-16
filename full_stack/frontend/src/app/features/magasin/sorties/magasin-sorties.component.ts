import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import {
  PageHeaderComponent, DataTableHeaderComponent, DataTableRowComponent,
  EmptyStateComponent, SkeletonComponent, ConfirmDeleteModalComponent,
} from '../../../shared/ui';
import {
  ExportExcelModalComponent, ExportColDef, ExportResult,
} from '../../../shared/ui/export-excel-modal/export-excel-modal.component';
import { ColumnManagerModalComponent, ColumnDef } from '../../vehicules/list/column-manager-modal.component';
import { MagasinApiService } from '../services/magasin-api.service';
import { Sortie } from '../models/magasin.model';
import { SortieFormModalComponent } from './sortie-form-modal.component';
import { downloadBlobAs } from '../../../shared/utils/download-blob';

const SORTIE_COLUMN_DEFS: ColumnDef[] = [
  { id: 'date',        label: 'Date',        flex: 0.9 },
  { id: 'vehicule',    label: 'Véhicule',    flex: 0.7 },
  { id: 'destination', label: 'Destination', flex: 1.6 },
  { id: 'quantite',    label: 'Quantité',    flex: 0.8 },
  { id: 'totaliseur',  label: 'Totaliseur',  flex: 0.8 },
  { id: 'compteur',    label: 'Compteur',    flex: 0.8 },
  { id: 'demandeur',   label: 'Demandeur',   flex: 0.9 },
  { id: 'numero_bs',   label: 'N° BS',       flex: 0.6 },
  { id: 'source',      label: 'Source',      flex: 0.6 },
];

const SORTIE_DEFAULT_IDS = ['date', 'vehicule', 'destination', 'quantite', 'compteur', 'demandeur', 'numero_bs'];

const ACTIONS_COL = { label: 'Actions', flex: 0.7 };

@Component({
  selector: 'app-magasin-sorties',
  standalone: true,
  imports: [
    DatePipe, DecimalPipe, FormsModule, LucideAngularModule,
    PageHeaderComponent, DataTableHeaderComponent, DataTableRowComponent,
    EmptyStateComponent, SkeletonComponent, ConfirmDeleteModalComponent,
    ColumnManagerModalComponent, ExportExcelModalComponent,
    SortieFormModalComponent,
  ],
  template: `
    <div class="magasin-page" style="animation: screenEnter 400ms ease both">
      <app-page-header title="Sorties carburant" [count]="totalElements()">
        <button class="btn-primary" type="button" (click)="openCreate()">+ Nouvelle sortie</button>
      </app-page-header>


      <div class="magasin-content">
        <!-- Filters -->
        <div class="filter-card">
          <input type="text" class="filter-input" placeholder="Recherche (destination, demandeur, BS, code véhicule…)"
                 [ngModel]="search()" (ngModelChange)="onSearch($event)" />
          <label class="filter-date">
            <span>Du</span>
            <input type="date" [ngModel]="dateMin()" (ngModelChange)="dateMin.set($event); reload()" />
          </label>
          <label class="filter-date">
            <span>Au</span>
            <input type="date" [ngModel]="dateMax()" (ngModelChange)="dateMax.set($event); reload()" />
          </label>
        </div>

        <!-- Table -->
        <div class="table-wrap">
          <app-data-table-header [cols]="headerCols()" />
          @if (loading()) {
            <app-skeleton [rows]="8" height="52px" />
          } @else if (sorties().length === 0) {
            <app-empty-state icon="fuel" message="Aucune sortie carburant." />
          } @else {
            @for (s of sorties(); track s.id; let i = $index) {
              <app-data-table-row [idx]="i">
                @for (col of visibleCols(); track col.id) {
                  @switch (col.id) {
                    @case ('date') {
                      <div class="dtr-cell dtr-cell--mono" [style.flex]="col.flex">{{ s.dateSortie | date:'dd/MM/yyyy' }}</div>
                    }
                    @case ('vehicule') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        @if (s.vehiculeCode) {
                          <span class="veh-chip">{{ s.vehiculeCode }}</span>
                        } @else { <span class="muted">—</span> }
                      </div>
                    }
                    @case ('destination') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        {{ s.destination }}
                        @if (s.typeMouvement === 'RETOUR') {
                          <span class="retour-badge">RETOUR</span>
                        }
                      </div>
                    }
                    @case ('quantite') {
                      <div class="dtr-cell dtr-cell--mono dtr-cell--qty" [style.flex]="col.flex">
                        {{ s.typeMouvement === 'RETOUR' ? '−' : '' }}{{ s.quantiteLitres | number:'1.0-2' }} L
                      </div>
                    }
                    @case ('totaliseur') {
                      <div class="dtr-cell dtr-cell--mono" [style.flex]="col.flex">
                        {{ s.totaliseur !== null ? (s.totaliseur | number:'1.0-0') : '—' }}
                      </div>
                    }
                    @case ('compteur') {
                      <div class="dtr-cell dtr-cell--mono" [style.flex]="col.flex">
                        {{ s.compteur !== null ? (s.compteur | number:'1.0-0') : '—' }}
                      </div>
                    }
                    @case ('demandeur') {
                      <div class="dtr-cell" [style.flex]="col.flex">{{ s.demandeur ?? '—' }}</div>
                    }
                    @case ('numero_bs') {
                      <div class="dtr-cell dtr-cell--mono" [style.flex]="col.flex">{{ s.numeroBs ?? '—' }}</div>
                    }
                    @case ('source') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        <span class="source-badge" [class.source-badge--import]="s.source === 'IMPORT'">{{ s.source }}</span>
                      </div>
                    }
                  }
                }
                <div class="dtr-cell dtr-cell--actions" [style.flex]="actionsCol.flex">
                  <lucide-icon name="pencil" [size]="15" class="row-action" title="Modifier" (click)="openEdit(s)" />
                  <lucide-icon name="trash-2" [size]="15" class="row-action row-action--danger" title="Supprimer" (click)="toDelete.set(s)" />
                </div>
              </app-data-table-row>
            }
          }
        </div>

        <!-- Toolbar -->
        <div class="table-toolbar">
          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="pager">
              <button class="pager-btn" [disabled]="page() === 0" (click)="goToPage(page() - 1)">‹ Précédent</button>
              <span class="pager-info">Page {{ page() + 1 }} / {{ totalPages() }}</span>
              <button class="pager-btn" [disabled]="page() >= totalPages() - 1" (click)="goToPage(page() + 1)">Suivant ›</button>
            </div>
          }
          <div class="table-actions">
            <button class="btn-export" type="button" (click)="showExportModal.set(true)" [disabled]="exporting()">
              <lucide-icon name="download" [size]="14" />
              {{ exporting() ? 'Exportation…' : 'Export Excel' }}
            </button>
            <button class="btn-settings" type="button" (click)="showColManager.set(true)" title="Gérer les colonnes">
              <lucide-icon name="settings" [size]="16" />
            </button>
          </div>
        </div>
      </div>

      @if (showForm()) {
        <app-sortie-form-modal [sortie]="editing()" (saved)="onSaved()" (cancelled)="showForm.set(false)" />
      }
      @if (toDelete(); as s) {
        <app-confirm-delete-modal
          [itemLabel]="'la sortie du ' + (s.dateSortie | date:'dd/MM/yyyy') + ' (' + s.quantiteLitres + ' L)'"
          [isDeleting]="deleting()"
          (confirm)="confirmDelete()"
          (cancel)="toDelete.set(null)" />
      }
      @if (showColManager()) {
        <app-column-manager-modal
          [allColumnDefs]="allColumnDefs"
          [defaultVisibleIds]="defaultVisibleIds"
          [currentVisible]="visibleColIds()"
          (applied)="onColumnsApplied($event)"
          (cancel)="showColManager.set(false)" />
      }
      @if (showExportModal()) {
        <app-export-excel-modal
          [allColumns]="exportColDefs"
          [filterDefs]="[]"
          [initialVisible]="exportDefaultColIds"
          (exported)="onExportConfirmed($event)"
          (cancel)="showExportModal.set(false)" />
      }
    </div>
  `,
  styles: [`
    @keyframes screenEnter { from { opacity: 0; } to { opacity: 1; } }
    .magasin-page { background: #F5F5F5; min-height: calc(100vh - 88px); }
    .magasin-content { padding: 20px 32px 32px; }
    .filter-card {
      background: var(--color-surface);
      border-radius: 12px;
      border: 1px solid var(--color-border);
      padding: 14px 20px;
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .filter-input {
      height: 36px;
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 8px;
      padding: 0 12px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      min-width: 320px;
      outline: none;
    }
    .filter-input:focus { border-color: var(--color-primary, #F7941D); }
    .filter-date {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: #6B7280;
    }
    .filter-date input {
      height: 36px;
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 8px;
      padding: 0 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }
    .table-wrap {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--color-border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.07);
      overflow: hidden;
    }
    .dtr-cell {
      padding: 0 16px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text, #111827);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .dtr-cell--mono { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; }
    .dtr-cell--qty { font-weight: 700; font-size: 13px; }
    .dtr-cell--actions { justify-content: flex-start; gap: 10px; overflow: visible; }
    .veh-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      background: #F5F5F5;
      border: 1px solid #E5E5E5;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .retour-badge {
      font-family: 'Montserrat', sans-serif;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.06em;
      background: #DBEAFE;
      color: #1D4ED8;
      padding: 2px 7px;
      border-radius: 9999px;
    }
    .source-badge {
      font-family: 'Montserrat', sans-serif;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.06em;
      background: #F3F4F6;
      color: #4B5563;
      padding: 2px 7px;
      border-radius: 9999px;
    }
    .source-badge--import { background: #EDE9FE; color: #6D28D9; }
    .muted { color: #C4C8CE; }
    .row-action { color: #9CA3AF; cursor: pointer; }
    .row-action:hover { color: var(--color-primary); }
    .row-action--danger:hover { color: #DC2626; }
    .btn-primary {
      height: 36px; padding: 0 16px; border-radius: 8px; border: none;
      background: var(--color-primary, #F7941D); color: #fff;
      font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; white-space: nowrap;
    }
    .table-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 0 0; }
    .table-actions { display: flex; gap: 8px; align-items: center; margin-left: auto; }
    .btn-export {
      height: 34px; padding: 0 14px; background: white; border: 1px solid var(--color-border);
      border-radius: 8px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
    }
    .btn-export:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .btn-export:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-settings {
      width: 34px; height: 34px; background: white; border: 1px solid var(--color-border);
      border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #374151;
    }
    .btn-settings:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .pager {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .pager-btn {
      height: 32px; padding: 0 14px; border-radius: 8px;
      border: 1px solid var(--color-border, #E5E7EB);
      background: white;
      font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 600;
      color: #374151;
      cursor: pointer;
    }
    .pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .pager-info { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6B7280; }
  `],
})
export class MagasinSortiesComponent {
  private api = inject(MagasinApiService);
  private toastr = inject(ToastrService);

  sorties = signal<Sortie[]>([]);
  loading = signal(true);
  page = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  search = signal('');
  dateMin = signal('');
  dateMax = signal('');
  showForm = signal(false);
  editing = signal<Sortie | null>(null);
  toDelete = signal<Sortie | null>(null);
  deleting = signal(false);
  exporting = signal(false);
  showColManager = signal(false);
  showExportModal = signal(false);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly LS_KEY = 'magasin.sorties.columns';
  readonly allColumnDefs = SORTIE_COLUMN_DEFS;
  readonly defaultVisibleIds = SORTIE_DEFAULT_IDS;
  readonly actionsCol = ACTIONS_COL;

  visibleColIds = signal<string[]>(this.loadColConfig());

  visibleCols = computed<ColumnDef[]>(() => {
    const byId = new Map(SORTIE_COLUMN_DEFS.map(c => [c.id, c]));
    return this.visibleColIds().map(id => byId.get(id)!).filter(Boolean);
  });

  headerCols = computed(() => [
    ...this.visibleCols().map(c => ({ label: c.label, flex: c.flex })),
    ACTIONS_COL,
  ]);

  readonly exportColDefs: ExportColDef[] = [
    { id: 'date',          label: 'Date' },
    { id: 'vehicule_code', label: 'Code véhicule' },
    { id: 'destination',   label: 'Destination' },
    { id: 'type',          label: 'Type (sortie/retour)' },
    { id: 'quantite',      label: 'Quantité (L)' },
    { id: 'totaliseur',    label: 'Totaliseur' },
    { id: 'compteur',      label: 'Compteur' },
    { id: 'demandeur',     label: 'Demandeur' },
    { id: 'numero_bs',     label: 'N° BS' },
    { id: 'tiers',         label: 'Tiers' },
    { id: 'source',        label: 'Source' },
  ];
  readonly exportDefaultColIds = ['date', 'vehicule_code', 'destination', 'quantite', 'compteur', 'demandeur', 'numero_bs'];

  constructor() {
    this.load();
  }

  private loadColConfig(): string[] {
    try {
      const raw = localStorage.getItem('magasin.sorties.columns');
      if (raw) return JSON.parse(raw) as string[];
    } catch { /* ignore */ }
    return SORTIE_DEFAULT_IDS;
  }

  onColumnsApplied(ids: string[]): void {
    this.visibleColIds.set(ids);
    localStorage.setItem(this.LS_KEY, JSON.stringify(ids));
    this.showColManager.set(false);
  }

  onSearch(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.reload(), 300);
  }

  reload(): void {
    this.page.set(0);
    this.load();
  }

  goToPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  openCreate(): void {
    this.editing.set(null);
    this.showForm.set(true);
  }

  openEdit(s: Sortie): void {
    this.editing.set(s);
    this.showForm.set(true);
  }

  onSaved(): void {
    this.showForm.set(false);
    this.load();
  }

  onExportConfirmed(result: ExportResult): void {
    this.showExportModal.set(false);
    this.exporting.set(true);
    this.api.exportExcel({
      entites: ['sorties'],
      dateMin: this.dateMin() || undefined,
      dateMax: this.dateMax() || undefined,
      columns: result.columns,
    }).subscribe({
      next: blob => {
        this.exporting.set(false);
        downloadBlobAs(blob, 'magasin-sorties.xlsx');
      },
      error: () => this.exporting.set(false),
    });
  }

  confirmDelete(): void {
    const s = this.toDelete();
    if (!s) return;
    this.deleting.set(true);
    this.api.deleteSortie(s.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toDelete.set(null);
        this.toastr.success('Sortie supprimée');
        this.load();
      },
      error: () => this.deleting.set(false),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.listSorties({
      page: this.page(),
      size: 20,
      search: this.search().trim() || undefined,
      dateMin: this.dateMin() || undefined,
      dateMax: this.dateMax() || undefined,
    }).subscribe({
      next: res => {
        this.sorties.set(res.content);
        this.totalPages.set(res.totalPages);
        this.totalElements.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
