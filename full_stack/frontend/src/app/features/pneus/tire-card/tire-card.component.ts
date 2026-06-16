import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Pneu } from '../../../shared/models/pneu.model';
import { StatusBadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ImageLightboxComponent } from '../../../shared/ui/image-lightbox/image-lightbox.component';

@Component({
  selector: 'app-tire-card',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, ImageLightboxComponent],
  template: `
    <div class="tire-card">
      <!-- Image (real photo opens the lightbox) / placeholder -->
      <div class="tire-card__img-wrap">
        @if (pneu.photoUrl) {
          <app-image-lightbox [src]="pneu.photoUrl" [fill]="true" />
        } @else {
          <img src="assets/tire-default.svg"
               [alt]="'P' + pneu.position"
               class="tire-card__img tire-card__img--default" />
          @if (pneu.marque) {
            <span class="tire-card__img-label">{{ pneu.marque }}</span>
          }
        }
      </div>

      <div class="tire-card__header">
        <span class="tire-card__position">P{{ pneu.position }}</span>
        <app-status-badge [status]="pneu.status" />
      </div>
      <div class="tire-card__body">
        <div class="tire-card__row"><span class="tire-card__label">N° série</span><span>{{ pneu.nSerie ?? '—' }}</span></div>
        <div class="tire-card__row"><span class="tire-card__label">Référence</span><span>{{ pneu.reference ?? '—' }}</span></div>
        <div class="tire-card__row"><span class="tire-card__label">Marque</span><span>{{ pneu.marque ?? '—' }}</span></div>
        <div class="tire-card__row"><span class="tire-card__label">Date montage</span><span>{{ pneu.dateMontage ?? '—' }}</span></div>
        <div class="tire-card__row"><span class="tire-card__label">KM parcourus</span><span>{{ pneu.kmParcourus }} km</span></div>
        <div class="tire-card__row"><span class="tire-card__label">KM restant</span><span>{{ pneu.kmRestant ?? '—' }} km</span></div>
        <div class="tire-card__row"><span class="tire-card__label">Pression</span><span>{{ pneu.pressionPsi ?? '—' }} PSI</span></div>
        <div class="tire-card__row"><span class="tire-card__label">Profondeur</span><span>{{ pneu.profondeur32e ?? '—' }}/32"</span></div>
      </div>
      <a [routerLink]="['/pneus', pneu.id]" class="tire-card__link">Voir la fiche</a>
    </div>
  `,
  styles: [`
    .tire-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; }

    /* Image / placeholder */
    .tire-card__img-wrap { position: relative; margin: -16px -16px 14px; border-radius: var(--radius-md) var(--radius-md) 0 0; overflow: hidden; height: 80px; }
    .tire-card__img-wrap app-image-lightbox { display: block; height: 100%; }
    .tire-card__img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .tire-card__img--default { object-fit: cover; background: #1F2937; }
    .tire-card__img-label { position: absolute; bottom: 4px; left: 0; right: 0; text-align: center; font-family: 'Open Sans', sans-serif; font-size: 11px; color: #9CA3AF; font-style: italic; pointer-events: none; }

    .tire-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .tire-card__position { font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 700; color: var(--color-text); }
    .tire-card__body { display: flex; flex-direction: column; gap: 6px; }
    .tire-card__row { display: flex; justify-content: space-between; }
    .tire-card__label { font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .tire-card__row span:last-child { font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); }
    .tire-card__link { display: block; margin-top: 12px; text-align: center; font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600; color: var(--color-primary); text-decoration: none; }
    .tire-card__link:hover { text-decoration: underline; }
  `],
})
export class TireCardComponent {
  @Input({ required: true }) pneu!: Pneu;
}