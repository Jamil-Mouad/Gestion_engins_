import { Component, Input, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ComposantService } from '../../../composants/composant.service';
import { ComposantNode, Composant, ComposantCategorie } from '../../../../shared/models/composant.model';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { ModalShellComponent } from '../../../../shared/ui/modal/modal-shell.component';
import { ConfirmDeleteModalComponent } from '../../../../shared/ui/confirm-delete-modal/confirm-delete-modal.component';
import {
  DataTableHeaderComponent,
  DataTableRowComponent,
} from '../../../../shared/ui';
import { ColumnDef, ColumnManagerModalComponent } from '../../list/column-manager-modal.component';

// ── Column configuration ────────────────────────────────────────────────────
const COMP_TAB_LS_KEY = 'fleet.vehicule-composants.columns';

const COMP_TAB_COL_DEFS: ColumnDef[] = [
  { id: 'reference',   label: 'Référence',   flex: 1.2 },
  { id: 'designation', label: 'Désignation', flex: 2.5 },
  { id: 'categorie',   label: 'Catégorie',   flex: 1   },
  { id: 'unite',       label: 'Unité',       flex: 0.5 },
  { id: 'stock',       label: 'Stock',       flex: 0.7 },
];
const COMP_TAB_DEFAULT_COL_IDS = ['reference', 'designation', 'categorie', 'unite', 'stock'];
/** Actions column is always pinned — never in column manager. */
const COMP_TAB_ACTION_COL: ColumnDef = { id: 'actions', label: 'Actions', flex: 1 };

function loadCompTabColIds(): string[] {
  try {
    const v = localStorage.getItem(COMP_TAB_LS_KEY);
    return v ? JSON.parse(v) : COMP_TAB_DEFAULT_COL_IDS;
  } catch { return COMP_TAB_DEFAULT_COL_IDS; }
}

const CATEGORIE_LABELS: Record<string, string> = {
  moteur: 'Moteur', pneumatique: 'Pneumatique', freinage: 'Freinage',
  hydraulique: 'Hydraulique', electrique: 'Électrique', transmission: 'Transmission', autre: 'Autre',
  chassis: 'Châssis', carrosserie: 'Carrosserie', suspension: 'Suspension',
};

