import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY } from 'rxjs';
import { switchMap, map, catchError, debounceTime } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { InterventionService } from './intervention.service';
import { Intervention, InterventionStatut, InterventionCategorie } from '../../shared/models/intervention.model';
import { Page } from '../../shared/models/pagination.model';
import { DateFrPipe } from '../../shared/pipes/date-fr.pipe';
import { CurrencyMadPipe } from '../../shared/pipes/currency-mad.pipe';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { NewInterventionModalComponent } from './new-intervention-modal.component';
import { CloturerConfirmModalComponent } from './cloturer-confirm-modal.component';
import { ColumnDef, ColumnManagerModalComponent } from '../vehicules/list/column-manager-modal.component';
import { DataTableCol } from '../../shared/ui/data-table/data-table-header.component';
import {
  PageHeaderComponent,
  TabGroupComponent,
  FilterChipComponent,
  DataTableHeaderComponent,
  DataTableRowComponent,
  SevBadgeComponent,
  StatusBadgeComponent,
  ImageLightboxComponent,
  ExportExcelModalComponent,
} from '../../shared/ui';
import { exportToXlsx } from '../../shared/utils/export-xlsx';

type TabId = 'en_cours' | 'cloture' | 'all';
type CategorieFilter = 'all' | InterventionCategorie;

const TAB_STATUTS: (string | undefined)[] = ['en_cours', 'cloture', undefined];

const INT_LS_KEY = 'fleet.interventions-global.columns';

const INT_COL_DEFS: ColumnDef[] = [
  { id: 'nBs',       label: 'N°BS',         flex: 0.9 },
  { id: 'date',      label: 'Date',         flex: 0.8 },
  { id: 'vehicule',  label: 'Véhicule',     flex: 0.9 },
  { id: 'categorie', label: 'Type',         flex: 1   },
  { id: 'composant', label: 'Composant',    flex: 2   },
  { id: 'cout',      label: 'Coût (MAD)',   flex: 0.9 },
  { id: 'photo',     label: 'Image',        flex: 0.6 },
  { id: 'statut',    label: 'Statut',       flex: 1   },
];
/** The Actions column is always pinned — never shown in the column manager. */
const INT_ACTION_COL: ColumnDef = { id: 'action', label: 'Actions', flex: 0.9 };
/** Manageable columns passed to the column-manager modal (excludes the pinned action col). */
const INT_COL_DEFS_MANAGEABLE = INT_COL_DEFS;
const INT_DEFAULT_COL_IDS = ['nBs', 'date', 'vehicule', 'categorie', 'composant', 'cout', 'photo', 'statut'];

function loadIntColIds(): string[] {
  try {
    const v = localStorage.getItem(INT_LS_KEY);
    const ids: string[] = v ? JSON.parse(v) : INT_DEFAULT_COL_IDS;
    return ids.filter(id => id !== 'action'); // strip legacy pinned col
  }
  catch { return INT_DEFAULT_COL_IDS; }
}

