import { Component, Input } from '@angular/core';

export interface BarChartItem {
  label: string;
  value: number;
  display: string;
}

@Component({
  selector: 'app-kpi-bar-chart',
  standalone: true,
  imports: [],
  template: `
    <div class="bar-chart">
      @for (item of data; track item.label; let i = $index) {
        <div class="bar-row" [attr.title]="item.label + ': ' + item.display">
          <span class="bar-label">{{ item.label }}</span>
          <div class="bar-track">
            <div
              class="bar-fill"
              [style.width]="barWidth(i)"
              [style.--bar-color]="barColor(i)">
            </div>
          </div>
          <span class="bar-value">{{ item.display }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bar-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: #404040;
      width: 68px;
      text-align: right;
      flex-shrink: 0;
    }
    .bar-track {
      flex: 1;
      height: 32px;
      background: #F9FAFB;
      border: 1px solid #E8E8E8;
      border-radius: 8px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 8px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.35);
      animation: barFill 700ms cubic-bezier(0.22,1,0.36,1) both, liquidShine 2.6s ease-in-out infinite;
      background:
        linear-gradient(90deg, var(--bar-color, #F7941D), color-mix(in srgb, var(--bar-color, #F7941D) 80%, transparent)),
        linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%);
      background-size: 100% 100%, 200% 100%;
      background-blend-mode: normal, overlay;
    }
    .bar-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #404040;
      width: 110px;
      text-align: right;
      flex-shrink: 0;
    }
  `],
})
export class KpiBarChartComponent {
  @Input() data: BarChartItem[] = [];

  private readonly colors = [
    'var(--color-primary)',
    '#F59E0B',
    '#0EA5E9',
    '#10B981',
    '#A855F7',
  ];

  get maxValue(): number {
    return this.data.length ? Math.max(...this.data.map(d => d.value)) : 1;
  }

  barWidth(i: number): string {
    const max = this.maxValue;
    if (max === 0) return '0%';
    return `${(this.data[i].value / max) * 100}%`;
  }

  barColor(i: number): string {
    return this.colors[i % this.colors.length];
  }
}
