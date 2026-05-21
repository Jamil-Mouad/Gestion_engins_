import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-demandes-intervention',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1 class="page-title">Demandes d'intervention</h1>
      <p class="page-sub">Cette section est en cours de développement.</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 40px 32px;
      color: var(--color-text);
    }
    .page-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .page-sub {
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      color: var(--color-text-muted);
    }
  `],
})
export class DemandesInterventionComponent {}
