import { Component, inject, signal, computed } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { tap, catchError, of } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { VehiculeService } from '../vehicule.service';
import { VehiculeDetail } from '../../../shared/models/vehicule.model';
import { StatusBadgeComponent } from '../../../shared/ui/badge/badge.component';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
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
    UpperCasePipe, RouterLink,
    LucideAngularModule,
    StatusBadgeComponent, StatusLabelPipe, SkeletonComponent,
    ConfirmDeleteModalComponent, EmptyStateComponent,
    BreadcrumbComponent, TabGroupComponent,
    InfosTabComponent, PneusTabComponent, InterventionsTabComponent, ComposantsTabComponent,
    VidangesTabComponent, HistoriqueTabComponent, KpisTabComponent, DocumentsTabComponent,
  ],
  template: `
    <div class="veh-detail-page">
      @if (loading()) {
        <div style="padding:32px">
          <app-skeleton [rows]="4" height="32px" />
        </div>
      } @else if (vehicule()) {
        <!-- Breadcrumb -->
        <app-breadcrumb [items]="[{label: 'Véhicules', route: '/vehicules'}, {label: vehicule()!.code}]" />

        <!-- Header card -->
        <div class="veh-detail-header">
          <div class="veh-detail-header__main">
            <div class="veh-photo-placeholder">
              <lucide-icon name="truck" [size]="28" />
              <span>photo</span>
            </div>
            <div class="veh-detail-info">
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

        <!-- Tabs bar -->
        <div class="veh-tabs-bar">
          <app-tab-group [tabs]="tabDefs" [activeIndex]="activeTabIndex()" (tabChange)="setTab($event)" />
        </div>

        <!-- Tab content -->
        <div class="veh-tab-content">
          @switch (activeTab()) {
            @case ('infos') {
              <app-infos-tab [vehicule]="vehicule()!" />
            }
            @case ('interventions') {
              <app-interventions-tab />
            }
            @case ('pneus') {
              <app-pneus-tab [vehiculeId]="vehicule()!.id" [configAxle]="vehicule()!.camionDetails?.configAxle ?? null" />
            }
            @case ('vidanges') {
              <app-vidanges-tab />
            }
            @case ('kpis') {
              <app-kpis-tab />
            }
            @case ('historique') {
              <app-historique-tab />
            }
            @case ('composants') {
              <app-composants-tab />
            }
            @case ('documents') {
              <app-documents-tab />
            }
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
      } @else {
        <app-empty-state message="Véhicule introuvable" />
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
  `],
})
export class VehiculeDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private vehiculeService = inject(VehiculeService);

  activeTabIndex = signal(0);
  loading = signal(true);
  showDelete = signal(false);
  deleting = signal(false);

  tabDefs = [
    { label: 'Infos' },
    { label: 'Interventions' },
    { label: 'Gestion pneus' },
    { label: 'Vidanges' },
    { label: 'KPIs' },
    { label: 'Historique' },
    { label: 'Composants' },
    { label: 'Documents' },
  ];

  tabIds = ['infos', 'interventions', 'pneus', 'vidanges', 'kpis', 'historique', 'composants', 'documents'];

  activeTab = computed(() => this.tabIds[this.activeTabIndex()]);

  setTab(i: number): void { this.activeTabIndex.set(i); }

  vehicule = toSignal<VehiculeDetail | null>(
    (() => {
      const idParam = this.route.snapshot.paramMap.get('id');
      const vehiculeId = idParam ? Number(idParam) : NaN;
      if (isNaN(vehiculeId) || vehiculeId <= 0) { this.loading.set(false); return of(null); }
      return this.vehiculeService.get(vehiculeId).pipe(
        tap({ next: () => this.loading.set(false), error: () => this.loading.set(false) }),
        catchError(() => of(null)),
      );
    })(),
    { initialValue: null },
  );

  chauffeur = computed(() => {
    const cd = this.vehicule()?.camionDetails;
    if (!cd) return null;
    const parts = [cd.chauffeurPrenom, cd.chauffeurNom].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  });

  // Keep legacy tabs signal for any external references
  tabs = computed(() => {
    const v = this.vehicule();
    if (!v) return this.tabDefs.map(t => t.label);
    return this.tabDefs.map(t => t.label);
  });

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
