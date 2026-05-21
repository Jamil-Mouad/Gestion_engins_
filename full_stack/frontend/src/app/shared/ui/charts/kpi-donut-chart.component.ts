import { Component, Input, signal } from '@angular/core';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface SliceWithPath extends DonutSlice {
  path: string;
}

@Component({
  selector: 'app-kpi-donut-chart',
  standalone: true,
  imports: [],
  template: `
    <div class="donut-host" (mouseleave)="hovIdx.set(null)">
      <svg [attr.width]="size" [attr.height]="size"
        [attr.viewBox]="'0 0 ' + size + ' ' + size"
        style="display:block">
        @for (s of slices(); track s.label; let i = $index) {
          <path
            [attr.d]="s.path"
            [attr.fill]="s.color"
            stroke="white"
            stroke-width="2"
            [style.opacity]="hovIdx() !== null && hovIdx() !== i ? 0.55 : 1"
            style="transition:opacity 150ms; cursor:pointer"
            (mouseenter)="hovIdx.set(i)"
            (mouseleave)="hovIdx.set(null)"/>
        }
        <!-- Center text -->
        <text
          [attr.x]="cx"
          [attr.y]="cy - 6"
          text-anchor="middle"
          [attr.font-size]="size * 0.13"
          font-weight="700"
          fill="#171717"
          font-family="'JetBrains Mono', monospace">
          {{ hovSlice()?.value ?? centerLabel }}
        </text>
        <text
          [attr.x]="cx"
          [attr.y]="cy + 10"
          text-anchor="middle"
          [attr.font-size]="size * 0.07"
          fill="#737373"
          font-family="'Open Sans', sans-serif">
          {{ hovSlice()?.label ?? centerSub }}
        </text>
      </svg>
      @if (hovSlice()) {
        <div class="donut-tooltip">
          <span [style.color]="hovSlice()!.color" style="font-weight:700">&#9632;</span>
          {{ hovSlice()!.label }} — {{ hovSlice()!.value }} ({{ hovPct() }}%)
        </div>
      }
    </div>
  `,
  styles: [`
    .donut-host {
      position: relative;
      display: inline-block;
    }
    .donut-tooltip {
      position: absolute;
      bottom: -28px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border: 1px solid #E8E8E8;
      border-radius: 8px;
      padding: 3px 10px;
      box-shadow: 0 12px 24px rgba(17,24,39,.10);
      font-family: 'Open Sans', sans-serif;
      font-size: 11px;
      color: #171717;
      white-space: nowrap;
      pointer-events: none;
      z-index: 5;
    }
  `],
})
export class KpiDonutChartComponent {
  @Input() data: DonutSlice[] = [];
  @Input() centerLabel = '';
  @Input() centerSub = '';
  @Input() size = 160;

  hovIdx = signal<number | null>(null);

  get cx(): number { return this.size / 2; }
  get cy(): number { return this.size / 2; }
  get R(): number { return this.size * 0.42; }
  get ri(): number { return this.size * 0.28; }

  slices(): SliceWithPath[] {
    const total = this.data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return [];
    let a = -Math.PI / 2;
    return this.data.map(d => {
      const angle = (d.value / total) * 2 * Math.PI;
      const ea = a + angle;
      const x1 = this.cx + this.R * Math.cos(a);
      const y1 = this.cy + this.R * Math.sin(a);
      const x2 = this.cx + this.R * Math.cos(ea);
      const y2 = this.cy + this.R * Math.sin(ea);
      const xi1 = this.cx + this.ri * Math.cos(ea);
      const yi1 = this.cy + this.ri * Math.sin(ea);
      const xi2 = this.cx + this.ri * Math.cos(a);
      const yi2 = this.cy + this.ri * Math.sin(a);
      const la = angle > Math.PI ? 1 : 0;
      const path = `M${x1.toFixed(2)},${y1.toFixed(2)} A${this.R},${this.R} 0 ${la} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi1.toFixed(2)},${yi1.toFixed(2)} A${this.ri},${this.ri} 0 ${la} 0 ${xi2.toFixed(2)},${yi2.toFixed(2)} Z`;
      a = ea;
      return { ...d, path };
    });
  }

  hovSlice(): SliceWithPath | null {
    const idx = this.hovIdx();
    return idx !== null ? this.slices()[idx] ?? null : null;
  }

  hovPct(): string {
    const s = this.hovSlice();
    if (!s) return '0';
    const total = this.data.reduce((acc, d) => acc + d.value, 0);
    return total > 0 ? ((s.value / total) * 100).toFixed(0) : '0';
  }
}