@Component({
  selector: 'app-composants-tab',
  standalone: true,
  imports: [
    CommonModule, DecimalPipe, FormsModule, LucideAngularModule,
    SkeletonComponent, EmptyStateComponent, ModalShellComponent,
    ConfirmDeleteModalComponent,
    DataTableHeaderComponent, DataTableRowComponent,
    ColumnManagerModalComponent,
  ],
  template: `
    <div class="comp-tab">

      <!-- ── Toolbar ── -->
      <div class="comp-tab__toolbar">
        <div class="view-toggle">
          <button class="view-btn"
                  [class.view-btn--active]="viewMode() === 'tree'"
                  (click)="viewMode.set('tree')">Vue arborescente</button>
          <button class="view-btn"
                  [class.view-btn--active]="viewMode() === 'table'"
                  (click)="viewMode.set('table')">Vue tableau</button>
        </div>
        <button class="btn-primary-sm" type="button" (click)="openCreateRoot()">
          <lucide-icon name="plus" [size]="14" />
          Nouveau composant
        </button>
      </div>

      @if (loading()) {
        <app-skeleton [rows]="5" height="48px" />
      }

      <!-- ══ TREE VIEW ══ -->
      @if (!loading() && viewMode() === 'tree') {
        @if (tree().length === 0) {
          <app-empty-state icon="⚙️" message="Aucun composant dans le catalogue." />
        } @else {
          <div class="tree-layout">

            <!-- Left: tree navigation -->
            <div class="tree-nav">
              <div class="tree-nav__header">CATALOGUE</div>
              @for (node of tree(); track node.id) {
                <div class="tree-item tree-item--l1"
                     [class.tree-item--selected]="selectedId() === node.id"
                     (click)="onTreeRowClick(node)">
                  @if (node.children.length > 0) {
                    <lucide-icon
                      [name]="expandedIds().has(node.id) ? 'chevron-down' : 'chevron-right'"
                      [size]="12" class="tree-chevron"
                      (click)="$event.stopPropagation(); toggleExpand(node.id)" />
                  } @else {
                    <span class="tree-leaf-pad"></span>
                  }
                  <span class="tree-item__label">{{ node.designation }}</span>
                  <span class="tree-item__level">(N1)</span>
                </div>

                @if (expandedIds().has(node.id)) {
                  @for (child of node.children; track child.id) {
                    <div class="tree-item tree-item--l2"
                         [class.tree-item--selected]="selectedId() === child.id"
                         (click)="onTreeRowClick(child)">
                      @if (child.children.length > 0) {
                        <lucide-icon
                          [name]="expandedIds().has(child.id) ? 'chevron-down' : 'chevron-right'"
                          [size]="11" class="tree-chevron"
                          (click)="$event.stopPropagation(); toggleExpand(child.id)" />
                      } @else {
                        <span class="tree-leaf-pad"></span>
                      }
                      <span class="tree-item__label">{{ child.designation }}</span>
                      <span class="tree-item__level">(N2)</span>
                    </div>

                    @if (expandedIds().has(child.id)) {
                      @for (leaf of child.children; track leaf.id) {
                        <div class="tree-item tree-item--l3"
                             [class.tree-item--selected]="selectedId() === leaf.id"
                             (click)="selectNode(leaf)">
                          <span class="tree-leaf-pad"></span>
                          <span class="tree-item__label tree-item__label--leaf">{{ leaf.designation }}</span>
                        </div>
                      }
                    }
                  }
                }
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
                    <span class="image-pane__text">Aucune image — {{ selectedNode()!.designation }}</span>
                  </div>
                }
                <div class="image-pane__actions">
                  <input #imgFile type="file" accept="image/png,image/jpeg,image/webp" hidden
                         (change)="onPhotoFileChange($event)" />
                  <button type="button" class="image-pane__btn" [disabled]="uploadingImage()" (click)="imgFile.click()">
                    <lucide-icon name="upload" [size]="14" />
                    {{ uploadingImage() ? 'Téléversement…' : (currentImageUrl() ? 'Changer l\\'image' : 'Ajouter une image') }}
                  </button>
                </div>
                @if (imageError()) { <div class="image-pane__error">{{ imageError() }}</div> }
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
                      <span class="detail-row__value">{{ categorieLabel(selectedNode()!.categorie) }}</span>
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
                    <button type="button" class="da-btn da-btn--edit" (click)="openEdit(selectedNode()!)">
                      <lucide-icon name="pencil" [size]="14" /> Modifier
                    </button>
                    @if ((selectedNode()!.niveau ?? 1) < 3) {
                      <button type="button" class="da-btn da-btn--add" (click)="openCreateChild(selectedNode()!)">
                        <lucide-icon name="plus" [size]="14" /> Sous-composant
                      </button>
                    }
                    <button type="button" class="da-btn da-btn--delete" (click)="askDelete(selectedNode()!)">
                      <lucide-icon name="trash-2" [size]="14" /> Supprimer
                    </button>
                  </div>
                }
              }
            </div>
          </div>
        }
      }

      <!-- ══ TABLE VIEW ══ -->
      @if (!loading() && viewMode() === 'table') {
        @if (tree().length === 0) {
          <app-empty-state icon="⚙️" message="Aucun composant dans le catalogue." />
        } @else {
          <div class="table-wrap">
            <app-data-table-header [cols]="visibleTableCols()" />
            @for (node of tree(); track node.id; let i = $index) {
              <app-data-table-row [idx]="i" [clickable]="node.children.length > 0" (rowClicked)="toggleExpand(node.id)">
                @for (col of visibleTableCols(); track col.id) {
                  @switch (col.id) {
                    @case ('reference') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        @if (node.reference) { <span class="ref-chip">{{ node.reference }}</span> }
                        @else { <span class="ref-chip ref-chip--empty">—</span> }
                      </div>
                    }
                    @case ('designation') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        @if (node.children.length > 0) {
                          <lucide-icon [name]="expandedIds().has(node.id) ? 'chevron-down' : 'chevron-right'" [size]="12" class="table-chevron" />
                        }
                        <span class="comp-designation">{{ node.designation }}</span>
                      </div>
                    }
                    @case ('categorie') {
                      <div class="dtr-cell" [style.flex]="col.flex">
                        @if (node.categorie) {
                          <span class="partie-badge partie-badge--{{ node.categorie }}">{{ categorieLabel(node.categorie) }}</span>
                        }
                      </div>
                    }
                    @case ('unite') {
                      <div class="dtr-cell" [style.flex]="col.flex"><span class="mono-text">{{ node.unite ?? '—' }}</span></div>
                    }
                    @case ('stock') {
                      <div class="dtr-cell" [style.flex]="col.flex">{{ node.stock ?? '—' }}</div>
                    }
                    @case ('actions') {
                      <div class="dtr-cell dtr-cell--actions" [style.flex]="col.flex" (click)="$event.stopPropagation()">
                        <lucide-icon name="pencil" [size]="15" class="row-action" title="Modifier" (click)="openEdit(node)" />
                        @if ((node.niveau ?? 1) < 3) {
                          <lucide-icon name="plus" [size]="15" class="row-action" title="Sous-composant" (click)="openCreateChild(node)" />
                        }
                        <lucide-icon name="trash-2" [size]="15" class="row-action row-action--danger" title="Supprimer" (click)="askDelete(node)" />
                      </div>
                    }
                  }
                }
              </app-data-table-row>
              @if (expandedIds().has(node.id)) {
                @for (child of node.children; track child.id; let ci = $index) {
                  <app-data-table-row [idx]="i * 1000 + ci" [clickable]="child.children.length > 0" (rowClicked)="toggleExpand(child.id)">
                    @for (col of visibleTableCols(); track col.id) {
                      @switch (col.id) {
                        @case ('reference') {
                          <div class="dtr-cell" [style.flex]="col.flex">
                            @if (child.reference) { <span class="ref-chip">{{ child.reference }}</span> }
                            @else { <span class="ref-chip ref-chip--empty">—</span> }
                          </div>
                        }
                        @case ('designation') {
                          <div class="dtr-cell" [style.flex]="col.flex" style="padding-left:32px">
                            @if (child.children.length > 0) {
                              <lucide-icon [name]="expandedIds().has(child.id) ? 'chevron-down' : 'chevron-right'" [size]="11" class="table-chevron" />
                            }
                            <span class="comp-designation comp-designation--child">{{ child.designation }}</span>
                          </div>
                        }
                        @case ('categorie') {
                          <div class="dtr-cell" [style.flex]="col.flex">
                            @if (child.categorie) {
                              <span class="partie-badge partie-badge--{{ child.categorie }}">{{ categorieLabel(child.categorie) }}</span>
                            }
                          </div>
                        }
                        @case ('unite') {
                          <div class="dtr-cell" [style.flex]="col.flex"><span class="mono-text">{{ child.unite ?? '—' }}</span></div>
                        }
                        @case ('stock') {
                          <div class="dtr-cell" [style.flex]="col.flex">{{ child.stock ?? '—' }}</div>
                        }
                        @case ('actions') {
                          <div class="dtr-cell dtr-cell--actions" [style.flex]="col.flex" (click)="$event.stopPropagation()">
                            <lucide-icon name="pencil" [size]="15" class="row-action" title="Modifier" (click)="openEdit(child)" />
                            @if ((child.niveau ?? 2) < 3) {
                              <lucide-icon name="plus" [size]="15" class="row-action" title="Sous-composant" (click)="openCreateChild(child)" />
                            }
                            <lucide-icon name="trash-2" [size]="15" class="row-action row-action--danger" title="Supprimer" (click)="askDelete(child)" />
                          </div>
                        }
                      }
                    }
                  </app-data-table-row>
                  @if (expandedIds().has(child.id)) {
                    @for (leaf of child.children; track leaf.id; let li = $index) {
                      <app-data-table-row [idx]="i * 10000 + ci * 100 + li">
                        @for (col of visibleTableCols(); track col.id) {
                          @switch (col.id) {
                            @case ('reference') {
                              <div class="dtr-cell" [style.flex]="col.flex">
                                @if (leaf.reference) { <span class="ref-chip">{{ leaf.reference }}</span> }
                                @else { <span class="ref-chip ref-chip--empty">—</span> }
                              </div>
                            }
                            @case ('designation') {
                              <div class="dtr-cell" [style.flex]="col.flex" style="padding-left:60px">
                                <span class="comp-designation comp-designation--leaf">{{ leaf.designation }}</span>
                              </div>
                            }
                            @case ('categorie') {
                              <div class="dtr-cell" [style.flex]="col.flex">
                                @if (leaf.categorie) {
                                  <span class="partie-badge partie-badge--{{ leaf.categorie }}">{{ categorieLabel(leaf.categorie) }}</span>
                                }
                              </div>
                            }
                            @case ('unite') {
                              <div class="dtr-cell" [style.flex]="col.flex"><span class="mono-text">{{ leaf.unite ?? '—' }}</span></div>
                            }
                            @case ('stock') {
                              <div class="dtr-cell" [style.flex]="col.flex">{{ leaf.stock ?? '—' }}</div>
                            }
                            @case ('actions') {
                              <div class="dtr-cell dtr-cell--actions" [style.flex]="col.flex" (click)="$event.stopPropagation()">
                                <lucide-icon name="pencil" [size]="15" class="row-action" title="Modifier" (click)="openEdit(leaf)" />
                                <lucide-icon name="trash-2" [size]="15" class="row-action row-action--danger" title="Supprimer" (click)="askDelete(leaf)" />
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
          </div>

          <!-- Footer: export + column gear -->
          <div class="table-footer">
            <div class="table-actions">
              <button class="btn-export" (click)="exportCsv()" type="button" title="Exporter en CSV">
                <lucide-icon name="download" [size]="14" />
                Export Excel
              </button>
              <button class="btn-settings" type="button" title="Gérer les colonnes" (click)="showColManager.set(true)">
                <lucide-icon name="settings" [size]="15" />
              </button>
            </div>
          </div>
        }
      }

      @if (showColManager()) {
        <app-column-manager-modal
          [allColumnDefs]="compTabColDefs"
          [defaultVisibleIds]="compTabDefaultColIds"
          [currentVisible]="tableColIds()"
          (applied)="onTableColumnsApplied($event)"
          (cancel)="showColManager.set(false)" />
      }
    </div>

    <!-- ══ Create / edit modal ══ -->
    @if (showCreateModal()) {
      <app-modal-shell [modalTitle]="modalTitle()" (onClose)="showCreateModal.set(false)">
        @if (parentLabel()) {
          <div class="cf-parent-hint">Sous-composant de <strong>{{ parentLabel() }}</strong></div>
        }
        <div class="create-form">
          <div class="cf-row">
            <div class="cf-group">
              <label class="cf-label">Désignation <span class="required">*</span></label>
              <input class="cf-input" type="text" [(ngModel)]="newDesignation" placeholder="ex. Injecteur" />
            </div>
            <div class="cf-group">
              <label class="cf-label">Référence</label>
              <input class="cf-input" type="text" [(ngModel)]="newReference" placeholder="ex. INJ-001" />
            </div>
          </div>
          <div class="cf-row">
            <div class="cf-group">
              <label class="cf-label">Catégorie</label>
              <select class="cf-input" [(ngModel)]="newCategorie">
                <option value="">—</option>
                @for (c of categorieOptions; track c.value) {
                  <option [value]="c.value">{{ c.label }}</option>
                }
              </select>
            </div>
            <div class="cf-group">
              <label class="cf-label">Unité</label>
              <input class="cf-input" type="text" [(ngModel)]="newUnite" placeholder="ex. pièce" />
            </div>
          </div>
          <div class="cf-row">
            <div class="cf-group">
              <label class="cf-label">Marque</label>
              <input class="cf-input" type="text" [(ngModel)]="newMarque" placeholder="ex. Bosch" />
            </div>
            <div class="cf-group">
              <label class="cf-label">Prix unitaire (MAD)</label>
              <input class="cf-input" type="number" [(ngModel)]="newPrix" placeholder="0.00" />
            </div>
          </div>
          <div class="cf-group">
            <label class="cf-label">Stock initial</label>
            <input class="cf-input" type="number" [(ngModel)]="newStock" placeholder="0" />
          </div>
          <div class="cf-group">
            <label class="cf-label">Image</label>
            <div class="cf-photo-row">
              <input class="cf-input cf-photo-url" type="text" [(ngModel)]="newImageUrl"
                     placeholder="https://… ou téléverser un fichier" />
              <input #newImgFile type="file" accept="image/png,image/jpeg,image/webp" hidden
                     (change)="onCreatePhotoFileChange($event)" />
              <button type="button" class="cf-photo-btn" [disabled]="uploadingImage()" (click)="newImgFile.click()">
                {{ uploadingImage() ? '…' : 'Choisir un fichier' }}
              </button>
            </div>
            @if (newImageUrl) {
              <img class="cf-photo-preview" [src]="newImageUrl" alt="aperçu" />
            }
          </div>
          @if (createError()) {
            <div class="cf-error">{{ createError() }}</div>
          }
          <div class="cf-actions">
            <button type="button" class="cf-cancel" (click)="showCreateModal.set(false)">Annuler</button>
            <button type="button" class="cf-submit"
                    [disabled]="!newDesignation || creating()"
                    (click)="onCreateSubmit()">
              {{ creating() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </app-modal-shell>
    }

    @if (deleteTarget()) {
      <app-confirm-delete-modal
        confirmMessage="Supprimer ce composant ? Un composant ayant des sous-composants ou utilisé par une intervention ne peut pas être supprimé."
        [itemLabel]="deleteTarget()!.designation"
        [isDeleting]="deleting()"
        (confirm)="onDeleteConfirmed()"
        (cancel)="deleteTarget.set(null)" />
    }
  `,
  styles: [`
    .comp-tab { display: flex; flex-direction: column; gap: 16px; }

    /* Toolbar */
    .comp-tab__toolbar { display: flex; align-items: center; justify-content: space-between; }

    /* View toggle */
    .view-toggle { display: flex; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
    .view-btn { padding: 7px 18px; font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 500; background: transparent; border: none; cursor: pointer; color: var(--color-text); transition: background 0.15s; }
    .view-btn--active { background: var(--color-primary); color: #fff; font-weight: 600; }

    /* Button */
    .btn-primary-sm { height: 36px; padding: 0 16px; border: none; border-radius: 8px; background: var(--color-primary); font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn-primary-sm:hover { opacity: 0.9; }

    /* Tree layout — 3 zones */
    .tree-layout { display: grid; grid-template-columns: 260px 1fr 340px; gap: 16px; align-items: start; }

    /* Left tree nav */
    .tree-nav { background: var(--color-surface); border-radius: 12px; border: 1px solid var(--color-border); padding: 12px 0; max-height: 520px; overflow-y: auto; }
    .tree-nav__header { font-family: 'Montserrat', sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); padding: 4px 16px 8px; border-bottom: 1px solid var(--color-border); margin-bottom: 4px; }
    .tree-item { display: flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer; transition: background 0.1s; }
    .tree-item:hover { background: var(--color-surface-2, #F9FAFB); }
    .tree-item--selected { background: #EFF6FF !important; border-right: 2px solid var(--color-primary); }
    .tree-item--l1 { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: var(--color-text); }
    .tree-item--l2 { padding-left: 28px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); }
    .tree-item--l3 { padding-left: 46px; font-family: 'Open Sans', sans-serif; font-size: 12px; color: var(--color-text-muted); }
    .tree-chevron { color: var(--color-text-muted); flex-shrink: 0; cursor: pointer; }
    .tree-leaf-pad { width: 16px; flex-shrink: 0; }
    .tree-item__label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tree-item__label--leaf { color: var(--color-text-muted); }
    .tree-item__level { font-size: 10px; color: var(--color-text-muted); white-space: nowrap; }

    /* Center: composant image pane */
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

    /* Right: detail panel */
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

    /* Table view */
    .table-wrap { background: white; border-radius: 12px; border: 1px solid var(--color-border); box-shadow: 0 1px 3px rgba(0,0,0,.07); overflow: hidden; margin-bottom: 16px; }

    /* Table footer */
    .table-footer { display: flex; align-items: center; justify-content: flex-end; padding: 4px 0; }
    .table-actions { display: flex; align-items: center; gap: 8px; }
    .btn-export { height: 34px; padding: 0 14px; background: white; border: 1px solid var(--color-border); border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .btn-export:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .btn-settings { height: 34px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); cursor: pointer; display: flex; align-items: center; color: var(--color-text-muted); }
    .btn-settings:hover { background: #F9FAFB; color: var(--color-text); }
    .dtr-cell { padding: 0 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; }
    .dtr-cell--actions { justify-content: center; }
    .table-chevron { color: var(--color-text-muted); flex-shrink: 0; }
    .action-icon { color: #9CA3AF; cursor: pointer; }
    .comp-designation { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 500; }
    .comp-designation--child { font-weight: 400; color: #374151; }
    .comp-designation--leaf  { font-weight: 400; color: #6B7280; font-size: 12px; }
    .ref-chip { font-family: 'JetBrains Mono', monospace; font-size: 12px; background: #F5F5F5; padding: 2px 7px; border-radius: 4px; border: 1px solid #E5E5E5; color: #374151; }
    .ref-chip--empty { background: transparent; border-color: transparent; color: #9CA3AF; }
    .mono-text { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #6B7280; }
    .partie-badge { padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: 'Open Sans', sans-serif; white-space: nowrap; }
    .partie-badge--moteur      { background:#EFF6FF; color:#1D4ED8; }
    .partie-badge--pneumatique { background:#FFF7ED; color:#C2410C; }
    .partie-badge--freinage    { background:#FEF2F2; color:#B91C1C; }
    .partie-badge--hydraulique { background:#F0FDFA; color:#0F766E; }
    .partie-badge--electrique  { background:#FEFCE8; color:#A16207; }
    .partie-badge--transmission{ background:#FAF5FF; color:#7E22CE; }
    .partie-badge--autre       { background:#F3F4F6; color:#6B7280; }
    .partie-badge--chassis     { background:#F1F5F9; color:#334155; }
    .partie-badge--carrosserie { background:#ECFDF5; color:#047857; }
    .partie-badge--suspension  { background:#FDF4FF; color:#A21CAF; }

    /* Create form */
    .create-form { display: flex; flex-direction: column; gap: 14px; }
    .cf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .cf-group { display: flex; flex-direction: column; gap: 4px; }
    .cf-label { font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
    .required { color: var(--color-danger, #EF4444); }
    .cf-input { height: 38px; border: 1px solid var(--color-border); border-radius: 8px; padding: 0 12px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); background: var(--color-surface); }
    .cf-photo-row { display: flex; gap: 8px; align-items: center; }
    .cf-photo-url { flex: 1; }
    .cf-photo-btn { height: 38px; padding: 0 14px; border: 1px solid var(--color-border); border-radius: 8px; background: white; font-family: 'Open Sans', sans-serif; font-size: 13px; cursor: pointer; color: var(--color-text); white-space: nowrap; }
    .cf-photo-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .cf-photo-preview { margin-top: 8px; max-width: 80px; max-height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid var(--color-border); }
    .cf-error { background: #FEF2F2; color: #991B1B; padding: 8px 12px; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-size: 13px; }
    .cf-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
    .cf-cancel { height: 36px; padding: 0 16px; border: 1px solid var(--color-border); border-radius: 8px; background: white; font-family: 'Open Sans', sans-serif; font-size: 13px; cursor: pointer; color: var(--color-text-muted); }
    .cf-submit { height: 36px; padding: 0 20px; border: none; border-radius: 8px; background: var(--color-primary); font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; }
    .cf-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .cf-parent-hint { font-family: 'Open Sans', sans-serif; font-size: 12px; color: var(--color-text-muted); margin-bottom: 12px; padding: 8px 12px; background: var(--color-surface-2, #F9FAFB); border-radius: 6px; }

    /* Detail panel actions */
    .detail-actions { flex-direction: row; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--color-border); padding-top: 16px; }
    .da-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-surface); cursor: pointer; font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 600; color: var(--color-text); }
    .da-btn:hover { background: #F9FAFB; }
    .da-btn--add { color: var(--color-primary); border-color: var(--color-primary); }
    .da-btn--delete { color: #B91C1C; border-color: #FCA5A5; }
    .da-btn--delete:hover { background: #FEF2F2; }

    /* Table row inline actions */
    .dtr-cell--actions { gap: 10px; }
    .row-action { color: #9CA3AF; cursor: pointer; }
    .row-action:hover { color: var(--color-primary); }
    .row-action--danger:hover { color: #DC2626; }
  `],
})
export class ComposantsTabComponent {
  private composantService = inject(ComposantService);
  private destroyRef = inject(DestroyRef);

