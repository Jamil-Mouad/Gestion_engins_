import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Pneu, PneuInspection, InspectionForm } from '../../shared/models/pneu.model';

@Injectable({ providedIn: 'root' })
export class PneuService {
  private readonly API = '/api/v1/pneus';
  private http = inject(HttpClient);

  listByVehicule(vehiculeId: number): Observable<Pneu[]> {
    return this.http.get<Pneu[]>(`/api/v1/vehicules/${vehiculeId}/pneus`);
  }

  get(id: number): Observable<Pneu> {
    return this.http.get<Pneu>(`${this.API}/${id}`);
  }

  getInspections(id: number): Observable<PneuInspection[]> {
    return this.http.get<PneuInspection[]>(`${this.API}/${id}/inspections`);
  }

  createInspection(pneuId: number, form: InspectionForm): Observable<PneuInspection> {
    return this.http.post<PneuInspection>(`${this.API}/${pneuId}/inspections`, form);
  }
}