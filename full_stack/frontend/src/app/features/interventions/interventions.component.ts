import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, tap } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { InterventionService } from './intervention.service';
import { Intervention, InterventionStatut, InterventionCategorie } from '../../shared/models/intervention.model';
import { Page } from '../../shared/models/pagination.model';
import { DateFrPipe } from '../../shared/pipes/date-fr.pipe';
import { CurrencyMadPipe } from '../../shared/pipes/currency-mad.pipe';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { NewInterventionModalComponent } from './new-intervention-modal.component';
import { CloturerConfirmModalComponent } from './cloturer-confirm-modal.component';
import {
  PageHeaderComponent,
  TabGroupComponent,
  FilterChipComponent,
  DataTableHeaderComponent,
  DataTableRowComponent,
  SevBadgeComponent,
  StatusBadgeComponent,
} from '../../shared/ui';

type TabId = 'en_cours' | 'cloture' | 'all';
type CategorieFilter = 'all' | InterventionCategorie;

@Component({
  selector: 'app-interventions',
  standalone: true,
  imports: [
    DateFrPipe, CurrencyMadPipe,
    EmptyStateComponent, SkeletonComponent,
    PageHeaderComponent, TabGroupComponent, FilterChipComponent,
    DataTableHeaderComponent, DataTableRowComponent,
    SevBadgeComponent, StatusBadgeComponent,
    NewInterventionModalComponent, CloturerConfirmModalComponent,
    LucideAngularModule,
  ],
  template: `
    <div class="int-page" style="animation: screenEnter 400ms ease both">
      <!-- Page header -->
      <app-page-header title="Interventions" [count]="totalCount()">
        <button class="btn-primary" (click)="showNewModal.set(true)" type="button">
          + Nouvelle intervention
        </button>
      </app-page-header>

      <div class="int-content">
        <!-- Tabs + filter card -->
        <div class="filter-card">
          <app-tab-group
            [tabs]="tabDefs"
            [activeIndex]="activeTabIndex()"
            (tabChange)="onTabChange($event)" />

          <div class="filter-row">
            <div class="search-wrap">
              <lucide-icon name="search" class="search-icon" [size]="15" />
              <input class="search-input" placeholder="Rechercher ID, véhicule, composant…"
                     [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" />
            </div>
            <span class="filter-label">Catégorie :</span>
            @for (f of categorieFilters; track f.value) {
              <app-filter-chip
                [label]="f.label"
                [active]="categorieFilter() === f.value"
                (clicked)="categorieFilter.set(categorieFilter() === f.value ? 'all' : f.value)" />
            }
          </div>
        </div>

        <!-- Table -->
        <div class="table-wrap">
          <app-data-table-header [cols]="tableCols" />

          @if (loading()) {
            <app-skeleton [rows]="6" height="52px" />
          } @else if (filteredInterventions().length === 0) {
            <app-empty-state icon="🔧" message="Aucune intervention trouvée — essayez de modifier vos filtres." />
          } @else {
            @for (intervention of filteredInterventions(); track intervention.id; let i = $index) {
              <app-data-table-row [idx]="i" [clickable]="true">
                <!-- N°BS -->
                <div class="td td--w09 mono grey">{{ intervention.nBs ?? '—' }}</div>
                <!-- Date -->
                <div class="td td--w08 mono">{{ intervention.dateDebut | dateFr:'short' }}</div>
                <!-- Véhicule -->
                <div class="td td--w09">
                  <span class="code-chip">{{ intervention.vehicule.code }}</span>
                </div>
                <!-- Type/Catégorie -->
                <div class="td td--w1">
                  <app-sev-badge [type]="intervention.categorie" />
                </div>
                <!-- Composant / description -->
                <div class="td td--w2 desc">
                  {{ intervention.composant?.designation ?? intervention.typeIntervention.libelle }}
                </div>
                <!-- Coût -->
                <div class="td td--w09 mono cost">
                  {{ intervention.coutTotal | currencyMad }}
                </div>
                <!-- Statut -->
                <div class="td td--w1">
                  <app-status-badge [status]="intervention.statut" [label]="statutLabels[intervention.statut]" />
                </div>
                <!-- Action -->
                <div class="td td--w09">
                  @if (intervention.statut !== 'cloture') {
                    <button class="btn-cloturer" (click)="$event.stopPropagation(); onCloturer(intervention)" type="button">
                      Clôturer
                    </button>
                  }
                </div>
              </app-data-table-row>
            }
          }
        </div>

        <!-- Pagination info -->
        @if (!loading() && filteredInterventions().length > 0) {
          <div class="pagination-bar">
            <span class="pagination-info">
              Affichage 1–{{ filteredInterventions().length }} sur {{ totalCount() }}
            </span>
          </div>
        }
      </div>

      @if (showNewModal()) {
        <app-new-intervention-modal
          (saved)="onInterventionSaved($event)"
          (close)="showNewModal.set(false)" />
      }

      @if (cloturerIntervention()) {
        <app-cloturer-confirm-modal
          [interventionLabel]="cloturerIntervention()!.nBs ?? cloturerIntervention()!.id.toString()"
          (confirmed)="onCloturerConfirmed()"
          (cancel)="cloturerIntervention.set(null)" />
      }
    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .int-page { background: #F5F5F5; min-height: calc(100vh - 72px); }
    .int-content { padding: 20px 32px 32px; }

    /* Filter card */
    .filter-card { background: white; border-radius: 12px; border: 1px solid var(--color-border); margin-bottom: 20px; overflow: hidden; }
    .filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 14px 20px; border-top: 1px solid var(--color-border); }
    .filter-label { font-family: 'Open Sans', sans-serif; font-size: 13px; color: #6B7280; flex-shrink: 0; }

    /* Search input */
    .search-wrap { position: relative; display: inline-flex; align-items: center; }
    .search-icon { position: absolute; left: 10px; color: #9CA3AF; pointer-events: none; }
    .search-input {
      height: 36px;
      padding: 0 12px 0 36px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text);
      background: var(--color-surface);
      outline: none;
      min-width: 240px;
    }
    .search-input:focus { border-color: var(--color-primary); }

    /* Table */
    .table-wrap { background: white; border-radius: 12px; border: 1px solid var(--color-border); box-shadow: 0 1px 2px rgba(17,24,39,.06); overflow: hidden; margin-bottom: 16px; }

    /* Table cells */
    .td { display: flex; align-items: center; height: 52px; padding: 0 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .td.mono  { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .td.grey  { color: #6B7280; }
    .td.desc  { color: #374151; white-space: normal; overflow: visible; }
    .td.cost  { color: var(--color-primary); font-weight: 600; justify-content: flex-end; }
    .td--w09  { flex: 0.9; }
    .td--w08  { flex: 0.8; }
    .td--w1   { flex: 1; }
    .td--w2   { flex: 2; }

    /* Véhicule code chip */
    .code-chip { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; background: #F5F5F5; padding: 2px 8px; border-radius: 4px; border: 1px solid #E5E5E5; }

    /* Clôturer button */
    .btn-cloturer { background: transparent; border: 1px solid #DC2626; color: #DC2626; border-radius: 6px; padding: 4px 12px; font-family: 'Open Sans', sans-serif; font-size: 12px; cursor: pointer; transition: background 150ms; }
    .btn-cloturer:hover { background: #FEF2F2; }

    /* Primary button */
    .btn-primary { height: 40px; padding: 0 16px; background: var(--color-primary); border: none; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: white; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 150ms; }
    .btn-primary:hover { background: var(--color-primary-dark, #E6851A); }

    /* Pagination */
    .pagination-bar { display: flex; align-items: center; padding: 4px 0; }
    .pagination-info { font-family: 'Open Sans', sans-serif; font-size: 13px; color: #6B7280; }
  `],
})
export class InterventionsComponent {
  private interventionService = inject(InterventionService);
  private refreshTrigger = new BehaviorSubject<void>(undefined);

