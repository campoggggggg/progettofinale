import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RiepilogoPortafoglio, Transazione, TransazioneRequest } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private http = inject(HttpClient);

  getPortafoglio(): Observable<RiepilogoPortafoglio> {
    return this.http.get<RiepilogoPortafoglio>('/api/portafoglio');
  }

  getTransazioni(): Observable<Transazione[]> {
    return this.http.get<Transazione[]>('/api/transazioni');
  }

  addTransazione(req: TransazioneRequest): Observable<void> {
    return this.http.post<void>('/api/transazioni', req);
  }

  deleteTransazione(id: number): Observable<void> {
    return this.http.delete<void>(`/api/transazioni/${id}`);
  }

  svuotaCache(): Observable<void> {
    return this.http.post<void>('/api/cache/svuota', {});
  }
}
