import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { take } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { DemandeAchatService } from './demande-achat.service';
import { DemandeAchat, DemandeStatut } from '../../shared/models/demande-achat.model';
import { ColumnDef, ColumnManagerModalComponent } from '../vehicules/list/column-manager-modal.component';
import {
  PageHeaderComponent,
  FilterChipComponent,
  DataTableHeaderComponent,
  DataTableRowComponent,
  RequestStatusBadgeComponent,
  SkeletonComponent,
  EmptyStateComponent,
  ImageLightboxComponent,
} from '../../shared/ui';
import { NewDemandeModalComponent } from './new-demande-modal.component';
import { ExcelExportService } from '../../shared/services/excel-export.service';
import { downloadBlobAs } from '../../shared/utils/download-blob';
import { ExportExcelModalComponent, ExportColDef, ExportFilterDef, ExportResult } from '../../shared/ui/export-excel-modal/export-excel-modal.component';

// ── Column configuration ──────────────────────────────────────────────────────

const DA_COL_DEFS: ColumnDef[] = [
  { id: 'id',        label: 'ID',        flex: 1   },
  { id: 'date',      label: 'Date',      flex: 0.9 },
  { id: 'demandeur', label: 'Demandeur', flex: 1.3 },
  { id: 'piece',     label: 'Pièce',     flex: 2   },
  { id: 'reference', label: 'Réf.',      flex: 1   },
  { id: 'quantite',  label: 'Qté',       flex: 0.6 },
  { id: 'photo',     label: 'Image',     flex: 0.6 },
  { id: 'statut',    label: 'Statut',    flex: 1   },
];
/** Actions column is always pinned — never shown in the column manager. */
const DA_ACTION_COL: ColumnDef = { id: 'action', label: 'Actions', flex: 1.2 };
const DA_DEFAULT_COL_IDS = ['id', 'date', 'demandeur', 'piece', 'reference', 'quantite', 'photo', 'statut'];
const DA_LS_KEY = 'fleet.demandes-achat.columns';

function loadDaColIds(): string[] {
  try {
    const v = localStorage.getItem(DA_LS_KEY);
    return v ? JSON.parse(v) : DA_DEFAULT_COL_IDS;
  } catch {
    return DA_DEFAULT_COL_IDS;
  }
}