  activeTabIndex = signal(0);
  categorieFilter = signal<CategorieFilter>('all');
  searchQuery = signal('');
  loading = signal(true);
  showNewModal = signal(false);
  cloturerIntervention = signal<Intervention | null>(null);

  readonly tabDefs = [
    { label: 'En cours',  badge: undefined as number | undefined },
    { label: 'Terminées', badge: undefined as number | undefined },
    { label: 'Toutes',    badge: undefined as number | undefined },
  ];

  readonly categorieFilters: { label: string; value: CategorieFilter }[] = [
    { label: 'Préventive',  value: 'preventive'  },
    { label: 'Corrective',  value: 'corrective'  },
    { label: 'Dépannage',   value: 'depannage'   },
    { label: 'Contrôle',    value: 'controle'    },
  ];

  readonly tableCols = [
    { label: 'N°BS',        flex: 0.9 },
    { label: 'Date',        flex: 0.8 },
    { label: 'Véhicule',    flex: 0.9 },
    { label: 'Type',        flex: 1   },
    { label: 'Composant',   flex: 2   },
    { label: 'Coût (MAD)',  flex: 0.9 },
    { label: 'Statut',      flex: 1   },
    { label: '',            flex: 0.9 },
  ];

  readonly statutLabels: Record<InterventionStatut, string> = {
    ouvert:   'Ouvert',
    en_cours: 'En cours',
    cloture:  'Clôturé',
  };

