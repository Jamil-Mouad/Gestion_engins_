import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Vehicule, VehiculeDetail, NewVehiculeForm, VehiculeType, VehiculeStatut } from '../../shared/models/vehicule.model';
import { Page } from '../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class VehiculeService {
  private readonly API = '/api/v1/vehicules';
  private http = inject(HttpClient);

  list(params?: { type?: VehiculeType; statut?: VehiculeStatut }): Observable<Page<Vehicule>> {
    let httpParams = new HttpParams();
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.statut) httpParams = httpParams.set('statut', params.statut);
    return this.http.get<Page<Vehicule>>(this.API, { params: httpParams });
  }

  get(id: number): Observable<VehiculeDetail> {
    return this.http.get<VehiculeDetail>(`${this.API}/${id}`);
  }

  create(form: NewVehiculeForm): Observable<Vehicule> {
    return this.http.post<Vehicule>(this.API, form);
  }

  update(id: number, form: Partial<NewVehiculeForm>): Observable<Vehicule> {
    return this.http.patch<Vehicule>(`${this.API}/${id}`, form);
  }

  softDelete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}