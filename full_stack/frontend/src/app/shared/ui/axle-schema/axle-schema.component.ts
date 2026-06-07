import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pneu, PneuStatus } from '../../../shared/models/pneu.model';

// ─── Prototype-style axle layout constants ──────────────────────────────────
const TIRE_W = 64;
const TIRE_H = 96;
const PAIR_GAP = 4;       // gap between dual tires (tighter)
const CHASSIS_GAP = 4;    // gap between chassis edge and adjacent tire
const CENTER_X = 200;     // chassis horizontal center (shifted right)
const CHASSIS_W = 40;
const CHASSIS_LEFT = CENTER_X - CHASSIS_W / 2;   // 180
const CHASSIS_RIGHT = CENTER_X + CHASSIS_W / 2;  // 220
const AXLE_SPACING = 160; // vertical distance between axle centres
const CHASSIS_TOP_PAD = 20;
const FIRST_AXLE_Y = 110;
const BOTTOM_PAD = 40;
const VIEW_W = 460;       // viewBox width (includes label space)

// ─── Per-config axle definitions ────────────────────────────────────────────
interface AxleDef { label: string; left: 1 | 2; right: 1 | 2; }

const AXLE_CONFIGS: Record<string, AxleDef[]> = {
  '4x2': [
    { label: 'Essieu avant',  left: 1, right: 1 },
    { label: 'Essieu arrière', left: 2, right: 2 },
  ],
  '6x4': [
    { label: 'Essieu avant', left: 1, right: 1 },
    { label: 'Essieu 2',     left: 2, right: 2 },
    { label: 'Essieu 3',     left: 2, right: 2 },
  ],
  'plateau-2x2': [
    { label: 'Essieu 1', left: 1, right: 1 },
    { label: 'Essieu 2', left: 1, right: 1 },
  ],
  // Semi-remorque configurations:
  'semi-2-essieux': [
    { label: 'Essieu 1', left: 2, right: 2 },
    { label: 'Essieu 2', left: 2, right: 2 },
  ],
  'semi-3-essieux': [
    { label: 'Essieu 1', left: 2, right: 2 },
    { label: 'Essieu 2', left: 2, right: 2 },
    { label: 'Essieu 3', left: 2, right: 2 },
  ],
};

// ─── Derived tire-position layout ───────────────────────────────────────────
export interface TileInfo {
  position: number;   // P1, P2, ...
  x: number;
  y: number;
  pneu: Pneu | undefined;
}
interface AxleLayout {
  index: number;
  y: number;
  label: string;
  tiles: TileInfo[];
}

function buildLayout(config: string, tires: Pneu[]): AxleLayout[] {
  const defs = AXLE_CONFIGS[config] ?? AXLE_CONFIGS['4x2'];
  let posIdx = 0;
  return defs.map((def, i) => {
    const axleY = FIRST_AXLE_Y + i * AXLE_SPACING;
    const tiles: TileInfo[] = [];

    // Left outer (only for dual)
    if (def.left === 2) {
      posIdx++;
      tiles.push({ position: posIdx, x: CHASSIS_LEFT - CHASSIS_GAP - TIRE_W - PAIR_GAP - TIRE_W, y: axleY - TIRE_H / 2, pneu: tires.find(t => t.position === posIdx) });
    }
    // Left inner (always 1 tile on left)
    posIdx++;
    tiles.push({ position: posIdx, x: CHASSIS_LEFT - CHASSIS_GAP - TIRE_W, y: axleY - TIRE_H / 2, pneu: tires.find(t => t.position === posIdx) });

    // Right inner (always 1 tile on right)
    posIdx++;
    tiles.push({ position: posIdx, x: CHASSIS_RIGHT + CHASSIS_GAP, y: axleY - TIRE_H / 2, pneu: tires.find(t => t.position === posIdx) });

    // Right outer (only for dual)
    if (def.right === 2) {
      posIdx++;
      tiles.push({ position: posIdx, x: CHASSIS_RIGHT + CHASSIS_GAP + TIRE_W + PAIR_GAP, y: axleY - TIRE_H / 2, pneu: tires.find(t => t.position === posIdx) });
    }

    return { index: i, y: axleY, label: def.label, tiles };
  });
}

function totalPositionsForConfig(config: string): number {
  const defs = AXLE_CONFIGS[config] ?? AXLE_CONFIGS['4x2'];
  return defs.reduce((sum, d) => sum + d.left + d.right, 0);
}

