import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { take, switchMap, BehaviorSubject } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { ComposantService } from './composant.service';
import { ComposantNode, ComposantCategorie, Composant } from '../../shared/models/composant.model';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ComposantFormModalComponent, ComposantFormContext } from './composant-form-modal.component';
import { ColumnDef, ColumnManagerModalComponent } from '../vehicules/list/column-manager-modal.component';
import { ImageLightboxComponent } from '../../shared/ui/image-lightbox/image-lightbox.component';
import {
  PageHeaderComponent,
  FilterChipComponent,
  DataTableHeaderComponent,
  DataTableRowComponent,
} from '../../shared/ui';
import { ExcelExportService } from '../../shared/services/excel-export.service';
import { downloadBlobAs } from '../../shared/utils/download-blob';
import {
  ExportExcelModalComponent,
  ExportColDef,
  ExportFilterDef,
  ExportResult,
} from '../../shared/ui/export-excel-modal/export-excel-modal.component';

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

// ── Vehicle type selector ─────────────────────────────────────────────────────

const VEHICULE_TYPES: { value: string | null; label: string }[] = [
  { value: null,              label: 'Tous les types' },
  { value: 'camion',          label: 'Camion' },
  { value: 'camion_tracteur', label: 'Camion Tracteur' },
  { value: 'semi_remorque',   label: 'Semi-Remorque' },
  { value: 'voiture',         label: 'Voiture' },
  { value: 'chariot',         label: 'Chariot' },
  { value: 'chargeur',        label: 'Chargeur' },
  { value: 'bus',             label: 'Bus' },
  { value: 'balayeuse',       label: 'Balayeuse' },
  { value: 'pick_up',         label: 'Pick-up' },
];

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
    DecimalPipe,
    LucideAngularModule,
    ImageLightboxComponent,
    SkeletonComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    FilterChipComponent,
    DataTableHeaderComponent,
    DataTableRowComponent,
    ComposantFormModalComponent,
    ExportExcelModalComponent,
    ColumnManagerModalComponent,
  ],
  template: `
    <div class="comp-page" style="animation: screenEnter 400ms ease both">

      <!-- Page header -->
      <!-- Global page = the per-type STARTER TEMPLATES; each vehicle's own
           tree is edited from its detail page (Composants tab). -->
      <app-page-header title="Composants — modèles par type" [count]="tree().length">
        <button class="btn-primary" type="button" (click)="openCreate()">
          + Nouveau composant
        </button>
      </app-page-header>

      <div class="comp-content">

        <!-- Search + filter card -->
        <div class="filter-card">
          <div class="filter-row-top">
            <div class="search-wrap">
              <lucide-icon name="search" class="search-icon" [size]="15" />
              <input
                class="search-input"
                placeholder="Rechercher par nom, référence…"
                [value]="searchQuery()"
                (input)="searchQuery.set($any($event.target).value)" />
            </div>
            <div class="type-selector-wrap">
              <label class="filter-label">Type de véhicule :</label>
              <select class="type-select" [value]="selectedType() ?? ''" (change)="onTypeChange($any($event.target).value)">
                @for (t of vehiculeTypes; track t.value) {
                  <option [value]="t.value ?? ''">{{ t.label }}</option>
                }
              </select>
            </div>
            <div class="view-toggle">
              <button class="view-btn" [class.view-btn--active]="viewMode() === 'tree'" type="button" title="Vue hiérarchique" (click)="viewMode.set('tree')">
                <lucide-icon name="layout-grid" [size]="15" />
              </button>
              <button class="view-btn" [class.view-btn--active]="viewMode() === 'flat'" type="button" title="Vue tableau" (click)="viewMode.set('flat')">
                <lucide-icon name="table-2" [size]="15" />
              </button>
            </div>
            @if (viewMode() === 'flat') {
              <button class="btn-export" type="button" (click)="showExportModal.set(true)" [disabled]="exporting()" title="Exporter en Excel">
                <lucide-icon name="download" [size]="14" />
                {{ exporting() ? 'Exportation…' : 'Export Excel' }}
              </button>
              <button class="btn-settings" type="button" title="Gérer les colonnes" (click)="showColManager.set(true)">
                <lucide-icon name="settings" [size]="15" />
              </button>
            }
          </div>
          <div class="filter-row-bottom">
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
        </div>

        @if (loading()) {
          <app-skeleton [rows]="6" height="52px" />
        } @else if (viewMode() === 'flat') {

          <!-- ══ FLAT / TABLE VIEW ══ -->
          <div class="table-wrap">
            <app-data-table-header [cols]="visibleCols()" />
            @if (flattenedFiltered().length === 0) {
              <app-empty-state icon="package" message="Aucun composant trouvé — essayez de modifier vos filtres." />
            } @else {
              @for (node of flattenedFiltered(); track node.id; let i = $index) {
                <app-data-table-row [idx]="i">
                  @for (col of visibleCols(); track col.id) {
                    @switch (col.id) {
                      @case ('image') {
                        <div class="dtr-cell dtr-cell--img" [style.flex]="col.flex">
                          <app-image-lightbox [src]="node.imageUrl ?? null" />
                        </div>
                      }
                      @case ('reference') {
                        <div class="dtr-cell" [style.flex]="col.flex">
                          @if (node.reference) { <span class="ref-chip">{{ node.reference }}</span> }
                          @else { <span class="ref-chip ref-chip--empty">—</span> }
                        </div>
                      }
                      @case ('designation') {
                        <div class="dtr-cell" [style.flex]="col.flex" [style.padding-left.px]="(node.niveau - 1) * 20 + 16">
                          @if (node.children.length > 0 && !tableFilterActive()) {
                            <lucide-icon
                              [name]="tableExpandedIds().has(node.id) ? 'chevron-down' : 'chevron-right'"
                              [size]="14" class="row-chevron"
                              (click)="$event.stopPropagation(); toggleTableRow(node.id)" />
                          } @else {
                            <span class="row-chevron-pad"></span>
                          }
                          <span class="comp-designation">{{ node.designation }}</span>
                        </div>
                      }
                      @case ('partie') {
                        <div class="dtr-cell" [style.flex]="col.flex">
                          @if (node.categorie) { <span class="partie-badge partie-badge--{{ node.categorie }}">{{ partieLabel(node.categorie) }}</span> }
                          @else { <span class="partie-badge partie-badge--autre">—</span> }
                        </div>
                      }
                      @case ('unite') {
                        <div class="dtr-cell" [style.flex]="col.flex"><span class="mono-text">{{ node.unite ?? '—' }}</span></div>
                      }
                      @case ('stock') {
                        <div class="dtr-cell" [style.flex]="col.flex"><span class="niveau-chip">{{ node.stock ?? '—' }}</span></div>
                      }
                      @case ('actions') {
                        <div class="dtr-cell dtr-cell--actions" [style.flex]="col.flex" (click)="$event.stopPropagation()">
                          <lucide-icon name="plus" [size]="15" class="row-action" title="Sous-composant" (click)="openCreateChild(node)" />
                          <lucide-icon name="pencil" [size]="15" class="row-action" title="Modifier" (click)="openEdit(node)" />
                          <lucide-icon name="trash-2" [size]="15" class="row-action row-action--danger" title="Supprimer" (click)="confirmDelete(node)" />
                        </div>
                      }
                    }
                  }
                </app-data-table-row>
              }
            }
          </div>

        } @else {

          <!-- ══ TREE VIEW — 3-panel layout ══ -->
          @if (filteredNodes().length === 0) {
            <app-empty-state icon="package" message="Aucun composant trouvé — essayez de modifier vos filtres." />
          } @else {
            <div class="tree-layout">

              <!-- Left: tree navigation -->
              <div class="tree-nav">
                <div class="tree-nav__header">CATALOGUE</div>
                @for (node of treeRows(); track node.id) {
                  <div class="tree-item"
                       [class.tree-item--l1]="node.niveau === 1"
                       [class.tree-item--l2]="node.niveau === 2"
                       [class.tree-item--l3]="node.niveau >= 3"
                       [class.tree-item--selected]="selectedId() === node.id"
                       [style.padding-left.px]="(node.niveau - 1) * 18 + 12"
                       (click)="onTreeNodeClick(node)">
                    @if (node.children.length > 0) {
                      <lucide-icon
                        [name]="expandedIds().has(node.id) ? 'chevron-down' : 'chevron-right'"
                        [size]="12" class="tree-chevron"
                        (click)="$event.stopPropagation(); toggle(node.id)" />
                    } @else {
                      <span class="tree-leaf-pad"></span>
                    }
                    <span class="tree-item__label"
                          [class.tree-item__label--leaf]="node.niveau >= 3">{{ node.designation }}</span>
                    <span class="tree-item__level">(N{{ node.niveau }})</span>
                  </div>
                }
              </div>

              <!-- Center: composant image -->
              <div class="image-pane">
                @if (selectedNode()) {
                  @if (currentImageUrl()) {
                    <img class="image-pane__img" [src]="currentImageUrl()" [alt]="selectedNode()!.designation" />
                  } @else {
                    <div class="image-pane__placeholder">
                      <lucide-icon name="image" [size]="40" class="image-pane__icon" />
                      <span class="image-pane__text">{{ selectedNode()!.designation }}</span>
                    </div>
                  }
                  <div class="image-pane__actions">
                    <input #imgFile type="file" accept="image/png,image/jpeg,image/webp" hidden
                           (change)="onPhotoFileChange($event)" />
                    <button type="button" class="image-pane__btn" [disabled]="uploadingImage()" (click)="imgFile.click()">
                      <lucide-icon name="upload" [size]="14" />
                      {{ uploadingImage() ? 'Téléversement…' : (currentImageUrl() ? "Changer l'image" : 'Ajouter une image') }}
                    </button>
                  </div>
                  @if (imageError()) {
                    <div class="image-pane__error">{{ imageError() }}</div>
                  }
                } @else {
                  <div class="image-pane__placeholder">
                    <lucide-icon name="image" [size]="40" class="image-pane__icon" />
                    <span class="image-pane__text image-pane__text--muted">Sélectionnez un composant</span>
                  </div>
                }
              </div>

              <!-- Right: detail panel -->
              <div class="detail-panel">
                @if (!selectedNode()) {
                  <div class="detail-panel__empty">
                    <p>Sélectionnez un composant dans l'arbre pour en voir les détails.</p>
                  </div>
                } @else {
                  @if (detailLoading()) {
                    <app-skeleton [rows]="4" height="24px" />
                  } @else {
                    <div class="detail-section">
                      <div class="detail-section__title">SPÉCIFICATIONS</div>
                      <div class="detail-row">
                        <span class="detail-row__label">TYPE</span>
                        <span class="detail-row__value">{{ partieLabel(selectedNode()!.categorie) }}</span>
                      </div>
                      @if (selectedNode()!.reference) {
                        <div class="detail-row">
                          <span class="detail-row__label">RÉFÉRENCE</span>
                          <span class="detail-row__value detail-row__value--mono">{{ selectedNode()!.reference }}</span>
                        </div>
                      }
                      @if (selectedDetail()?.marque) {
                        <div class="detail-row">
                          <span class="detail-row__label">MARQUE</span>
                          <span class="detail-row__value">{{ selectedDetail()!.marque }}</span>
                        </div>
                      }
                      @if (selectedDetail()?.prixUnitaire != null) {
                        <div class="detail-row">
                          <span class="detail-row__label">PRIX</span>
                          <span class="detail-row__value">{{ selectedDetail()!.prixUnitaire | number:'1.2-2' }} MAD</span>
                        </div>
                      }
                    </div>

                    <div class="detail-section">
                      <div class="detail-section__title">MAINTENANCE</div>
                      <div class="detail-row">
                        <span class="detail-row__label">Dernier remplacement</span>
                        <span class="detail-row__value detail-row__value--muted">—</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-row__label">Historique maintenance</span>
                        <span class="detail-row__value detail-row__value--muted">—</span>
                      </div>
                    </div>

                    <div class="detail-section">
                      <div class="detail-section__title">HISTOIRE DE MAINTENANCE</div>
                      <div class="detail-timeline-empty">Aucun historique disponible.</div>
                    </div>

                    <div class="detail-section detail-section--stocks">
                      <div class="detail-section__title">STOCKS</div>
                      <div class="detail-stock">
                        <span class="detail-stock__count">{{ selectedNode()!.stock ?? 0 }}</span>
                        <span class="detail-stock__label">en stock</span>
                      </div>
                    </div>

                    <div class="detail-section detail-actions">
                      <button type="button" class="da-btn da-btn--edit" (click)="openEditSelected()">
                        <lucide-icon name="pencil" [size]="14" /> Modifier
                      </button>
                      <button type="button" class="da-btn da-btn--add" (click)="openCreateChild(selectedNode()!)">
                        <lucide-icon name="plus" [size]="14" /> + Sous-composant
                      </button>
                      <button type="button" class="da-btn da-btn--delete" (click)="confirmDelete(selectedNode()!)">
                        <lucide-icon name="trash-2" [size]="14" /> Supprimer
                      </button>
                    </div>
                  }
                }
              </div>

            </div>
          }

        }

      </div>

      <!-- Delete confirmation -->
      @if (deleteTarget()) {
        <div class="confirm-overlay" (click)="deleteTarget.set(null)">
          <div class="confirm-dialog" (click)="$event.stopPropagation()">
            <h3 class="confirm-title">Supprimer le composant ?</h3>
            <p class="confirm-msg">
              @if (deleteDescendants() > 0) {
                Supprimer <strong>{{ deleteTarget()!.designation }}</strong> et ses
                <strong>{{ deleteDescendants() }} sous-composant{{ deleteDescendants() > 1 ? 's' : '' }}</strong> ?
              } @else {
                Supprimer <strong>{{ deleteTarget()!.designation }}</strong> ?
              }
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
          [allColumnDefs]="compColumnDefs"
          [defaultVisibleIds]="compDefaultColIds"
          [currentVisible]="visibleColIds()"
          (applied)="onColumnsApplied($event)"
          (cancel)="showColManager.set(false)" />
      }

      <!-- Export Excel modal -->
      @if (showExportModal()) {
        <app-export-excel-modal
          [allColumns]="exportColDefs"
          [initialVisible]="exportDefaultIds"
          [filterDefs]="exportFilterDefs"
          (exported)="onExportConfirmed($event)"
          (cancel)="showExportModal.set(false)" />
      }

    </div>
  `,
  styles: [`
    .comp-page { background: #F5F5F5; min-height: calc(100vh - 88px); }
    .comp-content { padding: 20px 32px 32px; }

    /* Filter card */
    .filter-card { background: var(--color-surface); border-radius: 12px; border: 1px solid var(--color-border); padding: 14px 20px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
    .filter-row-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .filter-row-bottom { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .filter-label { font-family: 'Open Sans', sans-serif; font-size: 13px; color: #6B7280; font-weight: 500; flex-shrink: 0; }
    .search-wrap { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 10px; color: #9CA3AF; pointer-events: none; }
    .search-input { height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--color-border); border-radius: 8px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; width: 260px; outline: none; transition: border-color 150ms; }
    .search-input:focus { border-color: var(--color-primary, #1A56DB); }
    .type-selector-wrap { display: flex; align-items: center; gap: 6px; }
    .type-select { height: 36px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 8px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; background: white; cursor: pointer; outline: none; }
    .type-select:focus { border-color: var(--color-primary); }
    .view-toggle { display: flex; gap: 4px; margin-left: auto; }
    .view-btn { height: 34px; width: 36px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--color-border); border-radius: 8px; background: white; cursor: pointer; color: #9CA3AF; transition: all 120ms; }
    .view-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .view-btn--active { background: var(--color-primary); border-color: var(--color-primary); color: white; }

    /* Toolbar action buttons (shown in flat view only) */
    .btn-export { height: 34px; padding: 0 14px; background: white; border: 1px solid var(--color-border); border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .btn-export:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .btn-export:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-settings { height: 34px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); cursor: pointer; display: flex; align-items: center; color: var(--color-text-muted); }
    .btn-settings:hover { background: #F9FAFB; color: var(--color-text); }

    /* Flat / table view */
    .table-wrap { background: white; border-radius: 12px; border: 1px solid var(--color-border); box-shadow: 0 1px 3px rgba(0,0,0,0.07); overflow: visible; margin-bottom: 16px; }
    .dtr-cell { box-sizing: border-box; padding: 0 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text, #111827); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; }
    .dtr-cell--actions { justify-content: center; overflow: visible; gap: 10px; }
    .dtr-cell--img { justify-content: center; padding: 4px 8px; }
    .expand-icon { color: #6B7280; margin-right: 6px; flex-shrink: 0; }
    .ref-chip { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500; background: #F5F5F5; padding: 2px 8px; border-radius: 4px; border: 1px solid #E5E5E5; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: inline-block; }
    .ref-chip--empty { background: transparent; border-color: transparent; color: #9CA3AF; }
    .mono-text { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #6B7280; }
    .comp-designation { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 500; color: #111827; }
    .comp-designation--child { font-weight: 400; color: #374151; }
    .comp-designation--leaf { font-weight: 400; color: #6B7280; font-size: 12px; }
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
    .niveau-chip { font-family: 'Open Sans', sans-serif; font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #F3F4F6; color: #374151; font-weight: 500; }
    .niveau-chip--n1 { background: #EFF6FF; color: #1D4ED8; }
    .niveau-chip--n2 { background: #F0FDF4; color: #15803D; }
    .niveau-chip--n3 { background: #FFF7ED; color: #C2410C; }
    .row-chevron { color: #9CA3AF; cursor: pointer; margin-right: 6px; flex-shrink: 0; }
    .row-chevron:hover { color: var(--color-primary); }
    .row-chevron-pad { width: 20px; flex-shrink: 0; }
    .row-action { color: #9CA3AF; cursor: pointer; }
    .row-action:hover { color: var(--color-primary); }
    .row-action--danger:hover { color: #DC2626; }

    /* Tree 3-panel layout */
    .tree-layout { display: grid; grid-template-columns: 260px 1fr 340px; gap: 16px; align-items: start; }

    /* Left tree nav */
    .tree-nav { background: var(--color-surface); border-radius: 12px; border: 1px solid var(--color-border); padding: 12px 0; max-height: 520px; overflow-y: auto; }
    .tree-nav__header { font-family: 'Montserrat', sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); padding: 4px 16px 8px; border-bottom: 1px solid var(--color-border); margin-bottom: 4px; }
    .tree-item { display: flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer; transition: background 0.1s; }
    .tree-item:hover { background: var(--color-surface-2, #F9FAFB); }
    .tree-item--selected { background: #EFF6FF !important; border-right: 2px solid var(--color-primary); }
    .tree-item--l1 { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: var(--color-text); }
    .tree-item--l2 { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); }
    .tree-item--l3 { font-family: 'Open Sans', sans-serif; font-size: 12px; color: var(--color-text-muted); }
    .tree-chevron { color: var(--color-text-muted); flex-shrink: 0; cursor: pointer; }
    .tree-leaf-pad { width: 16px; flex-shrink: 0; }
    .tree-item__label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tree-item__label--leaf { color: var(--color-text-muted); }
    .tree-item__level { font-size: 10px; color: var(--color-text-muted); white-space: nowrap; }

    /* Center image pane */
    .image-pane { background: var(--color-surface); border-radius: 12px; border: 1px solid var(--color-border); min-height: 340px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 24px; overflow: hidden; }
    .image-pane__img { max-width: 100%; max-height: 360px; object-fit: contain; border-radius: 8px; }
    .image-pane__placeholder { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; }
    .image-pane__icon { color: var(--color-n300, #D1D5DB); }
    .image-pane__text { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text-muted); text-align: center; }
    .image-pane__text--muted { color: var(--color-n300, #D1D5DB); font-size: 12px; }
    .image-pane__actions { display: flex; }
    .image-pane__btn { height: 34px; padding: 0 14px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600; color: var(--color-text); }
    .image-pane__btn:hover:not(:disabled) { background: #F9FAFB; }
    .image-pane__btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .image-pane__error { font-family: 'Open Sans', sans-serif; font-size: 12px; color: #991B1B; }

    /* Right detail panel */
    .detail-panel { background: var(--color-surface); border-radius: 12px; border: 1px solid var(--color-border); padding: 20px; display: flex; flex-direction: column; gap: 18px; }
    .detail-panel__empty { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text-muted); text-align: center; padding: 32px 16px; }
    .detail-section { display: flex; flex-direction: column; gap: 8px; }
    .detail-section--stocks { border-top: 1px solid var(--color-border); padding-top: 16px; }
    .detail-section__title { font-family: 'Montserrat', sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--color-border); }
    .detail-row:last-child { border-bottom: none; }
    .detail-row__label { font-family: 'Open Sans', sans-serif; font-size: 11px; color: var(--color-text-muted); }
    .detail-row__value { font-family: 'Open Sans', sans-serif; font-size: 12px; color: var(--color-text); font-weight: 500; }
    .detail-row__value--mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
    .detail-row__value--muted { color: var(--color-text-muted); }
    .detail-timeline-empty { font-family: 'Open Sans', sans-serif; font-size: 12px; color: var(--color-text-muted); padding: 4px 0; }
    .detail-stock { display: flex; align-items: baseline; gap: 6px; padding-top: 4px; }
    .detail-stock__count { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: var(--color-text); }
    .detail-stock__label { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text-muted); }
    .detail-actions { flex-direction: row; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--color-border); padding-top: 16px; }
    .da-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-surface); cursor: pointer; font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 600; color: var(--color-text); }
    .da-btn:hover { background: #F9FAFB; }
    .da-btn--add { color: var(--color-primary); border-color: var(--color-primary); }
    .da-btn--delete { color: #B91C1C; border-color: #FCA5A5; }
    .da-btn--delete:hover { background: #FEF2F2; }

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
  expandedIds = signal<Set<number>>(new Set());

  // ── Vehicle type selector + view mode ────────────────────────────────────────
  readonly vehiculeTypes = VEHICULE_TYPES;
  selectedType = signal<string | null>(null);
  viewMode = signal<'tree' | 'flat'>('flat');

  // ── Filter signals ────────────────────────────────────────────────────────────
  searchQuery   = signal('');
  partieFilter  = signal<PartieFilter>('all');

  // ── Tree selection ────────────────────────────────────────────────────────────
  selectedId     = signal<number | null>(null);
  selectedNode   = signal<ComposantNode | null>(null);
  selectedDetail = signal<Composant | null>(null);
  detailLoading  = signal(false);

  // ── Image pane ────────────────────────────────────────────────────────────────
  uploadingImage = signal(false);
  imageError     = signal<string | null>(null);
  currentImageUrl = computed(() => this.selectedDetail()?.imageUrl ?? this.selectedNode()?.imageUrl ?? null);

  // ── Dynamic columns ───────────────────────────────────────────────────────────
  visibleColIds = signal<string[]>(loadCompColIds());
  visibleCols = computed<ColumnDef[]>(() => {
    const byId = new Map(COMP_COL_DEFS.map(c => [c.id, c]));
    return this.visibleColIds().map(id => byId.get(id)!).filter(Boolean);
  });
  exporting = signal(false);
  showExportModal = signal(false);
  showColManager = signal(false);
  readonly compColumnDefs = COMP_COL_DEFS;
  readonly compDefaultColIds = COMP_DEFAULT_COL_IDS;

  readonly exportColDefs: ExportColDef[] = [
    { id: 'reference',   label: 'Référence' },
    { id: 'designation', label: 'Désignation' },
    { id: 'partie',      label: 'Partie' },
    { id: 'unite',       label: 'Unité' },
    { id: 'stock',       label: 'Stock' },
    { id: 'marque',      label: 'Marque' },
    { id: 'prix',        label: 'Prix unitaire (MAD)' },
    { id: 'niveau',      label: 'Niveau' },
  ];
  readonly exportDefaultIds = ['reference', 'designation', 'partie', 'unite', 'stock'];
  readonly exportFilterDefs: ExportFilterDef[] = [
    { key: 'vehiculeType', label: 'Type véhicule', type: 'select', options: [
      { value: '', label: 'Tous' },
      { value: 'camion_tracteur', label: 'Camion Tracteur' },
      { value: 'semi_remorque',   label: 'Semi-Remorque' },
      { value: 'camion',          label: 'Camion' },
      { value: 'voiture',         label: 'Voiture' },
      { value: 'chariot',         label: 'Chariot' },
    ]},
    { key: 'categorie', label: 'Partie', type: 'select', options: [
      { value: '', label: 'Toutes' },
      { value: 'moteur',        label: 'Moteur' },
      { value: 'pneumatique',   label: 'Pneumatique' },
      { value: 'freinage',      label: 'Freinage' },
      { value: 'hydraulique',   label: 'Hydraulique' },
      { value: 'electrique',    label: 'Électrique' },
      { value: 'transmission',  label: 'Transmission' },
      { value: 'autre',         label: 'Autre' },
    ]},
  ];

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

  // Tree view rows: flattened filtered roots honoring expandedIds, any depth.
  treeRows = computed<ComposantNode[]>(() => {
    const expanded = this.expandedIds();
    const walk = (nodes: ComposantNode[]): ComposantNode[] =>
      nodes.flatMap(n => expanded.has(n.id) ? [n, ...walk(n.children ?? [])] : [n]);
    return walk(this.filteredNodes());
  });

  // Table view collapse state (independent from the tree-view expandedIds).
  tableExpandedIds = signal<Set<number>>(new Set());
  tableFilterActive = computed(() =>
    !!this.searchQuery().toLowerCase().trim() || this.partieFilter() !== 'all');

  flattenedFiltered = computed(() => {
    const q      = this.searchQuery().toLowerCase().trim();
    const partie = this.partieFilter();
    if (this.tableFilterActive()) {
      // Filtering bypasses collapse: show every matching node, flat.
      const flatten = (nodes: ComposantNode[]): ComposantNode[] =>
        nodes.flatMap(n => [n, ...flatten(n.children ?? [])]);
      return flatten(this.tree()).filter(node => {
        const matchQ = !q || node.designation.toLowerCase().includes(q) || (node.reference ?? '').toLowerCase().includes(q);
        const matchP = partie === 'all' || node.categorie === partie;
        return matchQ && matchP;
      });
    }
    // No filter: collapsible tree — children only under expanded parents.
    const expanded = this.tableExpandedIds();
    const walk = (nodes: ComposantNode[]): ComposantNode[] =>
      nodes.flatMap(n => expanded.has(n.id) ? [n, ...walk(n.children ?? [])] : [n]);
    return walk(this.tree());
  });

  // Descendant count of the node pending deletion, for the cascade warning.
  deleteDescendants = computed(() => {
    const target = this.deleteTarget();
    if (!target) return 0;
    const count = (nodes: ComposantNode[]): number =>
      nodes.reduce((sum, n) => sum + 1 + count(n.children ?? []), 0);
    return count(target.children ?? []);
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

  private readonly type$ = new BehaviorSubject<string | null>(null);

  constructor() {
    this.type$.pipe(
      switchMap(type => {
        this.loading.set(true);
        this.selectedId.set(null);
        this.selectedNode.set(null);
        this.selectedDetail.set(null);
        this.expandedIds.set(new Set());
        return this.composantService.tree(type ?? undefined);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (data) => { this.tree.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onTypeChange(value: string): void {
    const type = value === '' ? null : value;
    this.selectedType.set(type);
    this.type$.next(type);
  }

  // ── Expand / collapse ─────────────────────────────────────────────────────────
  toggle(id: number): void {
    this.expandedIds.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleTableRow(id: number): void {
    this.tableExpandedIds.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  onColumnsApplied(ids: string[]): void {
    this.visibleColIds.set(ids);
    localStorage.setItem(COMP_LS_KEY, JSON.stringify(ids));
    this.showColManager.set(false);
  }

  // ── Tree selection ────────────────────────────────────────────────────────────
  onTreeNodeClick(node: ComposantNode): void {
    this.selectTreeNode(node);
    if (node.children && node.children.length > 0) {
      this.toggle(node.id);
    }
  }

  selectTreeNode(node: ComposantNode): void {
    if (this.selectedId() === node.id) return;
    this.selectedId.set(node.id);
    this.selectedNode.set(node);
    this.selectedDetail.set(null);
    this.imageError.set(null);
    this.detailLoading.set(true);
    this.composantService.get(node.id).pipe(take(1)).subscribe({
      next: (detail) => { this.selectedDetail.set(detail); this.detailLoading.set(false); },
      error: () => this.detailLoading.set(false),
    });
  }

  // ── Image upload in tree view ─────────────────────────────────────────────────
  onPhotoFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const id = this.selectedId();
    if (!id) return;
    this.uploadingImage.set(true);
    this.imageError.set(null);
    this.composantService.uploadPhoto(file).pipe(take(1)).subscribe({
      next: ({ url }) => {
        this.composantService.update(id, { imageUrl: url } as Partial<Composant>).pipe(take(1)).subscribe({
          next: (updated) => {
            this.selectedDetail.set(updated);
            this.selectedNode.update(n => n ? { ...n, imageUrl: url } : n);
            this.uploadingImage.set(false);
            this.toastr.success('Image mise à jour.');
          },
          error: () => { this.uploadingImage.set(false); this.imageError.set('Erreur lors de la mise à jour.'); },
        });
      },
      error: () => { this.uploadingImage.set(false); this.imageError.set('Erreur lors du téléversement.'); },
    });
  }

  // ── Create root composant ─────────────────────────────────────────────────────
  openCreate(): void {
    this.formCtx.set({});
  }

  // ── Edit: use full detail if available (tree view), else node ─────────────────
  openEditSelected(): void {
    const detail = this.selectedDetail();
    const node = this.selectedNode();
    if (detail) {
      this.formCtx.set({ composant: detail });
    } else if (node) {
      this.openEdit(node);
    }
  }

  openEdit(node: ComposantNode): void {
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

  openCreateChild(node: ComposantNode): void {
    this.formCtx.set({
      parent: { id: node.id, designation: node.designation, niveau: node.niveau },
    });
  }

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
        if (this.selectedId() === target.id) {
          this.selectedId.set(null);
          this.selectedNode.set(null);
          this.selectedDetail.set(null);
        }
        this.reloadTree();
      },
      error: (err) => {
        const msg = err?.error?.error ?? err?.error?.message ?? err?.message;
        this.toastr.error(msg ?? 'Impossible de supprimer ce composant.');
      },
    });
  }

  onFormSaved(): void {
    // Expand the parent so a freshly created child is visible right away.
    const parentId = this.formCtx()?.parent?.id;
    if (parentId != null) {
      this.expandedIds.update(s => new Set(s).add(parentId));
      this.tableExpandedIds.update(s => new Set(s).add(parentId));
    }
    this.formCtx.set(null);
    this.toastr.success('Composant enregistré.');
    this.reloadTree();
  }

  private reloadTree(): void {
    this.composantService.tree(this.selectedType() ?? undefined).subscribe({
      next: (data) => this.tree.set(data),
    });
  }

  onExportConfirmed(result: ExportResult): void {
    this.exporting.set(true);
    this.showExportModal.set(false);
    this.excelExportService.download({
      entites: 'composants',
      columns: result.columns,
      vehiculeType: result.filters['vehiculeType'] || undefined,
      categorie: result.filters['categorie'] || undefined,
    }).pipe(take(1)).subscribe({
      next: (blob) => { downloadBlobAs(blob, 'composants.xlsx'); this.exporting.set(false); },
      error: () => { this.toastr.error('Erreur lors de l\'export Excel.'); this.exporting.set(false); },
    });
  }

  partieLabel(cat: ComposantCategorie | null): string {
    return cat ? (PARTIE_LABELS[cat] ?? cat) : '—';
  }
}
