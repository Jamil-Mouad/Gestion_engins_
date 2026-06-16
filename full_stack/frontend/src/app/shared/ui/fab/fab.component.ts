import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-fab',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <button
      class="fab"
      [class.fab--hovered]="hovered()"
      (click)="clicked.emit()"
      (mouseenter)="hovered.set(true)"
      (mouseleave)="hovered.set(false)"
      type="button">
      <lucide-icon [name]="icon" [size]="22" class="fab-icon" />
      <span class="fab-label">{{ label }}</span>
    </button>
  `,
  styles: [`
    .fab {
      position: fixed;
      bottom: 32px;
      right: 32px;
      height: 56px;
      padding: 0 24px;
      background: var(--color-primary);
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.12);
      cursor: pointer;
      z-index: 20;
      transition: all 150ms ease-out;
      user-select: none;
      border: none;
      transform: scale(1);
    }
    .fab--hovered {
      background: var(--color-primary-dark, #E6851A);
      transform: scale(1.03);
    }
    .fab-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: white;
    }
    .fab-icon {
      color: white;
    }
  `],
})
export class FabComponent {
  @Input() label = '';
  @Input() icon = 'plus';
  @Output() clicked = new EventEmitter<void>();

  hovered = signal(false);
}