@Component({
  selector: 'app-axle-schema',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="axle-schema">
      <svg [attr.viewBox]="'0 0 ' + VIEW_W + ' ' + svgHeight()"
           width="100%" [attr.height]="svgHeight()"
           class="axle-schema__svg">

        <!-- Chassis rect (vertical bar) -->
        <rect
          [attr.x]="CHASSIS_LEFT" [attr.y]="CHASSIS_TOP_PAD"
          [attr.width]="CHASSIS_W" [attr.height]="svgHeight() - CHASSIS_TOP_PAD * 2"
          rx="8" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1.5"/>

        <!-- Per-axle: line + tiles + label -->
        @for (axle of axleLayout(); track axle.index) {
          <!-- Axle line -->
          <line
            [attr.x1]="AXLE_LINE_X1"
            [attr.y1]="axle.y"
            [attr.x2]="AXLE_LINE_X2"
            [attr.y2]="axle.y"
            stroke="#D1D5DB" stroke-width="2"/>

          <!-- Axle label (right-aligned) -->
          <text
            [attr.x]="VIEW_W - 4"
            [attr.y]="axle.y + 4"
            text-anchor="end"
            font-family="Open Sans, sans-serif" font-size="10" fill="#9CA3AF">
            {{ axle.label }}
          </text>

          <!-- Tire tiles -->
          @for (tile of axle.tiles; track tile.position) {
            <g [attr.transform]="'translate(' + tile.x + ',' + tile.y + ')'"
               class="axle-schema__tile"
               (click)="onTileClick(tile.position)">

              <!-- Tile background -->
              <rect
                [attr.width]="TIRE_W" [attr.height]="TIRE_H" rx="8"
                [attr.fill]="tileColor(tile.pneu?.status)"
                [attr.stroke]="selectedPosition === tile.position ? '#F97316' : tileBorder(tile.pneu?.status)"
                [attr.stroke-width]="selectedPosition === tile.position ? 2.5 : 1.5"
                style="cursor:pointer"/>

              @if (!tile.pneu) {
                <!-- Empty: + symbol -->
                <text x="22" y="38" text-anchor="middle"
                      font-family="system-ui, sans-serif" font-size="24"
                      font-weight="300" fill="#9CA3AF">+</text>
              } @else {
                <!-- Position label -->
                <text x="22" y="26" text-anchor="middle"
                      font-family="Montserrat, sans-serif" font-size="12"
                      font-weight="700" fill="white">P{{ tile.position }}</text>

                <!-- km remaining -->
                @if (tile.pneu.kmRestant != null) {
                  <text x="22" y="44" text-anchor="middle"
                        font-family="JetBrains Mono, monospace" font-size="9"
                        fill="rgba(255,255,255,0.85)">
                    {{ formatKm(tile.pneu.kmRestant) }}
                  </text>
                }

                <!-- Warn badge -->
                @if (tile.pneu.status === 'warn') {
                  <circle cx="36" cy="10" r="8" fill="#EF4444" stroke="white" stroke-width="1.5"/>
                  <text x="36" y="14" text-anchor="middle"
                        font-family="Montserrat, sans-serif" font-size="9"
                        font-weight="700" fill="white">!</text>
                }
              }
            </g>
          }
        }
      </svg>
    </div>
  `,
  styles: [`
    .axle-schema { display: inline-block; }
    .axle-schema__svg { max-width: 100%; display: block; }
    .axle-schema__tile { cursor: pointer; transition: opacity 150ms; }
    .axle-schema__tile:hover { opacity: 0.82; }
  `],
})
export class AxleSchemaComponent implements OnChanges {
  @Input() set axleConfig(v: '4x2' | '6x4' | 'plateau-2x2' | 'semi-2-essieux' | 'semi-3-essieux') { this.config.set(v); }
  @Input() tires: Pneu[] = [];
  @Output() tireClick = new EventEmitter<number>();
  @Input() selectedPosition: number | null = null;

  // expose constants to template
  readonly VIEW_W = VIEW_W;
  readonly TIRE_W = TIRE_W;
  readonly TIRE_H = TIRE_H;
  readonly CHASSIS_LEFT = CHASSIS_LEFT;
  readonly CHASSIS_W = CHASSIS_W;
  readonly CHASSIS_TOP_PAD = CHASSIS_TOP_PAD;
  readonly AXLE_LINE_X1 = CHASSIS_LEFT - CHASSIS_GAP - TIRE_W - PAIR_GAP - TIRE_W - 4;
  readonly AXLE_LINE_X2 = CHASSIS_RIGHT + CHASSIS_GAP + TIRE_W + PAIR_GAP + TIRE_W + 4;

  config = signal<'4x2' | '6x4' | 'plateau-2x2' | 'semi-2-essieux' | 'semi-3-essieux'>('4x2');

  axleLayout = signal<AxleLayout[]>([]);

  svgHeight = computed(() => {
    const layout = this.axleLayout();
    if (!layout.length) return 200;
    const lastAxleY = layout[layout.length - 1].y;
    return lastAxleY + TIRE_H / 2 + BOTTOM_PAD;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['axleConfig'] || changes['tires']) {
      this.axleLayout.set(buildLayout(this.config(), this.tires));
    }
  }

  tileColor(status: PneuStatus | undefined): string {
    if (status === 'ok')   return '#1D4ED8'; // blue — healthy
    if (status === 'warn' || status === 'empty') return '#EF4444'; // red — alert/exhausted
    return '#F3F4F6'; // grey — empty slot (no tire mounted)
  }

  tileBorder(status: PneuStatus | undefined): string {
    if (status === 'ok')   return '#1E40AF';
    if (status === 'warn' || status === 'empty') return '#B91C1C';
    return '#D1D5DB';
  }

  formatKm(km: number): string {
    return km >= 1000 ? `${Math.round(km / 1000)}k` : `${km}`;
  }

  onTileClick(position: number): void {
    this.tireClick.emit(position);
  }

  /** Total positions for a given config (used externally by pneus-tab) */
  static totalPositions(config: string): number {
    return totalPositionsForConfig(config);
  }
}