  /** Vehicle type this catalogue is scoped to (e.g. 'camion', 'balayeuse'). Empty = global view. */
  @Input() vehiculeType = '';

  tree = signal<ComposantNode[]>([]);
  loading = signal(true);
  viewMode = signal<'tree' | 'table'>('tree');
  expandedIds = signal<Set<number>>(new Set());
  selectedId = signal<number | null>(null);
  selectedNode = signal<ComposantNode | null>(null);
  selectedDetail = signal<Composant | null>(null);
  detailLoading = signal(false);

  // Image pane state
  uploadingImage = signal(false);
  imageError = signal<string | null>(null);
  currentImageUrl = computed(() => this.selectedDetail()?.imageUrl ?? this.selectedNode()?.imageUrl ?? null);

  // Create / edit modal state
  showCreateModal = signal(false);
  modalMode = signal<'create' | 'edit'>('create');
  editingId = signal<number | null>(null);
  formParentId: number | null = null;
  formNiveau = 1;
  parentLabel = signal('');
  newDesignation = '';
  newReference = '';
  newCategorie: ComposantCategorie | '' = '';
  newUnite = '';
  newMarque = '';
  newPrix: number | null = null;
  newStock: number | null = 0;
  newImageUrl = '';
  creating = signal(false);
  createError = signal<string | null>(null);

