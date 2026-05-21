import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    @if (loading) {
      <app-skeleton [rows]="3" height="40px" />
    } @else {
      <ng-content />
    }
  `,
})
export class LoadingOverlayComponent {
  @Input() loading = false;
}