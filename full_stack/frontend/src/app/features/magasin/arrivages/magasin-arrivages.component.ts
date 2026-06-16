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
import { Arrivage } from '../models/magasin.model';
import { ArrivageFormModalComponent } from './arrivage-form-modal.component';
import { downloadBlobAs } from '../../../shared/utils/download-blob';

const ARRIVAGE_COLUMN_DEFS: ColumnDef[] = [
  { id: 'date',          label: 'Date',         flex: 0.9 },
  { id: 'numero_bl',     label: 'N° BL',        flex: 0.8 },
  { id: 'quantite',      label: 'Quantité',     flex: 0.9 },
  { id: 'prix_unitaire', label: 'PU HT (DH/L)', flex: 0.8 },
  { id: 'valeur_ht',     label: 'Valeur HT',    flex: 0.9 },
  { id: 'fournisseur',   label: 'Fournisseur',  flex: 1   },
  { id: 'source',        label: 'Source',       flex: 0.6 },
];

const ARRIVAGE_DEFAULT_IDS = ['date', 'numero_bl', 'quantite', 'prix_unitaire', 'valeur_ht', 'fournisseur'];

const ACTIONS_COL = { label: 'Actions', flex: 0.7 };

@Component({
  selector: 'app-magasin-arrivages',
  standalone: true,
  imports: [
    DatePipe, DecimalPipe, FormsModule, LucideAngularModule,
    PageHeaderComponent, DataTableHeaderComponent, DataTableRowComponent,
    EmptyStateComponent, SkeletonComponent, ConfirmDeleteModalComponent,
    ColumnManagerModalComponent, ExportExcelModalComponent,
    ArrivageFormModalComponent,
  ],
  template: `
    <div class="magasin-page" style="animation: screenEnter 400ms ease both">
      <app-page-header title="Arrivages de gasoil" [count]="totalElements()">
        <button class="btn-primary" type="button" (click)="openCreate()">+ Nouvel arrivage</button>
      </app-page-header>


      <div class="magasin-content">
        <div class="filter-card">
          <label class="filter-date">
            <span>Du</span>
            <input type="date" [ngModel]="dateMin()" (ngModelChange)="dateMin.set($event); reload()" />
          </label>
          <label class="filter-date">
            <span>Au</span>
            <input type="date" [ngModel]="dateMax()" (ngModelChange)="dateMax.set($event); reload()" />
          </label>
        </div>

        <div class="table-wrap">
          <app-data-table-header [cols]="headerCols()" />
          @if (loading()) {
            <app-skeleton [rows]="6" height="52px" />
          } @else if (arrivages().length === 0) {
            <app-empty-state icon="truck" message="Aucun arrivage enregistré." />
          } @else {
            @for (a of arrivages(); track a.id; let i = $index) {
              <app-data-table-row [idx]="i">
                @for (col of visibleCols(); track col.id) {
                  @switch (col.id) {
                    @case ('date') {
                      <div class="dtr-cell dtr-cell--mono" [style.flex]="col.flex">{{ a.dateArrivage | date:'dd/MM/yyyy' }}</div>
                    }
                    @case ('numero_bl') {
                      <div class="dtr-cell dtr-cell--mono" [style.flex]="col.flex">{{ a.numeroBl ?? '—' }}</div>
                    }
                    @case ('quantite') {
                      <div class="dtr-cell dtr-cell--mono dtr-cell--qty" [style.flex]="col.flex">{{ a.quantiteLitres | number:'1.0-0' }} L</div>
                    }
                    @case ('prix_unitaire') {
                      <div class="dtr-cell dtr-cell--mono" [style.flex]="col.flex">
                        {{ a.prixUnitaireHt !== null ? (a.prixUnitaireHt | number:'1.2-4') : '—' }}
                      </div>
                    }
                    @case ('valeur_ht') {
                      <div class="dtr-cell dtr-cell--mono" [style.flex]="col.flex">
                        {{ a.valeurHt !== null ? ((a.valeurHt | number:'1.0-2') + ' DH') : '—' }}
                      </div>
                    }
                    @case ('fournisseur') {
                      <div class="dtr-cell" [style.flex]="col.flex">{{ a.fournisseur ?? '—' }}</div>
                    }
                    @case ('source') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        <span class="source-badge" [class.source-badge--import]="a.source === 'IMPORT'">{{ a.source }}</span>
                      </div>
                    }
                  }
                }
                <div class="dtr-cell dtr-cell--actions" [style.flex]="actionsCol.flex">
                  <lucide-icon name="pencil" [size]="15" class="row-action" title="Modifier" (click)="openEdit(a)" />
                  <lucide-icon name="trash-2" [size]="15" class="row-action row-action--danger" title="Supprimer" (click)="toDelete.set(a)" />
                </div>
              </app-data-table-row>
            }
          }
        </div>

        <div class="table-toolbar">
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
        <app-arrivage-form-modal [arrivage]="editing()" (saved)="onSaved()" (cancelled)="showForm.set(false)" />
      }
      @if (toDelete(); as a) {
        <app-confirm-delete-modal
          [itemLabel]="'l\\'arrivage du ' + (a.dateArrivage | date:'dd/MM/yyyy') + ' (' + a.quantiteLitres + ' L)'"
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
    }
    .dtr-cell--mono { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; }
    .dtr-cell--qty { font-weight: 700; font-size: 13px; }
    .dtr-cell--actions { justify-content: flex-start; gap: 10px; overflow: visible; }
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
    .pager { display: flex; align-items: center; gap: 16px; }
    .pager-btn {
      height: 32px; padding: 0 14px; border-radius: 8px;
      border: 1px solid var(--color-border, #E5E7EB);
      background: white;
      font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 600;
      color: #374151; cursor: pointer;
    }
    .pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .pager-info { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6B7280; }
  `],
})
export class MagasinArrivagesComponent {
  private api = inject(MagasinApiService);
  private toastr = inject(ToastrService);

