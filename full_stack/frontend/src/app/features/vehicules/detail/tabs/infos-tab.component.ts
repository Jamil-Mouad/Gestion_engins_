import { Component, Input, Output, EventEmitter, inject, signal, computed, OnChanges, SimpleChanges, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VehiculeDetail, Attelage, isCamionType } from '../../../../shared/models/vehicule.model';
import { VehiculeService } from '../../vehicule.service';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { AssignSemiModalComponent } from '../assign-semi-modal.component';

interface InfoRow {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}

interface ComplianceItem {
  label: string;
  value: string | null | undefined;
  status?: 'ok' | 'warn' | 'late' | 'neutral';
}

@Component({
  selector: 'app-infos-tab',
  standalone: true,
  imports: [CardComponent, DatePipe, AssignSemiModalComponent],
  template: `
    <div class="infos-page">
      <div [class]="isCamion() ? 'infos-grid' : 'infos-grid infos-grid--single'">
        <div class="left-col">
          <app-card title="Informations techniques">
            <div class="info-rows">
              @for (row of infoRows(); track row.label) {
                <div class="info-row">
                  <span class="info-row__label">{{ row.label }}</span>
                  <span class="info-row__value" [class.mono]="row.mono">{{ row.value || '—' }}</span>
                </div>
              }
            </div>
          </app-card>

          @if (showAttelage()) {
            <app-card title="Attelage">
              @if (vehicule.currentAttelage) {
                <div class="attelage-current">
                  <div class="attelage-current__info">
                    @if (isCamion()) {
                      <span class="attelage-current__label">Semi-remorque attelée</span>
                      <span class="attelage-current__code">{{ vehicule.currentAttelage.semiCode }}</span>
                    } @else {
                      <span class="attelage-current__label">Tracteur attelé</span>
                      <span class="attelage-current__code">{{ vehicule.currentAttelage.tracteurCode }}</span>
                    }
                    <span class="attelage-current__since">
                      Depuis le {{ vehicule.currentAttelage.dateDebut | date:'dd/MM/yyyy' }}
                    </span>
                  </div>
                  @if (isCamion()) {
                    <button class="btn-detach" type="button" (click)="detach()">Détacher</button>
                  }
                </div>
              } @else if (isCamion()) {
                <div class="attelage-empty">
                  <span class="attelage-empty__text">Aucune semi-remorque attelée</span>
                  <button class="btn-attach" type="button" (click)="showAssignModal.set(true)">+ Atteler</button>
                </div>
              } @else {
                <div class="attelage-empty">
                  <span class="attelage-empty__text">Aucun tracteur attelé</span>
                </div>
              }

              @if (terminatedHistory().length > 0) {
                <div class="attelage-history">
                  <h4 class="attelage-history__title">Historique</h4>
                  <table class="attelage-history__table">
                    <thead>
                      <tr>
                        <th>Semi-remorque</th>
                        <th>Début</th>
                        <th>Fin</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (a of terminatedHistory(); track a.id) {
                        <tr>
                          <td class="mono">{{ a.semiCode }}</td>
                          <td>{{ a.dateDebut | date:'dd/MM/yyyy' }}</td>
                          <td>{{ a.dateFin | date:'dd/MM/yyyy' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </app-card>
          }
        </div>

        @if (isCamion()) {
          <div class="right-col">
            <app-card title="Conformité & Suivi réglementaire">
              <div class="compliance-rows">
                @for (item of complianceItems(); track item.label) {
                  <div class="compliance-row">
                    <span class="compliance-row__label">{{ item.label }}</span>
                    <span
                      class="compliance-row__value"
                      [class.compliance-row__value--ok]="item.status === 'ok'"
                      [class.compliance-row__value--warn]="item.status === 'warn'"
                      [class.compliance-row__value--late]="item.status === 'late'">
                      @if (item.status && item.status !== 'neutral') {
                        <span
                          class="compliance-dot"
                          [class.dot--ok]="item.status === 'ok'"
                          [class.dot--warn]="item.status === 'warn'"
                          [class.dot--late]="item.status === 'late'"></span>
                      }
                      {{ item.value || '—' }}
                    </span>
                  </div>
                }
              </div>
            </app-card>

            <app-card title="KPIs véhicule">
              <div class="kpi-grid">
                <div class="kpi-tile">
                  <div class="kpi-tile__label">MTBF</div>
                  <div class="kpi-tile__value kpi-tile__value--green">— h</div>
                </div>
                <div class="kpi-tile">
                  <div class="kpi-tile__label">VOYAGES / MOIS</div>
                  <div class="kpi-tile__value kpi-tile__value--info">—</div>
                </div>
                <div class="kpi-tile">
                  <div class="kpi-tile__label">DISPONIBILITÉ</div>
                  <div class="kpi-tile__value kpi-tile__value--green">— %</div>
                </div>
                <div class="kpi-tile">
                  <div class="kpi-tile__label">COÛT YTD</div>
                  <div class="kpi-tile__value kpi-tile__value--warning">— MAD</div>
                </div>
                <div class="kpi-tile">
                  <div class="kpi-tile__label">KM PARCOURUS</div>
                  <div class="kpi-tile__value kpi-tile__value--info">— km</div>
                </div>
                <div class="kpi-tile">
                  <div class="kpi-tile__label">% CONSO. (VS FLOTTE)</div>
                  <div class="kpi-tile__value kpi-tile__value--warning">— %</div>
                </div>
              </div>
            </app-card>
          </div>
        }
      </div>

      @if (showAssignModal()) {
        <app-assign-semi-modal
          [tracteurId]="vehicule.id"
          (saved)="onAttelageSaved()"
          (close)="showAssignModal.set(false)"
        />
      }
    </div>
  `,
  styles: [`
    .infos-page { display: flex; flex-direction: column; gap: 20px; }
    .infos-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 20px; }
    .infos-grid--single { grid-template-columns: 1fr; }
    .left-col { display: flex; flex-direction: column; gap: 20px; }
    .right-col { display: flex; flex-direction: column; gap: 20px; }

    /* Info rows */
    .info-rows { display: flex; flex-direction: column; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
    .info-row:last-child { border-bottom: none; }
    .info-row__label { font-family: 'Open Sans',sans-serif; font-size: 13px; color: #6B7280; }
    .info-row__value { font-family: 'Open Sans',sans-serif; font-size: 13px; color: #111827; font-weight: 500; }
    .info-row__value.mono { font-family: 'JetBrains Mono',monospace; }

    /* Compliance rows */
    .compliance-rows { display: flex; flex-direction: column; }
    .compliance-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
    .compliance-row:last-child { border-bottom: none; }
    .compliance-row__label { font-family: 'Open Sans',sans-serif; font-size: 13px; color: #6B7280; }
    .compliance-row__value { font-family: 'JetBrains Mono',monospace; font-size: 13px; display: flex; align-items: center; gap: 6px; }
    .compliance-row__value--ok { color: #065F46; }
    .compliance-row__value--warn { color: #92400E; }
    .compliance-row__value--late { color: #991B1B; }
    .compliance-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot--ok { background: #10B981; }
    .dot--warn { background: #F59E0B; }
    .dot--late { background: #EF4444; }

    /* KPI grid */
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .kpi-tile { background: #FAFAFA; border-radius: 8px; padding: 12px; border: 1px solid var(--color-border); }
    .kpi-tile__label { font-family: 'Montserrat',sans-serif; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6B7280; margin-bottom: 4px; }
    .kpi-tile__value { font-family: 'JetBrains Mono',monospace; font-size: 18px; font-weight: 700; }
    .kpi-tile__value--green { color: #10B981; }
    .kpi-tile__value--info { color: #0EA5E9; }
    .kpi-tile__value--warning { color: #F59E0B; }

    /* Attelage card */
    .attelage-current { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
    .attelage-current__info { display: flex; flex-direction: column; gap: 4px; }
    .attelage-current__label { font-family: 'Open Sans',sans-serif; font-size: 12px; color: #6B7280; }
    .attelage-current__code { font-family: 'JetBrains Mono',monospace; font-size: 16px; font-weight: 700; color: #111827; }
    .attelage-current__since { font-family: 'Open Sans',sans-serif; font-size: 12px; color: #6B7280; }
    .btn-detach { height: 34px; padding: 0 14px; border: 1px solid #FECACA; border-radius: 6px; background: #FEF2F2; color: #B91C1C; font-family: 'Montserrat',sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-detach:hover { background: #FEE2E2; }
    .attelage-empty { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
    .attelage-empty__text { font-family: 'Open Sans',sans-serif; font-size: 13px; color: #9CA3AF; }
    .btn-attach { height: 34px; padding: 0 14px; border: 1px solid var(--color-border); border-radius: 6px; background: white; color: #374151; font-family: 'Montserrat',sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-attach:hover { background: #F9FAFB; }

    /* Attelage history */
    .attelage-history { margin-top: 20px; border-top: 1px solid var(--color-border); padding-top: 16px; }
    .attelage-history__title { font-family: 'Montserrat',sans-serif; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }
    .attelage-history__table { width: 100%; border-collapse: collapse; font-family: 'Open Sans',sans-serif; font-size: 13px; }
    .attelage-history__table th { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--color-border); color: #6B7280; font-weight: 600; }
    .attelage-history__table td { padding: 8px 8px; border-bottom: 1px solid var(--color-border); color: #374151; }
    .attelage-history__table tr:last-child td { border-bottom: none; }
    .mono { font-family: 'JetBrains Mono',monospace; }

    /* Responsive */
    @media (max-width: 900px) {
      .infos-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class InfosTabComponent implements OnChanges {
  @Input({ required: true }) vehicule!: VehiculeDetail;
  @Output() attelageChanged = new EventEmitter<void>();

  private vehiculeService = inject(VehiculeService);
  private destroyRef = inject(DestroyRef);

  showAssignModal = signal(false);
  history = signal<Attelage[]>([]);

  isCamion = computed(() => isCamionType(this.vehicule?.type));
  isSemiRemorque = computed(() => this.vehicule?.type === 'semi_remorque');
  showAttelage = computed(() => this.isCamion() || this.isSemiRemorque());
  terminatedHistory = computed(() => this.history().filter(a => a.dateFin !== null));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicule'] && this.vehicule?.id && isCamionType(this.vehicule?.type)) {
      this.vehiculeService.listAttelages(this.vehicule.id).pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe({
        next: (list) => this.history.set(list),
      });
    }
  }

  detach(): void {
    const attelage = this.vehicule?.currentAttelage;
    if (!attelage) return;
    const today = new Date().toISOString().split('T')[0];
    this.vehiculeService.terminateAttelage(
      attelage.id, today, attelage.tracteurId, attelage.semiId,
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.vehiculeService.invalidateDetail(this.vehicule.id);
        this.attelageChanged.emit();
      },
    });
  }

  onAttelageSaved(): void {
    this.showAssignModal.set(false);
    this.vehiculeService.invalidateDetail(this.vehicule.id);
    this.attelageChanged.emit();
  }

  infoRows = computed<InfoRow[]>(() => {
    const v = this.vehicule;
    const cd = v?.camionDetails;
    return [
      { label: 'Type', value: v?.type },
      { label: 'Marque', value: v?.marque },
      { label: 'Modèle', value: v?.modele },
      { label: 'Année', value: v?.annee?.toString() },
      { label: 'N° Chassis', value: v?.nChassis },
      { label: 'Capacité', value: cd?.capaciteTonnes != null ? `${cd.capaciteTonnes} t` : null },
      { label: 'Carburant', value: v?.carburant },
      { label: 'Chauffeur affecté', value: cd ? [cd.chauffeurPrenom, cd.chauffeurNom].filter(Boolean).join(' ') || null : null },
      { label: 'Matricule', value: v?.matricule, mono: true },
      { label: 'Compteur km', value: cd?.compteurKm != null ? `${cd.compteurKm} km` : null, mono: true },
      { label: 'Compteur heures', value: cd?.compteurHeures != null ? `${cd.compteurHeures} h` : null, mono: true },
      { label: 'Date mise en service', value: v?.dateMiseService },
    ].filter(r => r.value !== null && r.value !== undefined);
  });

  complianceItems = computed<ComplianceItem[]>(() => {
    const cd = this.vehicule?.camionDetails;
    if (!cd) return [];

    const today = new Date();
    const getStatus = (dateStr: string | null | undefined): 'ok' | 'warn' | 'late' | 'neutral' => {
      if (!dateStr) return 'neutral';
      const exp = new Date(dateStr);
      const daysLeft = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) return 'late';
      if (daysLeft < 30) return 'warn';
      return 'ok';
    };

    return [
      { label: 'Visite technique tracteur', value: cd.visiteTechTracteurExpiration, status: getStatus(cd.visiteTechTracteurExpiration) },
      { label: 'Visite technique semi', value: cd.visiteTechSemiExpiration, status: getStatus(cd.visiteTechSemiExpiration) },
      { label: 'Carnet de circulation', value: cd.carnetCirculationExpiration, status: getStatus(cd.carnetCirculationExpiration) },
      { label: 'Métrologie', value: cd.metrologieExpiration, status: getStatus(cd.metrologieExpiration) },
      { label: 'Extincteur', value: cd.extincteurExpiration, status: getStatus(cd.extincteurExpiration) },
    ];
  });
}
