import { Component, inject, signal, viewChild } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ImportService } from './import.service';
import { ExportService } from './export.service';
import { ImportType } from '../../shared/models/import.model';
import { ImportsHistorique } from '../../shared/models/import.model';
import { DropzoneComponent } from './dropzone.component';
import { HistoriqueImportsTableComponent } from './historique-imports-table.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-import-export',
  standalone: true,
  imports: [
    LucideAngularModule,
    DropzoneComponent,
    HistoriqueImportsTableComponent,
    SkeletonComponent,
    PageHeaderComponent,
    CardComponent,
  ],
  template: `
    <div class="ie-page" style="animation: screenEnter 400ms ease both">

      <app-page-header title="Import / Export" />

      <div class="ie-content">

        <!-- ── Import card ────────────────────────────────── -->
        <app-card title="Import Excel">
          <app-dropzone #dropzone (fileSelected)="onFileSelected($event)" />

          @if (uploading()) {
            <div class="ie-status ie-status--loading">
              <div class="ie-spinner"></div>
              <span>Import en cours…</span>
            </div>
          }

          @if (uploadError()) {
            <div class="ie-status ie-status--error">
              <lucide-icon name="circle-alert" [size]="14" />
              <span>{{ uploadError() }}</span>
            </div>
          }
        </app-card>

        <!-- ── Export card ────────────────────────────────── -->
        <app-card title="Export données">
          <div class="ie-export-section">
            <div class="ie-export-label">Entités à exporter</div>
            @for (item of exportItems; track item.key; let i = $index) {
              <div class="ie-export-row" (click)="toggleExport(i)">
                <div class="ie-checkbox" [class.ie-checkbox--checked]="exportChecks()[i]">
                  @if (exportChecks()[i]) {
                    <svg width="10" height="8" viewBox="0 0 10 8">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  }
                </div>
                <span class="ie-export-item-label">{{ item.label }}</span>
              </div>
            }
          </div>

          <div class="ie-export-actions">
            <button class="btn-secondary" type="button" (click)="exportVehicules()">
              <lucide-icon name="download" [size]="14" />
              Exporter Excel
            </button>
            <button class="btn-primary" type="button" (click)="exportInterventions()">
              <lucide-icon name="download" [size]="14" />
              Exporter PDF
            </button>
          </div>
        </app-card>

        <!-- ── Historique ────────────────────────────────── -->
        <div class="ie-hist-wrap">
          <div class="ie-hist-header">
            <span class="ie-hist-title">Historique des imports</span>
          </div>
          <div class="ie-hist-table-card">
            @if (loadingHistorique()) {
              <app-skeleton [rows]="3" height="52px" />
            } @else {
              <app-historique-imports-table [rows]="historique()" />
            }
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .ie-page {
      background: var(--color-background, #F5F5F5);
      min-height: calc(100vh - 72px);
    }

    .ie-content {
      padding: 24px 32px 32px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    /* ── Export ──────────────────────────── */
    .ie-export-section {
      margin-bottom: 20px;
    }
    .ie-export-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 10px;
    }
    .ie-export-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 0;
      border-bottom: 1px solid var(--color-border);
      cursor: pointer;
    }
    .ie-export-row:hover { background: #f9fafb; }
    .ie-checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-border);
      border-radius: 4px;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 150ms, border-color 150ms;
    }
    .ie-checkbox--checked {
      background: var(--color-primary);
      border-color: var(--color-primary);
    }
    .ie-export-item-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      color: #1f2937;
    }
    .ie-export-actions {
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }

    /* ── Historique ────────────────────────── */
    .ie-hist-wrap {
      grid-column: 1 / -1;
    }
    .ie-hist-header {
      margin-bottom: 12px;
    }
    .ie-hist-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text, #111);
    }
    .ie-hist-table-card {
      background: var(--color-surface, #fff);
      border-radius: 12px;
      border: 1px solid var(--color-border);
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    /* ── Status messages ─────────────────────── */
    .ie-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
    }
    .ie-status--loading {
      color: var(--color-primary);
    }
    .ie-status--error {
      color: #dc2626;
    }
    .ie-spinner {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #e5e7eb;
      border-top-color: var(--color-primary);
      animation: spin 600ms linear infinite;
      flex-shrink: 0;
    }

    /* ── Buttons ─────────────────────────────── */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 8px;
      border: 1px solid var(--color-primary);
      background: var(--color-primary);
      color: #fff;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-primary:hover { opacity: 0.9; }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 8px;
      border: 1px solid var(--color-border);
      background: var(--color-surface, #fff);
      color: var(--color-text, #111);
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-secondary:hover { background: #f5f5f5; }

    @media (max-width: 768px) {
      .ie-content { grid-template-columns: 1fr; }
      .ie-hist-wrap { grid-column: auto; }
    }
  `],
})
export class ImportExportComponent {
  private importService = inject(ImportService);
  private exportService = inject(ExportService);

  dropzone = viewChild<DropzoneComponent>('dropzone');

  historique = signal<ImportsHistorique[]>([]);
  loadingHistorique = signal(true);
  uploading = signal(false);
  uploadError = signal('');

  exportItems = [
    { key: 'vehicules', label: 'Véhicules' },
    { key: 'interventions', label: 'Interventions' },
    { key: 'composants', label: 'Composants' },
    { key: 'pneus', label: 'Pneus' },
    { key: 'vidanges', label: 'Vidanges' },
    { key: 'kpis', label: 'KPIs' },
  ];
  exportChecks = signal<boolean[]>([true, true, false, false, true, false]);

  constructor() {
    this.loadHistorique();
  }

  toggleExport(index: number): void {
    this.exportChecks.update(checks => checks.map((v, i) => (i === index ? !v : v)));
  }

  loadHistorique(): void {
    this.loadingHistorique.set(true);
    this.importService.getHistorique().subscribe({
      next: (page) => {
        this.historique.set(page.content);
        this.loadingHistorique.set(false);
      },
      error: () => this.loadingHistorique.set(false),
    });
  }

  onFileSelected(file: File): void {
    this.uploading.set(true);
    this.uploadError.set('');
    this.importService.uploadExcel(file, 'excel_general' as ImportType).subscribe({
      next: (preview) => {
        this.uploading.set(false);
        this.dropzone()?.showPreview(preview);
        this.loadHistorique();
      },
      error: () => {
        this.uploading.set(false);
        this.dropzone()?.reset();
        this.uploadError.set("Erreur lors de l'import.");
      },
    });
  }

  exportVehicules(): void {
    this.exportService.exportVehicules({}).subscribe({
      next: (blob) => this.downloadBlob(blob, 'vehicules.xlsx'),
      error: () => {
        this.uploadError.set("Erreur lors de l'export des véhicules.");
      },
    });
  }

  exportInterventions(): void {
    this.exportService.exportInterventions({}).subscribe({
      next: (blob) => this.downloadBlob(blob, 'interventions.xlsx'),
      error: () => {
        this.uploadError.set("Erreur lors de l'export des interventions.");
      },
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 0);
  }
}
