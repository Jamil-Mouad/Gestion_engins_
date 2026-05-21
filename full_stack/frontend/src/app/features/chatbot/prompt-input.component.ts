import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-prompt-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="prompt-input">
      <textarea class="prompt-input__textarea"
                 [(ngModel)]="text"
                 rows="2"
                 placeholder="Posez votre question…"
                 (keydown.enter)="onEnter($event)"
                 [disabled]="streaming"></textarea>
      <button class="prompt-input__btn" (click)="submit()" [disabled]="streaming || !text.trim()">
        Envoyer
      </button>
    </div>
  `,
  styles: [`
    .prompt-input { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--color-border); background: var(--color-surface); }
    .prompt-input__textarea { flex: 1; font-family: 'Open Sans', sans-serif; font-size: 14px; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); resize: none; background: var(--color-surface-1); color: var(--color-text); }
    .prompt-input__textarea:focus { outline: none; border-color: var(--color-primary); }
    .prompt-input__btn { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; padding: 8px 20px; border-radius: var(--radius-sm); border: none; background: var(--color-primary); color: #fff; cursor: pointer; transition: opacity 0.15s; }
    .prompt-input__btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class PromptInputComponent {
  @Input() streaming = false;
  @Output() sendMessage = new EventEmitter<string>();

  text = '';

onEnter(event: Event): void {
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    this.submit();
  }

  submit(): void {
    const trimmed = this.text.trim();
    if (!trimmed) return;
    this.sendMessage.emit(trimmed);
    this.text = '';
  }
}