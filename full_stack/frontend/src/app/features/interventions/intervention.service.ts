import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Intervention, InterventionStatut, InterventionCategorie, TypeIntervention, NewInterventionForm } from '../../shared/models/intervention.model';
import { Page } from '../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class InterventionService {
  private readonly API = '/api/v1/interventions';
  private http = inject(HttpClient);

  list(params?: { categorie?: InterventionCategorie; vehiculeId?: number; statut?: string; page?: number; size?: number }): Observable<Page<Intervention>> {
    let httpParams = new HttpParams();
    if (params?.categorie) httpParams = httpParams.set('categorie', params.categorie);
    if (params?.vehiculeId) httpParams = httpParams.set('vehicule_id', String(params.vehiculeId));
    if (params?.statut) httpParams = httpParams.set('statut', params.statut);
    if (params?.page !== undefined) httpParams = httpParams.set('page', String(params.page));
    if (params?.size !== undefined) httpParams = httpParams.set('size', String(params.size));
    return this.http.get<Page<Intervention>>(this.API, { params: httpParams });
  }

  get(id: number): Observable<Intervention> {
    return this.http.get<Intervention>(`${this.API}/${id}`);
  }

  create(form: NewInterventionForm): Observable<Intervention> {
    return this.http.post<Intervention>(this.API, form);
  }

  cloturer(id: number): Observable<Intervention> {
    return this.http.patch<Intervention>(`${this.API}/${id}/cloturer`, {});
  }

  getTypes(): Observable<TypeIntervention[]> {
    return this.http.get<TypeIntervention[]>(`${this.API}/types`);
  }
}