  // Delete confirmation state
  deleteTarget = signal<ComposantNode | null>(null);
  deleting = signal(false);

  modalTitle = computed(() => this.modalMode() === 'edit' ? 'Modifier composant' : 'Ajouter composant');

  // ── Dynamic column management (table view) ──────────────────────────────────
  readonly compTabColDefs    = COMP_TAB_COL_DEFS;
  readonly compTabDefaultColIds = COMP_TAB_DEFAULT_COL_IDS;
  tableColIds = signal<string[]>(loadCompTabColIds());
  visibleTableCols = computed<ColumnDef[]>(() => {
    const byId = new Map(COMP_TAB_COL_DEFS.map(c => [c.id, c]));
    const managed = this.tableColIds().map(id => byId.get(id)!).filter(Boolean);
    return [...managed, COMP_TAB_ACTION_COL];
  });
  showColManager = signal(false);

  readonly categorieOptions: { value: ComposantCategorie; label: string }[] = [
    { value: 'moteur', label: 'Moteur' },
    { value: 'pneumatique', label: 'Pneumatique' },
    { value: 'freinage', label: 'Freinage' },
    { value: 'hydraulique', label: 'Hydraulique' },
    { value: 'electrique', label: 'Électrique' },
    { value: 'transmission', label: 'Transmission' },
    { value: 'chassis', label: 'Châssis' },
    { value: 'carrosserie', label: 'Carrosserie' },
    { value: 'suspension', label: 'Suspension' },
    { value: 'autre', label: 'Autre' },
  ];