@Component({
  selector: 'app-interventions',
  standalone: true,
  imports: [
    DateFrPipe, CurrencyMadPipe,
    EmptyStateComponent, SkeletonComponent,
    PageHeaderComponent, TabGroupComponent, FilterChipComponent,
    DataTableHeaderComponent, DataTableRowComponent,
    SevBadgeComponent, StatusBadgeComponent,
    NewInterventionModalComponent, CloturerConfirmModalComponent,
    LucideAngularModule, ColumnManagerModalComponent,
    ImageLightboxComponent, ExportExcelModalComponent,
  ],
  template: `
    <div class="int-page">
      <!-- Page header -->
      <app-page-header title="Interventions" [count]="totalElements() ?? undefined">
        <button class="btn-primary" (click)="showNewModal.set(true)" type="button">
          + Nouvelle intervention
        </button>
      </app-page-header>

      @if (loadError()) {
        <div style="margin:16px 32px;padding:12px 16px;background:#FEE2E2;color:#991B1B;border-radius:8px;font-family:'Open Sans',sans-serif;font-size:13px;">
          Impossible de charger les interventions. Vérifiez votre connexion ou contactez l'administrateur.
        </div>
      }

      <div class="int-content">
        <!-- Tabs + filter card -->
        <div class="filter-card">
          <app-tab-group
            [tabs]="tabDefs"
            [activeIndex]="activeTabIndex()"
            (tabChange)="onTabChange($event)" />

          <div class="filter-row">
            <div class="search-wrap">
              <lucide-icon name="search" class="search-icon" [size]="15" />
              <input class="search-input" placeholder="Rechercher ID, véhicule, composant…"
                     (input)="onSearchInput($any($event.target).value)" />
            </div>
            <span class="filter-label">Catégorie :</span>
            @for (f of categorieFilters; track f.value) {
              <app-filter-chip
                [label]="f.label"
                [active]="categorieFilter() === f.value"
                (clicked)="onCategorieFilter(f.value)" />
            }
          </div>
        </div>

        <!-- Table -->
        <div class="table-wrap">
          <app-data-table-header [cols]="headerCols()" />

          @if (loading() && interventions().length === 0) {
            <app-skeleton [rows]="6" height="52px" />
          } @else if (interventions().length === 0) {
            <app-empty-state icon="🔧" message="Aucune intervention trouvée — essayez de modifier vos filtres." />
          } @else {
            @for (intervention of interventions(); track intervention.id; let i = $index) {
              <app-data-table-row [idx]="i" [clickable]="true" (rowClicked)="toggleExpand(intervention.id)">
                <div class="chevron-cell">
                  <lucide-icon
                    [name]="expandedIds().has(intervention.id) ? 'chevron-down' : 'chevron-right'"
                    [size]="14" />
                </div>
                @for (col of visibleCols(); track col.id) {
                  @switch (col.id) {
                    @case ('nBs') {
                      <div class="td td--nbs" [style.flex]="col.flex">
                        @if (intervention.nBs) {
                          @for (code of nBsCodes(intervention.nBs); track code) {
                            <span class="bs-chip">{{ code }}</span>
                          }
                        } @else {
                          <span class="mono grey">—</span>
                        }
                      </div>
                    }
                    @case ('date') {
                      <div class="td td--w08 mono" [style.flex]="col.flex">{{ intervention.dateDebut | dateFr:'short' }}</div>
                    }
                    @case ('vehicule') {
                      <div class="td td--w09" [style.flex]="col.flex">
                        <span class="code-chip">{{ intervention.vehicule.code }}</span>
                      </div>
                    }
                    @case ('categorie') {
                      <div class="td td--w1" [style.flex]="col.flex">
                        <app-sev-badge [type]="intervention.categorie" />
                      </div>
                    }
                    @case ('composant') {
                      <div class="td td--w2 desc" [style.flex]="col.flex">
                        {{ intervention.composant?.designation ?? intervention.typeIntervention.libelle }}
                      </div>
                    }
                    @case ('cout') {
                      <div class="td td--w09 mono cost" [style.flex]="col.flex">{{ intervention.coutTotal | currencyMad }}</div>
                    }
                    @case ('photo') {
                      <div class="td td--photo" [style.flex]="col.flex">
                        <app-image-lightbox [src]="intervention.photoUrl" />
                      </div>
                    }
                    @case ('statut') {
                      <div class="td td--w1" [style.flex]="col.flex">
                        <app-status-badge [status]="intervention.statut" [label]="statutLabels[intervention.statut]" />
                      </div>
                    }
                    @case ('action') {
                      <div class="td td--w09" [style.flex]="col.flex">
                        @if (intervention.statut !== 'cloture') {
                          <button class="btn-cloturer" (click)="$event.stopPropagation(); onCloturer(intervention)" type="button">
                            Clôturer
                          </button>
                        }
                      </div>
                    }
                  }
                }
              </app-data-table-row>
              @if (expandedIds().has(intervention.id)) {
                <div class="int-detail">
                  <div class="int-detail-grid">
                    <div class="int-detail-item">
                      <span class="int-detail-label">Composant</span>
                      <span class="int-detail-value">{{ intervention.composant?.designation ?? '—' }}</span>
                    </div>
                    <div class="int-detail-item">
                      <span class="int-detail-label">Temps</span>
                      <span class="int-detail-value">{{ intervention.tempsHeures != null ? (intervention.tempsHeures + ' h') : '—' }}</span>
                    </div>
                  </div>
                  @if (intervention.observations) {
                    <div class="int-detail-obs">
                      <span class="int-detail-label">Observations</span>
                      <span class="int-detail-value">{{ intervention.observations }}</span>
                    </div>
                  }
                </div>
              }
            }
          }
        </div>

        <!-- Pagination info + Charger plus + table actions toolbar -->
        <div class="table-footer">
          <div class="pagination-bar">
            @if (interventions().length > 0) {
              <span class="pagination-info">
                Affichage 1–{{ interventions().length }} sur {{ totalElements() ?? '…' }}
              </span>
              @if (hasMore()) {
                <button class="btn-charger-plus" (click)="chargerPlus()" [disabled]="loadingMore()" type="button">
                  {{ loadingMore() ? 'Chargement…' : 'Charger plus' }}
                </button>
              }
            }
          </div>
          <div class="table-actions">
            <button class="btn-export" (click)="openExportModal()" type="button" title="Exporter en Excel">
              <lucide-icon name="download" [size]="14" />
              Export Excel
            </button>
            <button class="btn-settings" type="button" title="Gérer les colonnes" (click)="showColManager.set(true)">
              <lucide-icon name="settings" [size]="15" />
            </button>
          </div>
        </div>
      </div>

      @if (showNewModal()) {
        <app-new-intervention-modal
          (saved)="onInterventionSaved($event)"
          (close)="showNewModal.set(false)" />
      }

      @if (cloturerIntervention()) {
        <app-cloturer-confirm-modal
          [interventionLabel]="cloturerIntervention()!.nBs ?? cloturerIntervention()!.id.toString()"
          (confirmed)="onCloturerConfirmed()"
          (cancel)="cloturerIntervention.set(null)" />
      }

      @if (showColManager()) {
        <app-column-manager-modal
          [allColumnDefs]="intColumnDefs"
          [defaultVisibleIds]="intDefaultColIds"
          [currentVisible]="visibleColIds()"
          (applied)="onColumnsApplied($event)"
          (cancel)="showColManager.set(false)" />
      }

      @if (showExportModal()) {
        <app-export-excel-modal
          [allColumns]="exportColDefs"
          [initialVisible]="visibleColIds()"
          [filterSummary]="exportFilterSummary()"
          (exported)="onExportConfirmed($event)"
          (cancel)="showExportModal.set(false)" />
      }
    </div>
  `,
  styles: [`
    .int-page { background: #F5F5F5; min-height: calc(100vh - 72px); }
    .int-content { padding: 20px 32px 32px; }

    /* Filter card */
    .filter-card { background: white; border-radius: 12px; border: 1px solid var(--color-border); margin-bottom: 20px; overflow: hidden; }
    .filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 14px 20px; border-top: 1px solid var(--color-border); }
    .filter-label { font-family: 'Open Sans', sans-serif; font-size: 13px; color: #6B7280; flex-shrink: 0; }

    /* Search input */
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
      min-width: 240px;
    }
    .search-input:focus { border-color: var(--color-primary); }

    /* Table */
    .table-wrap { background: white; border-radius: 12px; border: 1px solid var(--color-border); box-shadow: 0 1px 2px rgba(17,24,39,.06); overflow: hidden; margin-bottom: 16px; }

    /* Table cells */
    .td { display: flex; align-items: center; height: 52px; padding: 0 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .td--photo { overflow: visible; }
    .td.mono  { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .td.grey  { color: #6B7280; }
    .td.desc  { color: #374151; white-space: normal; overflow: visible; }
    .td.cost  { color: var(--color-primary); font-weight: 600; justify-content: flex-end; }
    .td--w09  { flex: 0.9; }
    .td--w08  { flex: 0.8; }
    .td--w1   { flex: 1; }
    .td--w2   { flex: 2; }

    /* Véhicule code chip */
    .code-chip { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; background: #F5F5F5; padding: 2px 8px; border-radius: 4px; border: 1px solid #E5E5E5; }

    /* Clôturer button */
    .btn-cloturer { background: transparent; border: 1px solid #DC2626; color: #DC2626; border-radius: 6px; padding: 4px 12px; font-family: 'Open Sans', sans-serif; font-size: 12px; cursor: pointer; transition: background 150ms; }
    .btn-cloturer:hover { background: #FEF2F2; }

    /* Primary button */
    .btn-primary { height: 40px; padding: 0 16px; background: var(--color-primary); border: none; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: white; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 150ms; }
    .btn-primary:hover { background: var(--color-primary-dark, #E6851A); }

    /* Export button */
    .btn-export { height: 40px; padding: 0 16px; background: white; border: 1px solid var(--color-border); border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: border-color 150ms; }
    .btn-export:hover { border-color: var(--color-primary); color: var(--color-primary); }

    /* Column manager button */
    .btn-settings { margin-left: auto; height: 34px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); cursor: pointer; display: flex; align-items: center; color: var(--color-text-muted); transition: background 150ms; }
    .btn-settings:hover { background: #F9FAFB; color: var(--color-text); }

    /* Footer toolbar */
    .table-footer { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
    .pagination-bar { display: flex; align-items: center; gap: 16px; }
    .pagination-info { font-family: 'Open Sans', sans-serif; font-size: 13px; color: #6B7280; }
    .btn-charger-plus { height: 34px; padding: 0 16px; background: white; border: 1px solid var(--color-border); border-radius: 8px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; cursor: pointer; transition: border-color 150ms; }
    .btn-charger-plus:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
    .btn-charger-plus:disabled { opacity: 0.6; cursor: default; }
    /* Table actions (Export + gear) */
    .table-actions { display: flex; align-items: center; gap: 8px; }
    /* N°BS chips */
    .td--nbs { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-height: 52px; height: auto; padding: 6px 16px; }
    .bs-chip { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 500; background: #F3F4F6; border: 1px solid #E5E7EB; color: #374151; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }

    /* Expandable rows */
    .chevron-cell { width: 28px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #9CA3AF; }
    .int-detail { background: #F9FAFB; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); padding: 12px 24px 12px 54px; }
    .int-detail-grid { display: flex; flex-wrap: wrap; gap: 16px 32px; }
    .int-detail-item { display: flex; flex-direction: column; gap: 2px; }
    .int-detail-label { font-family: 'Open Sans', sans-serif; font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.04em; }
    .int-detail-value { font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; }
    .int-detail-obs { margin-top: 10px; display: flex; flex-direction: column; gap: 2px; }
  `],
})
export class InterventionsComponent {
  private interventionService = inject(InterventionService);
  private destroyRef = inject(DestroyRef);

