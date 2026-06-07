import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

import { Vehicule, VehiculeDetail, NewVehiculeForm, VehiculeType, VehiculeStatut, Attelage } from '../../shared/models/vehicule.model';
import { Page } from '../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class VehiculeService {
  private readonly API = '/api/v1/vehicules';
  private readonly ATTELAGE_API = '/api/v1/attelages';
  private http = inject(HttpClient);
  private listCache = new Map<string, Observable<Page<Vehicule>>>();
  private detailCache = new Map<number, Observable<VehiculeDetail>>();

  list(params?: { type?: VehiculeType; statut?: VehiculeStatut; q?: string; page?: number; size?: number }, force = false): Observable<Page<Vehicule>> {
    const key = JSON.stringify(params ?? {});
    if (force) this.listCache.delete(key);
    if (!this.listCache.has(key)) {
      let httpParams = new HttpParams();
      if (params?.type) httpParams = httpParams.set('type', params.type);
      if (params?.statut) httpParams = httpParams.set('statut', params.statut);
      if (params?.q) httpParams = httpParams.set('q', params.q);
      if (params?.page !== undefined) httpParams = httpParams.set('page', String(params.page));
      if (params?.size !== undefined) httpParams = httpParams.set('size', String(params.size));
      if (force) httpParams = httpParams.set('_', Date.now().toString());
      this.listCache.set(key, this.http.get<Page<Vehicule>>(this.API, { params: httpParams }).pipe(
        tap({ error: () => this.listCache.delete(key) }),
        shareReplay({ bufferSize: 1, refCount: false }),
      ));
    }
    return this.listCache.get(key)!;
  }

  invalidate(): void {
    this.listCache.clear();
    this.detailCache.clear();
  }

  get(id: number, force = false): Observable<VehiculeDetail> {
    if (force) this.detailCache.delete(id);
    if (!this.detailCache.has(id)) {
      const httpParams = force ? new HttpParams().set('_', Date.now().toString()) : undefined;
      this.detailCache.set(id, this.http.get<VehiculeDetail>(`${this.API}/${id}`, httpParams ? { params: httpParams } : {}).pipe(
        tap({ error: () => this.detailCache.delete(id) }),
        shareReplay({ bufferSize: 1, refCount: false }),
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
    return this.http.put<Vehicule>(`${this.API}/${id}`, form).pipe(tap(() => this.invalidate()));
  }

  uploadPhoto(file: File): Observable<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; filename: string }>('/api/v1/files/vehicule-photos', formData);
  }

  softDelete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`).pipe(tap(() => this.invalidate()));
  }

  createAttelage(tracteurId: number, semiId: number, dateDebut: string): Observable<Attelage> {
    return this.http.post<Attelage>(this.ATTELAGE_API, { tracteurId, semiId, dateDebut }).pipe(
      tap(() => {
        this.invalidateDetail(tracteurId);
        this.invalidateDetail(semiId);
      })
    );
  }

  listAttelages(tracteurId: number): Observable<Attelage[]> {
    return this.http.get<Attelage[]>(this.ATTELAGE_API, {
      params: { tracteurId: String(tracteurId) }
    });
  }

  terminateAttelage(attelageId: number, dateFin: string, tracteurId: number, semiId: number): Observable<Attelage> {
    return this.http.patch<Attelage>(`${this.ATTELAGE_API}/${attelageId}/terminer`, { dateFin }).pipe(
      tap(() => {
        this.invalidateDetail(tracteurId);
        this.invalidateDetail(semiId);
      })
    );
  }

  deleteAttelage(attelageId: number, tracteurId: number, semiId: number): Observable<void> {
    return this.http.delete<void>(`${this.ATTELAGE_API}/${attelageId}`).pipe(
      tap(() => {
        this.invalidateDetail(tracteurId);
        this.invalidateDetail(semiId);
      })
    );
  }
}
