import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pneu, PneuStatus } from '../../../shared/models/pneu.model';

interface TirePosition {
  position: number;
  offset: number;
  pneu: Pneu | undefined;
}

interface Axle {
  index: number;
  x: number;
  y: number;
  tires: TirePosition[];
}

@Component({
  selector: 'app-axle-schema',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="axle-schema">
      <svg [attr.viewBox]="'0 0 ' + svgWidth() + ' ' + svgHeight()" class="axle-schema__svg"
           [attr.width]="svgWidth()" [attr.height]="svgHeight()">
        <rect x="20" y="10" width="40" height="60"
              rx="8" fill="var(--color-surface-2)" stroke="var(--color-border)" stroke-width="1.5"/>
        @for (axle of axles(); track axle.index) {
          <g [attr.transform]="'translate(' + axle.x + ', 0)'">
            <line [attr.x1]="0" [attr.y1]="80" [attr.x2]="0" [attr.y2]="100"
                  stroke="var(--color-border)" stroke-width="2"/>
            @for (tire of axle.tires; track tire.position) {
              <g [attr.transform]="'translate(' + tire.offset + ', ' + axle.y + ')'"
                 (click)="onTireClick(tire.pneu)"
                 class="axle-schema__tire">
                <circle cx="0" cy="0" r="16"
                        [attr.fill]="tireColor(tire.pneu?.status)"
                        stroke="var(--color-border)" stroke-width="1.5"
                        style="cursor:pointer"/>
                <text x="0" y="4" text-anchor="middle"
                      font-family="Montserrat, sans-serif" font-size="10"
                      font-weight="600" fill="white">
                  {{ tire.pneu?.position ?? tire.position }}
                </text>
              </g>
            }
          </g>
        }
      </svg>
    </div>
  `,
  styles: [`
    .axle-schema { display: inline-block; }
    .axle-schema__svg { max-width: 100%; }
    .axle-schema__tire { cursor: pointer; transition: opacity 150ms; }
    .axle-schema__tire:hover { opacity: 0.8; }
  `],
})
export class AxleSchemaComponent implements OnChanges {
  config = signal<'4x2' | '6x4' | 'plateau-2x2'>('4x2');
  @Input() set axleConfig(v: '4x2' | '6x4' | 'plateau-2x2') { this.config.set(v); }
  @Input() tires: Pneu[] = [];
  @Output() tireClick = new EventEmitter<Pneu>();

  svgWidth = signal(240);
  svgHeight = signal(130);

  axles = signal<Axle[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['axleConfig'] && !changes['tires']) return;
    const config = this.config();
    this.svgWidth.set(config === '6x4' ? 300 : 240);
    const positionsPerAxle: Record<string, number[][]> = {
      '4x2': [[1, 2], [3, 4, 5, 6]],
      '6x4': [[1, 2], [3, 4, 5, 6], [7, 8, 9, 10]],
      'plateau-2x2': [[1, 2], [3, 4]],
    };
    const axleX = config === '6x4' ? [60, 140, 220] : [60, 140];
    const tirePositions = positionsPerAxle[config] ?? positionsPerAxle['4x2'];
    this.axles.set(tirePositions.map((positions, i) => ({
      index: i,
      x: axleX[i] ?? 60,
      y: 80,
      tires: positions.map((pos, j) => {
        const offsets = positions.length === 2 ? [-20, 20] : [-30, -10, 10, 30];
        return {
          position: pos,
          offset: offsets[j] ?? 0,
          pneu: this.tires.find(t => t.position === pos),
        };
      }),
    })));
  }

  tireColor(status: PneuStatus | undefined): string {
    switch (status) {
      case 'ok': return 'var(--color-success)';
      case 'warn': return 'var(--color-warning)';
      case 'empty': return 'var(--color-danger)';
      default: return 'var(--color-n200)';
    }
  }

  onTireClick(pneu: Pneu | undefined): void {
    if (pneu) this.tireClick.emit(pneu);
  }
}