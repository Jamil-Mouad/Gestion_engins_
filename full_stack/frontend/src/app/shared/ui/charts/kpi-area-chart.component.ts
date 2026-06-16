import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-kpi-area-chart',
  standalone: true,
  imports: [],
  template: `
    <div class="area-chart-host" (mouseleave)="hover.set(null)">
      <svg
        width="100%"
        [attr.viewBox]="'0 0 ' + VW + ' ' + VH"
        preserveAspectRatio="none"
        style="display:block;overflow:visible"
        (mousemove)="onMove($event)">
        <defs>
          <linearGradient [id]="gradId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" [attr.stop-color]="chartColor" stop-opacity="0.25"/>
            <stop offset="100%" [attr.stop-color]="chartColor" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        <!-- Grid lines + Y labels -->
        @for (v of yTicks; track v) {
          <g>
            <line [attr.x1]="PL" [attr.y1]="ty(v)" [attr.x2]="VW - PR" [attr.y2]="ty(v)"
              stroke="#F5F5F5" stroke-width="1"/>
            <text [attr.x]="PL - 6" [attr.y]="ty(v) + 4"
              text-anchor="end" font-size="10" fill="#737373" font-family="'Open Sans', sans-serif">{{ v }}%</text>
          </g>
        }
        <!-- Objective dashed line -->
        <line [attr.x1]="PL" [attr.y1]="objY()" [attr.x2]="VW - PR" [attr.y2]="objY()"
          stroke="#D4D4D4" stroke-width="1.5" stroke-dasharray="5,4"/>
        <text [attr.x]="VW - PR + 6" [attr.y]="objY() + 4"
          font-size="10" fill="#737373" font-family="'Open Sans', sans-serif">{{ objective }}%</text>
        <!-- Area fill -->
        <path [attr.d]="areaPath()" [attr.fill]="'url(#' + gradId + ')'"/>
        <!-- Line -->
        <path [attr.d]="linePath()" fill="none" [attr.stroke]="chartColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Dots -->
        @for (item of dotData(); track item.i) {
          <circle
            [attr.cx]="item.x"
            [attr.cy]="item.y"
            [attr.r]="hover()?.i === item.i ? 5.5 : 3.5"
            [attr.fill]="chartColor"
            stroke="white"
            stroke-width="2"/>
        }
        <!-- X labels -->
        @for (m of months; track m; let i = $index) {
          <text [attr.x]="tx(i)" [attr.y]="VH - 4"
            text-anchor="middle" font-size="10" fill="#737373" font-family="'Open Sans', sans-serif">{{ m }}</text>
        }
        <!-- Hover crosshair -->
        @if (hover()) {
          <line
            [attr.x1]="hover()!.x" [attr.y1]="PT"
            [attr.x2]="hover()!.x" [attr.y2]="PT + cH"
            stroke="#D4D4D4" stroke-width="1" stroke-dasharray="3,3"/>
        }
        <!-- Invisible hover rect -->
        <rect [attr.x]="PL" [attr.y]="PT" [attr.width]="cW" [attr.height]="cH"
          fill="transparent"/>
      </svg>
      <!-- Tooltip -->
      @if (hover()) {
        <div class="area-tooltip"
          [style.left]="(hover()!.x / VW * 100) + '%'"
          [style.top]="(hover()!.y / VH * 100) + '%'">
          <strong>{{ months[hover()!.i] }}</strong> — {{ hover()!.v.toFixed(1) }} %
        </div>
      }
    </div>
  `,
  styles: [`
    .area-chart-host {
      position: relative;
      overflow: visible;
    }
    .area-tooltip {
      position: absolute;
      transform: translate(-50%, -110%);
      background: white;
      border: 1px solid #E8E8E8;
      border-radius: 8px;
      padding: 5px 10px;
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
export class KpiAreaChartComponent {
  @Input() data: number[] = [];
  @Input() objective = 90;
  @Input() color?: string;

  get chartColor(): string { return this.color ?? 'var(--color-primary)'; }

  readonly gradId = `ag-${Math.random().toString(36).slice(2, 8)}`;
  readonly VW = 760;
  readonly VH = 240;
  readonly PL = 44;
  readonly PR = 60;
  readonly PT = 16;
  readonly PB = 28;
  readonly cW = this.VW - this.PL - this.PR;
  readonly cH = this.VH - this.PT - this.PB;
  readonly min = 82;
  readonly max = 100;
  readonly yTicks = [84, 88, 92, 96, 100];
  readonly months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  hover = signal<{ i: number; x: number; y: number; v: number } | null>(null);

  tx(i: number): number {
    const len = this.data.length > 1 ? this.data.length - 1 : 1;
    return this.PL + (i / len) * this.cW;
  }

  ty(v: number): number {
    return this.PT + this.cH - ((v - this.min) / (this.max - this.min)) * this.cH;
  }

  objY(): number { return this.ty(this.objective); }

  linePath(): string {
    if (!this.data.length) return '';
    return this.data.map((v, i) => `${i === 0 ? 'M' : 'L'}${this.tx(i).toFixed(1)},${this.ty(v).toFixed(1)}`).join(' ');
  }

  areaPath(): string {
    if (!this.data.length) return '';
    const line = this.linePath();
    const last = this.data.length - 1;
    return `${line} L${this.tx(last).toFixed(1)},${(this.PT + this.cH).toFixed(1)} L${this.PL},${(this.PT + this.cH).toFixed(1)} Z`;
  }

  dotData(): { i: number; x: number; y: number }[] {
    return this.data.map((v, i) => ({ i, x: this.tx(i), y: this.ty(v) }));
  }

  onMove(e: MouseEvent): void {
    const svg = (e.currentTarget as SVGElement);
    const rect = svg.getBoundingClientRect();
    const relX = (e.clientX - rect.left) * (this.VW / rect.width);
    const ratio = Math.max(0, Math.min(1, (relX - this.PL) / this.cW));
    const i = Math.round(ratio * (this.data.length - 1));
    if (i >= 0 && i < this.data.length) {
      this.hover.set({ i, x: this.tx(i), y: this.ty(this.data[i]), v: this.data[i] });
    }
  }
}