  activeTabIndex = signal(0);
  categorieFilter = signal<CategorieFilter>('all');
  loading = signal(true);
  loadingMore = signal(false);
  loadError = signal(false);
  showNewModal = signal(false);
  showColManager = signal(false);
  showExportModal = signal(false);
  cloturerIntervention = signal<Intervention | null>(null);
  interventions = signal<Intervention[]>([]);
  totalElements = signal<number | null>(null);
  expandedIds = signal<Set<number>>(new Set());

  readonly intColumnDefs = INT_COL_DEFS_MANAGEABLE;
  readonly intDefaultColIds = INT_DEFAULT_COL_IDS;
  /** Columns available in the export modal (excludes pinned action col). */
  readonly exportColDefs = INT_COL_DEFS_MANAGEABLE;
  visibleColIds = signal<string[]>(loadIntColIds());
  /** Always appends the pinned action column at the end. */
  visibleCols = computed<ColumnDef[]>(() => {
    const cols = this.visibleColIds()
      .filter(id => id !== 'action')
      .map(id => INT_COL_DEFS.find(c => c.id === id))
      .filter((c): c is ColumnDef => !!c);
    return [...cols, INT_ACTION_COL];
  });

  /** Header columns: chevron spacer + data columns */
  headerCols = computed<DataTableCol[]>(() => [
    { label: '', flex: 0, minWidth: 28 },
    ...this.visibleCols(),
  ]);