@Component({
  selector: 'app-demandes-achat',
  standalone: true,
  imports: [
    LucideAngularModule,
    PageHeaderComponent,
    FilterChipComponent,
    DataTableHeaderComponent,
    DataTableRowComponent,
    RequestStatusBadgeComponent,
    SkeletonComponent,
    EmptyStateComponent,
    NewDemandeModalComponent,
    ColumnManagerModalComponent,
    ImageLightboxComponent, ExportExcelModalComponent,
  ],
  template: `
    <div class="da-page">
      <!-- Page header -->
      <app-page-header title="Demandes d'achat" [count]="nouvelles()">
        <button class="btn-primary" (click)="showNewDemande.set(true)" type="button">
          + Nouvelle demande
        </button>
      </app-page-header>

      @if (actionError()) {
        <div class="da-error">{{ actionError() }}</div>
      }

      <div class="da-content">

        <!-- Filter card: search + status chips -->
        <div class="filter-card">
          <div class="filter-row">
            <div class="search-wrap">
              <lucide-icon name="search" class="search-icon" [size]="15" />
              <input
                class="search-input"
                placeholder="Rechercher une demande…"
                [value]="searchQuery()"
                (input)="searchQuery.set($any($event.target).value)" />
            </div>
            <span class="filter-label">Statut :</span>
            @for (tab of tabs; track tab.value) {
              <app-filter-chip
                [label]="tab.label"
                [active]="activeTab() === tab.value"
                (clicked)="filterByTab(tab.value)" />
            }
          </div>
        </div>

        <!-- Table -->
        <div class="table-wrap">
          <app-data-table-header [cols]="visibleCols()" />

          @if (loading()) {
            <app-skeleton [rows]="5" height="52px" />
          } @else if (filteredDemandes().length === 0) {
            <app-empty-state icon="shopping-cart" message="Aucune demande d'achat trouvée." />
          } @else {
            @for (d of filteredDemandes(); track d.id; let i = $index) {
              <app-data-table-row [idx]="i" [clickable]="false">
                @for (col of visibleCols(); track col.id) {
                  @switch (col.id) {

                    @case ('id') {
                      <div class="td" [style.flex]="col.flex">
                        <span class="da-code-chip">{{ d.code }}</span>
                      </div>
                    }

                    @case ('date') {
                      <div class="td td--mono" [style.flex]="col.flex">
                        {{ formatDate(d.dateDemande) }}
                      </div>
                    }

                    @case ('demandeur') {
                      <div class="td" [style.flex]="col.flex">
                        {{ d.demandeurNom ?? (d.demandeur.prenom + ' ' + d.demandeur.nom) }}
                      </div>
                    }

                    @case ('piece') {
                      <div class="td" [style.flex]="col.flex">
                        {{ d.composant?.designation ?? d.pieceLibre ?? '—' }}
                      </div>
                    }

                    @case ('reference') {
                      <div class="td td--mono" [style.flex]="col.flex">
                        {{ d.reference ?? '—' }}
                      </div>
                    }

                    @case ('quantite') {
                      <div class="td td--mono" [style.flex]="col.flex">
                        {{ d.quantite }}
                      </div>
                    }

                    @case ('photo') {
                      <div class="td td--photo" [style.flex]="col.flex">
                        <app-image-lightbox [src]="d.photoUrl" />
                      </div>
                    }

                    @case ('statut') {
                      <div class="td" [style.flex]="col.flex">
                        <app-request-status-badge [status]="toRequestStatus(d.statut)" />
                      </div>
                    }

                    @case ('action') {
                      <div class="td da-actions" [style.flex]="col.flex">
                        @if (d.statut === 'Nouvelle') {
                          <button class="da-btn da-btn--approve" (click)="approuver(d.id)">Approuver</button>
                          <button class="da-btn da-btn--reject"  (click)="rejeter(d.id)">Rejeter</button>
                        }
                        @if (d.statut === 'Approuvée') {
                          <button class="da-btn da-btn--close" (click)="cloturer(d.id)">Clôturer</button>
                        }
                        @if (d.statut !== 'Nouvelle' && d.statut !== 'Approuvée') {
                          <span class="da-no-action">—</span>
                        }
                      </div>
                    }

                  }
                }
              </app-data-table-row>
            }
          }
        </div>

        <!-- Footer toolbar -->
        <div class="table-footer">
          <div class="table-actions">
            <button class="btn-export" type="button" (click)="onExport()" [disabled]="exporting()" title="Exporter en Excel">
              <lucide-icon name="download" [size]="14" />
              {{ exporting() ? 'Exportation…' : 'Export Excel' }}
            </button>
            <button class="btn-settings" type="button" title="Gérer les colonnes" (click)="showColManager.set(true)">
              <lucide-icon name="settings" [size]="15" />
            </button>
          </div>
        </div>

      </div>

      @if (showColManager()) {
        <app-column-manager-modal
          [allColumnDefs]="daColumnDefs"
          [defaultVisibleIds]="daDefaultColIds"
          [currentVisible]="visibleColIds()"
          (applied)="onColumnsApplied($event)"
          (cancel)="showColManager.set(false)" />
      }

      @if (showNewDemande()) {
        <app-new-demande-modal (saved)="onDemandeCreated()" (close)="showNewDemande.set(false)" />
      }

      @if (showExportModal()) {
        <app-export-excel-modal
          [allColumns]="exportColDefs"
          [filterDefs]="exportFilterDefs"
          [initialVisible]="visibleColIds()"
          [initialFilters]="currentExportFilters()"
          (exported)="onExportConfirmed($event)"
          (cancel)="showExportModal.set(false)" />
      }

    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .da-page {
      min-height: calc(100vh - 88px);
      background: #F5F5F5;
      animation: screenEnter 260ms ease-out both;
    }

    .da-content { padding: 20px 32px 32px; }

    /* Error banner */
    .da-error {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-danger, #EF4444);
      background: rgba(239,68,68,0.08);
      border-radius: var(--radius-sm, 6px);
      padding: 8px 16px;
      margin: 12px 32px 0;
    }

    /* Primary button */
    .btn-primary {
      height: 36px;
      padding: 0 16px;
      border-radius: 8px;
      border: none;
      background: var(--color-primary, #E87722);
      color: #fff;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
      white-space: nowrap;
    }
    .btn-primary:hover { opacity: 0.9; }

    /* Filter card */
    .filter-card {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--color-border);
      margin-bottom: 20px;
      overflow: hidden;
    }
    .filter-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 14px 20px;
    }
    .filter-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: #6B7280;
      flex-shrink: 0;
    }

    /* Search */
    .search-wrap { position: relative; display: inline-flex; align-items: center; }
    .search-icon { position: absolute; left: 10px; color: #9CA3AF; pointer-events: none; }
    .search-input {
      height: 36px;
      padding: 0 12px 0 36px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text);
      background: var(--color-surface);
      outline: none;
      min-width: 220px;
    }
    .search-input:focus { border-color: var(--color-primary); }

    /* Table */
    .table-wrap {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--color-border);
      box-shadow: 0 1px 2px rgba(17,24,39,.06);
      overflow: hidden;
      margin-bottom: 16px;
    }

    /* Table cells */
    .td {
      display: flex;
      align-items: center;
      height: 52px;
      padding: 0 16px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: #374151;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .td--mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6B7280; }
    .td--photo { overflow: visible; }

    /* Code chip (ID column) */
    .da-code-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-primary);
      background: rgba(232,119,34, 0.10);
      padding: 2px 8px;
      border-radius: 6px;
    }

    /* Actions cell */
    .da-actions { display: flex; gap: 6px; align-items: center; }
    .da-btn {
      font-family: 'Open Sans', sans-serif;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s;
      white-space: nowrap;
    }
    .da-btn--approve { background: #D1FAE5; color: #065F46; }
    .da-btn--reject  { background: #FEE2E2; color: #991B1B; }
    .da-btn--close   { background: #E0F2FE; color: #0369A1; }
    .da-btn:hover { opacity: 0.8; }
    .da-no-action {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: #9CA3AF;
    }

    /* Footer toolbar */
    .table-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 4px 0;
    }
    .table-actions { display: flex; align-items: center; gap: 8px; }
    .btn-export {
      height: 34px;
      padding: 0 14px;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-export:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .btn-settings {
      height: 34px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-surface);
      cursor: pointer;
      display: flex;
      align-items: center;
      color: var(--color-text-muted);
    }
    .btn-settings:hover { background: #F9FAFB; color: var(--color-text); }
  `],
})
export class DemandesAchatComponent {
  private demandeService = inject(DemandeAchatService);
  private excelExportService = inject(ExcelExportService);
  private toastr = inject(ToastrService);
  private destroyRef = inject(DestroyRef);

