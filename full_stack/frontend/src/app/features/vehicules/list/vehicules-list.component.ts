import { Component, inject, signal, computed, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, EMPTY } from 'rxjs';
import { switchMap, map, catchError, debounceTime } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { VehiculeService } from '../vehicule.service';
import { Vehicule, VehiculeType, VehiculeStatut } from '../../../shared/models/vehicule.model';
import { StatusBadgeComponent } from '../../../shared/ui/badge/badge.component';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ViewToggleComponent } from '../../../shared/ui/view-toggle/view-toggle.component';
import { FilterChipComponent } from '../../../shared/ui/filter-chip/filter-chip.component';
import { DataTableHeaderComponent } from '../../../shared/ui/data-table/data-table-header.component';
import { DataTableRowComponent } from '../../../shared/ui/data-table/data-table-row.component';
import { NewVehiculeModalComponent } from './new-vehicule-modal.component';
import { SpinnerOverlayComponent } from '../../../shared/ui/spinner/spinner-overlay.component';

type ViewMode = 'table' | 'cards';
type TypeFilter = 'all' | VehiculeType;
type StatutFilter = 'all' | VehiculeStatut;

@Component({
  selector: 'app-vehicules-list',
  standalone: true,
  imports: [
    DecimalPipe,
    LucideAngularModule,
    StatusBadgeComponent, StatusLabelPipe, EmptyStateComponent, SkeletonComponent,
    PageHeaderComponent, ViewToggleComponent, FilterChipComponent,
    DataTableHeaderComponent, DataTableRowComponent,
    NewVehiculeModalComponent, SpinnerOverlayComponent,
  ],
  template: `
    <app-spinner-overlay [show]="showSpinner()" />
    <div class="veh-list-page">
      <app-page-header title="Véhicules" [count]="totalElements() ?? undefined">
        <app-view-toggle [view]="viewMode()" (viewChange)="viewMode.set($event)" />
        <button class="btn-primary" (click)="showAddModal.set(true)" type="button">
          <lucide-icon name="plus" [size]="16" color="white" />
          Ajouter un véhicule
        </button>
      </app-page-header>

      <div class="veh-list-content">
        <!-- Search + Filter Card -->
        <div class="search-filter-card">
          <div class="search-wrap">
            <lucide-icon name="search" [size]="16" class="search-icon" />
            <input
              class="search-input"
              placeholder="Rechercher par code, matricule, marque…"
              (input)="onSearchInput($any($event.target).value)" />
          </div>
          <div class="filter-chips">
            <span class="filter-label">Filtres :</span>
            @for (f of typeFilters; track f.value) {
              <app-filter-chip
                [label]="f.label"
                [active]="typeFilter() === f.value"
                (clicked)="onTypeFilter(f.value)" />
            }
            @for (s of statutFilters; track s.value) {
              <app-filter-chip
                [label]="s.label"
                [active]="statutFilter() === s.value"
                (clicked)="onStatutFilter(s.value)" />
            }
          </div>
        </div>

        <!-- Table view -->
        @if (viewMode() === 'table') {
          <div class="table-wrap">
            <app-data-table-header [cols]="tableCols" />
            @if (loading() && vehicles().length === 0) {
              <app-skeleton [rows]="6" height="52px" />
            } @else if (vehicles().length === 0) {
              <app-empty-state icon="🚛" message="Aucun véhicule trouvé — essayez de modifier vos filtres." />
            } @else {
              @for (v of vehicles(); track v.id; let i = $index) {
                <app-data-table-row [idx]="i" [clickable]="true" (rowClicked)="navigateToDetail(v.id)">
                  <div class="td td--w03"><div class="row-check"></div></div>
                  <div class="td td--w09"><span class="code-chip">{{ v.code }}</span></div>
                  <div class="td td--w08">{{ v.type | statusLabel }}</div>
                  <div class="td td--w2">{{ v.marque }} {{ v.modele }}</div>
                  <div class="td td--w1 mono">{{ v.matricule || '—' }}</div>
                  <div class="td td--w1 mono">—</div>
                  <div class="td td--w1">
                    <app-status-badge [status]="v.statut" [label]="v.statut | statusLabel" />
                  </div>
                  <div class="td td--w03">
                    <lucide-icon name="more-horizontal" [size]="16" class="more-icon" />
                  </div>
                </app-data-table-row>
              }
            }
          </div>
          <!-- Pagination bar -->
          @if (vehicles().length > 0) {
            <div class="pagination-bar">
              <span class="pagination-info">
                Affichage 1–{{ vehicles().length }} sur {{ totalElements() ?? '…' }}
              </span>
              @if (hasMore()) {
                <button class="btn-charger-plus" (click)="chargerPlus()" [disabled]="loadingMore()" type="button">
                  {{ loadingMore() ? 'Chargement…' : 'Charger plus' }}
                </button>
              }
            </div>
          }
        }

        <!-- Cards view -->
        @if (viewMode() === 'cards') {
          @if (loading() && vehicles().length === 0) {
            <app-skeleton [rows]="4" height="120px" />
          } @else if (vehicles().length === 0) {
            <app-empty-state icon="🚛" message="Aucun véhicule trouvé — essayez de modifier vos filtres." />
          } @else {
            <div class="cards-grid">
              @for (v of vehicles(); track v.id) {
                <div class="vehicle-card" (click)="navigateToDetail(v.id)">
                  <div class="vehicle-card__header">
                    <span class="code-chip">{{ v.code }}</span>
                    <app-status-badge [status]="v.statut" [label]="v.statut | statusLabel" />
                  </div>
                  <div class="vehicle-card__img-placeholder">
                    <lucide-icon name="truck" [size]="32" />
                  </div>
                  <div class="vehicle-card__type">{{ v.type | statusLabel }}{{ v.annee ? ' · ' + v.annee : '' }}</div>
                  <div class="vehicle-card__marque">{{ v.marque }} {{ v.modele }}</div>
                  <div class="vehicle-card__meta mono">{{ v.matricule || '—' }}</div>
                </div>
              }
            </div>
            @if (hasMore()) {
              <div class="charger-plus-wrap">
                <button class="btn-charger-plus" (click)="chargerPlus()" [disabled]="loadingMore()" type="button">
                  {{ loadingMore() ? 'Chargement…' : 'Charger plus' }}
                </button>
              </div>
            }
          }
        }
      </div>

      @if (showAddModal()) {
        <app-new-vehicule-modal
          (close)="showAddModal.set(false)"
          (saved)="onVehiculeAdded($event)" />
      }
    </div>
  `,
  styles: [`
    .veh-list-page { background: #F5F5F5; min-height: calc(100vh - 72px); }
    .veh-list-content { padding: 20px 32px 32px; }

    /* Search + filter card */
    .search-filter-card { background: white; border-radius: 12px; border: 1px solid var(--color-border); padding: 16px 20px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
    .search-wrap { position: relative; display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border: 1px solid var(--color-border); border-radius: 8px; background: white; box-shadow: 0 1px 2px rgba(17,24,39,.06); }
    .search-icon { flex-shrink: 0; color: #6B7280; }
    .search-input { flex: 1; border: none; outline: none; background: transparent; font-family: 'Open Sans', sans-serif; font-size: 14px; color: #111827; }
    .filter-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .filter-label { font-family: 'Open Sans', sans-serif; font-size: 13px; color: #6B7280; }

    /* Table */
    .table-wrap { background: white; border-radius: 12px; border: 1px solid var(--color-border); box-shadow: 0 1px 2px rgba(17,24,39,.06); overflow: hidden; }
    .td { display: flex; align-items: center; height: 52px; padding: 0 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; }
    .td.mono { font-family: 'JetBrains Mono', monospace; }
    .td--w03 { flex: 0.3; }
    .td--w08 { flex: 0.8; }
    .td--w09 { flex: 0.9; }
    .td--w1 { flex: 1; }
    .td--w2 { flex: 2; }
    .row-check { width: 16px; height: 16px; border: 1.5px solid #D1D5DB; border-radius: 3px; background: white; }
    .more-icon { color: #6B7280; }
    .code-chip { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; background: #F5F5F5; padding: 2px 8px; border-radius: 4px; border: 1px solid #E5E5E5; }

    /* Pagination */
    .pagination-bar { display: flex; align-items: center; gap: 16px; padding: 12px 0 0; }
    .pagination-info { font-family: 'Open Sans', sans-serif; font-size: 13px; color: #6B7280; }
    .btn-charger-plus { height: 34px; padding: 0 16px; background: white; border: 1px solid var(--color-border); border-radius: 8px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; cursor: pointer; transition: border-color 150ms; }
    .btn-charger-plus:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
    .btn-charger-plus:disabled { opacity: 0.6; cursor: default; }

    /* Cards */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .vehicle-card { background: white; border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 200ms ease-out; box-shadow: 0 1px 2px rgba(17,24,39,.06); }
    .vehicle-card:hover { border-color: var(--color-primary); transform: translateY(-2px); box-shadow: 0 4px 8px rgba(17,24,39,.08); }
    .vehicle-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .vehicle-card__img-placeholder { width: 100%; height: 80px; background: repeating-linear-gradient(45deg,#F5F5F5,#F5F5F5 4px,#FAFAFA 4px,#FAFAFA 12px); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #9CA3AF; margin-bottom: 12px; }
    .vehicle-card__type { font-family: 'Open Sans', sans-serif; font-size: 12px; color: #6B7280; margin-bottom: 4px; }
    .vehicle-card__marque { font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 4px; }
    .vehicle-card__meta { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6B7280; }
    .charger-plus-wrap { display: flex; justify-content: center; margin-top: 16px; }
    .mono { font-family: 'JetBrains Mono', monospace; }

    /* Primary button */
    .btn-primary { height: 40px; padding: 0 16px; background: var(--color-primary); border: none; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: white; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,24,39,.06); transition: background 150ms; }
    .btn-primary:hover { background: var(--color-primary-dark, #E6851A); }
  `],
})
export class VehiculesListComponent {
  private vehiculeService = inject(VehiculeService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  typeFilter = signal<TypeFilter>('all');
  statutFilter = signal<StatutFilter>('all');
  viewMode = signal<ViewMode>('table');
  loading = signal(true);
  loadingMore = signal(false);
  showAddModal = signal(false);
  showSpinner = signal(false);
  private _spinnerTimer: ReturnType<typeof setTimeout> | null = null;
  private _spinnerEff = effect(() => {
    if (this.loading()) {
      this._spinnerTimer = setTimeout(() => this.showSpinner.set(true), 250);
    } else {
      if (this._spinnerTimer) { clearTimeout(this._spinnerTimer); this._spinnerTimer = null; }
      this.showSpinner.set(false);
    }
  });
  vehicles = signal<Vehicule[]>([]);
  totalElements = signal<number | null>(null);

  private currentPage = 0;
  private readonly PAGE_SIZE = 6;
  private searchQuery = '';
  private readonly searchRaw$ = new Subject<string>();
  private readonly fetchTrigger$ = new Subject<{ page: number; append: boolean }>();

  hasMore = computed(() => this.vehicles().length < (this.totalElements() ?? 0));

  constructor() {
    this.fetchTrigger$.pipe(
      switchMap(({ page, append }) =>
        this.vehiculeService.list({
          page,
          size: this.PAGE_SIZE,
          q: this.searchQuery || undefined,
          type: this.typeFilter() === 'all' ? undefined : this.typeFilter() as VehiculeType,
          statut: this.statutFilter() === 'all' ? undefined : this.statutFilter() as VehiculeStatut,
        }).pipe(
          map(p => ({ p, append })),
          catchError(() => {
            this.loading.set(false);
            this.loadingMore.set(false);
            return EMPTY;
          }),
        )
      ),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ p, append }) => {
      this.vehicles.update(list => append ? [...list, ...p.content] : p.content);
      this.totalElements.set(p.totalElements);
      this.loading.set(false);
      this.loadingMore.set(false);
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

    this.fetchTrigger$.next({ page: 0, append: false });
  }

  onSearchInput(value: string): void {
    this.searchRaw$.next(value);
  }

  onTypeFilter(value: TypeFilter): void {
    this.typeFilter.set(this.typeFilter() === value ? 'all' : value);
    this.currentPage = 0;
    this.loading.set(true);
    this.fetchTrigger$.next({ page: 0, append: false });
  }

  onStatutFilter(value: StatutFilter): void {
    this.statutFilter.set(this.statutFilter() === value ? 'all' : value);
    this.currentPage = 0;
    this.loading.set(true);
    this.fetchTrigger$.next({ page: 0, append: false });
  }

  chargerPlus(): void {
    this.currentPage++;
    this.loadingMore.set(true);
    this.fetchTrigger$.next({ page: this.currentPage, append: true });
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/vehicules', id]);
  }

  onVehiculeAdded(_v: Vehicule): void {
    this.vehiculeService.invalidate();
    this.currentPage = 0;
    this.loading.set(true);
    this.fetchTrigger$.next({ page: 0, append: false });
  }

  typeFilters: { label: string; value: TypeFilter }[] = [
    { label: 'Camion',            value: 'camion'          },
    { label: 'Camion (Tracteur)', value: 'camion_tracteur'  },
    { label: 'Semi-remorque',     value: 'semi_remorque'    },
    { label: 'Voiture',           value: 'voiture'          },
    { label: 'Chariot',           value: 'chariot'          },
    { label: 'Chargeur',          value: 'chargeur'         },
    { label: 'Bus',               value: 'bus'              },
    { label: 'Balayeuse',         value: 'balayeuse'        },
    { label: 'Pick-up',           value: 'pick_up'          },
  ];

  statutFilters: { label: string; value: StatutFilter }[] = [
    { label: 'En service', value: 'in-service' },
    { label: 'Atelier', value: 'workshop' },
    { label: 'Maintenance', value: 'maintenance' },
  ];

  tableCols = [
    { label: '☐', flex: 0.3 },
    { label: 'Code', flex: 0.9 },
    { label: 'Type', flex: 0.8 },
    { label: 'Marque / Modèle', flex: 2 },
    { label: 'Matricule', flex: 1 },
    { label: 'Compteur', flex: 1 },
    { label: 'Statut', flex: 1 },
    { label: '', flex: 0.3 },
  ];
}