  exportFilterSummary = computed(() => {
    const parts: string[] = [];
    const tabLabels = ['En cours', 'Terminées', 'Toutes'];
    parts.push(`Onglet: ${tabLabels[this.activeTabIndex()]}`);
    if (this.categorieFilter() !== 'all') parts.push(`Catégorie: ${this.categorieFilter()}`);
    if (this.searchQuery) parts.push(`Recherche: "${this.searchQuery}"`);
    return parts.join(' | ');
  });

  private currentPage = 0;
  private readonly PAGE_SIZE = 6;
  private searchQuery = '';
  private readonly searchRaw$ = new Subject<string>();
  private readonly fetchTrigger$ = new Subject<{ page: number; append: boolean; force?: boolean }>();

  hasMore = computed(() => this.interventions().length < (this.totalElements() ?? 0));

  readonly tabDefs = [
    { label: 'En cours',  badge: undefined as number | undefined },
    { label: 'Terminées', badge: undefined as number | undefined },
    { label: 'Toutes',    badge: undefined as number | undefined },
  ];

  readonly categorieFilters: { label: string; value: CategorieFilter }[] = [
    { label: 'Préventive',  value: 'preventive'  },
    { label: 'Corrective',  value: 'corrective'  },
    { label: 'Dépannage',   value: 'depannage'   },
    { label: 'Contrôle',    value: 'controle'    },
  ];

  readonly statutLabels: Record<InterventionStatut, string> = {
    ouvert:   'Ouvert',
    en_cours: 'En cours',
    cloture:  'Clôturé',
  };

