import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarketDataService } from '../../core/services/market-data.service';
import { MarketDataResponse } from '../../core/models/models';

@Component({
  selector: 'app-market-data',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTooltipModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Market Data</h1>
          <p>Recupera dati storici e parametri statistici per la simulazione Monte Carlo</p>
        </div>
      </div>

      <!-- Fetch Form -->
      <div class="form-card">
        <h3><mat-icon>cloud_download</mat-icon> Recupera Dati di Mercato</h3>
        <p class="form-desc">
          I dati vengono recuperati da <strong>CoinGecko</strong> (crypto) o <strong>Alpha Vantage</strong> (azioni),
          persistiti su MySQL e messi in cache su Redis per 24h.
        </p>

        <form [formGroup]="form" (ngSubmit)="fetch()" class="fetch-form">
          <mat-form-field appearance="outline">
            <mat-label>Simbolo</mat-label>
            <input matInput formControlName="symbol" placeholder="es. bitcoin, ethereum, AAPL, TSLA">
            <mat-hint>Crypto: nome minuscolo (bitcoin) — Azioni: ticker (AAPL)</mat-hint>
            <mat-error *ngIf="form.get('symbol')?.hasError('required')">Obbligatorio</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tipo Asset</mat-label>
            <mat-select formControlName="type">
              <mat-option value="CRYPTO">🔮 Crypto (CoinGecko)</mat-option>
              <mat-option value="STOCK">📈 Azione (Alpha Vantage)</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('type')?.hasError('required')">Obbligatorio</mat-error>
          </mat-form-field>

          <button mat-flat-button class="btn-primary fetch-btn" type="submit" [disabled]="loading">
            <mat-spinner *ngIf="loading" diameter="20" />
            <mat-icon *ngIf="!loading">search</mat-icon>
            {{ loading ? 'Recupero...' : 'Recupera Dati' }}
          </button>
        </form>
      </div>

      <!-- Result -->
      <div class="result-card" *ngIf="result">
        <div class="result-header">
          <div class="result-symbol">
            <div class="result-icon" [class.crypto]="result.type === 'CRYPTO'" [class.stock]="result.type === 'STOCK'">
              {{ result.symbol.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h2>{{ result.symbol.toUpperCase() }}</h2>
              <span class="badge" [class.badge-crypto]="result.type === 'CRYPTO'" [class.badge-stock]="result.type === 'STOCK'">
                {{ result.type }}
              </span>
              <span class="cache-badge" *ngIf="result.fromCache">
                <mat-icon>bolt</mat-icon> Da Cache
              </span>
            </div>
          </div>
          <div class="date-range">{{ result.fromDate | date:'dd/MM/yyyy' }} → {{ result.toDate | date:'dd/MM/yyyy' }}</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">μ (Mu) — Rendimento Medio</div>
            <div class="stat-value">{{ result.mu | number:'1.6-6' }}</div>
            <div class="stat-desc">Media dei log-return giornalieri</div>
          </div>

          <div class="stat-card">
            <div class="stat-label">σ (Sigma) — Volatilità</div>
            <div class="stat-value accent">{{ result.sigma | number:'1.6-6' }}</div>
            <div class="stat-desc">Dev. standard dei log-return (campionaria)</div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Punti Dati</div>
            <div class="stat-value">{{ result.dataPoints | number }}</div>
            <div class="stat-desc">Sessioni di trading analizzate</div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Sharpe Ratio (est.)</div>
            <div class="stat-value" [class.text-success]="getSharpe(result) > 1" [class.text-danger]="getSharpe(result) < 0">
              {{ getSharpe(result) | number:'1.2-2' }}
            </div>
            <div class="stat-desc">Rendimento aggiustato per il rischio</div>
          </div>
        </div>

        <!-- Info Panel -->
        <div class="info-panel">
          <mat-icon>info_outline</mat-icon>
          <div>
            <strong>Come vengono usati questi parametri:</strong>
            <p>
              Mu (μ) e Sigma (σ) alimentano la simulazione Monte Carlo negli scenari.
              Il modello simula migliaia di possibili percorsi di prezzo basati su questi log-return storici,
              generando proiezioni probabilistiche a 6 mesi, 1 anno e 5 anni.
            </p>
          </div>
        </div>
      </div>

      <!-- Quick examples -->
      <div class="examples-card" *ngIf="!result">
        <h3>Esempi di simboli supportati</h3>
        <div class="examples-grid">
          <div class="example-group">
            <div class="group-label">🔮 Crypto (CoinGecko)</div>
            <div class="chips">
              <span class="chip" *ngFor="let c of cryptoExamples" (click)="setExample(c, 'CRYPTO')">{{ c }}</span>
            </div>
          </div>
          <div class="example-group">
            <div class="group-label">📈 Azioni (Alpha Vantage)</div>
            <div class="chips">
              <span class="chip stock" *ngFor="let s of stockExamples" (click)="setExample(s, 'STOCK')">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; @media (max-width: 768px) { padding: 20px 16px; } }
    .page-header { margin-bottom: 24px; h1 { font-size: 24px; font-weight: 700; } p { color: var(--text-secondary); margin-top: 4px; } }

    .form-card, .result-card, .examples-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 20px;
      h3 { font-size: 15px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; mat-icon { color: var(--accent-teal); } }
    }

    .form-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; strong { color: var(--accent-teal); } }

    .fetch-form {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 12px;
      align-items: flex-start;
      @media (max-width: 600px) { grid-template-columns: 1fr; }
    }
    .fetch-btn { height: 56px; border-radius: 10px !important; font-weight: 600; display: flex; align-items: center; gap: 8px; white-space: nowrap; }

    /* Result */
    .result-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; @media (max-width: 600px) { flex-direction: column; gap: 12px; } }
    .result-symbol { display: flex; align-items: center; gap: 14px; }
    .result-icon {
      width: 52px; height: 52px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700;
      &.crypto { background: rgba(99,102,241,0.2); color: var(--accent-purple); }
      &.stock { background: rgba(0,212,170,0.15); color: var(--accent-teal); }
    }
    h2 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .cache-badge {
      display: inline-flex; align-items: center; gap: 2px;
      margin-left: 6px;
      background: rgba(245,158,11,0.15); color: #f59e0b;
      border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 600;
      mat-icon { font-size: 12px; height: 12px; width: 12px; }
    }
    .date-range { font-size: 13px; color: var(--text-muted); }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 20px;
      @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
    }
    .stat-card { background: var(--bg-elevated); border-radius: 10px; padding: 16px; }
    .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    .stat-value { font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; &.accent { color: var(--accent-teal); } }
    .stat-desc { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

    .info-panel {
      display: flex;
      gap: 12px;
      background: rgba(0,212,170,0.06);
      border: 1px solid rgba(0,212,170,0.2);
      border-radius: 10px;
      padding: 14px 16px;
      font-size: 13px;
      color: var(--text-secondary);
      mat-icon { color: var(--accent-teal); flex-shrink: 0; margin-top: 2px; }
      strong { color: var(--text-primary); display: block; margin-bottom: 4px; }
    }

    /* Examples */
    .examples-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; @media (max-width: 600px) { grid-template-columns: 1fr; } }
    .group-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      background: rgba(99,102,241,0.15);
      color: var(--accent-purple);
      &:hover { background: rgba(99,102,241,0.3); }
      &.stock { background: rgba(0,212,170,0.12); color: var(--accent-teal); &:hover { background: rgba(0,212,170,0.25); } }
    }
  `]
})
export class MarketDataComponent {
  private marketDataService = inject(MarketDataService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  result: MarketDataResponse | null = null;
  loading = false;

  cryptoExamples = ['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot'];
  stockExamples = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'];

  form = this.fb.group({
    symbol: ['', Validators.required],
    type: ['CRYPTO', Validators.required]
  });

  fetch(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.result = null;
    this.marketDataService.fetch(this.form.value as any).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
        const msg = res.fromCache ? 'Dati recuperati dalla cache Redis!' : `${res.dataPoints} punti dati recuperati con successo!`;
        this.snack.open(msg, 'OK', { duration: 3000, panelClass: 'snack-success' });
      },
      error: (err) => {
        this.loading = false;
        const msg = err.status === 404 ? 'Simbolo non trovato' :
                    err.status === 429 ? 'Limite API raggiunto, riprova tra poco' :
                    err.error?.message ?? 'Errore nel recupero dei dati';
        this.snack.open(msg, 'Chiudi', { duration: 5000, panelClass: 'snack-error' });
      }
    });
  }

  setExample(symbol: string, type: string): void {
    this.form.patchValue({ symbol, type });
  }

  getSharpe(r: MarketDataResponse): number {
    if (!r.sigma || r.sigma === 0) return 0;
    const riskFreeDaily = 0.05 / 252;
    return (r.mu - riskFreeDaily) / r.sigma;
  }
}
