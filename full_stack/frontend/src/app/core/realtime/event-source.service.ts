import { Injectable, OnDestroy, inject } from '@angular/core';
import { VehiculeService } from '../../features/vehicules/vehicule.service';

@Injectable({ providedIn: 'root' })
export class EventSourceService implements OnDestroy {
  private es: EventSource | null = null;
  private vehiculeService = inject(VehiculeService);

  connect(): void {
    if (this.es) return;
    this.es = new EventSource('/api/v1/events/stream');

    this.es.addEventListener('vehicule.changed', () => {
      this.vehiculeService.invalidate();
    });

    this.es.onerror = () => {
      // Browser auto-reconnects; log silently
    };
  }

  ngOnDestroy(): void {
    this.es?.close();
    this.es = null;
  }
}
