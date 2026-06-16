import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Composant, ComposantNode } from '../../shared/models/composant.model';
import { Page } from '../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class ComposantService {
  private readonly API = '/api/v1/composants';
  private http = inject(HttpClient);

  // With a vehiculeId, returns that vehicle's own composant tree; the
  // type-only form returns the per-type starter template.
  tree(type?: string, vehiculeId?: number): Observable<ComposantNode[]> {
    let httpParams = new HttpParams();
    if (vehiculeId != null) httpParams = httpParams.set('vehiculeId', String(vehiculeId));
    else if (type) httpParams = httpParams.set('type', type);
    return this.http.get<ComposantNode[]>(`${this.API}/tree`, { params: httpParams });
  }

  list(params?: { categorie?: string; page?: number; size?: number }): Observable<Page<Composant>> {
    let httpParams = new HttpParams();
    if (params?.categorie) httpParams = httpParams.set('categorie', params.categorie);
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    return this.http.get<Page<Composant>>(this.API, { params: httpParams });
  }

  get(id: number): Observable<Composant> {
    return this.http.get<Composant>(`${this.API}/${id}`);
  }

  create(form: Partial<Composant>): Observable<Composant> {
    return this.http.post<Composant>(this.API, form);
  }

  search(q: string, categorie?: string): Observable<Composant[]> {
    let httpParams = new HttpParams().set('q', q);
    if (categorie) httpParams = httpParams.set('categorie', categorie);
    return this.http.get<Composant[]>(`${this.API}/search`, { params: httpParams });
  }

  update(id: number, form: Partial<Composant>): Observable<Composant> {
    return this.http.put<Composant>(`${this.API}/${id}`, form);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  uploadPhoto(file: File): Observable<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; filename: string }>('/api/v1/files/composant-photos', formData);
  }

  downloadFiche(id: number): Observable<Blob> {
    return this.http.get(`${this.API}/${id}/fiche.pdf`, { responseType: 'blob' });
  }
}