import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { ModalShellComponent } from '../modal/modal-shell.component';

export interface ExportColDef {
  id: string;
  label: string;
}

export interface ExportFilterDef {
  key: string;
  label: string;
  type: 'select';
  options: { value: string; label: string }[];
}

export interface ExportResult {
  columns: string[];
  filters: Record<string, string>;
}

@Component({
  selector: 'app-export-excel-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DragDropModule, LucideAngularModule, ModalShellComponent],
  template: `
    <app-modal-shell modalTitle="Exporter Excel" (onClose)="cancel.emit()">
      <p class="em-hint">Sélectionnez les colonnes et critères à inclure dans le fichier Excel.</p>

      <div class="em-body">
        <!-- Left: available (unchecked) -->
        <div class="em-panel">
          <div class="em-panel__head">
            <span>COLONNES DISPONIBLES ({{ available().length }})</span>
            <input class="em-filter-input" [(ngModel)]="search" placeholder="Filtrer…" />
          </div>
          <div class="em-list">
            @for (col of filteredAvailable(); track col.id) {
              <label class="em-item em-item--check">
                <input type="checkbox" [checked]="false" (change)="addColumn(col)" />
                <span>{{ col.label }}</span>
              </label>
            }
            @if (filteredAvailable().length === 0) {
              <span class="em-empty">Toutes les colonnes sont incluses</span>
            }
          </div>
        </div>

        <!-- Right: selected in order -->
        <div class="em-panel">
          <div class="em-panel__head">
            <span>COLONNES EXPORT ({{ selected().length }})</span>
            <button class="em-restore" type="button" (click)="restoreDefault()">Restaurer défauts</button>
          </div>
          <div class="em-list" cdkDropList (cdkDropListDropped)="drop($event)">
            @for (col of selected(); track col.id) {
              <div class="em-item em-item--drag" cdkDrag>
                <lucide-icon name="grip-vertical" [size]="14" class="em-drag-handle" cdkDragHandle />
                <span>{{ col.label }}</span>
                <button class="em-remove" type="button" (click)="removeColumn(col)" aria-label="Retirer">
                  <lucide-icon name="x" [size]="12" />
                </button>
              </div>
            }
            @if (selected().length === 0) {
              <span class="em-empty">Ajoutez des colonnes depuis la liste de gauche</span>
            }
          </div>
        </div>
      </div>

      <!-- Filters section -->
      @if (filterDefs.length > 0) {
        <div class="em-filters-section">
          <div class="em-filters-title">
            <lucide-icon name="filter" [size]="13" />
            Filtres
          </div>
          <div class="em-filters-grid">
            @for (f of filterDefs; track f.key) {
              <div class="em-filter-row">
                <label class="em-filter-label">{{ f.label }}</label>
                <select class="em-select" [(ngModel)]="filterValues[f.key]">
                  <option value="">Tout</option>
                  @for (opt of f.options; track opt.value) {
                    <option [value]="opt.value">{{ opt.label }}</option>
                  }
                </select>
              </div>
            }
          </div>
        </div>
      }

      <div class="em-actions">
        <button class="btn-cancel" type="button" (click)="cancel.emit()">Annuler</button>
        <button class="btn-export" type="button" [disabled]="selected().length === 0" (click)="doExport()">
          <lucide-icon name="download" [size]="14" />
          Exporter
        </button>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .em-hint { font-family: 'Open Sans',sans-serif; font-size: 13px; color: #6B7280; margin: 0 0 16px; }
    .em-body { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .em-panel { display: flex; flex-direction: column; }
    .em-panel__head {
      display: flex; align-items: center; justify-content: space-between;
      font-family: 'Montserrat',sans-serif; font-size: 11px; font-weight: 700;
      color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;
    }
    .em-filter-input {
      height: 26px; padding: 0 8px; border: 1px solid var(--color-border); border-radius: 4px;
      font-size: 12px; font-family: 'Open Sans',sans-serif; color: #374151; outline: none; width: 90px;
    }
    .em-restore {
      background: none; border: none; cursor: pointer;
      font-family: 'Open Sans',sans-serif; font-size: 11px; color: var(--color-primary); padding: 0;
    }
    .em-restore:hover { opacity: 0.75; }
    .em-list { border: 1px solid var(--color-border); border-radius: 8px; overflow-y: auto; max-height: 220px; }
    .em-item {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      border-bottom: 1px solid var(--color-border);
      font-family: 'Open Sans',sans-serif; font-size: 13px; color: #374151;
    }
    .em-item:last-child { border-bottom: none; }
    .em-item--check { cursor: pointer; }
    .em-item--check:hover { background: #F9FAFB; }
    .em-item--check input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; }
    .em-item--drag { cursor: default; }
    .em-drag-handle { color: #9CA3AF; cursor: grab; flex-shrink: 0; }
    .em-remove {
      margin-left: auto; background: none; border: none; color: #9CA3AF;
      cursor: pointer; padding: 2px; display: flex; align-items: center; flex-shrink: 0;
    }
    .em-remove:hover { color: #EF4444; }
    .em-empty { display: block; padding: 16px 12px; font-family: 'Open Sans',sans-serif; font-size: 13px; color: #9CA3AF; }
    .cdk-drag-preview {
      background: white; border: 1px solid var(--color-border); border-radius: 6px;
      box-shadow: 0 4px 8px rgba(0,0,0,.12); padding: 10px 12px;
      font-family: 'Open Sans',sans-serif; font-size: 13px; color: #374151;
      display: flex; align-items: center; gap: 8px;
    }
    .cdk-drag-placeholder { opacity: 0.3; }
    .cdk-drag-animating { transition: transform 200ms; }

    /* Filters */
    .em-filters-section {
      margin-top: 20px; padding-top: 16px;
      border-top: 1px solid var(--color-border);
    }
    .em-filters-title {
      display: flex; align-items: center; gap: 6px;
      font-family: 'Montserrat',sans-serif; font-size: 11px; font-weight: 700;
      color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;
    }
    .em-filters-grid { display: flex; flex-wrap: wrap; gap: 12px 24px; }
    .em-filter-row { display: flex; flex-direction: column; gap: 4px; min-width: 160px; }
    .em-filter-label {
      font-family: 'Open Sans',sans-serif; font-size: 11px; font-weight: 600;
      color: #6B7280; text-transform: uppercase; letter-spacing: 0.03em;
    }
    .em-select {
      height: 34px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 8px;
      font-family: 'Open Sans',sans-serif; font-size: 13px; color: #374151;
      background: white; cursor: pointer; outline: none;
    }
    .em-select:focus { border-color: var(--color-primary); }

    .em-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
    .btn-cancel {
      height: 38px; padding: 0 16px; background: white;
      border: 1px solid var(--color-border); border-radius: 8px;
      font-family: 'Open Sans',sans-serif; font-size: 13px; cursor: pointer; color: #374151;
    }
    .btn-export {
      height: 38px; padding: 0 20px; background: var(--color-primary); border: none; border-radius: 8px;
      font-family: 'Montserrat',sans-serif; font-size: 13px; font-weight: 600; color: white; cursor: pointer;
      display: flex; align-items: center; gap: 6px;
    }
    .btn-export:hover:not(:disabled) { opacity: 0.9; }
    .btn-export:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ExportExcelModalComponent {
  @Input() allColumns: ExportColDef[] = [];
  @Input() filterDefs: ExportFilterDef[] = [];
  filterValues: Record<string, string> = {};

  @Input() set initialFilters(v: Record<string, string>) {
    Object.assign(this.filterValues, v);
  }

  @Input({ required: true }) set initialVisible(ids: string[]) {
    const byId = new Map(this.allColumns.map(c => [c.id, c]));
    this._defaultIds = ids;
    this.selected.set(ids.map(id => byId.get(id)!).filter(Boolean));
  }

  @Output() exported = new EventEmitter<ExportResult>();
  @Output() cancel = new EventEmitter<void>();

  selected = signal<ExportColDef[]>([]);
  search = '';
  private _defaultIds: string[] = [];

  available = computed(() =>
    this.allColumns.filter(c => !this.selected().some(s => s.id === c.id))
  );

  filteredAvailable = computed(() => {
    const q = this.search.toLowerCase().trim();
    return q ? this.available().filter(c => c.label.toLowerCase().includes(q)) : this.available();
  });

  addColumn(col: ExportColDef): void {
    this.selected.update(list => [...list, col]);
  }

  removeColumn(col: ExportColDef): void {
    this.selected.update(list => list.filter(c => c.id !== col.id));
  }

  restoreDefault(): void {
    const byId = new Map(this.allColumns.map(c => [c.id, c]));
    this.selected.set(this._defaultIds.map(id => byId.get(id)!).filter(Boolean));
  }

  drop(event: CdkDragDrop<ExportColDef[]>): void {
    const arr = [...this.selected()];
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this.selected.set(arr);
  }

  doExport(): void {
    const filters: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.filterValues)) {
      if (v) filters[k] = v;
    }
    this.exported.emit({ columns: this.selected().map(c => c.id), filters });
  }
}
