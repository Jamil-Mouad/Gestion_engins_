import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [],
  template: `<span class="badge badge--{{ variant }}">{{ label }}</span>`,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      border-radius: var(--radius-sm);
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.5;
    }
    .badge--success { background: #dcfce7; color: #166534; }
    .badge--warning { background: #fef3c7; color: #92400e; }
    .badge--danger { background: #fee2e2; color: #991b1b; }
    .badge--info { background: #dbeafe; color: #1e40af; }
    .badge--secondary { background: var(--color-surface-2); color: var(--color-text-muted); }
  `],
})
export class BadgeComponent {
  @Input() variant: 'success' | 'warning' | 'danger' | 'info' | 'secondary' = 'secondary';
  @Input() label = '';
}

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [BadgeComponent],
  template: `<app-badge [variant]="variant" [label]="label" />`,
})
export class StatusBadgeComponent {
  @Input() status!: string;
  @Input() label = '';

  get variant(): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'secondary'> = {
      'in-service': 'success',
      'workshop': 'warning',
      'maintenance': 'warning',
      'out-of-service': 'danger',
      'ouvert': 'info',
      'en_cours': 'warning',
      'cloture': 'success',
      'a_faire': 'warning',
      'fait': 'success',
      'depasse': 'danger',
      'ok': 'success',
      'warn': 'warning',
      'empty': 'danger',
    };
    return map[this.status] ?? 'secondary';
  }
}

// ─── SevBadgeComponent ─────────────────────────────────────────────────────────
@Component({
  selector: 'app-sev-badge',
  standalone: true,
  imports: [],
  template: `<span class="sev-badge sev-badge--{{ type }}">{{ label }}</span>`,
  styles: [`
    .sev-badge { display:inline-flex; padding:3px 10px; border-radius:9999px; font-family:'Open Sans',sans-serif; font-size:12px; font-weight:600; flex-shrink:0; }
    .sev-badge--warning    { background:#FEF3C7; color:#92400E; }
    .sev-badge--critical   { background:#FEE2E2; color:#991B1B; }
    .sev-badge--success    { background:#D1FAE5; color:#065F46; }
    .sev-badge--info       { background:#E0F2FE; color:#0369A1; }
    .sev-badge--preventive { background:#D1FAE5; color:#065F46; }
    .sev-badge--corrective { background:#FEF3C7; color:#92400E; }
    .sev-badge--depannage  { background:#FEE2E2; color:#991B1B; }
    .sev-badge--controle   { background:#E0F2FE; color:#0369A1; }
    .sev-badge--depasse    { background:#FEE2E2; color:#991B1B; }
    .sev-badge--proche     { background:#FEF3C7; color:#92400E; }
  `],
})
export class SevBadgeComponent {
  @Input() type: 'warning'|'critical'|'success'|'info'|'preventive'|'corrective'|'depannage'|'controle'|'depasse'|'proche' = 'info';

  get label(): string {
    const labels: Record<string, string> = {
      warning: 'Alerte', critical: 'Critique', success: 'OK', info: 'Info',
      preventive: 'Préventive', corrective: 'Corrective', depannage: 'Dépannage', controle: 'Contrôle',
      depasse: 'Dépassé', proche: 'Proche',
    };
    return labels[this.type] ?? this.type;
  }
}

// ─── RequestStatusBadgeComponent ──────────────────────────────────────────────
@Component({
  selector: 'app-request-status-badge',
  standalone: true,
  imports: [],
  template: `
    <span class="rsb rsb--{{ status }}">
      <span class="rsb-dot"></span>
      {{ label }}
    </span>
  `,
  styles: [`
    .rsb { display:inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:9999px; font-family:'Open Sans',sans-serif; font-size:12px; font-weight:600; flex-shrink:0; }
    .rsb-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
    .rsb--nouvelle   { background:#E0F2FE; color:#0369A1; } .rsb--nouvelle .rsb-dot   { background:#0369A1; }
    .rsb--approuvee  { background:#D1FAE5; color:#065F46; } .rsb--approuvee .rsb-dot  { background:#065F46; }
    .rsb--rejetee    { background:#FEE2E2; color:#991B1B; } .rsb--rejetee .rsb-dot    { background:#991B1B; }
    .rsb--cloturee   { background:#F3F4F6; color:#6B7280; } .rsb--cloturee .rsb-dot   { background:#6B7280; }
  `],
})
export class RequestStatusBadgeComponent {
  @Input() status: 'nouvelle'|'approuvee'|'rejetee'|'cloturee' = 'nouvelle';

  get label(): string {
    const map: Record<string, string> = {
      nouvelle: 'Nouvelle', approuvee: 'Approuvée', rejetee: 'Rejetée', cloturee: 'Clôturée',
    };
    return map[this.status] ?? this.status;
  }
}

// ─── UrgencyBadgeComponent ─────────────────────────────────────────────────────
@Component({
  selector: 'app-urgency-badge',
  standalone: true,
  imports: [],
  template: `<span class="ub ub--{{ level }}">{{ label }}</span>`,
  styles: [`
    .ub { display:inline-flex; padding:3px 10px; border-radius:9999px; font-family:'Open Sans',sans-serif; font-size:12px; font-weight:600; flex-shrink:0; }
    .ub--haute   { background:#FEE2E2; color:#991B1B; }
    .ub--moyenne { background:#FEF3C7; color:#92400E; }
    .ub--basse   { background:#D1FAE5; color:#065F46; }
  `],
})
export class UrgencyBadgeComponent {
  @Input() level: 'haute'|'moyenne'|'basse' = 'basse';

  get label(): string {
    const map: Record<string, string> = { haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' };
    return map[this.level] ?? this.level;
  }
}