import { Component, Input, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
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

const COLS: DataTableCol[] = [
  { label: 'Position',         flex: 0.8 },
  { label: 'Marque',           flex: 1.2 },
  { label: 'N° série',         flex: 1.5 },
  { label: 'Profondeur (32è)', flex: 1.2 },
  { label: 'Pression (PSI)',   flex: 1.2 },
  { label: 'Km parcourus',     flex: 1.2 },
  { label: 'Statut',           flex: 0.9 },
  { label: 'Actions',          flex: 0.8 },
];

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
          <app-data-table-header [cols]="cols" />
          @for (p of pneus(); track p.id; let i = $index) {
            <app-data-table-row [idx]="i">
              <div class="dtr-cell dtr-cell--mono" [style.flex]="cols[0].flex">{{ p.position }}</div>
              <div class="dtr-cell" [style.flex]="cols[1].flex">{{ p.marque ?? '—' }}</div>
              <div class="dtr-cell dtr-cell--mono" [style.flex]="cols[2].flex">{{ p.nSerie ?? '—' }}</div>
              <div class="dtr-cell dtr-cell--mono" [style.flex]="cols[3].flex">
                {{ p.profondeur32e != null ? p.profondeur32e : '—' }}
              </div>
              <div class="dtr-cell dtr-cell--mono" [style.flex]="cols[4].flex">
                {{ p.pressionPsi != null ? p.pressionPsi : '—' }}
              </div>
              <div class="dtr-cell dtr-cell--mono" [style.flex]="cols[5].flex">
                {{ p.kmParcourus | number }}
              </div>
              <div class="dtr-cell" [style.flex]="cols[6].flex">
                <span class="badge badge--{{ getStatusVariant(p.status) }}">
                  {{ statusLabel(p.status) }}
                </span>
              </div>
              <div class="dtr-cell dtr-cell--actions" [style.flex]="cols[7].flex">
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

    .ptt-table-wrap { margin: 0 -24px -24px; }

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
  private destroyRef = inject(DestroyRef);

  readonly cols = COLS;

  pneus    = signal<Pneu[]>([]);
  loading  = signal(true);
  showAdd  = signal(false);
  editTarget   = signal<Pneu | null>(null);
  deleteTarget = signal<Pneu | null>(null);
  deleting     = signal(false);

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
