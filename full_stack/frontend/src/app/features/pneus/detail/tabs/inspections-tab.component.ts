import { Component, Input, inject, signal, ChangeDetectionStrategy, OnChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PneuService } from '../../pneu.service';
import { PneuInspection, InspectionActivity } from '../../../../shared/models/pneu.model';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { InspectionModalComponent } from '../../inspection-modal.component';

@Component({
  selector: 'app-pneu-inspections-tab',
  standalone: true,
  imports: [CommonModule, DateFrPipe, EmptyStateComponent, InspectionModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inspections-tab">
      <div class="inspections-tab__header">
        <h3 class="inspections-tab__title">Inspections</h3>
        <button class="inspections-tab__add-btn" (click)="showModal.set(true)">Nouvelle inspection</button>
      </div>
      @if (inspections().length > 0) {
        <table class="inspections-tab__table">
          <thead>
            <tr><th>Date</th><th>Activité</th><th>Pression</th><th>Profondeur</th><th>Méthode</th><th>Notes</th></tr>
          </thead>
          <tbody>
            @for (insp of inspections(); track insp.id) {
              <tr>
                <td>{{ insp.dateInspection | dateFr:'short' }}</td>
                <td>{{ insp.activity }}</td>
                <td>{{ insp.pressionPsi ?? '—' }} PSI</td>
                <td>{{ insp.profondeur32e ?? '—' }}/32"</td>
                <td>{{ insp.methode ?? '—' }}</td>
                <td>{{ insp.notes ?? '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <app-empty-state message="Aucune inspection pour ce pneu" />
      }
      @if (showModal()) {
        <app-inspection-modal [pneuId]="pneuId" (saved)="onInspectionSaved()" (close)="showModal.set(false)" />
      }
    </div>
  `,
  styles: [`
    .inspections-tab__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .inspections-tab__title { font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 600; margin: 0; }
    .inspections-tab__add-btn { background: var(--color-primary); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
    .inspections-tab__add-btn:hover { background: var(--color-primary-dark); }
    .inspections-tab__table { width: 100%; border-collapse: collapse; }
    .inspections-tab__table th { text-align: left; font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 12px; border-bottom: 2px solid var(--color-border); }
    .inspections-tab__table td { padding: 10px 12px; border-bottom: 1px solid var(--color-border); font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); }
  `],
})
export class PneuInspectionsTabComponent implements OnChanges {
  private pneuService = inject(PneuService);

  @Input({ required: true }) pneuId!: number;
  inspections = signal<PneuInspection[]>([]);
  showModal = signal(false);

  private reload$ = new Subject<number>();

  constructor() {
    this.reload$.pipe(
      switchMap(id => this.pneuService.getInspections(id).pipe(catchError(() => of([])))),
      takeUntilDestroyed(),
    ).subscribe(data => this.inspections.set(data));
  }

  ngOnChanges(): void {
    this.reload$.next(this.pneuId);
  }

  onInspectionSaved(): void {
    this.showModal.set(false);
    this.reload$.next(this.pneuId);
  }
}