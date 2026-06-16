import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import {
  PageHeaderComponent, DataTableHeaderComponent, DataTableRowComponent,
  EmptyStateComponent, SkeletonComponent, ConfirmDeleteModalComponent,
} from '../../../shared/ui';
import { MagasinApiService } from '../services/magasin-api.service';
import { Jaugeage } from '../models/magasin.model';
import { JaugeageFormModalComponent } from './jaugeage-form-modal.component';

@Component({
  selector: 'app-magasin-jaugeages',
  standalone: true,
  imports: [
    DatePipe, DecimalPipe, LucideAngularModule,
    PageHeaderComponent, DataTableHeaderComponent, DataTableRowComponent,
    EmptyStateComponent, SkeletonComponent, ConfirmDeleteModalComponent,
    JaugeageFormModalComponent,
  ],
  template: `
    <div class="magasin-page" style="animation: screenEnter 400ms ease both">
      <app-page-header title="Jaugeages quotidiens" [count]="totalElements()">
        <button class="btn-primary" type="button" (click)="showForm.set(true)">
          <lucide-icon name="ruler" [size]="15" /> Jaugeage du jour
        </button>
      </app-page-header>


      <div class="magasin-content">
        <div class="table-wrap">
          <app-data-table-header [cols]="tableCols" />
          @if (loading()) {
            <app-skeleton [rows]="8" height="52px" />
          } @else if (jaugeages().length === 0) {
            <app-empty-state icon="ruler" message="Aucun jaugeage saisi." />
          } @else {
            @for (j of jaugeages(); track j.id; let i = $index) {
              <app-data-table-row [idx]="i">
                <div class="dtr-cell dtr-cell--mono" style="flex:0.9">{{ j.dateJaugeage | date:'dd/MM/yyyy' }}</div>
                <div class="dtr-cell dtr-cell--mono" style="flex:0.7">{{ j.hauteurCm | number:'1.0-1' }} cm</div>
                <div class="dtr-cell dtr-cell--mono dtr-cell--qty" style="flex:0.9">{{ j.litresMesures | number:'1.0-0' }} L</div>
                <div class="dtr-cell dtr-cell--mono" style="flex:0.9">{{ j.litresTheoriques | number:'1.0-0' }} L</div>
                <div class="dtr-cell" style="flex:0.9">
                  <span class="ecart-badge ecart-badge--{{ ecartLevel(j) }}">
                    {{ j.ecartLitres > 0 ? '+' : '' }}{{ j.ecartLitres | number:'1.0-0' }} L
                  </span>
                </div>
                <div class="dtr-cell dtr-cell--actions" style="flex:0.6">
                  <lucide-icon name="trash-2" [size]="15" class="row-action row-action--danger" title="Supprimer" (click)="toDelete.set(j)" />
                </div>
              </app-data-table-row>
            }
          }
        </div>

        @if (totalPages() > 1) {
          <div class="pager">
            <button class="pager-btn" [disabled]="page() === 0" (click)="goToPage(page() - 1)">‹ Précédent</button>
            <span class="pager-info">Page {{ page() + 1 }} / {{ totalPages() }}</span>
            <button class="pager-btn" [disabled]="page() >= totalPages() - 1" (click)="goToPage(page() + 1)">Suivant ›</button>
          </div>
        }
      </div>

      @if (showForm()) {
        <app-jaugeage-form-modal (saved)="onSaved()" (cancelled)="showForm.set(false)" />
      }
      @if (toDelete(); as j) {
        <app-confirm-delete-modal
          [itemLabel]="'le jaugeage du ' + (j.dateJaugeage | date:'dd/MM/yyyy')"
          [isDeleting]="deleting()"
          (confirm)="confirmDelete()"
          (cancel)="toDelete.set(null)" />
      }
    </div>
  `,
  styles: [`
    @keyframes screenEnter { from { opacity: 0; } to { opacity: 1; } }
    .magasin-page { background: #F5F5F5; min-height: calc(100vh - 88px); }
    .magasin-content { padding: 20px 32px 32px; }
    .table-wrap {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--color-border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.07);
      overflow: hidden;
    }
    .dtr-cell {
      padding: 0 16px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text, #111827);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
    }
    .dtr-cell--mono { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; }
    .dtr-cell--qty { font-weight: 700; font-size: 13px; }
    .dtr-cell--actions { justify-content: flex-start; }
    .ecart-badge {
      display: inline-flex;
      padding: 3px 10px;
      border-radius: 9999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
    }
    .ecart-badge--ok { background: #D1FAE5; color: #065F46; }
    .ecart-badge--warn { background: #FEF3C7; color: #92400E; }
    .ecart-badge--alert { background: #FEE2E2; color: #991B1B; }
    .row-action { color: #9CA3AF; cursor: pointer; }
    .row-action:hover { color: var(--color-primary); }
    .row-action--danger:hover { color: #DC2626; }
    .btn-primary {
      height: 36px; padding: 0 16px; border-radius: 8px; border: none;
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--color-primary, #F7941D); color: #fff;
      font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; white-space: nowrap;
    }
    .pager { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; }
    .pager-btn {
      height: 32px; padding: 0 14px; border-radius: 8px;
      border: 1px solid var(--color-border, #E5E7EB);
      background: white;
      font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 600;
      color: #374151; cursor: pointer;
    }
    .pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .pager-info { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6B7280; }
  `],
})
export class MagasinJaugeagesComponent {
  private api = inject(MagasinApiService);
  private toastr = inject(ToastrService);

  jaugeages = signal<Jaugeage[]>([]);
  loading = signal(true);
  page = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  showForm = signal(false);
  toDelete = signal<Jaugeage | null>(null);
  deleting = signal(false);

  readonly tableCols = [
    { label: 'Date',         flex: 0.9 },
    { label: 'Hauteur',      flex: 0.7 },
    { label: 'Mesuré',       flex: 0.9 },
    { label: 'Théorique',    flex: 0.9 },
    { label: 'Écart',        flex: 0.9 },
    { label: 'Actions',      flex: 0.6 },
  ];

  constructor() {
    this.load();
  }

  ecartLevel(j: Jaugeage): 'ok' | 'warn' | 'alert' {
    const theorique = Math.abs(j.litresTheoriques);
    if (theorique > 0) {
      const pct = Math.abs(j.ecartLitres) / theorique * 100;
      if (pct <= 1) return 'ok';
      if (pct <= 3) return 'warn';
      return 'alert';
    }
    const abs = Math.abs(j.ecartLitres);
    if (abs <= 100) return 'ok';
    if (abs <= 400) return 'warn';
    return 'alert';
  }

  goToPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  onSaved(): void {
    this.showForm.set(false);
    this.load();
  }

  confirmDelete(): void {
    const j = this.toDelete();
    if (!j) return;
    this.deleting.set(true);
    this.api.deleteJaugeage(j.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toDelete.set(null);
        this.toastr.success('Jaugeage supprimé');
        this.load();
      },
      error: () => this.deleting.set(false),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.listJaugeages({ page: this.page(), size: 20 }).subscribe({
      next: res => {
        this.jaugeages.set(res.content);
        this.totalPages.set(res.totalPages);
        this.totalElements.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
