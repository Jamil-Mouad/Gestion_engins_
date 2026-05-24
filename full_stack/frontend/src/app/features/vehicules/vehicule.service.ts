import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

import { Vehicule, VehiculeDetail, NewVehiculeForm, VehiculeType, VehiculeStatut } from '../../shared/models/vehicule.model';
import { Page } from '../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class VehiculeService {
  private readonly API = '/api/v1/vehicules';
  private http = inject(HttpClient);
  private listCache = new Map<string, Observable<Page<Vehicule>>>();
  private detailCache = new Map<number, Observable<VehiculeDetail>>();

  list(params?: { type?: VehiculeType; statut?: VehiculeStatut; q?: string; page?: number; size?: number }): Observable<Page<Vehicule>> {
    const key = JSON.stringify(params ?? {});
    if (!this.listCache.has(key)) {
      let httpParams = new HttpParams();
      if (params?.type) httpParams = httpParams.set('type', params.type);
      if (params?.statut) httpParams = httpParams.set('statut', params.statut);
      if (params?.q) httpParams = httpParams.set('q', params.q);
      if (params?.page !== undefined) httpParams = httpParams.set('page', String(params.page));
      if (params?.size !== undefined) httpParams = httpParams.set('size', String(params.size));
      this.listCache.set(key, this.http.get<Page<Vehicule>>(this.API, { params: httpParams }).pipe(
        shareReplay({ bufferSize: 1, refCount: true, windowTime: 60_000 }),
      ));
    }
    return this.listCache.get(key)!;
  }

  invalidate(): void {
    this.listCache.clear();
    this.detailCache.clear();
  }

  get(id: number): Observable<VehiculeDetail> {
    if (!this.detailCache.has(id)) {
      this.detailCache.set(id, this.http.get<VehiculeDetail>(`${this.API}/${id}`).pipe(
        shareReplay({ bufferSize: 1, refCount: true, windowTime: 60_000 }),
      ));
    }
    return this.detailCache.get(id)!;
  }

  invalidateDetail(id: number): void {
    this.detailCache.delete(id);
  }

  create(form: NewVehiculeForm): Observable<Vehicule> {
    return this.http.post<Vehicule>(this.API, form).pipe(tap(() => this.invalidate()));
  }

  update(id: number, form: Partial<NewVehiculeForm>): Observable<Vehicule> {
    return this.http.patch<Vehicule>(`${this.API}/${id}`, form).pipe(tap(() => this.invalidate()));
  }

  softDelete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`).pipe(tap(() => this.invalidate()));
  }
}
