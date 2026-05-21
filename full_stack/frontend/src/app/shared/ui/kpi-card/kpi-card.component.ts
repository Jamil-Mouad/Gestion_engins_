import { Component, Input, HostBinding, signal } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [],
  template: `
    <span class="kpi-label">{{ label }}</span>
    <span class="kpi-value">{{ value }}</span>
    @if (variation) {
      <span class="kpi-variation" [style.color]="varColor">{{ variation }}</span>
    }
  `,
  styles: [`
    :host {
      flex: 1;
      min-width: 200px;
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
    .kpi-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .kpi-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 32px;
      font-weight: 700;
      color: var(--color-text);
      line-height: 1;
    }
    .kpi-variation {
      font-family: 'Open Sans', sans-serif;
      font-size: 11px;
      font-weight: 500;
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
