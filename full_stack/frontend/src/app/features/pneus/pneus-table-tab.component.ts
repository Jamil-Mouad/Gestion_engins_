import { Component, Input, OnInit, inject, signal, computed, DestroyRef, LOCALE_ID } from '@angular/core';
import { CommonModule, formatDate, formatNumber } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { Pneu, PneuStatus } from '../../shared/models/pneu.model';
import { PneuService } from './pneu.service';
import { CardComponent } from '../../shared/ui/card/card.component';
import { DataTableHeaderComponent, DataTableCol } from '../../shared/ui/data-table/data-table-header.component';
import { DataTableRowComponent } from '../../shared/ui/data-table/data-table-row.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { ConfirmDeleteModalComponent } from '../../shared/ui/confirm-delete-modal/confirm-delete-modal.component';
import { AjouterPneuModalComponent } from './ajouter-pneu-modal.component';
import { EditPneuModalComponent } from './edit-pneu-modal.component';
import { ColumnDef, ColumnManagerModalComponent } from '../vehicules/list/column-manager-modal.component';
import { ExportExcelModalComponent, ExportColDef, ExportFilterDef, ExportResult } from '../../shared/ui/export-excel-modal/export-excel-modal.component';
import { ExcelExportService } from '../../shared/services/excel-export.service';
import { downloadBlobAs } from '../../shared/utils/download-blob';

export const ALL_PNEU_COLUMN_DEFS: ColumnDef[] = [
  { id: 'position',       label: 'Position',          flex: 0.8 },
  { id: 'marque',         label: 'Marque',            flex: 1.2 },
  { id: 'nSerie',         label: 'N° série',          flex: 1.5 },
  { id: 'reference',      label: 'Référence',         flex: 1.3 },
  { id: 'dateMontage',    label: 'Date de montage',   flex: 1.2 },
  { id: 'profondeur32e',  label: 'Profondeur (32è)',  flex: 1.2 },
  { id: 'pressionPsi',    label: 'Pression (PSI)',    flex: 1.2 },
  { id: 'kmParcourus',    label: 'Km parcourus',      flex: 1.2 },
  { id: 'kmRestant',      label: 'Km restants',       flex: 1.2 },
  { id: 'expectedLifeKm', label: 'Durée de vie (km)', flex: 1.2 },
  { id: 'status',         label: 'Statut',            flex: 0.9 },
  { id: 'actif',          label: 'Actif',             flex: 0.7 },
];

export const DEFAULT_PNEU_VISIBLE_IDS = [
  'position', 'marque', 'nSerie', 'profondeur32e', 'pressionPsi', 'kmParcourus', 'status',
];

const MONO_COL_IDS = new Set([
  'position', 'nSerie', 'reference', 'dateMontage', 'profondeur32e',
  'pressionPsi', 'kmParcourus', 'kmRestant', 'expectedLifeKm',
]);

const ACTIONS_COL: DataTableCol = { label: 'Actions', flex: 0.8 };

