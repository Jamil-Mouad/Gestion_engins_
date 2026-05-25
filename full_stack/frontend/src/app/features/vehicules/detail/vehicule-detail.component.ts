import { Component, DestroyRef, inject, signal, computed, effect } from '@angular/core';
import { UpperCasePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { VehiculeService } from '../vehicule.service';
import { VehiculeDetail } from '../../../shared/models/vehicule.model';
import { StatusBadgeComponent } from '../../../shared/ui/badge/badge.component';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { SpinnerOverlayComponent } from '../../../shared/ui/spinner/spinner-overlay.component';
import { ConfirmDeleteModalComponent } from '../../../shared/ui/confirm-delete-modal/confirm-delete-modal.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { BreadcrumbComponent } from '../../../shared/ui/breadcrumb/breadcrumb.component';
import { TabGroupComponent } from '../../../shared/ui/tabs/tab-group.component';
import { InfosTabComponent } from './tabs/infos-tab.component';
import { PneusTabComponent } from './tabs/pneus-tab.component';
import { InterventionsTabComponent } from './tabs/interventions-tab.component';
import { ComposantsTabComponent } from './tabs/composants-tab.component';
import { VidangesTabComponent } from './tabs/vidanges-tab.component';
import { HistoriqueTabComponent } from './tabs/historique-tab.component';
import { KpisTabComponent } from './tabs/kpis-tab.component';
import { DocumentsTabComponent } from './tabs/documents-tab.component';

@Component({
  selector: 'app-vehicule-detail',
  standalone: true,
  imports: [
    UpperCasePipe, DecimalPipe, RouterLink,
    LucideAngularModule,
    StatusBadgeComponent, StatusLabelPipe, SkeletonComponent, SpinnerOverlayComponent,
    ConfirmDeleteModalComponent, EmptyStateComponent,
    BreadcrumbComponent, TabGroupComponent,
    InfosTabComponent, PneusTabComponent, InterventionsTabComponent, ComposantsTabComponent,
    VidangesTabComponent, HistoriqueTabComponent, KpisTabComponent, DocumentsTabComponent,
  ],
  template: `
    <app-spinner-overlay [show]="showSpinner()" />
    <div class="veh-detail-page">
      @if (!loading() && !vehicule()) {
        <app-empty-state message="Véhicule introuvable" />
      } @else {
        <!-- Breadcrumb always visible immediately -->
        <app-breadcrumb [items]="[{label: 'Véhicules', route: '/vehicules'}, {label: vehicule()?.code ?? ('#' + vehiculeId)}]" />

        <!-- Header card always renders — skeleton only for data fields -->
        <div class="veh-detail-header">
          <div class="veh-detail-header__main">
            <div class="veh-photo-placeholder">
              <lucide-icon name="truck" [size]="28" />
              <span>photo</span>
            </div>
            <div class="veh-detail-info">
              @if (loading()) {
                <div class="veh-skeleton-stack">
                  <div class="veh-skel veh-skel--sm"></div>
                  <div class="veh-skel veh-skel--lg"></div>
                  <div class="veh-skel veh-skel--md"></div>
                </div>
              } @else {
                <div class="veh-detail-info__meta">
                  <span class="veh-type-badge">{{ vehicule()!.type | uppercase }}</span>
                  <app-status-badge [status]="vehicule()!.statut" [label]="vehicule()!.statut | statusLabel" />
                </div>
                <div class="veh-detail-info__title">
                  <span class="veh-code">{{ vehicule()!.code }}</span>
                  <span class="veh-model">{{ vehicule()!.marque }} {{ vehicule()!.modele }}</span>
                </div>
                <div class="veh-detail-info__row">
                  @if (vehicule()!.matricule) {
                    <span class="mono">{{ vehicule()!.matricule }}</span>
                  }
                  @if (vehicule()!.annee) {
                    <span>{{ vehicule()!.annee }}</span>
                  }
                  @if (vehicule()!.camionDetails?.compteurKm != null) {
                    <span class="mono">{{ vehicule()!.camionDetails!.compteurKm | number }} km</span>
                  }
                  @if (chauffeur()) {
                    <span>Chauffeur : {{ chauffeur() }}</span>
                  }
                </div>
              }
            </div>
          </div>
          <div class="veh-detail-header__actions">
            <button class="btn-edit" type="button">
              <lucide-icon name="edit" [size]="14" />
              Éditer
            </button>
            <button class="btn-more" type="button" (click)="showDelete.set(true)">···</button>
          </div>
        </div>

        @if (vehicule()) {
          <!-- Tabs bar -->
          <div class="veh-tabs-bar veh-tabs-fadein">
            <app-tab-group [tabs]="tabDefs()" [activeIndex]="activeTabIndex()" (tabChange)="setTab($event)" />
          </div>

          <!-- Tab content — deferred on first activation, then kept mounted (hidden) to avoid refetch on switch -->
          <div class="veh-tab-content veh-tabs-fadein">
            <div [hidden]="activeTab() !== 'infos'">
              <app-infos-tab [vehicule]="vehicule()!" (attelageChanged)="reloadVehicule()" />
            </div>
            @defer (when isActivated('interventions')) {
              <div [hidden]="activeTab() !== 'interventions'">
                <app-interventions-tab />
              </div>
            }
            @defer (when isActivated('pneus')) {
              <div [hidden]="activeTab() !== 'pneus'">
                <app-pneus-tab
                  [vehiculeId]="vehicule()!.id"
                  [vehiculeType]="vehicule()!.type"
                  [configAxle]="vehicule()!.camionDetails?.configAxle ?? null"
                  [currentAttelage]="vehicule()!.currentAttelage ?? null" />
              </div>
            }
            @defer (when isActivated('vidanges')) {
              <div [hidden]="activeTab() !== 'vidanges'">
                <app-vidanges-tab />
              </div>
            }
            @defer (when isActivated('kpis')) {
              <div [hidden]="activeTab() !== 'kpis'">
                <app-kpis-tab />
              </div>
            }
            @defer (when isActivated('historique')) {
              <div [hidden]="activeTab() !== 'historique'">
                <app-historique-tab />
              </div>
            }
            @defer (when isActivated('composants')) {
              <div [hidden]="activeTab() !== 'composants'">
                <app-composants-tab />
              </div>
            }
            @defer (when isActivated('documents')) {
              <div [hidden]="activeTab() !== 'documents'">
                <app-documents-tab />
              </div>
            }
          </div>

          @if (showDelete()) {
            <app-confirm-delete-modal
              confirmMessage="Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible."
              [itemLabel]="vehicule()!.code + ' — ' + vehicule()!.marque + ' ' + vehicule()!.modele"
              [isDeleting]="deleting()"
              (confirm)="onDelete()"
              (cancel)="showDelete.set(false)" />
          }
        }
      }
    </div>
  `,
  styles: [`
    .veh-detail-page { background: #F5F5F5; min-height: calc(100vh - 72px); }

    /* Header */
    .veh-detail-header { background: white; padding: 20px 32px; border-bottom: 1px solid var(--color-border); display: flex; align-items: flex-start; justify-content: space-between; }
    .veh-detail-header__main { display: flex; align-items: flex-start; gap: 20px; }
    .veh-photo-placeholder { width: 80px; height: 80px; background: repeating-linear-gradient(45deg,#F5F5F5,#F5F5F5 4px,#FAFAFA 4px,#FAFAFA 12px); border-radius: 12px; border: 1px solid #E5E5E5; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; color: #9CA3AF; gap: 4px; }
    .veh-photo-placeholder span { font-family: 'JetBrains Mono',monospace; font-size: 10px; color: #6B7280; }
    .veh-detail-info { display: flex; flex-direction: column; gap: 6px; }
    .veh-detail-info__meta { display: flex; align-items: center; gap: 8px; }
    .veh-type-badge { font-family: 'Montserrat',sans-serif; font-size: 11px; font-weight: 700; color: #9A5B0C; background: #FEF1E1; padding: 3px 10px; border-radius: 9999px; letter-spacing: 0.05em; }
    .veh-detail-info__title { display: flex; align-items: baseline; gap: 8px; }
    .veh-code { font-family: 'JetBrains Mono',monospace; font-size: 22px; font-weight: 700; color: #111827; }
    .veh-model { font-family: 'Open Sans',sans-serif; font-size: 16px; font-weight: 400; color: #6B7280; }
    .veh-detail-info__row { font-family: 'Open Sans',sans-serif; font-size: 13px; color: #6B7280; display: flex; gap: 16px; flex-wrap: wrap; }
    .veh-detail-info__row .mono { font-family: 'JetBrains Mono',monospace; font-weight: 500; }
    .mono { font-family: 'JetBrains Mono',monospace; }

    /* Actions */
    .veh-detail-header__actions { display: flex; gap: 8px; align-items: center; }
    .btn-edit { height: 36px; padding: 0 14px; border: 1px solid var(--color-border); border-radius: 8px; background: white; font-family: 'Montserrat',sans-serif; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn-edit:hover { background: #F9FAFB; }
    .btn-more { width: 36px; height: 36px; border: 1px solid var(--color-border); border-radius: 8px; background: white; cursor: pointer; font-size: 16px; }
    .btn-more:hover { background: #F9FAFB; }

    /* Tabs + content */
    .veh-tabs-bar { background: white; border-bottom: 1px solid var(--color-border); padding: 0 32px; }
    .veh-tab-content { padding: 24px 32px 40px; }
    @keyframes tabsFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .veh-tabs-fadein { animation: tabsFadeIn 180ms ease-out; }

    /* Inline skeleton bars for header fields */
    @keyframes skelPulse { 0%,100% { opacity:1 } 50% { opacity:.45 } }
    .veh-skeleton-stack { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
    .veh-skel { border-radius: 4px; background: #E5E7EB; animation: skelPulse 1.4s ease-in-out infinite; }
    .veh-skel--sm  { height: 20px; width: 110px; }
    .veh-skel--lg  { height: 28px; width: 200px; }
    .veh-skel--md  { height: 16px; width: 130px; }
  `],
})
export class VehiculeDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private vehiculeService = inject(VehiculeService);
  private destroyRef = inject(DestroyRef);

  readonly vehiculeId: number = (() => {
    const p = this.route.snapshot.paramMap.get('id');
    return p ? Number(p) : NaN;
  })();

  vehicule = signal<VehiculeDetail | null>(null);
  loading = signal(true);
  activeTabIndex = signal(0);
  showDelete = signal(false);
  deleting = signal(false);
  showSpinner = signal(false);
  private _spinnerTimer: ReturnType<typeof setTimeout> | null = null;
  private activated = signal(new Set<string>(['infos']));

  constructor() {
    effect(() => {
      if (this.loading()) {
        this._spinnerTimer = setTimeout(() => this.showSpinner.set(true), 250);
      } else {
        if (this._spinnerTimer) { clearTimeout(this._spinnerTimer); this._spinnerTimer = null; }
        this.showSpinner.set(false);
      }
    });

    if (isNaN(this.vehiculeId) || this.vehiculeId <= 0) {
      this.loading.set(false);
      return;
    }
    this.vehiculeService.get(this.vehiculeId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of(null)),
    ).subscribe(data => {
      this.vehicule.set(data);
      this.loading.set(false);
    });
  }

  private readonly CAMION_TABS = [
    { label: 'Infos' },
    { label: 'Interventions' },
    { label: 'Gestion pneus' },
    { label: 'Vidanges' },
    { label: 'KPIs' },
    { label: 'Historique' },
    { label: 'Composants' },
    { label: 'Documents' },
  ];
  private readonly CAMION_TAB_IDS = ['infos', 'interventions', 'pneus', 'vidanges', 'kpis', 'historique', 'composants', 'documents'];

  private readonly NON_CAMION_TABS = [
    { label: 'Infos' },
    { label: 'Interventions' },
    { label: 'Composants' },
  ];
  private readonly NON_CAMION_TAB_IDS = ['infos', 'interventions', 'composants'];

  tabDefs = computed(() => this.vehicule()?.type === 'camion' ? this.CAMION_TABS : this.NON_CAMION_TABS);
  tabIds = computed(() => this.vehicule()?.type === 'camion' ? this.CAMION_TAB_IDS : this.NON_CAMION_TAB_IDS);

  activeTab = computed(() => this.tabIds()[this.activeTabIndex()]);

  isActivated(tabId: string): boolean { return this.activated().has(tabId); }

  setTab(i: number): void {
    this.activeTabIndex.set(i);
    const tabId = this.tabIds()[i];
    this.activated.update(s => { const ns = new Set(s); ns.add(tabId); return ns; });
  }

  chauffeur = computed(() => {
    const cd = this.vehicule()?.camionDetails;
    if (!cd) return null;
    const parts = [cd.chauffeurPrenom, cd.chauffeurNom].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  });

  reloadVehicule(): void {
    this.vehiculeService.get(this.vehiculeId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of(null)),
    ).subscribe(data => this.vehicule.set(data));
  }

  onDelete(): void {
    const v = this.vehicule();
    if (!v) return;
    this.deleting.set(true);
    this.vehiculeService.softDelete(v.id).subscribe({
      next: () => this.router.navigate(['/vehicules']),
      error: () => this.deleting.set(false),
    });
  }
}