  pageData = toSignal(
    this.refreshTrigger.pipe(
      switchMap(() => this.interventionService.list()),
      tap({
        next: () => this.loading.set(false),
        error: () => this.loading.set(false),
      }),
    ),
    { initialValue: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } as Page<Intervention> },
  );

  totalCount = computed(() => this.pageData().totalElements);

  filteredInterventions = computed(() => {
    const list = this.pageData().content;
    const tabIdx = this.activeTabIndex();
    const cat = this.categorieFilter();
    const q = this.searchQuery().toLowerCase().trim();

    // Tab filtering: 0 = en_cours|ouvert, 1 = cloture, 2 = all
    const tabStatuts: (InterventionStatut | null)[] = ['en_cours', 'cloture', null];
    const tabStatut = tabStatuts[tabIdx];

    return list.filter((i: Intervention) => {
      if (tabStatut !== null) {
        if (tabIdx === 0 && i.statut !== 'en_cours' && i.statut !== 'ouvert') return false;
        if (tabIdx !== 0 && i.statut !== tabStatut) return false;
      }
      if (cat !== 'all' && i.categorie !== cat) return false;
      if (q) {
        const matchesId = String(i.id).includes(q);
        const matchesVehicule = (i.vehicule?.code ?? '').toLowerCase().includes(q);
        const matchesComposant = (i.composant?.designation ?? '').toLowerCase().includes(q);
        if (!matchesId && !matchesVehicule && !matchesComposant) return false;
      }
      return true;
    });
  });

  onTabChange(index: number): void {
    this.activeTabIndex.set(index);
  }

  onCloturer(intervention: Intervention): void {
    this.cloturerIntervention.set(intervention);
  }

  onCloturerConfirmed(): void {
    const intervention = this.cloturerIntervention();
    if (!intervention) return;
    this.loading.set(true);
    this.interventionService.cloturer(intervention.id).subscribe({
      next: () => {
        this.cloturerIntervention.set(null);
        this.refreshTrigger.next();
      },
      error: () => {
        this.loading.set(false);
        this.cloturerIntervention.set(null);
      },
    });
  }

  onInterventionSaved(_intervention: Intervention): void {
    this.showNewModal.set(false);
    this.loading.set(true);
    this.refreshTrigger.next();
  }
}