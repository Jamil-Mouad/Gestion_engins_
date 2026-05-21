import { Component } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';

@Component({
  selector: 'app-composants-tab',
  standalone: true,
  imports: [EmptyStateComponent, CardComponent],
  template: `
    <app-card title="Composants du véhicule">
      <app-empty-state message="Aucun composant enregistré pour ce véhicule" />
    </app-card>
  `,
})
export class ComposantsTabComponent {}
