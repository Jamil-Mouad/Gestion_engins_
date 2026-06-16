import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pneu } from '../../../../shared/models/pneu.model';
import { StatusBadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';

@Component({
  selector: 'app-pneu-details-tab',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, DateFrPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="details-tab">
      <div class="details-tab__field"><span class="details-tab__label">N° série</span><span>{{ pneu.nSerie ?? '—' }}</span></div>
      <div class="details-tab__field"><span class="details-tab__label">Marque</span><span>{{ pneu.marque ?? '—' }}</span></div>
      <div class="details-tab__field"><span class="details-tab__label">Position</span><span>{{ pneu.position }}</span></div>
      <div class="details-tab__field"><span class="details-tab__label">Date montage</span><span>{{ pneu.dateMontage ?? '—' }}</span></div>
      <div class="details-tab__field"><span class="details-tab__label">KM montage</span><span>{{ pneu.kmMontage ?? '—' }} km</span></div>
      <div class="details-tab__field"><span class="details-tab__label">KM parcourus</span><span>{{ pneu.kmParcourus }} km</span></div>
      <div class="details-tab__field"><span class="details-tab__label">KM restant estimé</span><span>{{ pneu.kmRestant ?? '—' }} km</span></div>
      <div class="details-tab__field"><span class="details-tab__label">Durée de vie estimée</span><span>{{ pneu.expectedLifeKm }} km</span></div>
      <div class="details-tab__field"><span class="details-tab__label">Pression</span><span>{{ pneu.pressionPsi ?? '—' }} PSI</span></div>
      <div class="details-tab__field"><span class="details-tab__label">Profondeur</span><span>{{ pneu.profondeur32e ?? '—' }}/32"</span></div>
      <div class="details-tab__field"><span class="details-tab__label">Statut</span><span><app-status-badge [status]="pneu.status" /></span></div>
    </div>
  `,
  styles: [`
    .details-tab__field { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
    .details-tab__label { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: var(--color-text-muted); }
    .details-tab__field span:last-child { font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); }
  `],
})
export class PneuDetailsTabComponent {
  @Input({ required: true }) pneu!: Pneu;
}