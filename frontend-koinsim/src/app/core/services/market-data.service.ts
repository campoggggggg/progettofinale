import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MarketDataRequest, MarketDataResponse, SimboloDisponibile } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MarketDataService {
  private http = inject(HttpClient);

  fetch(req: MarketDataRequest): Observable<MarketDataResponse> {
    return this.http.post<MarketDataResponse>('/api/market-data/fetch', req);
  }

  getSimboli(): Observable<SimboloDisponibile[]> {
    return this.http.get<SimboloDisponibile[]>('/api/market-data/simboli');
  }
}
