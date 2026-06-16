import { Component, Input, HostBinding, signal } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [],
  template: `
    <span class="kpi-label">{{ label }}</span>
    <div class="kpi-data">
      <span class="kpi-value">{{ value }}</span>
      @if (variation) {
        <span class="kpi-sep">·</span>
        <span class="kpi-variation" [style.color]="varColor">{{ variation }}</span>
      }
    </div>
  `,
  styles: [`
    :host {
      flex: 1;
      min-width: 180px;
      container-type: inline-size;
      background: var(--color-surface);
      border-radius: 12px;
      padding: 20px 24px;
      border: 1px solid var(--color-border);
      border-left: var(--kpi-left-border, 1px solid var(--color-border));
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform 200ms ease-out, box-shadow 200ms ease-out;
      cursor: default;
    }
    :host(.hovered) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    /* default (non-compact): value and variation stay stacked, like before */
    .kpi-data {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }
    .kpi-sep { display: none; }
    .kpi-label {
      font-family: 'Montserrat', sans-serif;
      font-size: clamp(9px, 5cqi, 10px);
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .kpi-value {
      font-family: 'JetBrains Mono', monospace;
      /* scale with the card width so values never overflow narrow columns:
         low floor lets long values (e.g. "141 000 L") shrink to fit a single
         grid column, while the cap keeps wide cards prominent */
      font-size: clamp(13px, 11cqi, 30px);
      font-weight: 700;
      color: var(--color-text);
      line-height: 1.05;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .kpi-variation {
      font-family: 'Open Sans', sans-serif;
      font-size: 11px;
      font-weight: 500;
    }

    /* compact: bold label heading + single compact data line underneath
       (fixes the oversized value in narrow magasin KPI cells) */
    :host(.compact) { gap: 6px; }
    :host(.compact) .kpi-label {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: 0.02em;
    }
    :host(.compact) .kpi-data {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 4px 6px;
    }
    :host(.compact) .kpi-sep {
      display: inline;
      color: var(--color-text-muted);
      font-size: 13px;
    }
    :host(.compact) .kpi-value {
      font-size: 14px;
      line-height: 1.2;
      white-space: normal;
      overflow: visible;
    }
    :host(.compact) .kpi-variation {
      font-size: 13px;
      color: var(--color-text-muted) !important;
    }
  `],
  host: {
    '(mouseenter)': 'onEnter()',
    '(mouseleave)': 'onLeave()',
  },
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() variation?: string;
  @Input() varType: 'positive' | 'negative' | 'neutral' | 'warning' = 'neutral';

  /** Compact layout: bold label heading + value/variation on one line underneath. */
  @Input() @HostBinding('class.compact') compact = false;

  private _accent = false;
  @Input() set accent(v: boolean) {
    this._accent = v;
  }
  get accent(): boolean { return this._accent; }

  private _hovered = signal(false);

  @HostBinding('style.--kpi-left-border')
  get leftBorder(): string {
    return this._accent ? '4px solid var(--color-primary)' : '1px solid var(--color-border)';
  }

  get varColor(): string {
    const map: Record<string, string> = {
      positive: '#10B981',
      negative: '#EF4444',
      warning: '#F59E0B',
      neutral: 'var(--color-text-muted)',
    };
    return map[this.varType] ?? map['neutral'];
  }

  private updateAccent(): void {
    // trigger host binding refresh — done automatically by Angular
  }

  onEnter(): void { this._hovered.set(true); }
  onLeave(): void { this._hovered.set(false); }

  @HostBinding('class.hovered')
  get isHovered(): boolean { return this._hovered(); }
}
