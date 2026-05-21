import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardConfig, DashboardWidgetConfig } from '../../shared/models/dashboard.model';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';

const WIDGET_GROUPS = [
  {
    label: 'KPIs',
    ids: ['fleet-overview', 'cost-month', 'cost-chart', 'intervention-donut'],
  },
  {
    label: 'Alertes',
    ids: ['interventions-ouvertes', 'alertes-pneus', 'vidanges-retard'],
  },
  {
    label: 'Activité',
    ids: ['notifications-recap'],
  },
];

const WIDGET_LABELS: Record<string, string> = {
  'fleet-overview': 'Disponibilité',
  'cost-month': 'Coût MAD',
  'cost-chart': 'Coût — 12 mois',
  'intervention-donut': 'Interventions par statut',
  'interventions-ouvertes': 'Interventions ouvertes',
  'alertes-pneus': 'Alertes pneus',
  'vidanges-retard': 'Vidanges en retard',
  'notifications-recap': 'Notifications récentes',
};

@Component({
  selector: 'app-manage-widgets-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
  template: `
    <app-modal-shell modalTitle="Gérer les widgets" (onClose)="close.emit()">
      <div class="manage-widgets">
        @for (group of widgetGroups; track group.label) {
          <div class="manage-widgets__group">
            <h3 class="manage-widgets__group-label">{{ group.label }}</h3>
            @for (id of group.ids; track id) {
              <label class="manage-widgets__item">
                <input type="checkbox"
                  [checked]="isVisible(id)"
                  (change)="toggleWidget(id, $any($event.target).checked)" />
                <span>{{ widgetLabels[id] || id }}</span>
              </label>
            }
          </div>
        }
        <div class="manage-widgets__actions">
          <button class="btn-cancel" (click)="close.emit()">Annuler</button>
          <button class="btn-submit" (click)="onSave()">Enregistrer</button>
        </div>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .manage-widgets { display: flex; flex-direction: column; gap: 16px; }
    .manage-widgets__group { border-bottom: 1px solid var(--color-border); padding-bottom: 12px; }
    .manage-widgets__group-label { font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 600; color: var(--color-text); margin: 0 0 8px; }
    .manage-widgets__item { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); cursor: pointer; }
    .manage-widgets__item input[type="checkbox"] { accent-color: var(--color-primary); }
    .manage-widgets__actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .btn-cancel { background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; cursor: pointer; color: var(--color-text-muted); }
    .btn-submit { background: var(--color-primary); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-submit:hover { background: var(--color-primary-dark); }
  `],
})
export class ManageWidgetsModalComponent {
  @Input() allWidgets: string[] = [];
  @Input() currentConfig: DashboardConfig = [];
  @Output() configChanged = new EventEmitter<DashboardConfig>();
  @Output() close = new EventEmitter<void>();

  widgetGroups = WIDGET_GROUPS;
  widgetLabels = WIDGET_LABELS;

  private localConfig = signal<DashboardConfig>([]);

  isVisible(id: string): boolean {
    const found = this.currentConfig.find(w => w.id === id);
    return found ? found.visible : true;
  }

  toggleWidget(id: string, visible: boolean): void {
    const config = structuredClone(this.currentConfig);
    const idx = config.findIndex(w => w.id === id);
    if (idx >= 0) {
      config[idx] = { ...config[idx], visible };
    } else {
      const maxY = config.reduce((acc, w) => Math.max(acc, w.y + (w.rows ?? 1)), 0);
      config.push({ id, x: 0, y: maxY, cols: 2, rows: 1, visible });
    }
    this.localConfig.set(config);
  }

  onSave(): void {
    const config = this.localConfig().length > 0 ? this.localConfig() : this.currentConfig;
    this.configChanged.emit(config);
  }
}