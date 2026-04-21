// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  nomeUtente: string;
  password: string;
  email?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

// ─── Asset ───────────────────────────────────────────────────────────────────

export type TipoAsset = 'STOCK' | 'CRYPTO';

// ─── Transazione ─────────────────────────────────────────────────────────────

/** Inviata al backend per creare una transazione */
export interface TransazioneCreateRequest {
  simbolo: string;
  tipoAsset: TipoAsset;
  percentuale: number; // % del budget iniziale
}

/** Ricevuta dal backend nell'elenco dello scenario */
export interface TransazioneRequest {
  id?: number;
  simbolo: string;
  tipoAsset: TipoAsset;
  quantita: number;
  prezzoDiAcquisto: number;
  dataAcquisto: string; // ISO date "YYYY-MM-DD"
}

// ─── Scenario ────────────────────────────────────────────────────────────────

export interface ScenarioRequest {
  nome: string;
  descrizione: string;
  budgetIniziale: number;
}

export interface ScenarioResponse {
  id: number;
  nome: string;
  descrizione: string;
  budgetIniziale: number;
  budgetRimanente: number;
  dataCreazione: string;
  transazioni: TransazioneRequest[];
}

// ─── Proiezioni ──────────────────────────────────────────────────────────────

export interface PuntoProiezione {
  data: string;
  valorePortafoglio: number;
  pnl: number;
  pnlPerc: number;
  stimato: boolean;
}

export interface ProiezioneScenario {
  dataInizioSimulazione: string;
  costoTotale: number;
  odierno: PuntoProiezione;
  seiMesi: PuntoProiezione;
  unAnno: PuntoProiezione;
  cinqueAnni: PuntoProiezione;
}

// ─── Monte Carlo ─────────────────────────────────────────────────────────────

export interface RisultatoMonteCarlo {
  orizzonteGiorni: number;
  etichettaOrizzonte: string;
  percentile10: number;
  percentile50: number;
  percentile90: number;
  valoreCorrente: number;
  pnlMediano: number;
  pnlMedianoPerc: number;
}

export interface ProiezioneMonteCarlo {
  scenarioId: number;
  dataSimulazione: string;
  costoTotale: number;
  nSimulazioni: number;
  seiMesi: RisultatoMonteCarlo;
  unAnno: RisultatoMonteCarlo;
  cinqueAnni: RisultatoMonteCarlo;
}

// ─── Market Data ─────────────────────────────────────────────────────────────

export interface MarketDataRequest {
  symbol: string;
  type: TipoAsset;
}

export interface MarketDataResponse {
  symbol: string;
  type: TipoAsset;
  mu: number;
  sigma: number;
  dataPoints: number;
  fromDate: string;
  toDate: string;
  fromCache: boolean;
}
