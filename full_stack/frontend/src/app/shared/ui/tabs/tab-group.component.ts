import {
  Component, Input, Output, EventEmitter, signal,
  ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { TabComponent } from './tab.component';

@Component({
  selector: 'app-tab-group',
  standalone: true,
  imports: [TabComponent],
  template: `
    <div class="tab-group" #container>
      <!-- Liquid-glass hover pill -->
      <div class="hover-pill" #hoverPill></div>
      @for (tab of tabs; track tab.label; let i = $index) {
        <app-tab
          [label]="tab.label"
          [badge]="tab.badge"
          [active]="i === activeIndex"
          (clicked)="onTabClick(i)"
          (mouseenter)="onTabEnter($event, i)"
          (mouseleave)="onTabLeave()"
        />
      }
    </div>
  `,
  styles: [`
    .tab-group {
      display: flex;
      flex-direction: row;
      border-bottom: 1px solid var(--color-border);
      position: relative;
      overflow-x: auto;
      scrollbar-width: none;
      isolation: isolate;
    }
    .tab-group::-webkit-scrollbar { display: none; }
    .hover-pill {
      position: absolute;
      top: 4px;
      height: calc(100% - 12px);
      background: #EBEBEB;
      border: 1px solid #E0E0E0;
      border-radius: 8px;
      pointer-events: none;
      opacity: 0;
      transition:
        left 320ms cubic-bezier(0.34, 1.2, 0.64, 1),
        width 320ms cubic-bezier(0.34, 1.2, 0.64, 1),
        opacity 180ms ease;
      z-index: -1;
    }
  `],
  host: {
    style: 'display:block;',
  },
})
export class TabGroupComponent implements AfterViewInit {
  @Input() tabs: { label: string; badge?: number }[] = [];
  @Input() activeIndex = 0;
  @Output() tabChange = new EventEmitter<number>();

  @ViewChild('hoverPill') hoverPillRef!: ElementRef<HTMLDivElement>;
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  private _viewReady = signal(false);

  ngAfterViewInit(): void {
    this._viewReady.set(true);
  }

  onTabClick(index: number): void {
    this.tabChange.emit(index);
  }

  onTabEnter(event: MouseEvent, _index: number): void {
    if (!this._viewReady()) return;
    const pill = this.hoverPillRef?.nativeElement;
    const container = this.containerRef?.nativeElement;
    const target = event.currentTarget as HTMLElement;
    if (!pill || !container || !target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    pill.style.left = `${targetRect.left - containerRect.left}px`;
    pill.style.width = `${targetRect.width}px`;
    pill.style.opacity = '1';
  }

  onTabLeave(): void {
    const pill = this.hoverPillRef?.nativeElement;
    if (pill) {
      pill.style.opacity = '0';
    }
  }
}
