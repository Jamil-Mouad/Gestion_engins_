import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly API = '/api/v1/export';
  private http = inject(HttpClient);

  exportVehicules(params?: { vehiculeIds?: number[]; dateFrom?: string; dateTo?: string }): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params?.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    if (params?.vehiculeIds) httpParams = httpParams.set('vehiculeIds', params.vehiculeIds.join(','));
    return this.http.get(`${this.API}/vehicules`, { params: httpParams, responseType: 'blob' });
  }

  exportInterventions(params?: { dateFrom?: string; dateTo?: string }): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params?.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    return this.http.get(`${this.API}/interventions`, { params: httpParams, responseType: 'blob' });
  }
}