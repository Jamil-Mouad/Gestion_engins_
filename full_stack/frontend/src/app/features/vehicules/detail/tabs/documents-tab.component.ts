import { Component } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';

@Component({
  selector: 'app-documents-tab',
  standalone: true,
  imports: [EmptyStateComponent, CardComponent],
  template: `
    <app-card title="Documents du véhicule">
      <app-empty-state message="Aucun document disponible pour le moment" />
    </app-card>
  `,
})
export class DocumentsTabComponent {}
