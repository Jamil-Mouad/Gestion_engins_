import { Component, Input, Output, EventEmitter, inject, signal, computed, OnChanges, SimpleChanges, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VehiculeDetail, Attelage, isCamionType, isCamionTracteur } from '../../../../shared/models/vehicule.model';
import { VehiculeService } from '../../vehicule.service';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { AssignSemiModalComponent } from '../assign-semi-modal.component';
import { ConfirmDeleteModalComponent } from '../../../../shared/ui/confirm-delete-modal/confirm-delete-modal.component';

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
  imports: [CardComponent, DatePipe, RouterLink, AssignSemiModalComponent, ConfirmDeleteModalComponent],
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
                      <a class="attelage-current__code attelage-current__code--link"
                         [routerLink]="['/vehicules', vehicule.currentAttelage.semiId]">
                        {{ vehicule.currentAttelage.semiCode }}
                      </a>
                    } @else {
                      <span class="attelage-current__label">Tracteur attelé</span>
                      <a class="attelage-current__code attelage-current__code--link"
                         [routerLink]="['/vehicules', vehicule.currentAttelage.tracteurId]">
                        {{ vehicule.currentAttelage.tracteurCode }}
                      </a>
                    }
                    <span class="attelage-current__since">
                      Depuis le {{ vehicule.currentAttelage.dateDebut | date:'dd/MM/yyyy' }}
                    </span>
                  </div>
                  @if (isCamion()) {
                    <button class="btn-detach" type="button" (click)="showDetachConfirm.set(true)">Détacher</button>
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
                          <td class="mono">
                            <a class="attelage-history__link" [routerLink]="['/vehicules', a.semiId]">{{ a.semiCode }}</a>
                          </td>
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

      @if (showDetachConfirm()) {
        <app-confirm-delete-modal
          [confirmMessage]="detachConfirmMessage"
          (confirm)="onDetachConfirmed()"
          (cancel)="showDetachConfirm.set(false)" />
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

    /* Attelage card */
    .attelage-current { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
    .attelage-current__info { display: flex; flex-direction: column; gap: 4px; }
    .attelage-current__label { font-family: 'Open Sans',sans-serif; font-size: 12px; color: #6B7280; }
    .attelage-current__code { font-family: 'JetBrains Mono',monospace; font-size: 16px; font-weight: 700; color: #111827; }
    .attelage-current__code--link { text-decoration: none; color: var(--color-primary); cursor: pointer; }
    .attelage-current__code--link:hover { text-decoration: underline; }
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
    .attelage-history__link { text-decoration: none; color: var(--color-primary); font-family: 'JetBrains Mono', monospace; }
    .attelage-history__link:hover { text-decoration: underline; }

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
  showDetachConfirm = signal(false);
  history = signal<Attelage[]>([]);

  isCamion = computed(() => isCamionType(this.vehicule?.type));
  isCamionTracteurType = computed(() => isCamionTracteur(this.vehicule?.type));
  isSemiRemorque = computed(() => this.vehicule?.type === 'semi_remorque');
  showAttelage = computed(() => this.isCamionTracteurType() || this.isSemiRemorque());
  terminatedHistory = computed(() => this.history().filter(a => a.dateFin !== null));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicule'] && this.vehicule?.id && (isCamionTracteur(this.vehicule?.type) || this.vehicule?.type === 'semi_remorque')) {
      this.vehiculeService.listAttelages(this.vehicule.id).pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe({
        next: (list) => this.history.set(list),
      });
    }
  }

  get detachConfirmMessage(): string {
    const a = this.vehicule?.currentAttelage;
    if (!a) return '';
    return `Êtes-vous sûr de détacher ${a.semiCode} depuis le ${a.dateDebut} ?`;
  }

  onDetachConfirmed(): void {
    const attelage = this.vehicule?.currentAttelage;
    if (!attelage) return;
    this.showDetachConfirm.set(false);
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
      { label: 'N° Chassis', value: v?.nChassis, mono: true },
      { label: 'Capacité', value: cd?.capaciteTonnes != null ? `${cd.capaciteTonnes} t` : null },
      { label: 'Carburant', value: v?.carburant },
      { label: 'Chauffeur affecté', value: cd ? [cd.chauffeurPrenom, cd.chauffeurNom].filter(Boolean).join(' ') || null : null },
      { label: 'Carnet de circulation — expiration', value: cd?.carnetCirculationExpiration },
      { label: 'Métrologie — expiration', value: cd?.metrologieExpiration },
    ].filter(r => r.value !== null && r.value !== undefined);
  });

  complianceItems = computed<ComplianceItem[]>(() => {
    const cd = this.vehicule?.camionDetails;
    if (!cd) return [];

    const today = new Date();

    const getExpiryStatus = (dateStr: string | null | undefined): 'ok' | 'warn' | 'late' | 'neutral' => {
      if (!dateStr) return 'neutral';
      const exp = new Date(dateStr);
      const daysLeft = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) return 'late';
      if (daysLeft < 90) return 'warn';
      return 'ok';
    };

    return [
      { label: 'Batterie — Modèle', value: cd.batterieModele, status: 'neutral' },
      { label: 'Batterie — Date d\'achat', value: cd.batterieDateAchat, status: 'neutral' },
      { label: 'Dernier contrôle batterie', value: cd.batterieDateControle, status: cd.batterieDateControle ? 'ok' : 'neutral' },
      { label: 'Extincteur — date d\'expiration', value: cd.extincteurExpiration, status: getExpiryStatus(cd.extincteurExpiration) },
      { label: 'Visite technique — Tracteur', value: cd.visiteTechTracteurExpiration, status: getExpiryStatus(cd.visiteTechTracteurExpiration) },
      { label: 'Visite technique — Semi-remorque', value: cd.visiteTechSemiExpiration, status: getExpiryStatus(cd.visiteTechSemiExpiration) },
    ];
  });
}
