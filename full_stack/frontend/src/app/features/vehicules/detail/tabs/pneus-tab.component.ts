import { Component, Input, inject, signal, computed, SimpleChanges, DestroyRef, OnChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { PneuService } from '../../../pneus/pneu.service';
import { Pneu } from '../../../../shared/models/pneu.model';
import { Attelage, VehiculeType } from '../../../../shared/models/vehicule.model';
import { StatusBadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { AxleSchemaComponent } from '../../../../shared/ui/axle-schema/axle-schema.component';
import { TireCardComponent } from '../../../pneus/tire-card/tire-card.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-pneus-tab',
  standalone: true,
  imports: [CommonModule, AxleSchemaComponent, TireCardComponent, EmptyStateComponent, SkeletonComponent, StatusBadgeComponent],
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
        <app-empty-state message="Ce véhicule n'a pas de gestion de pneus" />
      } @else {
        <div class="pneus-tab__layout">
          <div class="pneus-tab__diagram">
            <app-axle-schema [axleConfig]="effectiveConfigAxle()!" [tires]="tires()" (tireClick)="selectedPneu.set($event)" />
          </div>
          @if (selectedPneu()) {
            <div class="pneus-tab__side-panel">
              <app-tire-card [pneu]="selectedPneu()!" />
            </div>
          }
        </div>
        @if (tires().length > 0) {
          <div class="pneus-tab__list">
            <h3 class="pneus-tab__subtitle">Tous les pneus</h3>
            @for (tire of tires(); track tire.id) {
              <div class="pneus-tab__tire-row" (click)="selectedPneu.set(tire)">
                <span class="pneus-tab__pos">P{{ tire.position }}</span>
                <span class="pneus-tab__serie">{{ tire.nSerie ?? '—' }}</span>
                <span class="pneus-tab__marque">{{ tire.marque ?? '—' }}</span>
                <span class="pneus-tab__km">{{ tire.kmParcourus }} km</span>
                <app-status-badge [status]="tire.status" />
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .pneus-tab__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .pneus-tab__context-label { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text-muted); }
    .pneus-tab__toggle { display: flex; border: 1px solid var(--color-border); border-radius: 6px; overflow: hidden; }
    .pneus-tab__toggle-btn { padding: 6px 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 500; background: transparent; border: none; cursor: pointer; color: var(--color-text); transition: background 0.15s; }
    .pneus-tab__toggle-btn--active { background: var(--color-primary); color: #fff; }
    .pneus-tab__layout { display: flex; gap: 24px; margin-bottom: 24px; }
    .pneus-tab__diagram { flex: 1; }
    .pneus-tab__side-panel { width: 280px; }
    .pneus-tab__subtitle { font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 600; color: var(--color-text); margin: 0 0 12px; }
    .pneus-tab__tire-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--color-border); cursor: pointer; }
    .pneus-tab__tire-row:hover { background: var(--color-surface-2); }
    .pneus-tab__pos { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 700; color: var(--color-primary); min-width: 32px; }
    .pneus-tab__serie, .pneus-tab__marque, .pneus-tab__km { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); }
    .pneus-tab__km { margin-left: auto; }
  `],
})
export class PneusTabComponent implements OnChanges {
  private pneuService = inject(PneuService);
  private destroyRef = inject(DestroyRef);

  @Input() vehiculeId!: number;
  @Input() vehiculeType: VehiculeType = 'camion';
  @Input() configAxle: '4x2' | '6x4' | 'plateau-2x2' | null = null;
  @Input() currentAttelage: Attelage | null = null;

  tires = signal<Pneu[]>([]);
  loading = signal(true);
  selectedPneu = signal<Pneu | null>(null);
  activePartie = signal<'tracteur' | 'remorque'>('tracteur');

  showToggle = computed(() => this.vehiculeType === 'camion' && this.currentAttelage !== null);

  contextLabel = computed(() => {
    if (this.activePartie() === 'remorque' && this.currentAttelage) {
      return `Semi-remorque ${this.currentAttelage.semiCode} · ${this.tires().length} positions`;
    }
    return `Configuration ${this.configAxle ?? '—'}`;
  });

  effectiveConfigAxle = computed(() =>
    this.activePartie() === 'remorque' ? 'plateau-2x2' : this.configAxle
  );

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

  private loadTires(): void {
    const id = this.activePartie() === 'remorque' && this.currentAttelage
      ? this.currentAttelage.semiId
      : this.vehiculeId;

    if (!id) { this.loading.set(false); return; }

    this.loading.set(true);
    this.selectedPneu.set(null);
    this.pneuService.listByVehicule(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (pneus) => { this.tires.set(pneus); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
