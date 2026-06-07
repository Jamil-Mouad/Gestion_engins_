import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

import { Intervention, InterventionStatut, InterventionCategorie, TypeIntervention, NewInterventionForm } from '../../shared/models/intervention.model';
import { Page } from '../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class InterventionService {
  private readonly API = '/api/v1/interventions';
  private http = inject(HttpClient);
  private listCache = new Map<string, Observable<Page<Intervention>>>();

  list(params?: { categorie?: InterventionCategorie; vehiculeId?: number; statut?: string; q?: string; page?: number; size?: number }, force = false): Observable<Page<Intervention>> {
    const key = JSON.stringify(params ?? {});
    if (force) this.listCache.delete(key);
    if (!this.listCache.has(key)) {
      let httpParams = new HttpParams();
      if (params?.categorie) httpParams = httpParams.set('categorie', params.categorie);
      if (params?.vehiculeId) httpParams = httpParams.set('vehicule_id', String(params.vehiculeId));
      if (params?.statut) httpParams = httpParams.set('statut', params.statut);
      if (params?.q) httpParams = httpParams.set('q', params.q);
      if (params?.page !== undefined) httpParams = httpParams.set('page', String(params.page));
      if (params?.size !== undefined) httpParams = httpParams.set('size', String(params.size));
      if (force) httpParams = httpParams.set('_', Date.now().toString());
      this.listCache.set(key, this.http.get<Page<Intervention>>(this.API, { params: httpParams }).pipe(
        tap({ error: () => this.listCache.delete(key) }),
        shareReplay({ bufferSize: 1, refCount: false }),
      ));
    }
    return this.listCache.get(key)!;
  }

  invalidate(): void {
    this.listCache.clear();
  }

  get(id: number): Observable<Intervention> {
    return this.http.get<Intervention>(`${this.API}/${id}`);
  }

  create(form: NewInterventionForm): Observable<Intervention> {
    return this.http.post<Intervention>(this.API, form).pipe(tap(() => this.invalidate()));
  }

  cloturer(id: number): Observable<Intervention> {
    return this.http.patch<Intervention>(`${this.API}/${id}/cloturer`, {}).pipe(tap(() => this.invalidate()));
  }

  getTypes(): Observable<TypeIntervention[]> {
    return this.http.get<TypeIntervention[]>(`${this.API}/types`);
  }

  uploadPhoto(file: File): Observable<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; filename: string }>('/api/v1/files/intervention-photos', formData);
  }
}
