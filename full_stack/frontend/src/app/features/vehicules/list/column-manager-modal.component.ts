import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { ModalShellComponent } from '../../../shared/ui/modal/modal-shell.component';

export interface ColumnDef {
  id: string;
  label: string;
  flex: number;
}

export const ALL_COLUMN_DEFS: ColumnDef[] = [
  { id: 'code',          label: 'Code',           flex: 0.9 },
  { id: 'type',          label: 'Type',            flex: 0.8 },
  { id: 'marque_modele', label: 'Marque / Modèle', flex: 2   },
  { id: 'matricule',     label: 'Matricule',       flex: 1   },
  { id: 'compteur_km',   label: 'Compteur',        flex: 1   },
  { id: 'statut',        label: 'Statut',          flex: 1   },
  { id: 'marque',        label: 'Marque',          flex: 1   },
  { id: 'modele',        label: 'Modèle',          flex: 1   },
  { id: 'annee',         label: 'Année',           flex: 0.7 },
  { id: 'n_chassis',     label: 'N° Chassis',      flex: 1.2 },
  { id: 'carburant',     label: 'Carburant',       flex: 0.8 },
  { id: 'compteur_h',    label: 'Compteur heures', flex: 1   },
];

export const DEFAULT_VISIBLE_IDS = ['code', 'type', 'marque_modele', 'matricule', 'compteur_km', 'statut'];

