import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { ComposantService } from './composant.service';
import { ComposantNode, ComposantCategorie, Composant } from '../../shared/models/composant.model';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ComposantFormModalComponent, ComposantFormContext } from './composant-form-modal.component';
import { ColumnDef, ColumnManagerModalComponent } from '../vehicules/list/column-manager-modal.component';
import {
  PageHeaderComponent,
  FilterChipComponent,
  DataTableHeaderComponent,
  DataTableRowComponent,
} from '../../shared/ui';
import { ExcelExportService } from '../../shared/services/excel-export.service';
import { downloadBlobAs } from '../../shared/utils/download-blob';

// ── Column configuration ──────────────────────────────────────────────────────

const COMP_COL_DEFS: ColumnDef[] = [
  { id: 'image',       label: 'Photo',        flex: 0.5 },
  { id: 'reference',   label: 'Référence',    flex: 1.2 },
  { id: 'designation', label: 'Désignation',  flex: 2.5 },
  { id: 'partie',      label: 'Partie',       flex: 1   },
  { id: 'unite',       label: 'Unité',        flex: 0.5 },
  { id: 'stock',       label: 'Stock',        flex: 0.7 },
  { id: 'actions',     label: 'Actions',      flex: 0.4 },
];

const COMP_DEFAULT_COL_IDS = ['image', 'reference', 'designation', 'partie', 'unite', 'stock', 'actions'];

const COMP_LS_KEY = 'fleet.composants.columns';

