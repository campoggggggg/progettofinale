import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ScenarioRequest, ScenarioResponse,
  TransazioneScenarioRequest, ProiezioneScenario
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ScenarioService {
  private http = inject(HttpClient);

  getScenari(): Observable<ScenarioResponse[]> {
    return this.http.get<ScenarioResponse[]>('/api/scenari');
  }

  getScenario(id: number): Observable<ScenarioResponse> {
    return this.http.get<ScenarioResponse>(`/api/scenari/${id}`);
  }

  creaScenario(req: ScenarioRequest): Observable<ScenarioResponse> {
    return this.http.post<ScenarioResponse>('/api/scenari', req);
  }

  aggiornaScenario(id: number, req: ScenarioRequest): Observable<ScenarioResponse> {
    return this.http.put<ScenarioResponse>(`/api/scenari/${id}`, req);
  }

  eliminaScenario(id: number): Observable<void> {
    return this.http.delete<void>(`/api/scenari/${id}`);
  }

  aggiungiTransazione(scenarioId: number, req: TransazioneScenarioRequest): Observable<void> {
    return this.http.post<void>(`/api/scenari/${scenarioId}/transazioni`, req);
  }

  rimuoviTransazione(scenarioId: number, transazioneId: number): Observable<void> {
    return this.http.delete<void>(`/api/scenari/${scenarioId}/transazioni/${transazioneId}`);
  }

  getProiezioni(scenarioId: number): Observable<ProiezioneScenario> {
    return this.http.get<ProiezioneScenario>(`/api/scenari/${scenarioId}/proiezioni`);
  }
}
