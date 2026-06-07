import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExcelExportService {
  private http = inject(HttpClient);

  download(params: {
    entites: string;
    vehiculeId?: number;
    vehiculeType?: string;
  }): Observable<Blob> {
    let httpParams = new HttpParams().set('entites', params.entites);
    if (params.vehiculeId != null) httpParams = httpParams.set('vehiculeId', String(params.vehiculeId));
    if (params.vehiculeType) httpParams = httpParams.set('vehiculeType', params.vehiculeType);
    return this.http.get('/api/v1/export/excel', { params: httpParams, responseType: 'blob' });
  }
}
