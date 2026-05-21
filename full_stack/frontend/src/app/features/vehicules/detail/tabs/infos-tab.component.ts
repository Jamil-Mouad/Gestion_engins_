import { Component, Input, computed, signal } from '@angular/core';
import { VehiculeDetail } from '../../../../shared/models/vehicule.model';
import { CardComponent } from '../../../../shared/ui/card/card.component';

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
  imports: [CardComponent],
  template: `
    <div class="infos-grid">
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
    </div>
  `,
  styles: [`
    .infos-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 20px; }
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

    /* Responsive */
    @media (max-width: 900px) {
      .infos-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class InfosTabComponent {
  @Input({ required: true }) vehicule!: VehiculeDetail;

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
    ].filter(r => r.value !== null && r.value !== undefined || true);
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