@Component({
  selector: 'app-column-manager-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DragDropModule, LucideAngularModule, ModalShellComponent],
  template: `
    <app-modal-shell modalTitle="Gérer les colonnes" (onClose)="cancel.emit()">
      <p class="cm-hint">Cochez pour afficher. Glissez-déposez pour réordonner les colonnes visibles.</p>
      <div class="cm-body">
        <div class="cm-panel">
          <div class="cm-panel__head">
            <span>COLONNES DISPONIBLES ({{ available().length }})</span>
          </div>
          <div class="cm-search-wrap">
            <input class="cm-search" placeholder="Filtrer..." (input)="searchQuery.set($any($event.target).value)" />
          </div>
          <div class="cm-list">
            @for (col of filteredAvailable(); track col.id) {
              <label class="cm-item cm-item--check">
                <input type="checkbox" [checked]="false" (change)="addColumn(col)" />
                <span>{{ col.label }}</span>
              </label>
            }
            @if (filteredAvailable().length === 0) {
              <span class="cm-empty">Toutes les colonnes sont visibles</span>
            }
          </div>
        </div>

        <div class="cm-panel">
          <div class="cm-panel__head">
            <span>COLONNES VISIBLES ({{ _visible().length }})</span>
            <button class="cm-restore" type="button" (click)="restoreDefaults()">Restaurer défauts</button>
          </div>
          <div class="cm-list" cdkDropList (cdkDropListDropped)="drop($event)">
            @for (col of _visible(); track col.id) {
              <div class="cm-item cm-item--drag" cdkDrag>
                <lucide-icon name="grip-vertical" [size]="14" class="cm-drag-handle" cdkDragHandle />
                <span>{{ col.label }}</span>
                <button class="cm-remove" type="button" (click)="removeColumn(col)" aria-label="Retirer">✕</button>
              </div>
            }
            @if (_visible().length === 0) {
              <span class="cm-empty">Ajoutez des colonnes depuis la liste de gauche</span>
            }
          </div>
        </div>
      </div>

      <div class="cm-actions">
        <button class="btn-cancel" type="button" (click)="cancel.emit()">Annuler</button>
        <button class="btn-apply" type="button" (click)="apply()">Appliquer</button>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .cm-hint { font-family: 'Open Sans',sans-serif; font-size: 13px; color: #6B7280; margin: 0 0 16px; }
    .cm-body { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .cm-panel { display: flex; flex-direction: column; }
    .cm-panel__head { display: flex; justify-content: space-between; align-items: center; font-family: 'Montserrat',sans-serif; font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .cm-restore { font-family: 'Open Sans',sans-serif; font-size: 12px; font-weight: 600; color: var(--color-primary); background: none; border: none; cursor: pointer; padding: 0; }
    .cm-restore:hover { text-decoration: underline; }
    .cm-search-wrap { margin-bottom: 8px; }
    .cm-search { width: 100%; height: 36px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 6px; font-family: 'Open Sans',sans-serif; font-size: 13px; box-sizing: border-box; }
    .cm-list { border: 1px solid var(--color-border); border-radius: 8px; overflow-y: auto; max-height: 260px; }
    .cm-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--color-border); font-family: 'Open Sans',sans-serif; font-size: 13px; color: #374151; }
    .cm-item:last-child { border-bottom: none; }
    .cm-item--check { cursor: pointer; }
    .cm-item--check:hover { background: #F9FAFB; }
    .cm-item--check input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; }
    .cm-item--drag { cursor: default; }
    .cm-drag-handle { color: #9CA3AF; cursor: grab; flex-shrink: 0; }
    .cm-remove { margin-left: auto; background: none; border: none; color: #9CA3AF; cursor: pointer; font-size: 14px; padding: 0 4px; flex-shrink: 0; }
    .cm-remove:hover { color: #EF4444; }
    .cm-empty { display: block; padding: 16px 12px; font-family: 'Open Sans',sans-serif; font-size: 13px; color: #9CA3AF; }
    .cdk-drag-preview { background: white; border: 1px solid var(--color-border); border-radius: 6px; box-shadow: 0 4px 8px rgba(0,0,0,.12); padding: 10px 12px; font-family: 'Open Sans',sans-serif; font-size: 13px; color: #374151; display: flex; align-items: center; gap: 8px; }
    .cdk-drag-placeholder { opacity: 0.3; }
    .cdk-drag-animating { transition: transform 200ms; }
    .cm-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
    .btn-cancel { height: 38px; padding: 0 16px; background: white; border: 1px solid var(--color-border); border-radius: 8px; font-family: 'Open Sans',sans-serif; font-size: 13px; cursor: pointer; color: #374151; }
    .btn-apply { height: 38px; padding: 0 20px; background: var(--color-primary); border: none; border-radius: 8px; font-family: 'Montserrat',sans-serif; font-size: 13px; font-weight: 600; color: white; cursor: pointer; }
    .btn-apply:hover { background: var(--color-primary-dark); }
  `],
})
export class ColumnManagerModalComponent {
  @Input({ required: true }) set currentVisible(ids: string[]) {
    const byId = new Map(ALL_COLUMN_DEFS.map(c => [c.id, c]));
    this._visible.set(ids.map(id => byId.get(id)!).filter(Boolean));
  }
  @Output() applied = new EventEmitter<string[]>();
  @Output() cancel = new EventEmitter<void>();

  _visible = signal<ColumnDef[]>([]);
  searchQuery = signal('');

  available = computed(() =>
    ALL_COLUMN_DEFS.filter(c => !this._visible().some(v => v.id === c.id))
  );
  filteredAvailable = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.available().filter(c => !q || c.label.toLowerCase().includes(q));
  });

  addColumn(col: ColumnDef): void {
    this._visible.update(list => [...list, col]);
  }

  removeColumn(col: ColumnDef): void {
    this._visible.update(list => list.filter(c => c.id !== col.id));
  }

  drop(event: CdkDragDrop<ColumnDef[]>): void {
    const arr = [...this._visible()];
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this._visible.set(arr);
  }

  restoreDefaults(): void {
    const byId = new Map(ALL_COLUMN_DEFS.map(c => [c.id, c]));
    this._visible.set(DEFAULT_VISIBLE_IDS.map(id => byId.get(id)!));
  }

  apply(): void {
    this.applied.emit(this._visible().map(c => c.id));
  }
}
