import { Component, EventEmitter, Output, inject, signal, DestroyRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { ModalShellComponent } from '../../../shared/ui';
import { MagasinApiService } from '../services/magasin-api.service';
import { Conversion, Jaugeage } from '../models/magasin.model';

@Component({
  selector: 'app-jaugeage-form-modal',
  standalone: true,
  imports: [FormsModule, DecimalPipe, ModalShellComponent],
  template: `
    <app-modal-shell
      [isVisible]="true"
      modalTitle="Jaugeage du jour (règle)"
      modalMaxWidth="460px"
      (onClose)="cancelled.emit()">

      <form class="jaugeage-form" (ngSubmit)="save()">
        <label class="field">
          <span class="field-label">Date <b class="req">*</b></span>
          <input type="date" [(ngModel)]="dateJaugeage" name="dateJaugeage" required class="input" />
        </label>

        <label class="field">
          <span class="field-label">Hauteur mesurée (cm) <b class="req">*</b></span>
          <input type="number" step="0.1" min="0" [ngModel]="hauteurCm()" (ngModelChange)="onHauteurInput($event)"
                 name="hauteurCm" required class="input input--qty" placeholder="142.5" />
        </label>

        @if (conversionError(); as err) {
          <div class="preview preview--error">{{ err }}</div>
        } @else if (conversion(); as c) {
          <div class="preview">
            <div class="preview-row">
              <span class="preview-label">Volume converti</span>
              <span class="preview-value">{{ c.litres | number:'1.0-0' }} L</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Tonnage (≈)</span>
              <span class="preview-value preview-value--sub">{{ c.tonnes | number:'1.2-2' }} t</span>
            </div>
          </div>
        }

        <div class="form-actions">
          <button type="button" class="btn-ghost" (click)="cancelled.emit()">Annuler</button>
          <button type="submit" class="btn-primary" [disabled]="saving() || !dateJaugeage || hauteurCm() === null">
            {{ saving() ? 'Enregistrement…' : 'Enregistrer le jaugeage' }}
          </button>
        </div>
      </form>
    </app-modal-shell>
  `,
  styles: [`
    .jaugeage-form { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted, #6B7280);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .req { color: #EF4444; }
    .input {
      height: 38px;
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 8px;
      padding: 0 12px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      outline: none;
      transition: border-color 150ms;
    }
    .input:focus { border-color: var(--color-primary, #F7941D); }
    .input--qty { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 16px; }
    .preview {
      background: var(--color-primary-soft, #FEF3E2);
      border: 1px solid var(--color-primary, #F7941D);
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .preview--error {
      background: #FEF2F2;
      border-color: #EF4444;
      color: #991B1B;
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      font-weight: 600;
    }
    .preview-row { display: flex; justify-content: space-between; align-items: baseline; }
    .preview-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: #92400E;
    }
    .preview-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 20px;
      font-weight: 700;
      color: var(--color-primary, #F7941D);
    }
    .preview-value--sub { font-size: 14px; color: #92400E; }
    .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
    .btn-ghost {
      height: 38px; padding: 0 16px; border-radius: 8px;
      border: 1px solid var(--color-border, #E5E7EB);
      background: transparent;
      font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600;
      color: var(--color-text-muted, #6B7280); cursor: pointer;
    }
    .btn-primary {
      height: 38px; padding: 0 18px; border-radius: 8px; border: none;
      background: var(--color-primary, #F7941D); color: #fff;
      font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: filter 150ms;
    }
    .btn-primary:hover:not(:disabled) { filter: brightness(0.95); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class JaugeageFormModalComponent implements OnInit {
  @Output() saved = new EventEmitter<Jaugeage>();
  @Output() cancelled = new EventEmitter<void>();

  private api = inject(MagasinApiService);
  private toastr = inject(ToastrService);
  private destroyRef = inject(DestroyRef);

  dateJaugeage = new Date().toISOString().slice(0, 10);
  hauteurCm = signal<number | null>(null);
  conversion = signal<Conversion | null>(null);
  conversionError = signal<string | null>(null);
  saving = signal(false);

  private hauteur$ = new Subject<number | null>();

  ngOnInit(): void {
    this.hauteur$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(h => {
        if (h === null || h < 0) return of(null);
        return this.api.convert(h).pipe(
          catchError((err: HttpErrorResponse) => {
            this.conversionError.set(err.error?.error ?? 'Conversion impossible');
            return of(null);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(conv => {
      this.conversion.set(conv);
      if (conv) this.conversionError.set(null);
    });
  }

  onHauteurInput(value: number | null): void {
    this.hauteurCm.set(value);
    this.conversionError.set(null);
    this.hauteur$.next(value);
  }

  save(): void {
    const h = this.hauteurCm();
    if (!this.dateJaugeage || h === null) return;
    this.saving.set(true);
    this.api.createJaugeage({ dateJaugeage: this.dateJaugeage, hauteurCm: h }).subscribe({
      next: j => {
        this.saving.set(false);
        this.toastr.success('Jaugeage enregistré');
        this.saved.emit(j);
      },
      error: () => this.saving.set(false),
    });
  }
}