  // ── Data signals ──────────────────────────────────────────────────────────
  demandes = signal<DemandeAchat[]>([]);
  loading  = signal(true);
  actionError = signal<string | null>(null);

  // ── Filter signals ────────────────────────────────────────────────────────
  activeTab   = signal<DemandeStatut | 'all'>('all');
  searchQuery = signal('');

  // ── Modals ────────────────────────────────────────────────────────────────
  showNewDemande = signal(false);
  exporting = signal(false);
  showExportModal = signal(false);

  // ── Dynamic columns ───────────────────────────────────────────────────────
  readonly daColumnDefs    = DA_COL_DEFS;
  readonly daDefaultColIds = DA_DEFAULT_COL_IDS;
  visibleColIds = signal<string[]>(loadDaColIds());
  /** Always appends the pinned action column at the end. */
  visibleCols = computed<ColumnDef[]>(() => {
    const byId = new Map(DA_COL_DEFS.map(c => [c.id, c]));
    const cols = this.visibleColIds().map(id => byId.get(id)!).filter(Boolean);
    return [...cols, DA_ACTION_COL];
  });
  showColManager = signal(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  nouvelles = computed(() => this.demandes().filter(d => d.statut === 'Nouvelle').length);

  filteredDemandes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.demandes().filter(d => {
      if (!q) return true;
      const designation = d.composant?.designation ?? d.pieceLibre ?? '';
      return (
        d.code.toLowerCase().includes(q) ||
        designation.toLowerCase().includes(q) ||
        `${d.demandeur.prenom} ${d.demandeur.nom}`.toLowerCase().includes(q) ||
        (d.demandeurNom ?? '').toLowerCase().includes(q)
      );
    });
  });

  tabs = [
    { label: 'Toutes',     value: 'all'        as const },
    { label: 'Nouvelles',  value: 'Nouvelle'   as DemandeStatut },
    { label: 'Approuvées', value: 'Approuvée'  as DemandeStatut },
    { label: 'Rejetées',   value: 'Rejetée'    as DemandeStatut },
    { label: 'Clôturées',  value: 'Clôturée'   as DemandeStatut },
  ];

  constructor() {
    this.loadDemandes();
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  loadDemandes(): void {
    this.loading.set(true);
    const params = this.activeTab() !== 'all' ? { statut: this.activeTab() as DemandeStatut } : {};
    this.demandeService.list(params).subscribe({
      next: (page) => { this.demandes.set(page.content); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  filterByTab(tab: DemandeStatut | 'all'): void {
    this.activeTab.set(tab);
    this.loadDemandes();
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  approuver(id: number): void {
    this.demandeService.approuver(id).subscribe({
      next: () => { this.actionError.set(null); this.loadDemandes(); },
      error: (err) => { console.error('Approbation failed', err); this.actionError.set("Erreur lors de l'approbation."); },
    });
  }

  rejeter(id: number): void {
    const raison = prompt('Raison du rejet :');
    if (raison) this.demandeService.rejeter(id, raison).subscribe({
      next: () => { this.actionError.set(null); this.loadDemandes(); },
      error: (err) => { console.error('Rejet failed', err); this.actionError.set('Erreur lors du rejet.'); },
    });
  }

  cloturer(id: number): void {
    this.demandeService.cloturer(id).subscribe({
      next: () => { this.actionError.set(null); this.loadDemandes(); },
      error: (err) => { console.error('Clôture failed', err); this.actionError.set('Erreur lors de la clôture.'); },
    });
  }

  onDemandeCreated(): void {
    this.showNewDemande.set(false);
    this.loadDemandes();
  }

  // ── Column management ─────────────────────────────────────────────────────
  onColumnsApplied(ids: string[]): void {
    this.visibleColIds.set(ids);
    try { localStorage.setItem(DA_LS_KEY, JSON.stringify(ids)); } catch {}
    this.showColManager.set(false);
  }

  // ── Export ────────────────────────────────────────────────────────────────
  readonly exportColDefs: ExportColDef[] = DA_COL_DEFS.filter(c => c.id !== 'photo');
  readonly currentExportFilters = computed<Record<string, string>>(() => {
    const tab = this.activeTab();
    const f: Record<string, string> = {};
    if (tab !== 'all') f['statut'] = tab;
    return f;
  });
  readonly exportFilterDefs: ExportFilterDef[] = [
    {
      key: 'statut', label: 'Statut', type: 'select',
      options: [
        { value: 'Nouvelle',  label: 'Nouvelle' },
        { value: 'Approuvée', label: 'Approuvée' },
        { value: 'Rejetée',   label: 'Rejetée' },
        { value: 'Clôturée',  label: 'Clôturée' },
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
    this.excelExportService.download({
      entites: 'demandesAchat',
      columns: result.columns,
      statut: result.filters['statut'],
    }).pipe(take(1)).subscribe({
      next: blob => { downloadBlobAs(blob, 'demandes-achat.xlsx'); this.exporting.set(false); },
      error: () => { this.toastr.error('Erreur lors de l\'export Excel.'); this.exporting.set(false); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  toRequestStatus(statut: string): 'nouvelle' | 'approuvee' | 'rejetee' | 'cloturee' {
    switch (statut) {
      case 'Nouvelle':  return 'nouvelle';
      case 'Approuvée': return 'approuvee';
      case 'Rejetée':   return 'rejetee';
      case 'Clôturée':  return 'cloturee';
      default:          return 'nouvelle';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const datePart = dateStr.slice(0, 10);
    const parts = datePart.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }
}
