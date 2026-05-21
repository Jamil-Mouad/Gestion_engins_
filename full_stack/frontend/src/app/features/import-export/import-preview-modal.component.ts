import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportPreview } from '../../shared/models/import.model';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';

@Component({
  selector: 'app-import-preview-modal',
  standalone: true,
  imports: [CommonModule, ModalShellComponent],
  template: `
    <app-modal-shell modalTitle="Aperçu de l'import" (onClose)="close.emit()">
      @if (previewData) {
        <div class="preview-modal">
          <div class="preview-modal__info">
            <span class="preview-modal__filename">{{ previewData!.fileName }}</span>
            <span class="preview-modal__count">{{ previewData!.lignesTotal }} lignes détectées</span>
          </div>

          @if (previewData!.errors.length > 0) {
            <div class="preview-modal__errors">
              <h4 class="preview-modal__subtitle">Erreurs détectées</h4>
              @for (err of previewData!.errors; track err.row) {
                <div class="preview-modal__error">Ligne {{ err.row }}: {{ err.message }}</div>
              }
            </div>
          }

          @if (previewData!.sampleRows.length > 0) {
            <div class="preview-modal__table-wrapper">
              <h4 class="preview-modal__subtitle">Aperçu (5 premières lignes)</h4>
              <table class="preview-modal__table">
                <thead>
                  <tr>
                    @for (key of getKeys(); track key) {
                      <th>{{ key }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of previewData!.sampleRows; track $index) {
                    <tr>
                      @for (key of getKeys(); track key) {
                        <td>{{ row[key] ?? '—' }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <div class="preview-modal__actions">
            <button class="preview-modal__btn preview-modal__btn--cancel" (click)="close.emit()">Annuler</button>
            <button class="preview-modal__btn preview-modal__btn--confirm" (click)="confirm.emit()">Confirmer l'import</button>
          </div>
        </div>
      }
    </app-modal-shell>
  `,
  styles: [`
    .preview-modal { padding: 16px 0; }
    .preview-modal__info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .preview-modal__filename { font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 600; color: var(--color-text); }
    .preview-modal__count { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text-muted); }
    .preview-modal__errors { margin-bottom: 16px; }
    .preview-modal__subtitle { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: var(--color-text); margin: 0 0 8px; }
    .preview-modal__error { font-family: 'Open Sans', sans-serif; font-size: 12px; color: var(--color-danger); padding: 2px 0; }
    .preview-modal__table-wrapper { margin-bottom: 16px; }
    .preview-modal__table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .preview-modal__table th { font-family: 'Montserrat', sans-serif; font-weight: 600; text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--color-border); color: var(--color-text-muted); }
    .preview-modal__table td { font-family: 'Open Sans', sans-serif; padding: 6px 8px; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
    .preview-modal__actions { display: flex; justify-content: flex-end; gap: 8px; }
    .preview-modal__btn { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; padding: 8px 20px; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s; }
    .preview-modal__btn--cancel { border: 1px solid var(--color-border); background: var(--color-surface-1); color: var(--color-text); }
    .preview-modal__btn--cancel:hover { background: var(--color-surface-2); }
    .preview-modal__btn--confirm { border: 1px solid var(--color-primary); background: var(--color-primary); color: #fff; }
    .preview-modal__btn--confirm:hover { opacity: 0.9; }
  `],
})
export class ImportPreviewModalComponent {
  @Input() previewData: ImportPreview | null = null;
  @Output() confirm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  getKeys(): string[] {
    if (!this.previewData || this.previewData.sampleRows.length === 0) return [];
    return Object.keys(this.previewData.sampleRows[0]);
  }
}