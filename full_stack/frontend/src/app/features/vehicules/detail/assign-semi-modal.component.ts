import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VehiculeService } from '../vehicule.service';
import { Attelage, Vehicule } from '../../../shared/models/vehicule.model';
import { ModalShellComponent } from '../../../shared/ui/modal/modal-shell.component';

@Component({
  selector: 'app-assign-semi-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalShellComponent],
  template: `
    <app-modal-shell modalTitle="Atteler une semi-remorque" (onClose)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()">
        @if (errorMessage()) {
          <p class="modal-error">{{ errorMessage() }}</p>
        }

        <div class="form-field">
          <label>Semi-remorque</label>
          <select formControlName="semiId">
            <option value="">— Sélectionner —</option>
            @for (s of availableSemis(); track s.id) {
              <option [value]="s.id">{{ s.code }} · {{ s.marque }} {{ s.modele }} ({{ s.matricule ?? '—' }})</option>
            }
          </select>
        </div>

        <div class="form-field">
          <label>Date de début</label>
          <input type="date" formControlName="dateDebut" />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
          <button type="submit" class="btn-submit" [disabled]="submitting() || form.invalid">
            {{ submitting() ? 'En cours…' : 'Atteler' }}
          </button>
        </div>
      </form>
    </app-modal-shell>
  `,
  styles: [`
    .form-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
    .form-field label { font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600; }
    .form-field select, .form-field input { padding: 8px 10px; border: 1px solid var(--color-border); border-radius: 6px; font-size: 14px; }
    .modal-error { color: var(--color-danger); font-size: 13px; margin-bottom: 12px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class AssignSemiModalComponent implements OnInit {
  private vehiculeService = inject(VehiculeService);
  private fb = inject(FormBuilder);

  @Input() tracteurId!: number;
  @Output() saved = new EventEmitter<Attelage>();
  @Output() close = new EventEmitter<void>();

  availableSemis = signal<Vehicule[]>([]);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    semiId:    ['', Validators.required],
    dateDebut: [new Date().toISOString().split('T')[0], Validators.required],
  });

  ngOnInit(): void {
    this.vehiculeService.list({ type: 'semi_remorque', size: 200 }).subscribe({
      next: (page) => this.availableSemis.set(page.content),
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set(null);
    const { semiId, dateDebut } = this.form.value;
    this.vehiculeService.createAttelage(this.tracteurId, Number(semiId), dateDebut!).subscribe({
      next: (a) => { this.submitting.set(false); this.saved.emit(a); },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? "Erreur lors de l'attelage");
      },
    });
  }
}