  arrivages = signal<Arrivage[]>([]);
  loading = signal(true);
  page = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  dateMin = signal('');
  dateMax = signal('');
  showForm = signal(false);
  editing = signal<Arrivage | null>(null);
  toDelete = signal<Arrivage | null>(null);
  deleting = signal(false);
  exporting = signal(false);
  showColManager = signal(false);
  showExportModal = signal(false);

  private readonly LS_KEY = 'magasin.arrivages.columns';
  readonly allColumnDefs = ARRIVAGE_COLUMN_DEFS;
  readonly defaultVisibleIds = ARRIVAGE_DEFAULT_IDS;
  readonly actionsCol = ACTIONS_COL;

  visibleColIds = signal<string[]>(this.loadColConfig());

  visibleCols = computed<ColumnDef[]>(() => {
    const byId = new Map(ARRIVAGE_COLUMN_DEFS.map(c => [c.id, c]));
    return this.visibleColIds().map(id => byId.get(id)!).filter(Boolean);
  });

  headerCols = computed(() => [
    ...this.visibleCols().map(c => ({ label: c.label, flex: c.flex })),
    ACTIONS_COL,
  ]);

  readonly exportColDefs: ExportColDef[] = [
    { id: 'date',          label: 'Date' },
    { id: 'numero_bl',     label: 'N° BL' },
    { id: 'quantite',      label: 'Quantité (L)' },
    { id: 'prix_unitaire', label: 'PU HT (DH/L)' },
    { id: 'valeur_ht',     label: 'Valeur HT (DH)' },
    { id: 'fournisseur',   label: 'Fournisseur' },
    { id: 'source',        label: 'Source' },
  ];
  readonly exportDefaultColIds = ['date', 'numero_bl', 'quantite', 'prix_unitaire', 'valeur_ht', 'fournisseur'];

  constructor() {
    this.load();
  }

  private loadColConfig(): string[] {
    try {
      const raw = localStorage.getItem('magasin.arrivages.columns');
      if (raw) return JSON.parse(raw) as string[];
    } catch { /* ignore */ }
    return ARRIVAGE_DEFAULT_IDS;
  }

  onColumnsApplied(ids: string[]): void {
    this.visibleColIds.set(ids);
    localStorage.setItem(this.LS_KEY, JSON.stringify(ids));
    this.showColManager.set(false);
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

  openEdit(a: Arrivage): void {
    this.editing.set(a);
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
      entites: ['arrivages'],
      dateMin: this.dateMin() || undefined,
      dateMax: this.dateMax() || undefined,
      columns: result.columns,
    }).subscribe({
      next: blob => {
        this.exporting.set(false);
        downloadBlobAs(blob, 'magasin-arrivages.xlsx');
      },
      error: () => this.exporting.set(false),
    });
  }

  confirmDelete(): void {
    const a = this.toDelete();
    if (!a) return;
    this.deleting.set(true);
    this.api.deleteArrivage(a.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toDelete.set(null);
        this.toastr.success('Arrivage supprimé');
        this.load();
      },
      error: () => this.deleting.set(false),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.listArrivages({
      page: this.page(),
      size: 20,
      dateMin: this.dateMin() || undefined,
      dateMax: this.dateMax() || undefined,
    }).subscribe({
      next: res => {
        this.arrivages.set(res.content);
        this.totalPages.set(res.totalPages);
        this.totalElements.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
