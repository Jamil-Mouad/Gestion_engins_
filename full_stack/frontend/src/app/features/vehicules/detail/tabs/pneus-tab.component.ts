import { Component, Input, inject, signal, computed, SimpleChanges, DestroyRef, OnChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs/operators';
import { PneuService } from '../../../pneus/pneu.service';
import { Pneu } from '../../../../shared/models/pneu.model';
import { Attelage, VehiculeType, isCamionTracteur } from '../../../../shared/models/vehicule.model';
import { AxleSchemaComponent } from '../../../../shared/ui/axle-schema/axle-schema.component';
import { TireCardComponent } from '../../../pneus/tire-card/tire-card.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { PermuterPneuModalComponent } from '../../../pneus/permuter-pneu-modal.component';
import { RemplacerPneuModalComponent } from '../../../pneus/remplacer-pneu-modal.component';
import { AjouterPneuModalComponent } from '../../../pneus/ajouter-pneu-modal.component';
import { AxleSchemaComponent as _AxleSchemaRef } from '../../../../shared/ui/axle-schema/axle-schema.component';
import { ExportExcelModalComponent, ExportColDef, ExportFilterDef, ExportResult } from '../../../../shared/ui/export-excel-modal/export-excel-modal.component';
import { ExcelExportService } from '../../../../shared/services/excel-export.service';
import { downloadBlobAs } from '../../../../shared/utils/download-blob';

@Component({
  selector: 'app-pneus-tab',
  standalone: true,
  imports: [
    CommonModule,
    AxleSchemaComponent,
    TireCardComponent,
    EmptyStateComponent,
    SkeletonComponent,
    PermuterPneuModalComponent,
    RemplacerPneuModalComponent,
    AjouterPneuModalComponent,
    ExportExcelModalComponent,
  ],
  template: `
    <div class="pneus-tab">

      @if (showToggle()) {
        <div class="pneus-tab__header">
          <span class="pneus-tab__context-label">{{ contextLabel() }}</span>
          <div class="pneus-tab__toggle">
            <button class="pneus-tab__toggle-btn"
                    [class.pneus-tab__toggle-btn--active]="activePartie() === 'tracteur'"
                    (click)="setPartie('tracteur')">Tracteur</button>
            <button class="pneus-tab__toggle-btn"
                    [class.pneus-tab__toggle-btn--active]="activePartie() === 'remorque'"
                    (click)="setPartie('remorque')">Semi-remorque</button>
          </div>
        </div>
      }

      @if (loading()) {
        <app-skeleton [rows]="3" height="40px" />
      } @else if (!effectiveConfigAxle()) {
        @if (activePartie() === 'remorque' && !currentAttelage) {
          <app-empty-state message="Aucune semi-remorque attelée — attelez-en une depuis l'onglet Infos" />
        } @else {
          <app-empty-state message="Ce véhicule n'a pas de gestion de pneus" />
        }
      } @else {
        <div class="pneus-tab__columns">

          <!-- Left column: axle schema card -->
          <div class="pneus-tab__left">
            <div class="pneus-tab__card">
              <div class="pneus-tab__card-header">
                <span class="pneus-tab__card-title">
                  @if (activePartie() === 'remorque' && currentAttelage) {
                    Configuration semi-remorque — {{ currentAttelage.semiCode }}
                  } @else {
                    Configuration essieux — {{ effectiveConfigAxle() }}
                  }
                </span>
                <div class="pneus-tab__legend">
                  <div class="pneus-tab__legend-item">
                    <span class="pneus-tab__legend-dot" style="background:#1D4ED8;"></span>
                    <span>Monté OK</span>
                  </div>
                  <div class="pneus-tab__legend-item">
                    <span class="pneus-tab__legend-dot" style="background:#EF4444;"></span>
                    <span>Alerte</span>
                  </div>
                  <div class="pneus-tab__legend-item">
                    <span class="pneus-tab__legend-dot" style="background:#D1D5DB;"></span>
                    <span>Vide</span>
                  </div>
                </div>
              </div>

              <div class="pneus-tab__schema-wrapper">
                <app-axle-schema
                  [axleConfig]="effectiveConfigAxle()!"
                  [tires]="tires()"
                  [selectedPosition]="selectedPosition()"
                  (tireClick)="onTireClick($event)" />
              </div>

              <div class="pneus-tab__card-footer">
                <button class="btn-secondary-sm" (click)="openExport()">Exporter Excel</button>
                <button class="btn-secondary-sm"
                        [disabled]="!selectedPneu()"
                        (click)="openPermuter()">Permuter positions</button>
                @if (selectedPosition() !== null && !selectedPneu()) {
                  <button class="btn-primary-sm"
                          (click)="openAjouter(selectedPosition())">Monter un pneu (P{{ selectedPosition() }})</button>
                } @else {
                  <button class="btn-primary-sm"
                          [disabled]="!selectedPneu()"
                          (click)="openRemplacer()">Remplacer un pneu</button>
                }
              </div>
            </div>
          </div>

          <!-- Right column: tire detail + resume -->
          <div class="pneus-tab__right">

            <!-- Installed Tires card -->
            <div class="pneus-tab__card">
              <div class="pneus-tab__card-header">
                <span class="pneus-tab__card-title">Installed Tires</span>
                <button class="btn-primary-sm" (click)="openAjouter()">+ Ajouter</button>
              </div>

              @if (selectedPneu()) {
                <app-tire-card [pneu]="selectedPneu()!" />
                <div class="pneus-tab__action-row">
                  <button class="btn-secondary-sm" (click)="openPermuter()">Permuter</button>
                  <button class="btn-primary-sm" (click)="openRemplacer()">Remplacer</button>
                  <button class="btn-secondary-sm" [disabled]="downloadingFiche()" (click)="downloadFiche()">
                    {{ downloadingFiche() ? '…' : 'Fiche PDF' }}
                  </button>
                  <button class="btn-danger-sm" [disabled]="deleting()" (click)="deletePneu()">
                    {{ deleting() ? '…' : 'Supprimer' }}
                  </button>
                </div>
              } @else if (selectedPosition() !== null) {
                <div class="pneus-tab__empty-pos">
                  <p>Position P{{ selectedPosition() }} libre.</p>
                  <button class="btn-primary-sm pneus-tab__mount-btn"
                          (click)="openAjouter(selectedPosition())">+ Monter un pneu ici</button>
                </div>
              } @else {
                <div class="pneus-tab__empty-pos">
                  <p>Aucun pneu installé sur cette position. Cliquez sur un emplacement pour en sélectionner un.</p>
                </div>
              }
            </div>

            <!-- Résumé parc pneus card -->
            <div class="pneus-tab__card">
              <div class="pneus-tab__card-header">
                <span class="pneus-tab__card-title">Résumé parc pneus</span>
              </div>
              <div class="pneus-tab__resume-row">
                <span class="pneus-tab__resume-label">Positions montées</span>
                <span class="pneus-tab__resume-value">{{ resume().montees }} / {{ resume().total }}</span>
              </div>
              <div class="pneus-tab__resume-row">
                <span class="pneus-tab__resume-label">Alertes actives</span>
                <span class="pneus-tab__resume-value"
                      [style.color]="resume().alertes > 0 ? 'var(--color-warning)' : 'inherit'">
                  {{ resume().alertes }}
                </span>
              </div>
              <div class="pneus-tab__resume-row">
                <span class="pneus-tab__resume-label">Km parcourus moy.</span>
                <span class="pneus-tab__resume-value">{{ resume().avgKm | number }} km</span>
              </div>
              <div class="pneus-tab__resume-row pneus-tab__resume-row--last">
                <span class="pneus-tab__resume-label">Prochain remplacement</span>
                <span class="pneus-tab__resume-value"
                      [style.color]="resume().urgentTire ? 'var(--color-danger)' : 'inherit'">
                  @if (resume().urgentTire) {
                    Pos {{ resume().urgentTire!.position }} (urgent)
                  } @else {
                    —
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      }

    </div>

    <!-- Permuter modal -->
    @if (showPermuterModal()) {
      <app-permuter-pneu-modal
        [pneuId]="selectedPneu()!.id"
        [currentPosition]="selectedPneu()!.position"
        [availablePositions]="availablePositionsForPermuter()"
        (saved)="onModalSaved()"
        (close)="showPermuterModal.set(false)" />
    }

    <!-- Remplacer modal -->
    @if (showRemplacerModal() && selectedPosition() !== null) {
      <app-remplacer-pneu-modal
        [pneuId]="selectedPneu()?.id ?? 0"
        [position]="selectedPosition()!"
        (saved)="onModalSaved()"
        (close)="showRemplacerModal.set(false)" />
    }

    <!-- Ajouter modal -->
    @if (showAjouterModal()) {
      <app-ajouter-pneu-modal
        [vehiculeId]="effectiveVehiculeId()"
        [availablePositions]="emptyPositions()"
        [maxPosition]="totalPositions()"
        [initialPosition]="ajouterInitialPosition()"
        (saved)="onModalSaved()"
        (close)="showAjouterModal.set(false)" />
    }

    <!-- Export Excel modal -->
    @if (showExportModal()) {
      <app-export-excel-modal
        [allColumns]="exportColDefs()"
        [filterDefs]="exportFilterDefs()"
        [initialVisible]="exportDefaultColIds()"
        (exported)="onExportConfirmed($event)"
        (cancel)="showExportModal.set(false)" />
    }
  `,
  styles: [`
    .pneus-tab__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .pneus-tab__context-label { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text-muted); }
    .pneus-tab__toggle { display: flex; border: 1px solid var(--color-border); border-radius: 6px; overflow: hidden; }
    .pneus-tab__toggle-btn { padding: 6px 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 500; background: transparent; border: none; cursor: pointer; color: var(--color-text); transition: background 0.15s; }
    .pneus-tab__toggle-btn--active { background: var(--color-primary); color: #fff; }

    .pneus-tab__columns { display: flex; gap: 24px; align-items: flex-start; }
    .pneus-tab__left { flex: 1; min-width: 0; }
    .pneus-tab__right { width: 280px; display: flex; flex-direction: column; gap: 16px; flex-shrink: 0; }

    .pneus-tab__card { background: var(--color-surface); border-radius: 12px; border: 1px solid var(--color-border); padding: 20px; }
    .pneus-tab__card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    .pneus-tab__card-title { font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 600; color: var(--color-text); }

    .pneus-tab__legend { display: flex; gap: 12px; }
    .pneus-tab__legend-item { display: flex; align-items: center; gap: 4px; font-family: 'Open Sans', sans-serif; font-size: 12px; color: var(--color-text-muted); }
    .pneus-tab__legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

    .pneus-tab__schema-wrapper { display: flex; justify-content: center; }

    .pneus-tab__card-footer { margin-top: 16px; border-top: 1px solid var(--color-border); padding-top: 12px; display: flex; justify-content: flex-end; gap: 8px; }

    .pneus-tab__action-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }

    .pneus-tab__empty-pos { padding: 16px 0; display: flex; flex-direction: column; gap: 12px; align-items: center; }
    .pneus-tab__empty-pos p { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text-muted); text-align: center; line-height: 1.5; margin: 0; }
    .pneus-tab__mount-btn { flex: 0 0 auto; padding: 0 16px; }

    .pneus-tab__resume-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--color-border); font-size: 13px; }
    .pneus-tab__resume-row--last { border-bottom: none; }
    .pneus-tab__resume-label { font-family: 'Open Sans', sans-serif; color: var(--color-text-muted); }
    .pneus-tab__resume-value { font-family: 'Montserrat', sans-serif; font-weight: 600; color: var(--color-text); }

    .btn-secondary-sm { flex: 1 1 auto; min-width: 0; height: 32px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 500; color: var(--color-text); cursor: pointer; transition: background 0.15s; white-space: nowrap; }
    .btn-secondary-sm:hover:not(:disabled) { background: var(--color-surface-2); }
    .btn-secondary-sm:disabled { opacity: 0.4; cursor: not-allowed; }

    .btn-primary-sm { flex: 1 1 auto; min-width: 0; height: 32px; padding: 0 10px; border: none; border-radius: 6px; background: var(--color-primary); font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 600; color: #fff; cursor: pointer; transition: opacity 0.15s; white-space: nowrap; }
    .btn-primary-sm:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary-sm:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-danger-sm { flex: 1 1 auto; min-width: 0; height: 32px; padding: 0 10px; border: 1px solid #FECACA; border-radius: 6px; background: #FEF2F2; font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 500; color: #B91C1C; cursor: pointer; white-space: nowrap; }
    .btn-danger-sm:hover:not(:disabled) { background: #FEE2E2; }
    .btn-danger-sm:disabled { opacity: 0.4; cursor: not-allowed; }
  `],
})
export class PneusTabComponent implements OnChanges {
  private pneuService = inject(PneuService);
  private excelExportService = inject(ExcelExportService);
  private destroyRef = inject(DestroyRef);

  @Input() vehiculeId!: number;
  @Input() vehiculeType: VehiculeType = 'camion';
  @Input() configAxle: '4x2' | '6x4' | 'plateau-2x2' | null = null;
  @Input() currentAttelage: Attelage | null = null;

  tires = signal<Pneu[]>([]);
  loading = signal(true);
  activePartie = signal<'tracteur' | 'remorque'>('tracteur');
  selectedPosition = signal<number | null>(null);

  showPermuterModal = signal(false);
  showRemplacerModal = signal(false);
  showAjouterModal = signal(false);
  showExportModal = signal(false);
  deleting = signal(false);
  downloadingFiche = signal(false);
  exporting = signal(false);
  ajouterInitialPosition = signal<number | null>(null);

  selectedPneu = computed(() => {
    const pos = this.selectedPosition();
    if (pos === null) return null;
    return this.tires().find(t => t.position === pos) ?? null;
  });

  showToggle = computed(() => isCamionTracteur(this.vehiculeType));

  contextLabel = computed(() => {
    if (this.activePartie() === 'remorque' && this.currentAttelage) {
      return `Semi-remorque ${this.currentAttelage.semiCode} · ${this.tires().length} positions`;
    }
    return `Configuration ${this.configAxle ?? '—'}`;
  });

  effectiveConfigAxle = computed(() => {
    if (this.activePartie() === 'remorque') {
      return (this.currentAttelage?.semiConfigAxle as '4x2' | '6x4' | 'plateau-2x2' | 'semi-2-essieux' | 'semi-3-essieux' | null) ?? null;
    }
    return this.configAxle;
  });

  totalPositions = computed(() => {
    const cfg = this.effectiveConfigAxle();
    if (!cfg) return 0;
    return _AxleSchemaRef.totalPositions(cfg);
  });

  emptyPositions = computed(() => {
    const total = this.totalPositions();
    const occupied = new Set(this.tires().map(t => t.position));
    return Array.from({ length: total }, (_, i) => i + 1).filter(p => !occupied.has(p));
  });

  resume = computed(() => {
    const t = this.tires();
    const totalPositions = this.totalPositions();
    const alertes = t.filter(p => p.status === 'warn').length;
    const avgKm = t.length > 0 ? Math.round(t.reduce((s, p) => s + p.kmParcourus, 0) / t.length) : 0;
    const wornTires = t.filter(p => p.status === 'warn' || p.status === 'empty');
    const urgentTire = wornTires.length > 0
      ? wornTires.reduce((min, p) => (p.kmRestant ?? 0) < (min.kmRestant ?? 0) ? p : min, wornTires[0])
      : t.length > 0
        ? t.reduce((min, p) => (p.kmRestant ?? 0) < (min.kmRestant ?? 0) ? p : min, t[0])
        : null;
    return { montees: t.length, total: totalPositions, alertes, avgKm, urgentTire };
  });

  effectiveVehiculeId = computed(() =>
    this.activePartie() === 'remorque' && this.currentAttelage
      ? this.currentAttelage.semiId
      : this.vehiculeId
  );

  availablePositionsForPermuter = computed(() => {
    const current = this.selectedPneu();
    return this.tires()
      .filter(t => t.position !== current?.position)
      .map(t => t.position);
  });

  onTireClick(position: number): void {
    this.selectedPosition.update(current => current === position ? null : position);
  }

  openPermuter(): void {
    if (!this.selectedPneu()) return;
    this.showPermuterModal.set(true);
  }

  openRemplacer(): void {
    if (this.selectedPosition() === null) return;
    this.showRemplacerModal.set(true);
  }

  openAjouter(prefillPosition: number | null = null): void {
    this.ajouterInitialPosition.set(prefillPosition);
    this.showAjouterModal.set(true);
  }

  openExport(): void {
    this.showExportModal.set(true);
  }

  downloadFiche(): void {
    const pneu = this.selectedPneu();
    if (!pneu || this.downloadingFiche()) return;
    this.downloadingFiche.set(true);
    this.pneuService.downloadFiche(pneu.id).pipe(take(1)).subscribe({
      next: blob => { downloadBlobAs(blob, `fiche-pneu-${pneu.id}.pdf`); this.downloadingFiche.set(false); },
      error: () => this.downloadingFiche.set(false),
    });
  }

  // The « partie » column only makes sense for an attelage (tracteur + semi)
  exportColDefs = computed<ExportColDef[]>(() => {
    const cols: ExportColDef[] = [
      { id: 'vehicule', label: 'Véhicule' },
      ...(isCamionTracteur(this.vehiculeType) ? [{ id: 'partie', label: 'Partie' }] : []),
      { id: 'position', label: 'Position' },
      { id: 'reference', label: 'Référence' },
      { id: 'nSerie', label: 'N° Série' },
      { id: 'marque', label: 'Marque' },
      { id: 'dateMontage', label: 'Date de montage' },
      { id: 'kmParcourus', label: 'Km parcourus' },
      { id: 'kmRestant', label: 'Km restants' },
      { id: 'expectedLifeKm', label: 'Durée de vie (km)' },
      { id: 'pressionPsi', label: 'Pression (PSI)' },
      { id: 'profondeur32e', label: 'Profondeur (32e)' },
      { id: 'status', label: 'Statut' },
      { id: 'actif', label: 'Actif' },
    ];
    return cols;
  });

  exportDefaultColIds = computed(() => this.exportColDefs()
    .filter(c => !['expectedLifeKm', 'pressionPsi', 'profondeur32e', 'actif'].includes(c.id))
    .map(c => c.id));

  // The « partie » filter only makes sense for an attelage (tracteur + semi).
  // Plain method (not computed): it depends on a non-signal @Input.
  exportFilterDefs = (): ExportFilterDef[] => [
    ...(isCamionTracteur(this.vehiculeType) ? [{
      key: 'partie', label: 'Partie', type: 'select' as const,
      options: [
        { value: 'camion_tracteur', label: 'Tracteur' },
        { value: 'semi_remorque', label: 'Semi-remorque' },
      ],
    }] : []),
    {
      key: 'statut', label: 'Statut', type: 'select' as const,
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
      vehiculeType: result.filters['partie'],
      columns: result.columns,
      statut: result.filters['statut'],
    }).pipe(take(1)).subscribe({
      next: blob => { downloadBlobAs(blob, 'pneus.xlsx'); this.exporting.set(false); },
      error: () => this.exporting.set(false),
    });
  }

  deletePneu(): void {
    const pneu = this.selectedPneu();
    if (!pneu) return;
    if (!confirm(`Supprimer le pneu P${pneu.position} ?`)) return;
    const vehiculeId = this.activePartie() === 'remorque' && this.currentAttelage
      ? this.currentAttelage.semiId
      : this.vehiculeId;
    this.deleting.set(true);
    this.pneuService.delete(pneu.id, vehiculeId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.deleting.set(false);
        this.selectedPosition.set(null);
        this.loadTires();
      },
      error: () => this.deleting.set(false),
    });
  }

  onModalSaved(): void {
    this.showPermuterModal.set(false);
    this.showRemplacerModal.set(false);
    this.showAjouterModal.set(false);
    const id = this.activePartie() === 'remorque' && this.currentAttelage
      ? this.currentAttelage.semiId
      : this.vehiculeId;
    this.pneuService.invalidateByVehicule(id);
    this.loadTires();
  }

  setPartie(partie: 'tracteur' | 'remorque'): void {
    if (this.activePartie() === partie) return;
    this.activePartie.set(partie);
    this.loadTires();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehiculeId'] || changes['configAxle'] || changes['currentAttelage']) {
      this.activePartie.set('tracteur');
      this.loadTires();
    }
  }

  loadTires(): void {
    const id = this.activePartie() === 'remorque' && this.currentAttelage
      ? this.currentAttelage.semiId
      : this.vehiculeId;

    if (!id) { this.loading.set(false); return; }

    this.loading.set(true);
    this.selectedPosition.set(null);
    this.pneuService.listByVehicule(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (pneus) => { this.tires.set(pneus); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
