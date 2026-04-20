export type TipoAsset = 'CRYPTO' | 'STOCK';

export interface LoginRequest {
  nomeUtente: string;
  password: string;
  email?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface PosizioneSingola {
  simbolo: string;
  tipoAsset: TipoAsset;
  quantita: number;
  prezzoDiAcquisto: number;
  prezzoAttuale: number;
  valoreAttuale: number;
  profitLoss: number;
  profitLossPerc: number;
}

export interface RiepilogoPortafoglio {
  posizioni: PosizioneSingola[];
  valoreGlobaleTotale: number;
  costoTotale: number;
  profitLossTotale: number;
  profitLossPercTotale: number;
}

export interface Transazione {
  id: number;
  simbolo: string;
  tipoAsset: TipoAsset;
  quantita: number;
  prezzoDiAcquisto: number;
  dataAcquisto: string;
}

export interface TransazioneRequest {
  simbolo: string;
  tipoAsset: TipoAsset;
  quantita: number;
}

export interface TransazioneScenarioResponse {
  id: number;
  simbolo: string;
  tipoAsset: TipoAsset;
  quantita: number;
  prezzoUnitario: number;
  dataAcquisto: string;
}

export interface TransazioneScenarioRequest {
  simbolo: string;
  tipoAsset: TipoAsset;
  quantita: number;
  dataAcquisto: string;
}

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
  transazioni: TransazioneScenarioResponse[];
}

export interface Punto {
  data: string;
  valorePortafoglio: number;
  pnl: number;
  pnlPerc: number;
  stimato: boolean;
}

export interface ProiezioneScenario {
  dataInizioSimulazione: string;
  costoTotale: number;
  odierno: Punto;
  seiMesi: Punto;
  unAnno: Punto;
  cinqueAnni: Punto;
}

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
