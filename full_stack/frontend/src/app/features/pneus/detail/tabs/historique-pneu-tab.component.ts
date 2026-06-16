import { Component, Input, inject, signal, ChangeDetectionStrategy, OnChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PneuService } from '../../pneu.service';
import { PneuInspection } from '../../../../shared/models/pneu.model';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-pneu-historique-tab',
  standalone: true,
  imports: [CommonModule, DateFrPipe, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="historique-tab">
      @if (inspections().length > 0) {
        <div class="historique-tab__timeline">
          @for (insp of inspections(); track insp.id) {
            <div class="historique-tab__entry">
              <div class="historique-tab__date">{{ insp.dateInspection | dateFr:'short' }}</div>
              <div class="historique-tab__details">
                <span class="historique-tab__activity">{{ insp.activity }}</span>
                @if (insp.pressionPsi) {
                  <span class="historique-tab__metric">{{ insp.pressionPsi }} PSI</span>
                }
                @if (insp.profondeur32e) {
                  <span class="historique-tab__metric">{{ insp.profondeur32e }}/32"</span>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <app-empty-state message="Aucun historique disponible" />
      }
    </div>
  `,
  styles: [`
    .historique-tab__timeline { display: flex; flex-direction: column; gap: 12px; }
    .historique-tab__entry { display: flex; gap: 16px; padding: 12px; border-left: 3px solid var(--color-primary); background: var(--color-surface); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
    .historique-tab__date { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: var(--color-text-muted); min-width: 100px; }
    .historique-tab__details { display: flex; gap: 12px; }
    .historique-tab__activity { font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); }
    .historique-tab__metric { font-family: 'Open Sans', sans-serif; font-size: 12px; color: var(--color-text-muted); }
  `],
})
export class PneuHistoriqueTabComponent implements OnChanges {
  private pneuService = inject(PneuService);

  @Input({ required: true }) pneuId!: number;
  inspections = signal<PneuInspection[]>([]);

  private pneuId$ = new Subject<number>();

  constructor() {
    this.pneuId$.pipe(
      switchMap(id => this.pneuService.getInspections(id).pipe(catchError(() => of([])))),
      takeUntilDestroyed(),
    ).subscribe(data => this.inspections.set(data));
  }

  ngOnChanges(): void {
    this.pneuId$.next(this.pneuId);
  }
}