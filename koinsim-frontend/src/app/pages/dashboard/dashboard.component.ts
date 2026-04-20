import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';
import { PortfolioService } from '../../core/services/portfolio.service';
import { RiepilogoPortafoglio } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule
  ],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Ciao, {{ username }} 👋</h1>
          <p>Panoramica del tuo portafoglio</p>
        </div>
        <button mat-stroked-button (click)="refresh()" [disabled]="loading" class="refresh-btn">
          <mat-icon>refresh</mat-icon> Aggiorna
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-overlay">
        <mat-spinner diameter="48" />
      </div>

      <!-- Content -->
      <ng-container *ngIf="!loading && portafoglio">
        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Valore Totale</div>
            <div class="kpi-value">{{ portafoglio.valoreGlobaleTotale | currency:'EUR':'symbol':'1.2-2' }}</div>
            <div class="kpi-sub">Valore di mercato attuale</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Costo Totale</div>
            <div class="kpi-value secondary">{{ portafoglio.costoTotale | currency:'EUR':'symbol':'1.2-2' }}</div>
            <div class="kpi-sub">Investimento iniziale</div>
          </div>

          <div class="kpi-card" [class.positive]="portafoglio.profitLossTotale >= 0" [class.negative]="portafoglio.profitLossTotale < 0">
            <div class="kpi-label">Profitto / Perdita</div>
            <div class="kpi-value" [class.text-success]="portafoglio.profitLossTotale >= 0" [class.text-danger]="portafoglio.profitLossTotale < 0">
              {{ portafoglio.profitLossTotale >= 0 ? '+' : '' }}{{ portafoglio.profitLossTotale | currency:'EUR':'symbol':'1.2-2' }}
            </div>
            <div class="kpi-sub" [class.text-success]="portafoglio.profitLossTotale >= 0" [class.text-danger]="portafoglio.profitLossTotale < 0">
              {{ portafoglio.profitLossPercTotale >= 0 ? '+' : '' }}{{ portafoglio.profitLossPercTotale | number:'1.2-2' }}%
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Posizioni Aperte</div>
            <div class="kpi-value accent">{{ portafoglio.posizioni.length }}</div>
            <div class="kpi-sub">Asset in portafoglio</div>
          </div>
        </div>

        <!-- Chart + Positions -->
        <div class="content-grid">
          <!-- Doughnut Chart -->
          <div class="chart-card" *ngIf="portafoglio.posizioni.length > 0">
            <h3>Allocazione Portfolio</h3>
            <div class="chart-wrapper">
              <canvas #donutChart></canvas>
            </div>
          </div>

          <!-- Positions Table -->
          <div class="positions-card">
            <div class="card-header">
              <h3>Posizioni</h3>
              <a routerLink="/transactions" mat-button class="view-all-btn">
                Gestisci <mat-icon>arrow_forward</mat-icon>
              </a>
            </div>

            <div *ngIf="portafoglio.posizioni.length === 0" class="empty-state">
              <mat-icon>account_balance_wallet</mat-icon>
              <h3>Nessuna posizione</h3>
              <p>Aggiungi la tua prima transazione</p>
              <a routerLink="/transactions" mat-flat-button class="btn-primary" style="margin-top:16px">
                Aggiungi Transazione
              </a>
            </div>

            <div class="position-list" *ngIf="portafoglio.posizioni.length > 0">
              <div class="position-item" *ngFor="let pos of portafoglio.posizioni">
                <div class="pos-left">
                  <div class="pos-icon" [class.crypto]="pos.tipoAsset === 'CRYPTO'" [class.stock]="pos.tipoAsset === 'STOCK'">
                    {{ pos.simbolo.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="pos-symbol">{{ pos.simbolo.toUpperCase() }}</div>
                    <div class="pos-qty">{{ pos.quantita }} {{ pos.tipoAsset }}</div>
                  </div>
                </div>
                <div class="pos-right">
                  <div class="pos-value">{{ pos.valoreAttuale | currency:'EUR':'symbol':'1.2-2' }}</div>
                  <div class="pos-pnl" [class.text-success]="pos.profitLoss >= 0" [class.text-danger]="pos.profitLoss < 0">
                    {{ pos.profitLoss >= 0 ? '+' : '' }}{{ pos.profitLossPerc | number:'1.1-1' }}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Empty state when no data -->
      <div *ngIf="!loading && !portafoglio" class="empty-state" style="margin-top: 60px">
        <mat-icon>trending_up</mat-icon>
        <h3>Nessun dato disponibile</h3>
        <p>Aggiungi delle transazioni per vedere il tuo portafoglio</p>
        <a routerLink="/transactions" mat-flat-button class="btn-primary" style="margin-top:16px">
          Inizia ora
        </a>
      </div>
    </div>
  `,
  styles: [`
    .page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px;
      @media (max-width: 768px) { padding: 20px 16px; }
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      h1 { font-size: 24px; font-weight: 700; }
      p { color: var(--text-secondary); margin-top: 4px; }
      @media (max-width: 480px) { flex-direction: column; gap: 16px; }
    }
    .refresh-btn { color: var(--text-secondary) !important; border-color: var(--border-color) !important; }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
      @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }
    .kpi-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 20px 22px;
      transition: border-color 0.2s, transform 0.2s;
      &:hover { border-color: var(--border-light); transform: translateY(-1px); }
      &.positive { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.05); }
      &.negative { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.05); }
    }
    .kpi-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .kpi-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
      &.secondary { color: var(--text-secondary); }
      &.accent { color: var(--accent-teal); }
    }
    .kpi-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }
    .chart-card, .positions-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 24px;
      h3 { font-size: 15px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
    }
    .chart-wrapper {
      position: relative;
      max-width: 260px;
      margin: 0 auto;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      h3 { margin-bottom: 0; }
    }
    .view-all-btn { color: var(--accent-teal) !important; font-size: 13px !important; display: flex; align-items: center; gap: 4px; }

    /* Position List */
    .position-list { display: flex; flex-direction: column; gap: 2px; }
    .position-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 8px;
      border-radius: 8px;
      transition: background 0.15s;
      &:hover { background: var(--bg-elevated); }
    }
    .pos-left { display: flex; align-items: center; gap: 12px; }
    .pos-icon {
      width: 38px; height: 38px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 15px;
      &.crypto { background: rgba(99,102,241,0.2); color: var(--accent-purple); }
      &.stock { background: rgba(0,212,170,0.15); color: var(--accent-teal); }
    }
    .pos-symbol { font-weight: 600; font-size: 13px; }
    .pos-qty { font-size: 12px; color: var(--text-muted); }
    .pos-right { text-align: right; }
    .pos-value { font-weight: 600; font-size: 13px; }
    .pos-pnl { font-size: 12px; font-weight: 500; margin-top: 2px; }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private portfolioService = inject(PortfolioService);
  private snack = inject(MatSnackBar);
  auth = inject(AuthService);

  @ViewChild('donutChart') donutChartRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  portafoglio: RiepilogoPortafoglio | null = null;
  loading = true;
  username = this.auth.username;

  ngOnInit(): void {
    this.loadPortafoglio();
  }

  ngAfterViewInit(): void {
    if (this.portafoglio?.posizioni.length) {
      this.buildChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  refresh(): void {
    this.loading = true;
    this.chart?.destroy();
    this.chart = null;
    this.loadPortafoglio();
  }

  private loadPortafoglio(): void {
    this.portfolioService.getPortafoglio().subscribe({
      next: (data) => {
        this.portafoglio = data;
        this.loading = false;
        setTimeout(() => this.buildChart(), 100);
      },
      error: () => {
        this.loading = false;
        this.snack.open('Errore nel caricamento del portafoglio', 'Chiudi', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  private buildChart(): void {
    if (!this.donutChartRef || !this.portafoglio?.posizioni.length) return;
    this.chart?.destroy();

    const colors = [
      '#00d4aa', '#6366f1', '#f59e0b', '#ef4444', '#10b981',
      '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'
    ];

    this.chart = new Chart(this.donutChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.portafoglio.posizioni.map(p => p.simbolo.toUpperCase()),
        datasets: [{
          data: this.portafoglio.posizioni.map(p => p.valoreAttuale),
          backgroundColor: colors.slice(0, this.portafoglio.posizioni.length),
          borderColor: '#141824',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed as number;
                return ` €${val.toFixed(2)}`;
              }
            }
          }
        }
      }
    });
  }
}
