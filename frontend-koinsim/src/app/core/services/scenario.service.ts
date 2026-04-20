import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ScenarioRequest,
  ScenarioResponse,
  TransazioneRequest,
  ProiezioneScenario,
  ProiezioneMonteCarlo,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ScenarioService {
  private http = inject(HttpClient);
  private readonly BASE = '/api/scenari';

  lista(): Observable<ScenarioResponse[]> {
    return this.http.get<ScenarioResponse[]>(this.BASE);
  }

  dettaglio(id: number): Observable<ScenarioResponse> {
    return this.http.get<ScenarioResponse>(`${this.BASE}/${id}`);
  }

  crea(req: ScenarioRequest): Observable<ScenarioResponse> {
    return this.http.post<ScenarioResponse>(this.BASE, req);
  }

  aggiorna(id: number, req: ScenarioRequest): Observable<ScenarioResponse> {
    return this.http.put<ScenarioResponse>(`${this.BASE}/${id}`, req);
  }

  elimina(id: number): Observable<void> {
    // 204 No Content: responseType 'text' evita errori di parsing JSON su body vuoto
    return this.http
      .delete(`${this.BASE}/${id}`, { responseType: 'text' as const })
      .pipe(map(() => void 0));
  }

  aggiungiTransazione(id: number, req: TransazioneRequest): Observable<void> {
    // 201 Created con body vuoto: responseType 'text' evita errori di parsing JSON
    return this.http
      .post(`${this.BASE}/${id}/transazioni`, req, { responseType: 'text' as const })
      .pipe(map(() => void 0));
  }

  rimuoviTransazione(id: number, transazioneId: number): Observable<void> {
    // 204 No Content: responseType 'text' evita errori di parsing JSON su body vuoto
    return this.http
      .delete(`${this.BASE}/${id}/transazioni/${transazioneId}`, {
        responseType: 'text' as const,
      })
      .pipe(map(() => void 0));
  }

  proiezioni(id: number): Observable<ProiezioneScenario> {
    return this.http.get<ProiezioneScenario>(`${this.BASE}/${id}/proiezioni`);
  }

  montecarlo(id: number): Observable<ProiezioneMonteCarlo> {
    return this.http.get<ProiezioneMonteCarlo>(
      `${this.BASE}/${id}/montecarlo`
    );
  }
}