  constructor() {
    this.loadTree();
  }

  loadTree(): void {
    this.loading.set(true);
    this.composantService.tree(this.vehiculeType || undefined).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (data) => { this.tree.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  toggleExpand(id: number): void {
    this.expandedIds.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /** Row click: select the node and, when it has children, toggle its expansion
   *  (so the sub-tree reveals on a normal click, not only via the chevron). */
  onTreeRowClick(node: ComposantNode): void {
    this.selectNode(node);
    if (node.children && node.children.length > 0) {
      this.toggleExpand(node.id);
    }
  }

  selectNode(node: ComposantNode): void {
    if (this.selectedId() === node.id) return;
    this.selectedId.set(node.id);
    this.selectedNode.set(node);
    this.selectedDetail.set(null);
    this.detailLoading.set(true);
    this.composantService.get(node.id).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (detail) => { this.selectedDetail.set(detail); this.detailLoading.set(false); },
      error: () => this.detailLoading.set(false),
    });
  }

  categorieLabel(cat: ComposantCategorie | null | undefined): string {
    return cat ? (CATEGORIE_LABELS[cat] ?? cat) : '—';
  }

  // ── Column management ──────────────────────────────────────────────────────
  onTableColumnsApplied(ids: string[]): void {
    this.tableColIds.set(ids);
    try { localStorage.setItem(COMP_TAB_LS_KEY, JSON.stringify(ids)); } catch {}
    this.showColManager.set(false);
  }

  // ── Export ────────────────────────────────────────────────────────────────
  private csvCell(value: unknown): string {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  private flattenTree(): ComposantNode[] {
    const out: ComposantNode[] = [];
    const walk = (nodes: ComposantNode[]) => {
      for (const n of nodes) {
        out.push(n);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(this.tree());
    return out;
  }

  exportCsv(): void {
    const managedIds = this.tableColIds();
    const managedCols = COMP_TAB_COL_DEFS.filter(c => managedIds.includes(c.id));
    const header = managedCols.map(c => this.csvCell(c.label)).join(',');
    const rows = this.flattenTree().map(n =>
      managedCols.map(c => {
        switch (c.id) {
          case 'reference':   return this.csvCell(n.reference ?? '');
          case 'designation': return this.csvCell(n.designation);
          case 'categorie':   return this.csvCell(this.categorieLabel(n.categorie));
          case 'unite':       return this.csvCell(n.unite ?? '');
          case 'stock':       return this.csvCell(n.stock ?? '');
          default:            return this.csvCell('');
        }
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'composants-vehicule.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  /** Upload + persist an image for the currently selected composant. */
  onPhotoFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const node = this.selectedNode();
    const detail = this.selectedDetail();
    if (!node || !detail) return;
    this.uploadingImage.set(true);
    this.imageError.set(null);
    this.composantService.uploadPhoto(file).pipe(
      switchMap(res => this.composantService.update(node.id, {
        parentId: detail.parentId,
        niveau: detail.niveau,
        designation: detail.designation,
        categorie: detail.categorie,
        unite: detail.unite,
        marque: detail.marque,
        prixUnitaire: detail.prixUnitaire,
        imageUrl: res.url,
      })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (updated) => {
        this.uploadingImage.set(false);
        this.selectedDetail.set(updated);
        this.loadTree();
      },
      error: () => {
        this.uploadingImage.set(false);
        this.imageError.set("Échec du téléversement de l'image.");
      },
    });
  }

  /** Upload an image while creating a new composant (sets the URL field). */
  onCreatePhotoFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingImage.set(true);
    this.createError.set(null);
    this.composantService.uploadPhoto(file).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => { this.newImageUrl = res.url; this.uploadingImage.set(false); },
      error: () => {
        this.uploadingImage.set(false);
        this.createError.set("Échec du téléversement de l'image.");
      },
    });
  }

  // ── CRUD: open modal in the right mode ──────────────────────────

  /** New top-level (N1) composant for this vehicle type. */
  openCreateRoot(): void {
    this.modalMode.set('create');
    this.editingId.set(null);
    this.formParentId = null;
    this.formNiveau = 1;
    this.parentLabel.set('');
    this.resetCreateForm();
    this.showCreateModal.set(true);
  }

  /** New child composant under the given node (niveau + 1, capped at 3). */
  openCreateChild(parent: ComposantNode): void {
    const parentNiveau = parent.niveau ?? 1;
    if (parentNiveau >= 3) return;
    this.modalMode.set('create');
    this.editingId.set(null);
    this.formParentId = parent.id;
    this.formNiveau = parentNiveau + 1;
    this.parentLabel.set(parent.designation);
    this.resetCreateForm();
    this.showCreateModal.set(true);
  }

  /** Edit an existing composant — fetch its full detail to prefill the form. */
  openEdit(node: ComposantNode): void {
    this.modalMode.set('edit');
    this.editingId.set(node.id);
    this.parentLabel.set('');
    this.createError.set(null);
    this.composantService.get(node.id).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (c) => {
        this.formParentId = c.parentId;
        this.formNiveau = c.niveau ?? node.niveau ?? 1;
        this.newDesignation = c.designation;
        this.newReference = c.reference ?? '';
        this.newCategorie = c.categorie ?? '';
        this.newUnite = c.unite ?? '';
        this.newMarque = c.marque ?? '';
        this.newPrix = c.prixUnitaire ?? null;
        this.newStock = c.stock ?? 0;
        this.newImageUrl = c.imageUrl ?? '';
        this.showCreateModal.set(true);
      },
      error: () => this.createError.set('Erreur lors du chargement du composant.'),
    });
  }

  onCreateSubmit(): void {
    if (!this.newDesignation) return;
    this.creating.set(true);
    this.createError.set(null);
    const body: Partial<Composant> = {
      designation: this.newDesignation,
      reference: this.newReference || null,
      categorie: (this.newCategorie as ComposantCategorie) || null,
      unite: this.newUnite || null,
      marque: this.newMarque || null,
      prixUnitaire: this.newPrix ?? null,
      stock: this.newStock ?? 0,
      imageUrl: this.newImageUrl || null,
      niveau: this.formNiveau as 1 | 2 | 3,
      parentId: this.formParentId,
      vehiculeType: this.vehiculeType || null,
    };
    const id = this.editingId();
    const req$ = this.modalMode() === 'edit' && id != null
      ? this.composantService.update(id, body)
      : this.composantService.create(body);
    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.creating.set(false);
        this.showCreateModal.set(false);
        this.resetCreateForm();
        this.refreshAfterMutation();
      },
      error: (err: any) => {
        this.creating.set(false);
        this.createError.set(err?.error?.error || 'Erreur lors de l\'enregistrement.');
      },
    });
  }

  askDelete(node: ComposantNode): void {
    this.deleteTarget.set(node);
  }

  onDeleteConfirmed(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleting.set(true);
    this.composantService.delete(target.id).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        if (this.selectedId() === target.id) {
          this.selectedId.set(null);
          this.selectedNode.set(null);
          this.selectedDetail.set(null);
        }
        this.refreshAfterMutation();
      },
      error: (err: any) => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.imageError.set(err?.error?.error || 'Ce composant est utilisé et ne peut pas être supprimé.');
      },
    });
  }

  /** Reload the tree and refresh the currently-selected node's detail (if any). */
  private refreshAfterMutation(): void {
    this.loadTree();
    const sel = this.selectedNode();
    if (sel) {
      this.composantService.get(sel.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (detail) => this.selectedDetail.set(detail),
        error: () => {},
      });
    }
  }

  private resetCreateForm(): void {
    this.newDesignation = '';
    this.newReference = '';
    this.newCategorie = '';
    this.newUnite = '';
    this.newMarque = '';
    this.newPrix = null;
    this.newStock = 0;
    this.newImageUrl = '';
  }
}