@Component({
  selector: 'app-pneus-table-tab',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    CardComponent,
    DataTableHeaderComponent,
    DataTableRowComponent,
    EmptyStateComponent,
    SkeletonComponent,
    ConfirmDeleteModalComponent,
    AjouterPneuModalComponent,
    EditPneuModalComponent,
    ColumnManagerModalComponent,
    ExportExcelModalComponent,
  ],
  template: `
    <app-card title="Gestion pneus">
      <!-- Toolbar -->
      <div card-title-right>
        <button class="btn-add" type="button" (click)="showAdd.set(true)">
          <lucide-icon name="plus" [size]="14" />
          Ajouter un pneu
        </button>
      </div>

      @if (loading()) {
        <app-skeleton [rows]="4" height="52px" />
      } @else if (pneus().length > 0) {
        <div class="ptt-table-wrap">
          <app-data-table-header [cols]="tableCols()" />
          @for (p of pneus(); track p.id; let i = $index) {
            <app-data-table-row [idx]="i">
              @for (col of visibleCols(); track col.id) {
                @if (col.id === 'status') {
                  <div class="dtr-cell" [style.flex]="col.flex">
                    <span class="badge badge--{{ getStatusVariant(p.status) }}">
                      {{ statusLabel(p.status) }}
                    </span>
                  </div>
                } @else {
                  <div class="dtr-cell" [class.dtr-cell--mono]="isMono(col.id)" [style.flex]="col.flex">
                    {{ cellValue(col.id, p) }}
                  </div>
                }
              }
              <div class="dtr-cell dtr-cell--actions" [style.flex]="actionsFlex">
                <button class="btn-icon" type="button" title="Modifier" (click)="openEdit(p)">
                  <lucide-icon name="pencil" [size]="14" />
                </button>
                <button class="btn-icon btn-icon--danger" type="button" title="Supprimer" (click)="openDelete(p)">
                  <lucide-icon name="trash-2" [size]="14" />
                </button>
              </div>
            </app-data-table-row>
          }
        </div>
      } @else {
        <app-empty-state message="Aucun pneu enregistré pour ce véhicule" />
      }

      @if (!loading()) {
        <div class="ptt-toolbar">
          <button class="btn-export" type="button" (click)="showExportModal.set(true)" [disabled]="exporting()">
            <lucide-icon name="download" [size]="14" />
            {{ exporting() ? 'Exportation…' : 'Export Excel' }}
          </button>
          <button class="btn-settings" type="button" (click)="showColManager.set(true)" title="Gérer les colonnes">
            <lucide-icon name="settings" [size]="16" />
          </button>
        </div>
      }
    </app-card>

    @if (showAdd()) {
      <app-ajouter-pneu-modal
        [vehiculeId]="vehiculeId"
        [availablePositions]="[]"
        [maxPosition]="20"
        (saved)="onAdded()"
        (close)="showAdd.set(false)" />
    }

    @if (editTarget()) {
      <app-edit-pneu-modal
        [pneu]="editTarget()!"
        (saved)="onEdited()"
        (close)="editTarget.set(null)" />
    }

    @if (deleteTarget()) {
      <app-confirm-delete-modal
        confirmMessage="Êtes-vous sûr de vouloir supprimer ce pneu ? Cette action est irréversible."
        [itemLabel]="deleteTargetLabel()"
        [isDeleting]="deleting()"
        (confirm)="onDeleteConfirm()"
        (cancel)="deleteTarget.set(null)" />
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
        [filterDefs]="exportFilterDefs"
        [initialVisible]="exportDefaultColIds"
        (exported)="onExportConfirmed($event)"
        (cancel)="showExportModal.set(false)" />
    }
  `,
  styles: [`
    .btn-add {
      height: 34px;
      padding: 0 14px;
      border: none;
      border-radius: 8px;
      background: var(--color-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
    }
    .btn-add:hover { opacity: 0.9; }

    .ptt-table-wrap { margin: 0 -24px; }

    .ptt-toolbar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      padding: 12px 0 0;
      border-top: 1px solid var(--color-border);
      margin: 12px -24px -12px;
      padding-left: 24px;
      padding-right: 24px;
    }
    .btn-export {
      height: 34px;
      padding: 0 14px;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }
    .btn-export:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
    .btn-export:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-settings {
      width: 34px;
      height: 34px;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #374151;
    }
    .btn-settings:hover { border-color: var(--color-primary); color: var(--color-primary); }

    .dtr-cell {
      display: flex;
      align-items: center;
      height: 52px;
      padding: 0 16px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dtr-cell--mono { font-family: 'JetBrains Mono', monospace; }
    .dtr-cell--actions { gap: 6px; }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      border-radius: 6px;
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      font-weight: 600;
    }
    .badge--success   { background: #dcfce7; color: #166534; }
    .badge--warning   { background: #fef3c7; color: #92400e; }
    .badge--secondary { background: #F3F4F6; color: #6B7280; }

    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface);
      cursor: pointer;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }
    .btn-icon:hover { background: #F9FAFB; color: var(--color-text); }
    .btn-icon--danger:hover { background: #FEF2F2; color: #991B1B; border-color: #FCA5A5; }
  `],
})
export class PneusTableTabComponent implements OnInit {
  @Input({ required: true }) vehiculeId!: number;
  @Input() vehiculeType = '';

  private pneuService = inject(PneuService);
  private excelExportService = inject(ExcelExportService);
  private destroyRef = inject(DestroyRef);
  private locale = inject(LOCALE_ID);

  readonly allColumnDefs = ALL_PNEU_COLUMN_DEFS;
  readonly defaultVisibleIds = DEFAULT_PNEU_VISIBLE_IDS;
  readonly actionsFlex = ACTIONS_COL.flex;

  pneus    = signal<Pneu[]>([]);
  loading  = signal(true);
  showAdd  = signal(false);
  editTarget   = signal<Pneu | null>(null);
  deleteTarget = signal<Pneu | null>(null);
  deleting     = signal(false);
  showColManager  = signal(false);
  showExportModal = signal(false);
  exporting       = signal(false);

  private readonly LS_KEY = 'fleet.pneus-table.columns';

