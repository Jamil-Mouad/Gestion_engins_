import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

import { Pneu, PneuInspection, InspectionForm, CreatePneuForm, RemonterPneuForm } from '../../shared/models/pneu.model';

@Injectable({ providedIn: 'root' })
export class PneuService {
  private readonly API = '/api/v1/pneus';
  private http = inject(HttpClient);
  private byVehiculeCache = new Map<number, Observable<Pneu[]>>();

  listByVehicule(vehiculeId: number): Observable<Pneu[]> {
    if (!this.byVehiculeCache.has(vehiculeId)) {
      this.byVehiculeCache.set(vehiculeId, this.http.get<Pneu[]>(`/api/v1/vehicules/${vehiculeId}/pneus`).pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
      ));
    }
    return this.byVehiculeCache.get(vehiculeId)!;
  }

  invalidateByVehicule(vehiculeId: number): void {
    this.byVehiculeCache.delete(vehiculeId);
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

  update(pneuId: number, body: {
    nSerie?: string | null;
    reference?: string | null;
    marque?: string | null;
    dateMontage?: string | null;
    expectedLifeKm?: number | null;
    pressionPsi?: number | null;
    profondeur32e?: number | null;
    photoUrl?: string | null;
  }): Observable<Pneu> {
    return this.http.patch<Pneu>(`${this.API}/${pneuId}`, body).pipe(
      tap(() => this.byVehiculeCache.clear())
    );
  }

  uploadPhoto(file: File): Observable<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; filename: string }>('/api/v1/files/pneu-photos', formData);
  }

  permuter(pneuId: number, nouvellePosition: number): Observable<void> {
    return this.http.patch<void>(`${this.API}/${pneuId}/permuter`, { nouvellePosition }).pipe(
      tap(() => this.byVehiculeCache.clear())
    );
  }

  remplacer(pneuId: number, body: {
    nSerie: string;
    reference: string;
    marque: string;
    dateMontage: string;
    expectedLifeKm: number;
    pressionPsi: number;
    profondeur32e: number;
    position: number;
  }): Observable<void> {
    return this.http.patch<void>(`${this.API}/${pneuId}/remplacer`, body).pipe(
      tap(() => this.byVehiculeCache.clear())
    );
  }

  downloadFiche(pneuId: number): Observable<Blob> {
    return this.http.get(`${this.API}/${pneuId}/fiche.pdf`, { responseType: 'blob' });
  }

  assign(vehiculeId: number, form: CreatePneuForm): Observable<Pneu> {
    return this.http.post<Pneu>(`/api/v1/vehicules/${vehiculeId}/pneus`, form).pipe(
      tap(() => this.invalidateByVehicule(vehiculeId)),
    );
  }

  delete(pneuId: number, vehiculeId: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${pneuId}`).pipe(
      tap(() => this.invalidateByVehicule(vehiculeId)),
    );
  }

  getActivityLog(pneuId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/${pneuId}/activity-log`);
  }

  listAvailable(): Observable<Pneu[]> {
    return this.http.get<Pneu[]>(`${this.API}/available`);
  }

  remonter(pneuId: number, vehiculeId: number, position: number): Observable<Pneu> {
    return this.http.patch<Pneu>(`${this.API}/${pneuId}/remonter`, { vehiculeId, position }).pipe(
      tap(() => this.byVehiculeCache.delete(vehiculeId)),
    );
  }
}