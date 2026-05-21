import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { SuiviVidange, VidangeStatut, VidangePlanningWeek } from '../../shared/models/vidange.model';
import { Page } from '../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class VidangeService {
  private readonly API = '/api/v1/vidanges';
  private http = inject(HttpClient);

  list(params?: { statut?: VidangeStatut; page?: number; size?: number }): Observable<Page<SuiviVidange>> {
    let httpParams = new HttpParams();
    if (params?.statut) httpParams = httpParams.set('statut', params.statut);
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    return this.http.get<Page<SuiviVidange>>(this.API, { params: httpParams });
  }

  listByVehicule(vehiculeId: number): Observable<SuiviVidange[]> {
    return this.http.get<SuiviVidange[]>(`/api/v1/vehicules/${vehiculeId}/vidanges`);
  }

  cloturer(id: number): Observable<SuiviVidange> {
    return this.http.patch<SuiviVidange>(`${this.API}/${id}/cloturer`, {});
  }

  planning(semaines: number = 4): Observable<VidangePlanningWeek[]> {
    const params = new HttpParams().set('semaines', semaines.toString());
    return this.http.get<VidangePlanningWeek[]>(`${this.API}/planning`, { params });
  }
}