function loadCompColIds(): string[] {
  try {
    const v = localStorage.getItem(COMP_LS_KEY);
    return v ? JSON.parse(v) : COMP_DEFAULT_COL_IDS;
  } catch {
    return COMP_DEFAULT_COL_IDS;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type PartieFilter = 'all' | ComposantCategorie;

const PARTIE_LABELS: Record<string, string> = {
  moteur: 'Moteur',
  pneumatique: 'Pneumatique',
  freinage: 'Freinage',
  hydraulique: 'Hydraulique',
  electrique: 'Électrique',
  transmission: 'Transmission',
  chassis: 'Châssis',
  carrosserie: 'Carrosserie',
  suspension: 'Suspension',
  autre: 'Autre',
};

@Component({
  selector: 'app-composants',
  standalone: true,
  imports: [
    LucideAngularModule,
    SkeletonComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    FilterChipComponent,
    DataTableHeaderComponent,
    DataTableRowComponent,
    ComposantFormModalComponent,
    ColumnManagerModalComponent,
  ],
  template: `
    <div class="comp-page" style="animation: screenEnter 400ms ease both">

      <!-- Page header -->
      <app-page-header title="Composants" [count]="tree().length">
        <button class="btn-primary" type="button" (click)="openCreate()">
          + Nouveau composant
        </button>
      </app-page-header>

      <div class="comp-content">

        <!-- Search + filter card -->
        <div class="filter-card">
          <div class="search-wrap">
            <lucide-icon name="search" class="search-icon" [size]="15" />
            <input
              class="search-input"
              placeholder="Rechercher par nom, référence…"
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)" />
          </div>
          <span class="filter-label">Partie :</span>
          <app-filter-chip
            label="Toutes"
            [active]="partieFilter() === 'all'"
            (clicked)="partieFilter.set('all')" />
          @for (f of partieFilters; track f.value) {
            <app-filter-chip
              [label]="f.label"
              [active]="partieFilter() === f.value"
              (clicked)="partieFilter.set(partieFilter() === f.value ? 'all' : f.value)" />
          }
        </div>

        <!-- Table -->
        <div class="table-wrap">
          <app-data-table-header [cols]="visibleCols()" />

          @if (loading()) {
            <app-skeleton [rows]="6" height="52px" />
          } @else if (filteredNodes().length === 0) {
            <app-empty-state icon="⚙️" message="Aucun composant trouvé — essayez de modifier vos filtres." />
          } @else {
            @for (node of filteredNodes(); track node.id; let i = $index) {

              <!-- Level 1 — root node -->
              <app-data-table-row [idx]="i" [clickable]="node.children.length > 0" (rowClicked)="toggle(node.id)">
                @for (col of visibleCols(); track col.id) {
                  @switch (col.id) {
                    @case ('image') {
                      <div class="dtr-cell dtr-cell--img" [style.flex]="col.flex">
                        @if (node.imageUrl) {
                          <img [src]="node.imageUrl" alt="" class="row-img" />
                        } @else {
                          <lucide-icon name="image" [size]="18" class="row-img-placeholder" />
                        }
                      </div>
                    }
                    @case ('reference') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        @if (node.reference) {
                          <span class="ref-chip">{{ node.reference }}</span>
                        } @else {
                          <span class="ref-chip ref-chip--empty">—</span>
                        }
                      </div>
                    }
                    @case ('designation') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        @if (node.children.length > 0) {
                          <lucide-icon [name]="expanded().has(node.id) ? 'chevron-down' : 'chevron-right'" [size]="14" class="expand-icon" />
                        }
                        <span class="comp-designation">{{ node.designation }}</span>
                      </div>
                    }
                    @case ('partie') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        @if (node.categorie) {
                          <span class="partie-badge partie-badge--{{ node.categorie }}">{{ partieLabel(node.categorie) }}</span>
                        } @else {
                          <span class="partie-badge partie-badge--autre">—</span>
                        }
                      </div>
                    }
                    @case ('unite') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        <span class="mono-text">{{ node.unite ?? '—' }}</span>
                      </div>
                    }
                    @case ('stock') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        <span class="niveau-chip">{{ node.stock ?? '—' }}</span>
                      </div>
                    }
                    @case ('actions') {
                      <div class="dtr-cell dtr-cell--actions" [style.flex]="col.flex" (click)="$event.stopPropagation()">
                        <lucide-icon name="pencil" [size]="15" class="row-action" title="Modifier" (click)="openEdit(node)" />
                        @if (node.niveau < 3) {
                          <lucide-icon name="plus" [size]="15" class="row-action" title="Sous-composant" (click)="openCreateChild(node)" />
                        }
                        <lucide-icon name="trash-2" [size]="15" class="row-action row-action--danger" title="Supprimer" (click)="confirmDelete(node)" />
                      </div>
                    }
                  }
                }
              </app-data-table-row>

              <!-- Level 2 — children when expanded -->
              @if (expanded().has(node.id)) {
                @for (child of node.children; track child.id; let ci = $index) {
                  <app-data-table-row [idx]="i * 1000 + ci" [clickable]="child.children.length > 0" (rowClicked)="toggle(child.id)">
                    @for (col of visibleCols(); track col.id) {
                      @switch (col.id) {
                        @case ('image') {
                          <div class="dtr-cell dtr-cell--img" [style.flex]="col.flex">
                            @if (child.imageUrl) {
                              <img [src]="child.imageUrl" alt="" class="row-img" />
                            } @else {
                              <lucide-icon name="image" [size]="18" class="row-img-placeholder" />
                            }
                          </div>
                        }
                        @case ('reference') {
                          <div class="dtr-cell" [style.flex]="col.flex">
                            @if (child.reference) {
                              <span class="ref-chip">{{ child.reference }}</span>
                            } @else {
                              <span class="ref-chip ref-chip--empty">—</span>
                            }
                          </div>
                        }
                        @case ('designation') {
                          <div class="dtr-cell" [style.flex]="col.flex" style="padding-left: 40px">
                            @if (child.children.length > 0) {
                              <lucide-icon [name]="expanded().has(child.id) ? 'chevron-down' : 'chevron-right'" [size]="14" class="expand-icon" />
                            }
                            <span class="comp-designation comp-designation--child">{{ child.designation }}</span>
                          </div>
                        }
                        @case ('partie') {
                          <div class="dtr-cell" [style.flex]="col.flex">
                            @if (child.categorie) {
                              <span class="partie-badge partie-badge--{{ child.categorie }}">{{ partieLabel(child.categorie) }}</span>
                            }
                          </div>
                        }
                        @case ('unite') {
                          <div class="dtr-cell" [style.flex]="col.flex">
                            <span class="mono-text">{{ child.unite ?? '—' }}</span>
                          </div>
                        }
                        @case ('stock') {
                          <div class="dtr-cell" [style.flex]="col.flex">
                            <span class="niveau-chip niveau-chip--child">{{ child.stock ?? '—' }}</span>
                          </div>
                        }
                        @case ('actions') {
                          <div class="dtr-cell dtr-cell--actions" [style.flex]="col.flex" (click)="$event.stopPropagation()">
                            <lucide-icon name="pencil" [size]="15" class="row-action" title="Modifier" (click)="openEdit(child)" />
                            @if (child.niveau < 3) {
                              <lucide-icon name="plus" [size]="15" class="row-action" title="Sous-composant" (click)="openCreateChild(child)" />
                            }
                            <lucide-icon name="trash-2" [size]="15" class="row-action row-action--danger" title="Supprimer" (click)="confirmDelete(child)" />
                          </div>
                        }
                      }
                    }
                  </app-data-table-row>

                  <!-- Level 3 — leaves when expanded -->
                  @if (expanded().has(child.id)) {
                    @for (leaf of child.children; track leaf.id; let li = $index) {
                      <app-data-table-row [idx]="i * 10000 + ci * 100 + li">
                        @for (col of visibleCols(); track col.id) {
                          @switch (col.id) {
                            @case ('image') {
                              <div class="dtr-cell dtr-cell--img" [style.flex]="col.flex">
                                @if (leaf.imageUrl) {
                                  <img [src]="leaf.imageUrl" alt="" class="row-img" />
                                } @else {
                                  <lucide-icon name="image" [size]="18" class="row-img-placeholder" />
                                }
                              </div>
                            }
                            @case ('reference') {
                              <div class="dtr-cell" [style.flex]="col.flex">
                                @if (leaf.reference) {
                                  <span class="ref-chip">{{ leaf.reference }}</span>
                                } @else {
                                  <span class="ref-chip ref-chip--empty">—</span>
                                }
                              </div>
                            }
                            @case ('designation') {
                              <div class="dtr-cell" [style.flex]="col.flex" style="padding-left: 72px">
                                <span class="comp-designation comp-designation--leaf">{{ leaf.designation }}</span>
                              </div>
                            }
                            @case ('partie') {
                              <div class="dtr-cell" [style.flex]="col.flex">
                                @if (leaf.categorie) {
                                  <span class="partie-badge partie-badge--{{ leaf.categorie }}">{{ partieLabel(leaf.categorie) }}</span>
                                }
                              </div>
                            }
                            @case ('unite') {
                              <div class="dtr-cell" [style.flex]="col.flex">
                                <span class="mono-text">{{ leaf.unite ?? '—' }}</span>
                              </div>
                            }
                            @case ('stock') {
                              <div class="dtr-cell" [style.flex]="col.flex">
                                <span class="niveau-chip niveau-chip--leaf">{{ leaf.stock ?? '—' }}</span>
                              </div>
                            }
                            @case ('actions') {
                              <div class="dtr-cell dtr-cell--actions" [style.flex]="col.flex" (click)="$event.stopPropagation()">
                                <lucide-icon name="pencil" [size]="15" class="row-action" title="Modifier" (click)="openEdit(leaf)" />
                                <lucide-icon name="trash-2" [size]="15" class="row-action row-action--danger" title="Supprimer" (click)="confirmDelete(leaf)" />
                              </div>
                            }
                          }
                        }
                      </app-data-table-row>
                    }
                  }
                }
              }
            }
          }
        </div>

        <!-- Footer toolbar: pagination area + Export + Column manager -->
        <div class="table-footer">
          <div></div>
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

      <!-- Delete confirmation -->
      @if (deleteTarget()) {
        <div class="confirm-overlay" (click)="deleteTarget.set(null)">
          <div class="confirm-dialog" (click)="$event.stopPropagation()">
            <h3 class="confirm-title">Supprimer le composant ?</h3>
            <p class="confirm-msg">
              Supprimer <strong>{{ deleteTarget()!.designation }}</strong> ?
              Cette action est irréversible.
            </p>
            <div class="confirm-actions">
              <button class="btn-cancel" (click)="deleteTarget.set(null)">Annuler</button>
              <button class="btn-danger" (click)="doDelete()">Supprimer</button>
            </div>
          </div>
        </div>
      }

      <!-- Form modal (create / edit) -->
      @if (formCtx()) {
        <app-composant-form-modal
          [ctx]="formCtx()!"
          (saved)="onFormSaved()"
          (close)="formCtx.set(null)" />
      }

      <!-- Column manager modal -->
      @if (showColManager()) {
        <app-column-manager-modal
          [allColumnDefs]="compColDefs"
          [defaultVisibleIds]="compDefaultColIds"
          [currentVisible]="visibleColIds()"
          (applied)="onColumnsApplied($event)"
          (cancel)="showColManager.set(false)" />
      }


    </div>
  `,
  styles: [`
    @keyframes screenEnter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .comp-page { background: #F5F5F5; min-height: calc(100vh - 72px); }
    .comp-content { padding: 20px 32px 32px; }

    /* Filter card */
    .filter-card { background: var(--color-surface); border-radius: 12px; border: 1px solid var(--color-border); padding: 14px 20px; margin-bottom: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .filter-label { font-family: 'Open Sans', sans-serif; font-size: 13px; color: #6B7280; font-weight: 500; }
    .search-wrap { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 10px; color: #9CA3AF; pointer-events: none; }
    .search-input { height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--color-border); border-radius: 8px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; width: 300px; outline: none; transition: border-color 150ms; }
    .search-input:focus { border-color: var(--color-primary, #1A56DB); }

    /* Table */
    .table-wrap { background: white; border-radius: 12px; border: 1px solid var(--color-border); box-shadow: 0 1px 3px rgba(0,0,0,0.07); overflow: visible; margin-bottom: 16px; }

    /* Shared cell */
    .dtr-cell { padding: 0 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text, #111827); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; }
    /* Actions cell must allow the absolutely-positioned dropdown to overflow the table bounds */
    .dtr-cell--actions { justify-content: center; overflow: visible; }
    .dtr-cell--img { justify-content: center; padding: 4px 8px; }
    .row-img { height: 36px; width: 52px; object-fit: cover; border-radius: 4px; display: block; }
    .row-img-placeholder { color: #D1D5DB; }

    /* Expand icon */
    .expand-icon { color: #6B7280; margin-right: 6px; flex-shrink: 0; }

    /* Ref chip */
    .ref-chip { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500; background: #F5F5F5; padding: 2px 8px; border-radius: 4px; border: 1px solid #E5E5E5; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: inline-block; }
    .ref-chip--empty { background: transparent; border-color: transparent; color: #9CA3AF; }

    /* Mono text */
    .mono-text { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #6B7280; }

    /* Designation */
    .comp-designation { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 500; color: #111827; }
    .comp-designation--child { font-weight: 400; color: #374151; }
    .comp-designation--leaf { font-weight: 400; color: #6B7280; font-size: 12px; }

    /* Partie badges */
    .partie-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: 'Open Sans', sans-serif; white-space: nowrap; }
    .partie-badge--moteur      { background: #EFF6FF; color: #1D4ED8; }
    .partie-badge--pneumatique { background: #FFF7ED; color: #C2410C; }
    .partie-badge--freinage    { background: #FEF2F2; color: #B91C1C; }
    .partie-badge--hydraulique { background: #F0FDFA; color: #0F766E; }
    .partie-badge--electrique  { background: #FEFCE8; color: #A16207; }
    .partie-badge--transmission{ background: #FAF5FF; color: #7E22CE; }
    .partie-badge--chassis     { background: #F0F9FF; color: #0369A1; }
    .partie-badge--carrosserie { background: #FFF1F2; color: #BE185D; }
    .partie-badge--suspension  { background: #ECFDF5; color: #065F46; }
    .partie-badge--autre       { background: #F3F4F6; color: #6B7280; }

    /* Niveau chip */
    .niveau-chip { font-family: 'Open Sans', sans-serif; font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #F3F4F6; color: #374151; font-weight: 500; }
    .niveau-chip--child { background: #E5E7EB; color: #6B7280; }
    .niveau-chip--leaf  { background: #F9FAFB; color: #9CA3AF; }

    /* Inline row actions */
    .row-action { color: #9CA3AF; cursor: pointer; }
    .row-action:hover { color: var(--color-primary); }
    .row-action--danger:hover { color: #DC2626; }
    .dtr-cell--actions { gap: 10px; }

    /* Footer toolbar */
    .table-footer { display: flex; align-items: center; justify-content: flex-end; padding: 4px 0; }
    .table-actions { display: flex; align-items: center; gap: 8px; }
    .btn-export { height: 34px; padding: 0 14px; background: white; border: 1px solid var(--color-border); border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .btn-export:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .btn-settings { height: 34px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); cursor: pointer; display: flex; align-items: center; color: var(--color-text-muted); }
    .btn-settings:hover { background: #F9FAFB; color: var(--color-text); }

    /* Buttons */
    .btn-primary { height: 36px; padding: 0 16px; border-radius: 8px; border: none; background: var(--color-primary, #E87722); color: #fff; font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 150ms; white-space: nowrap; }
    .btn-primary:hover { opacity: 0.9; }

    /* Delete confirm dialog */
    .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 500; }
    .confirm-dialog { background: white; border-radius: 12px; padding: 28px 32px; width: 420px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
    .confirm-title { font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 10px; }
    .confirm-msg { font-family: 'Open Sans', sans-serif; font-size: 14px; color: #6B7280; margin: 0 0 24px; line-height: 1.5; }
    .confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .btn-cancel { background: transparent; border: 1px solid var(--color-border); border-radius: 8px; padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; cursor: pointer; color: #374151; }
    .btn-danger { background: #DC2626; color: white; border: none; border-radius: 8px; padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-danger:hover { background: #B91C1C; }
  `],
})
export class ComposantsComponent {
  private composantService = inject(ComposantService);
  private excelExportService = inject(ExcelExportService);
  private toastr = inject(ToastrService);
  private destroyRef = inject(DestroyRef);

  // ── Data signals ─────────────────────────────────────────────────────────────
  tree    = signal<ComposantNode[]>([]);
  loading = signal(true);
  expanded = signal<Set<number>>(new Set());

  // ── Filter signals ────────────────────────────────────────────────────────────
  searchQuery   = signal('');
  partieFilter  = signal<PartieFilter>('all');

  // ── Dynamic columns ───────────────────────────────────────────────────────────
  readonly compColDefs = COMP_COL_DEFS;
  readonly compDefaultColIds = COMP_DEFAULT_COL_IDS;
  visibleColIds = signal<string[]>(loadCompColIds());
  visibleCols = computed<ColumnDef[]>(() => {
    const byId = new Map(COMP_COL_DEFS.map(c => [c.id, c]));
    return this.visibleColIds().map(id => byId.get(id)!).filter(Boolean);
  });
  showColManager = signal(false);
  exporting = signal(false);

  // ── Modals ────────────────────────────────────────────────────────────────────
  formCtx = signal<ComposantFormContext | null>(null);
  deleteTarget = signal<ComposantNode | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────────
  filteredNodes = computed(() => {
    const q      = this.searchQuery().toLowerCase().trim();
    const partie = this.partieFilter();
    return this.tree().filter(node => {
      const matchQ = !q || node.designation.toLowerCase().includes(q) || (node.reference ?? '').toLowerCase().includes(q);
      const matchP = partie === 'all' || node.categorie === partie;
      return matchQ && matchP;
    });
  });

  // ── Static config ─────────────────────────────────────────────────────────────
  readonly partieFilters: { value: ComposantCategorie; label: string }[] = [
    { value: 'moteur',        label: 'Moteur' },
    { value: 'pneumatique',   label: 'Pneumatique' },
    { value: 'freinage',      label: 'Freinage' },
    { value: 'hydraulique',   label: 'Hydraulique' },
    { value: 'electrique',    label: 'Électrique' },
    { value: 'transmission',  label: 'Transmission' },
    { value: 'autre',         label: 'Autre' },
  ];

  constructor() {
    this.loadTree();
  }

  // ── Tree loading ──────────────────────────────────────────────────────────────
  loadTree(): void {
    this.loading.set(true);
    this.composantService.tree().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (data) => {
        this.tree.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Expand / collapse ─────────────────────────────────────────────────────────
  toggle(id: number): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Create root composant ─────────────────────────────────────────────────────
  openCreate(): void {
    this.formCtx.set({});
  }

  // ── Edit an existing composant ────────────────────────────────────────────────
  openEdit(node: ComposantNode): void {
    // Build a Composant object from the node for the form
    const composant: Composant = {
      id: node.id,
      parentId: null,
      niveau: node.niveau,
      reference: node.reference ?? null,
      designation: node.designation,
      categorie: node.categorie,
      unite: node.unite ?? null,
      marque: null,
      prixUnitaire: null,
      stock: node.stock ?? 0,
      actif: true,
      imageUrl: node.imageUrl ?? null,
      vehiculeType: node.vehiculeType ?? null,
      creePar: null,
    };
    this.formCtx.set({ composant });
  }

  // ── Create child / subcomposant ───────────────────────────────────────────────
  openCreateChild(node: ComposantNode): void {
    this.formCtx.set({
      parent: { id: node.id, designation: node.designation, niveau: node.niveau as 1 | 2 },
    });
  }

  // ── Delete confirmation + execution ──────────────────────────────────────────
  confirmDelete(node: ComposantNode): void {
    this.deleteTarget.set(node);
  }

  doDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleteTarget.set(null);
    this.composantService.delete(target.id).subscribe({
      next: () => {
        this.toastr.success(`"${target.designation}" supprimé.`);
        this.reloadTree();
      },
      error: (err) => {
        const msg = err?.error?.error ?? err?.error?.message ?? err?.message;
        this.toastr.error(msg ?? 'Impossible de supprimer ce composant.');
      },
    });
  }

  // ── After form save ───────────────────────────────────────────────────────────
  onFormSaved(): void {
    this.formCtx.set(null);
    this.toastr.success('Composant enregistré.');
    this.reloadTree();
  }

  private reloadTree(): void {
    this.composantService.tree().subscribe({
      next: (data) => this.tree.set(data),
    });
  }

  // ── Column manager ────────────────────────────────────────────────────────────
  onColumnsApplied(ids: string[]): void {
    this.visibleColIds.set(ids);
    try { localStorage.setItem(COMP_LS_KEY, JSON.stringify(ids)); } catch {}
    this.showColManager.set(false);
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  onExport(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.excelExportService.download({ entites: 'composants' }).pipe(
      take(1),
    ).subscribe({
      next: (blob) => {
        downloadBlobAs(blob, 'composants.xlsx');
        this.exporting.set(false);
      },
      error: () => {
        this.toastr.error('Erreur lors de l\'export Excel.');
        this.exporting.set(false);
      },
    });
  }

  partieLabel(cat: ComposantCategorie | null): string {
    return cat ? (PARTIE_LABELS[cat] ?? cat) : '—';
  }
}