  constructor() {
    this.fetchTrigger$.pipe(
      switchMap(({ page, append, force }) =>
        this.interventionService.list({
          page,
          size: this.PAGE_SIZE,
          q: this.searchQuery || undefined,
          statut: TAB_STATUTS[this.activeTabIndex()],
          categorie: this.categorieFilter() === 'all' ? undefined : this.categorieFilter() as InterventionCategorie,
        }, force ?? false).pipe(
          map(p => ({ p, append })),
          catchError(() => {
            this.loading.set(false);
            this.loadingMore.set(false);
            this.loadError.set(true);
            return EMPTY;
          }),
        )
      ),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ p, append }) => {
      this.interventions.update(list => append ? [...list, ...p.content] : p.content);
      this.totalElements.set(p.totalElements);
      this.loading.set(false);
      this.loadingMore.set(false);
      this.loadError.set(false);
    });

    this.searchRaw$.pipe(
      debounceTime(250),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(q => {
      this.searchQuery = q;
      this.currentPage = 0;
      this.loading.set(true);
      this.fetchTrigger$.next({ page: 0, append: false });
    });

    this.fetchTrigger$.next({ page: 0, append: false, force: true });
  }

  onSearchInput(value: string): void {
    this.searchRaw$.next(value);
  }

  onTabChange(index: number): void {
    this.activeTabIndex.set(index);
    this.currentPage = 0;
    this.loading.set(true);
    this.fetchTrigger$.next({ page: 0, append: false });
  }

  onCategorieFilter(value: CategorieFilter): void {
    this.categorieFilter.set(this.categorieFilter() === value ? 'all' : value);
    this.currentPage = 0;
    this.loading.set(true);
    this.fetchTrigger$.next({ page: 0, append: false });
  }

  chargerPlus(): void {
    this.currentPage++;
    this.loadingMore.set(true);
    this.fetchTrigger$.next({ page: this.currentPage, append: true });
  }

  toggleExpand(id: number): void {
    const s = new Set(this.expandedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expandedIds.set(s);
  }

  onCloturer(intervention: Intervention): void {
    this.cloturerIntervention.set(intervention);
  }

  onCloturerConfirmed(): void {
    const intervention = this.cloturerIntervention();
    if (!intervention) return;
    this.loading.set(true);
    this.interventionService.cloturer(intervention.id).subscribe({
      next: () => {
        this.interventionService.invalidate();
        this.cloturerIntervention.set(null);
        this.currentPage = 0;
        this.fetchTrigger$.next({ page: 0, append: false });
      },
      error: () => {
        this.loading.set(false);
        this.cloturerIntervention.set(null);
      },
    });
  }

  onColumnsApplied(ids: string[]): void {
    const filtered = ids.filter(id => id !== 'action'); // action col is always pinned
    this.visibleColIds.set(filtered);
    try { localStorage.setItem(INT_LS_KEY, JSON.stringify(filtered)); } catch {}
    this.showColManager.set(false);
  }

  /** Split a raw N°BS string (space/comma-separated codes) into individual chips. */
  nBsCodes(nBs: string): string[] {
    return nBs.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  }

  onInterventionSaved(_intervention: Intervention): void {
    this.showNewModal.set(false);
    this.interventionService.invalidate();
    this.currentPage = 0;
    this.loading.set(true);
    this.fetchTrigger$.next({ page: 0, append: false, force: true });
  }

  openExportModal(): void {
    this.showExportModal.set(true);
  }

  onExportConfirmed(colIds: string[]): void {
    this.showExportModal.set(false);
    const colDefs = colIds
      .map(id => INT_COL_DEFS.find(c => c.id === id))
      .filter((c): c is ColumnDef => !!c);

    this.interventionService.list({
      size: 1000,
      q: this.searchQuery || undefined,
      statut: TAB_STATUTS[this.activeTabIndex()],
      categorie: this.categorieFilter() === 'all' ? undefined : this.categorieFilter() as InterventionCategorie,
    }).subscribe(page => {
      const rows = page.content.map(iv => {
        const row: Record<string, unknown> = {};
        for (const col of colDefs) {
          switch (col.id) {
            case 'nBs':       row[col.id] = iv.nBs ?? ''; break;
            case 'date':      row[col.id] = iv.dateDebut ? new Date(iv.dateDebut).toLocaleDateString('fr-FR') : ''; break;
            case 'vehicule':  row[col.id] = iv.vehicule?.code ?? ''; break;
            case 'categorie': row[col.id] = iv.categorie; break;
            case 'composant': row[col.id] = iv.composant?.designation ?? iv.typeIntervention.libelle; break;
            case 'cout':      row[col.id] = iv.coutTotal ?? ''; break;
            case 'photo':     row[col.id] = iv.photoUrl ?? ''; break;
            case 'statut':    row[col.id] = iv.statut; break;
          }
        }
        return row;
      });
      exportToXlsx(rows, colDefs, 'interventions.xlsx');
    });
  }
}