  private loadColConfig(): string[] {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      if (raw) return JSON.parse(raw) as string[];
    } catch { /* ignore */ }
    return DEFAULT_PNEU_VISIBLE_IDS;
  }

  visibleColIds = signal<string[]>(this.loadColConfig());

  visibleCols = computed<ColumnDef[]>(() => {
    const byId = new Map(ALL_PNEU_COLUMN_DEFS.map(c => [c.id, c]));
    return this.visibleColIds().map(id => byId.get(id)!).filter(Boolean);
  });

  tableCols = computed<DataTableCol[]>(() => [
    ...this.visibleCols().map(c => ({ label: c.label, flex: c.flex })),
    ACTIONS_COL,
  ]);

  onColumnsApplied(ids: string[]): void {
    this.visibleColIds.set(ids);
    localStorage.setItem(this.LS_KEY, JSON.stringify(ids));
    this.showColManager.set(false);
  }

  isMono(colId: string): boolean {
    return MONO_COL_IDS.has(colId);
  }

  cellValue(colId: string, p: Pneu): string {
    switch (colId) {
      case 'position':       return String(p.position);
      case 'marque':         return p.marque ?? '—';
      case 'nSerie':         return p.nSerie ?? '—';
      case 'reference':      return p.reference ?? '—';
      case 'dateMontage':    return p.dateMontage ? formatDate(p.dateMontage, 'dd/MM/yyyy', this.locale) : '—';
      case 'profondeur32e':  return p.profondeur32e != null ? String(p.profondeur32e) : '—';
      case 'pressionPsi':    return p.pressionPsi != null ? String(p.pressionPsi) : '—';
      case 'kmParcourus':    return formatNumber(p.kmParcourus, this.locale);
      case 'kmRestant':      return p.kmRestant != null ? formatNumber(p.kmRestant, this.locale) : '—';
      case 'expectedLifeKm': return formatNumber(p.expectedLifeKm, this.locale);
      case 'actif':          return p.actif ? 'Oui' : 'Non';
      default:               return '—';
    }
  }

  readonly exportColDefs: ExportColDef[] = [
    { id: 'vehicule',       label: 'Véhicule' },
    { id: 'position',       label: 'Position' },
    { id: 'reference',      label: 'Référence' },
    { id: 'nSerie',         label: 'N° Série' },
    { id: 'marque',         label: 'Marque' },
    { id: 'dateMontage',    label: 'Date de montage' },
    { id: 'kmParcourus',    label: 'Km parcourus' },
    { id: 'kmRestant',      label: 'Km restants' },
    { id: 'expectedLifeKm', label: 'Durée de vie (km)' },
    { id: 'pressionPsi',    label: 'Pression (PSI)' },
    { id: 'profondeur32e',  label: 'Profondeur (32e)' },
    { id: 'status',         label: 'Statut' },
    { id: 'actif',          label: 'Actif' },
  ];

  readonly exportDefaultColIds = this.exportColDefs
    .filter(c => !['expectedLifeKm', 'pressionPsi', 'profondeur32e', 'actif'].includes(c.id))
    .map(c => c.id);

  readonly exportFilterDefs: ExportFilterDef[] = [
    {
      key: 'statut', label: 'Statut', type: 'select',
      options: [
        { value: 'ok', label: 'OK' },
        { value: 'warn', label: 'Alerte' },
        { value: 'empty', label: 'Vide' },
      ],
    },
  ];

  onExportConfirmed(result: ExportResult): void {
    this.showExportModal.set(false);
    if (this.exporting()) return;
    this.exporting.set(true);
    this.excelExportService.download({
      entites: 'pneus',
      vehiculeId: this.vehiculeId,
      columns: result.columns,
      statut: result.filters['statut'],
    }).pipe(take(1)).subscribe({
      next: blob => { downloadBlobAs(blob, 'pneus.xlsx'); this.exporting.set(false); },
      error: () => this.exporting.set(false),
    });
  }

  deleteTargetLabel(): string {
    const p = this.deleteTarget();
    if (!p) return '';
    const parts: string[] = [`P${p.position}`];
    if (p.nSerie)  parts.push(p.nSerie);
    if (p.marque)  parts.push(p.marque);
    return parts.join(' — ');
  }

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.pneuService.invalidateByVehicule(this.vehiculeId);
    this.pneuService.listByVehicule(this.vehiculeId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of([] as Pneu[])),
    ).subscribe(list => {
      this.pneus.set(list);
      this.loading.set(false);
    });
  }

  openEdit(p: Pneu): void   { this.editTarget.set(p); }
  openDelete(p: Pneu): void { this.deleteTarget.set(p); }

  onAdded(): void {
    this.showAdd.set(false);
    this.reload();
  }

  onEdited(): void {
    this.editTarget.set(null);
    this.reload();
  }

  onDeleteConfirm(): void {
    const p = this.deleteTarget();
    if (!p) return;
    this.deleting.set(true);
    this.pneuService.delete(p.id, this.vehiculeId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of(undefined)),
    ).subscribe(() => {
      this.deleting.set(false);
      this.deleteTarget.set(null);
      this.reload();
    });
  }

  getStatusVariant(status: PneuStatus): 'success' | 'warning' | 'secondary' {
    switch (status) {
      case 'ok':    return 'success';
      case 'warn':  return 'warning';
      case 'empty': return 'secondary';
      default:      return 'secondary';
    }
  }

  statusLabel(status: PneuStatus): string {
    switch (status) {
      case 'ok':    return 'OK';
      case 'warn':  return 'Avertissement';
      case 'empty': return 'Vide';
      default:      return status;
    }
  }
}
