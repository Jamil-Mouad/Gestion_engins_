import { Component, Output, EventEmitter, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ImportPreview } from '../../shared/models/import.model';

@Component({
  selector: 'app-dropzone',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <!-- Hidden file input -->
    <input
      #fileInput
      type="file"
      accept=".xlsx,.xls"
      class="dz-hidden-input"
      (change)="onFileSelect($event)" />

    <!-- Drop zone -->
    <div
      class="dz-zone"
      [class.dz-zone--over]="isDragOver()"
      [class.dz-zone--parsing]="isParsing()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="!isParsing() && fileInput.click()">

      @if (isParsing()) {
        <!-- Parsing state -->
        <div class="dz-spinner"></div>
        <span class="dz-parsing-text">Analyse en cours…</span>
      } @else if (previewData()) {
        <!-- Preview state: preview table shown outside the zone -->
        <div class="dz-icon-wrap dz-icon-wrap--success">
          <lucide-icon name="circle-check" [size]="28" class="dz-icon-success" />
        </div>
        <span class="dz-filename">{{ previewData()!.fileName }}</span>
        <span class="dz-subtext">{{ previewData()!.lignesTotal }} lignes détectées</span>
        <button class="dz-browse-link" type="button" (click)="$event.stopPropagation(); reset()">Nouvel import</button>
      } @else {
        <!-- Idle state -->
        <div class="dz-icon-wrap" [class.dz-icon-wrap--over]="isDragOver()">
          <lucide-icon name="cloud-upload" [size]="28" class="dz-icon" [class.dz-icon--over]="isDragOver()" />
        </div>
        <span class="dz-label">Glissez un fichier Excel (.xlsx) ici</span>
        <span class="dz-subtext">
          ou <a class="dz-browse-link" (click)="$event.stopPropagation(); fileInput.click()">parcourir</a>
        </span>
        <span class="dz-hint">.xlsx / .xls · max 25 MB</span>
      }
    </div>

    <!-- Preview table (below the zone) -->
    @if (previewData() && previewData()!.sampleRows.length > 0) {
      <div class="dz-preview-table-wrap">
        <div class="dz-preview-title">Aperçu — 5 premières lignes</div>
        <div class="dz-preview-table-scroll">
          <table class="dz-preview-table">
            <thead>
              <tr>
                @for (key of previewKeys(); track key) {
                  <th>{{ key }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of previewData()!.sampleRows; track $index) {
                <tr>
                  @for (key of previewKeys(); track key) {
                    <td>{{ row[key] ?? '—' }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes spin { to { transform: rotate(360deg); } }

    .dz-hidden-input { display: none; }

    .dz-zone {
      border: 2px dashed var(--color-border);
      border-radius: 12px;
      min-height: 220px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: var(--color-surface, #fff);
      cursor: pointer;
      transition: border-color 200ms, background 200ms;
    }
    .dz-zone--over {
      border-color: var(--color-primary);
      border-style: solid;
      background: rgba(247, 148, 29, 0.05);
    }
    .dz-zone--parsing {
      cursor: default;
    }

    /* Icon wrap */
    .dz-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 200ms, transform 200ms;
    }
    .dz-icon-wrap--over {
      background: rgba(247, 148, 29, 0.12);
      transform: scale(1.1);
    }
    .dz-icon-wrap--success {
      background: #DCFCE7;
    }
    .dz-icon {
      color: #9ca3af;
      transition: color 200ms;
    }
    .dz-icon--over {
      color: var(--color-primary);
    }
    .dz-icon-success {
      color: #16a34a;
    }

    /* Labels */
    .dz-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text, #111);
    }
    .dz-filename {
      font-family: 'Montserrat', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #16a34a;
    }
    .dz-subtext {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text-muted, #6b7280);
    }
    .dz-hint {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: #9ca3af;
    }
    .dz-browse-link {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-primary);
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      text-decoration: underline;
    }
    .dz-browse-link:hover { opacity: 0.8; }

    /* Parsing */
    .dz-spinner {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 4px solid #e5e7eb;
      border-top-color: var(--color-primary);
      animation: spin 600ms linear infinite;
    }
    .dz-parsing-text {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-muted, #6b7280);
    }

    /* Preview table */
    .dz-preview-table-wrap {
      margin-top: 16px;
    }
    .dz-preview-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-muted, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
    }
    .dz-preview-table-scroll {
      overflow-x: auto;
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }
    .dz-preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .dz-preview-table th {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted, #6b7280);
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid var(--color-border);
      background: #f9fafb;
      white-space: nowrap;
    }
    .dz-preview-table td {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: var(--color-text, #111);
      padding: 7px 12px;
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }
    .dz-preview-table tr:last-child td { border-bottom: none; }
  `],
})
export class DropzoneComponent {
  @Output() fileSelected = new EventEmitter<File>();

  isDragOver = signal(false);
  isParsing = signal(false);
  previewData = signal<ImportPreview | null>(null);

  /** Keys of the first sample row (used for table headers) */
  previewKeys(): string[] {
    const data = this.previewData();
    if (!data || data.sampleRows.length === 0) return [];
    return Object.keys(data.sampleRows[0]);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && this.isValidFile(file)) {
      this.emitFile(file);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && this.isValidFile(file)) {
      this.emitFile(file);
    }
  }

  /** Called by parent to show preview after upload */
  showPreview(data: ImportPreview): void {
    this.isParsing.set(false);
    this.previewData.set(data);
  }

  /** Reset the dropzone to idle */
  reset(): void {
    this.previewData.set(null);
    this.isParsing.set(false);
  }

  private emitFile(file: File): void {
    this.isParsing.set(true);
    this.previewData.set(null);
    this.fileSelected.emit(file);
  }

  private isValidFile(file: File): boolean {
    return (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    );
  }
}
