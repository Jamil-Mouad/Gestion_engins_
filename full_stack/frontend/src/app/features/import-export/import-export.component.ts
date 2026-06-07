import { Component, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ImportService } from './import.service';
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
    FormsModule,
    LucideAngularModule,
    DropzoneComponent,
    HistoriqueImportsTableComponent,
    SkeletonComponent,
    PageHeaderComponent,
    CardComponent,
  ],
  template: `
    <div class="ie-page" style="animation: screenEnter 400ms ease both">

      <app-page-header title="Import" />

      <div class="ie-content">

        <!-- ── Import card ────────────────────────────────── -->
        <app-card title="Import Excel">
          <div class="ie-import-type">
            <label class="ie-import-type-label" for="importEntiteSelect">Type de données</label>
            <select id="importEntiteSelect" class="ie-select" [ngModel]="importEntite()" (ngModelChange)="importEntite.set($event)">
              <option value="vehicules">Véhicules</option>
              <option value="composants">Composants</option>
            </select>
          </div>

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
      grid-template-columns: 1fr;
      gap: 24px;
    }

    /* ── Import type select ──────────────────────────── */
    .ie-import-type {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .ie-import-type-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }
    .ie-select {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--color-border);
      background: var(--color-surface, #fff);
      color: var(--color-text, #111);
      cursor: pointer;
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

    @media (max-width: 768px) {
      .ie-hist-wrap { grid-column: auto; }
    }
  `],
})
export class ImportExportComponent {
  private importService = inject(ImportService);

  dropzone = viewChild<DropzoneComponent>('dropzone');

  historique = signal<ImportsHistorique[]>([]);
  loadingHistorique = signal(true);
  uploading = signal(false);
  uploadError = signal('');

  importEntite = signal<'vehicules' | 'composants'>('vehicules');

  constructor() {
    this.loadHistorique();
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
    this.importService.uploadExcel(file, this.importEntite()).subscribe({
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

}
