import { Component, input, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <lucide-icon name="refresh-cw" [size]="px()" class="spin-icon" />
  `,
  styles: [`
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    :host { display: inline-flex; align-items: center; justify-content: center; }
    .spin-icon { animation: spin 0.85s linear infinite; color: var(--color-primary, #F97316); }
  `],
})
export class SpinnerComponent {
  size = input<'sm' | 'md' | 'lg'>('md');
  px = computed(() => this.size() === 'sm' ? 20 : this.size() === 'lg' ? 48 : 32);
}
