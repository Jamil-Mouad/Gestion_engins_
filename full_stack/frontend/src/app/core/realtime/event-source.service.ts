import { Injectable, OnDestroy, inject } from '@angular/core';
import { VehiculeService } from '../../features/vehicules/vehicule.service';

@Injectable({ providedIn: 'root' })
export class EventSourceService implements OnDestroy {
  private es: EventSource | null = null;
  private vehiculeService = inject(VehiculeService);

  connect(): void {
    if (this.es) return;
    const token = localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token');
    if (!token) return;
    this.es = new EventSource(`/api/v1/events/stream?token=${encodeURIComponent(token)}`);

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
