import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  Input,
} from '@angular/core';
import { CommonModule, CurrencyPipe, PercentPipe } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Chart } from 'chart.js';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { ScenarioService } from '../../core/services/scenario.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ScenarioResponse,
  ProiezioneScenario,
  ProiezioneMonteCarlo,
  TransazioneRequest,
} from '../../core/models/models';
import { AddTransactionDialogComponent } from '../dialogs/add-transaction-dialog.component';

@Component({
  selector: 'app-scenario-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    PercentPipe,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatBadgeModule,
  ],
  template: `
    <!-- ── Toolbar ─────────────────────────────────────────────────────────── -->
    <mat-toolbar color="primary">
      <button mat-icon-button (click)="goBack()" matTooltip="Torna alla lista">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <mat-icon style="margin: 0 8px">show_chart</mat-icon>
      <span>{{ scenario?.nome ?? 'Dashboard' }}</span>
      <span class="spacer"></span>
      <button mat-icon-button (click)="auth.logout()" matTooltip="Logout">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <!-- ── Loading globale ────────────────────────────────────────────────── -->
    @if (loading) {
      <div class="center-spinner">
        <mat-spinner />
        <p style="margin-top:16px;color:#666">Caricamento dati...</p>
      </div>
    }

    @if (!loading && scenario) {
      <div class="dash-container">

        <!-- ════════════════════════════════════════════════════════════════
             RIGA 1: metriche budget + Historical Volatility
             ════════════════════════════════════════════════════════════════ -->
        <div class="row-top">

          <!-- Metriche -->
          <div class="metrics-group">
            <div class="metric-section-label">TOTAL</div>
            <div class="metrics-cards">

              <mat-card class="metric-card">
                <mat-card-content>
                  <div class="metric-label">BUDGET TOTALE</div>
                  <div class="metric-value">
                    {{ scenario.budgetIniziale | currency:'EUR':'symbol':'1.2-2' }}
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="metric-card">
                <mat-card-content>
                  <div class="metric-label">SPESO</div>
                  <div class="metric-value speso">
                    {{ speso | currency:'EUR':'symbol':'1.2-2' }}
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="metric-card">
                <mat-card-content>
                  <div class="metric-label">RIMANENTE</div>
                  <div class="metric-value rimanente">
                    {{ scenario.budgetRimanente | currency:'EUR':'symbol':'1.2-2' }}
                  </div>
                </mat-card-content>
              </mat-card>

            </div>
          </div>

        </div>

        <!-- ════════════════════════════════════════════════════════════════
             ASSET ALLOCATION %
             ════════════════════════════════════════════════════════════════ -->
        <mat-card class="allocation-section">
          <mat-card-header>
            <mat-card-title>ASSET ALLOCATION %</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (scenario.transazioni.length === 0) {
              <p class="empty-chart">Nessuna transazione presente</p>
            } @else {
              <div class="allocation-bar">
                @if (allocationStock > 0) {
                  <div
                    class="segment segment-stock"
                    [style.width.%]="allocationStock"
                  >
                    {{ allocationStock | number:'1.1-1' }}%
                  </div>
                }
                @if (allocationCrypto > 0) {
                  <div
                    class="segment segment-crypto"
                    [style.width.%]="allocationCrypto"
                  >
                    {{ allocationCrypto | number:'1.1-1' }}%
                  </div>
                }
                @if (allocationRimanente > 0) {
                  <div
                    class="segment"
                    [style.width.%]="allocationRimanente"
                    style="background:#e0e0e0;color:#888"
                  >
                    {{ allocationRimanente | number:'1.1-1' }}%
                  </div>
                }
              </div>
              <div class="allocation-labels">
                <span><span class="legend-dot" style="background:#3f51b5"></span>Azioni</span>
                <span><span class="legend-dot" style="background:#ffa726"></span>Crypto</span>
                <span><span class="legend-dot" style="background:#e0e0e0"></span>Liquidità</span>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- ════════════════════════════════════════════════════════════════
             RIGA 2: Osservazioni + Distribuzione portafoglio
             ════════════════════════════════════════════════════════════════ -->
        <div class="row-middle">

          <!-- Transazioni -->
          <mat-card class="osservazioni-card">
            <mat-card-header>
              <mat-card-title>TRANSAZIONI</mat-card-title>
              <span class="spacer"></span>
              <button
                mat-raised-button
                color="primary"
                (click)="openAddTransaction()"
                style="margin-right:8px"
              >
                <mat-icon>add</mat-icon> Aggiungi
              </button>
            </mat-card-header>

            <mat-card-content>
              <!-- Descrizione scenario -->
              @if (scenario.descrizione) {
                <p class="osservazioni-content">{{ scenario.descrizione }}</p>
                <mat-divider style="margin: 8px 0" />
              }

              <!-- Tabella transazioni -->
              @if (scenario.transazioni.length === 0) {
                <p style="color:#999;text-align:center;padding:16px">
                  Nessuna transazione. Inizia aggiungendone una.
                </p>
              } @else {
                <div class="table-wrapper">
                  <table mat-table [dataSource]="scenario.transazioni" class="transaction-table">

                    <ng-container matColumnDef="simbolo">
                      <th mat-header-cell *matHeaderCellDef>Simbolo</th>
                      <td mat-cell *matCellDef="let t">
                        <strong>{{ t.simbolo }}</strong>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="tipo">
                      <th mat-header-cell *matHeaderCellDef>Tipo</th>
                      <td mat-cell *matCellDef="let t">
                        <mat-chip [class]="t.tipoAsset === 'STOCK' ? 'chip-stock' : 'chip-crypto'">
                          {{ t.tipoAsset }}
                        </mat-chip>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="quantita">
                      <th mat-header-cell *matHeaderCellDef>Quantità</th>
                      <td mat-cell *matCellDef="let t">{{ t.quantita }}</td>
                    </ng-container>

                    <ng-container matColumnDef="prezzo">
                      <th mat-header-cell *matHeaderCellDef>Prezzo acquisto</th>
                      <td mat-cell *matCellDef="let t">
                        {{ t.prezzoDiAcquisto | currency:'EUR':'symbol':'1.2-2' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="totale">
                      <th mat-header-cell *matHeaderCellDef>Totale</th>
                      <td mat-cell *matCellDef="let t">
                        {{ t.quantita * t.prezzoDiAcquisto | currency:'EUR':'symbol':'1.2-2' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="data">
                      <th mat-header-cell *matHeaderCellDef>Data</th>
                      <td mat-cell *matCellDef="let t">{{ t.dataAcquisto }}</td>
                    </ng-container>

                    <ng-container matColumnDef="azioni">
                      <th mat-header-cell *matHeaderCellDef></th>
                      <td mat-cell *matCellDef="let t">
                        <button
                          mat-icon-button
                          color="warn"
                          matTooltip="Rimuovi"
                          (click)="removeTransaction(t.id!)"
                        >
                          <mat-icon>delete</mat-icon>
                        </button>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="txColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: txColumns"></tr>
                  </table>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Distribuzione portafoglio -->
          <mat-card class="distribuzione-card">
            <mat-card-header>
              <mat-card-title>DISTRIBUZIONE PORTAFOGLIO</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (scenario.transazioni.length === 0) {
                <p class="empty-chart">Aggiungi transazioni</p>
              } @else {
                <div class="chart-container" style="height:260px">
                  <canvas #distribuzioneChart></canvas>
                </div>
              }
            </mat-card-content>
          </mat-card>

        </div>

        <!-- ════════════════════════════════════════════════════════════════
             GRAFICO P&L MONTE CARLO
             ════════════════════════════════════════════════════════════════ -->
        <mat-card class="pnl-card">
          <mat-card-header>
            <mat-card-title>P&amp;L (€) — Simulazione Monte Carlo</mat-card-title>
            <span class="spacer"></span>
            <!-- Legenda percentili -->
            <div class="pnl-legend">
              <span class="legend-dot" style="background:#2196F3"></span>
              <span>10° Percentile</span>
              <span class="legend-dot" style="background:#F44336;margin-left:12px"></span>
              <span>50° Percentile</span>
              <span class="legend-dot" style="background:#4CAF50;margin-left:12px"></span>
              <span>90° Percentile</span>
            </div>
          </mat-card-header>

          <mat-card-content>
            @if (loadingMonteCarlo) {
              <div class="center-spinner-small" style="height:200px">
                <mat-spinner diameter="40" />
                <p style="margin-top:8px;color:#666">Simulazione Monte Carlo in corso...</p>
              </div>
            } @else if (!montecarlo) {
              <p class="empty-chart">
                {{ scenario.transazioni.length === 0
                   ? 'Aggiungi transazioni per avviare la simulazione'
                   : 'Avvia la simulazione cliccando il pulsante' }}
              </p>
              @if (scenario.transazioni.length > 0) {
                <div style="text-align:center;padding:16px">
                  <button mat-raised-button color="primary" (click)="loadMonteCarlo()">
                    <mat-icon>play_arrow</mat-icon> Avvia simulazione (10.000 percorsi)
                  </button>
                </div>
              }
            } @else {
              <div class="montecarlo-summary">
                @for (orizzonte of montecarloSummary; track orizzonte.label) {
                  <div class="mc-item">
                    <div class="mc-label">{{ orizzonte.label }}</div>
                    <div class="mc-median" [class.positive]="orizzonte.pnl >= 0" [class.negative]="orizzonte.pnl < 0">
                      {{ orizzonte.pnl | currency:'EUR':'symbol':'1.0-0' }}
                      ({{ orizzonte.pnlPerc | number:'1.1-1' }}%)
                    </div>
                  </div>
                }
              </div>
              <div class="chart-container" style="height:280px">
                <canvas #pnlChart></canvas>
              </div>
            }
          </mat-card-content>
        </mat-card>

      </div>
    }
  `,
  styles: [`
    .dash-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .spacer { flex: 1 1 auto; }
    .center-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
    }
    .center-spinner-small {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .empty-chart { text-align: center; color: #999; padding: 16px; }

    /* ── Riga top ─────────────────────────────────────────────────── */
    .row-top {
      margin-bottom: 16px;
    }

    .metric-section-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #888;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .metrics-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .metric-card mat-card-content { padding: 16px 12px !important; }
    .metric-label { font-size: 0.75rem; font-weight: 600; color: #666; margin-bottom: 4px; }
    .metric-value { font-size: 1.6rem; font-weight: 500; color: #3f51b5; }
    .metric-value.speso { color: #e53935; }
    .metric-value.rimanente { color: #43a047; }

    /* ── Allocation ───────────────────────────────────────────────── */
    .allocation-section mat-card-header { padding-bottom: 8px; }
    .allocation-bar {
      height: 36px;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      .segment {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 500;
        font-size: 0.85rem;
        transition: width 0.4s ease;
        min-width: 40px;
      }
      .segment-stock  { background-color: #3f51b5; }
      .segment-crypto { background-color: #ffa726; }
    }
    .allocation-labels {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 0.8rem;
      color: #666;
    }

    /* ── Riga middle ──────────────────────────────────────────────── */
    .row-middle {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 16px;
    }
    @media (max-width: 900px) { .row-middle { grid-template-columns: 1fr; } }

    .osservazioni-card mat-card-header {
      display: flex;
      align-items: center;
    }
    .osservazioni-content {
      white-space: pre-wrap;
      font-size: 0.95rem;
      line-height: 1.6;
      color: #444;
      padding: 8px 0;
    }
    .table-wrapper {
      overflow-x: auto;
      max-height: 300px;
      overflow-y: auto;
    }
    .transaction-table { width: 100%; }

    /* Chip asset type */
    mat-chip.chip-stock  { background: #e8eaf6 !important; color: #3f51b5 !important; font-size: 0.75rem; }
    mat-chip.chip-crypto { background: #fff3e0 !important; color: #e65100 !important; font-size: 0.75rem; }

    .distribuzione-card { min-height: 300px; }

    /* ── P&L card ─────────────────────────────────────────────────── */
    .pnl-card mat-card-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
    }
    .pnl-legend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      color: #555;
    }
    .montecarlo-summary {
      display: flex;
      gap: 32px;
      padding: 8px 0 16px;
      flex-wrap: wrap;
    }
    .mc-item { display: flex; flex-direction: column; }
    .mc-label { font-size: 0.75rem; color: #888; }
    .mc-median { font-size: 1.1rem; font-weight: 500; }
    .mc-median.positive { color: #43a047; }
    .mc-median.negative { color: #e53935; }
    .legend-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 2px;
    }
  `],
})
export class ScenarioDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  // Riceve l'id dallo URL (withComponentInputBinding)
  @Input() id!: string;

  @ViewChild('distribuzioneChart') distribuzioneChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pnlChart') pnlChartRef!: ElementRef<HTMLCanvasElement>;

  auth = inject(AuthService);
  private scenarioSvc = inject(ScenarioService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  scenario: ScenarioResponse | null = null;
  proiezioni: ProiezioneScenario | null = null;
  montecarlo: ProiezioneMonteCarlo | null = null;

  loading = false;
  loadingCharts = false;
  loadingMonteCarlo = false;

  txColumns = ['simbolo', 'tipo', 'quantita', 'prezzo', 'totale', 'data', 'azioni'];

  private charts: Chart[] = [];

  // ── Calcolati ────────────────────────────────────────────────────────────

  get speso(): number {
    return (this.scenario?.budgetIniziale ?? 0) - (this.scenario?.budgetRimanente ?? 0);
  }

  get allocationStock(): number {
    return this.allocationPercent('STOCK');
  }

  get allocationCrypto(): number {
    return this.allocationPercent('CRYPTO');
  }

  get allocationRimanente(): number {
    const totalBudget = this.scenario?.budgetIniziale ?? 0;
    if (totalBudget === 0) return 0;
    return Math.max(0, (this.scenario!.budgetRimanente / totalBudget) * 100);
  }

  get montecarloSummary(): { label: string; pnl: number; pnlPerc: number }[] {
    if (!this.montecarlo) return [];
    return [
      {
        label: '6 Mesi (mediano)',
        pnl: this.montecarlo.seiMesi.pnlMediano,
        pnlPerc: this.montecarlo.seiMesi.pnlMedianoPerc,
      },
      {
        label: '1 Anno (mediano)',
        pnl: this.montecarlo.unAnno.pnlMediano,
        pnlPerc: this.montecarlo.unAnno.pnlMedianoPerc,
      },
      {
        label: '5 Anni (mediano)',
        pnl: this.montecarlo.cinqueAnni.pnlMediano,
        pnlPerc: this.montecarlo.cinqueAnni.pnlMedianoPerc,
      },
    ];
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadScenario();
  }

  ngAfterViewInit(): void {
    // I grafici vengono disegnati dopo che i dati sono caricati (vedi loadScenario)
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  loadScenario(): void {
    this.loading = true;
    const scenarioId = Number(this.id);

    this.scenarioSvc.dettaglio(scenarioId).subscribe({
      next: s => {
        this.scenario = s;
        this.loading = false;
        // Dopo che la view si aggiorna, carica le proiezioni e disegna i grafici
        setTimeout(() => this.loadChartsData(), 0);
      },
      error: () => {
        this.loading = false;
        this.snack.open('Errore nel caricamento dello scenario', 'Chiudi', {
          duration: 4000,
        });
      },
    });
  }

  loadChartsData(): void {
    if (!this.scenario || this.scenario.transazioni.length === 0) return;
    this.loadingCharts = true;

    this.scenarioSvc.proiezioni(Number(this.id)).subscribe({
      next: p => {
        this.proiezioni = p;
        this.loadingCharts = false;
        this.cdr.detectChanges();
        // Disegna i grafici statici (distribuzione)
        setTimeout(() => {
          this.drawDistribuzioneChart();
        }, 50);
      },
      error: () => {
        this.loadingCharts = false;
      },
    });
  }

  loadMonteCarlo(): void {
    this.loadingMonteCarlo = true;
    this.scenarioSvc.montecarlo(Number(this.id)).subscribe({
      next: mc => {
        this.montecarlo = mc;
        this.loadingMonteCarlo = false;
        this.cdr.detectChanges();
        setTimeout(() => this.drawPnlChart(), 50);
      },
      error: err => {
        this.loadingMonteCarlo = false;
        this.snack.open(
          err.error?.message ?? 'Errore nella simulazione Monte Carlo',
          'Chiudi',
          { duration: 5000 }
        );
      },
    });
  }

  // ── Transazioni ──────────────────────────────────────────────────────────

  openAddTransaction(): void {
    this.dialog
      .open(AddTransactionDialogComponent, { 
        width: '460px',
        data: { budgetIniziale: this.scenario?.budgetIniziale ?? 0 }
      })
      .afterClosed()
      .subscribe((req: TransazioneRequest | undefined) => {
        if (!req) return;
        this.scenarioSvc
          .aggiungiTransazione(Number(this.id), req)
          .subscribe({
            next: () => {
              this.snack.open('Transazione aggiunta!', 'OK', { duration: 3000 });
              // Reset montecarlo e ricarica scenario
              this.montecarlo = null;
              this.destroyCharts();
              this.loadScenario();
            },
            error: err =>
              this.snack.open(
                err.error?.message ?? 'Errore nell\'aggiunta della transazione',
                'Chiudi',
                { duration: 5000 }
              ),
          });
      });
  }

  removeTransaction(transazioneId: number): void {
    if (!confirm('Rimuovere questa transazione dallo scenario?')) return;
    this.scenarioSvc
      .rimuoviTransazione(Number(this.id), transazioneId)
      .subscribe({
        next: () => {
          this.snack.open('Transazione rimossa', 'OK', { duration: 3000 });
          this.montecarlo = null;
          this.destroyCharts();
          this.loadScenario();
        },
        error: () =>
          this.snack.open('Errore nella rimozione', 'Chiudi', { duration: 4000 }),
      });
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/scenari']);
  }

  // ── Charts ───────────────────────────────────────────────────────────────

  private destroyCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }



  /**
   * Donut chart: distribuzione del portafoglio per asset class.
   */
  private drawDistribuzioneChart(): void {
    if (!this.distribuzioneChartRef || !this.scenario) return;
    const existing = this.charts.find(c => c.canvas === this.distribuzioneChartRef.nativeElement);
    if (existing) existing.destroy();

    const tx = this.scenario.transazioni;
    const stockCost = tx
      .filter(t => t.tipoAsset === 'STOCK')
      .reduce((s, t) => s + t.quantita * t.prezzoDiAcquisto, 0);
    const cryptoCost = tx
      .filter(t => t.tipoAsset === 'CRYPTO')
      .reduce((s, t) => s + t.quantita * t.prezzoDiAcquisto, 0);
    const liquidita = this.scenario.budgetRimanente;

    const labels: string[] = [];
    const data: number[] = [];
    const colors: string[] = [];

    if (stockCost > 0) { labels.push('Azioni'); data.push(stockCost); colors.push('#4CAF50'); }
    if (cryptoCost > 0) { labels.push('Crypto'); data.push(cryptoCost); colors.push('#FF9800'); }
    if (liquidita > 0) { labels.push('Liquidità'); data.push(liquidita); colors.push('#2196F3'); }

    const chart = new Chart(this.distribuzioneChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 2, hoverOffset: 8 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: ctx => {
                const val = ctx.parsed as number;
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct = ((val / total) * 100).toFixed(1);
                return ` ${pct}%  (€${val.toLocaleString('it-IT', { maximumFractionDigits: 0 })})`;
              },
            },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  /**
   * Grafico P&L Monte Carlo con 3 linee percentili (10°/50°/90°).
   * X: [Oggi, 6 Mesi, 1 Anno, 5 Anni]
   * Y: P&L in € rispetto al costo totale
   */
  private drawPnlChart(): void {
    if (!this.pnlChartRef || !this.montecarlo || !this.proiezioni) return;
    const existing = this.charts.find(c => c.canvas === this.pnlChartRef.nativeElement);
    if (existing) existing.destroy();

    const mc = this.montecarlo;
    const oggi = this.proiezioni.odierno.pnl;
    const costo = mc.costoTotale;

    // P&L = valore percentile - costo totale
    const pnl10 = [oggi, mc.seiMesi.percentile10 - costo, mc.unAnno.percentile10 - costo, mc.cinqueAnni.percentile10 - costo];
    const pnl50 = [oggi, mc.seiMesi.pnlMediano, mc.unAnno.pnlMediano, mc.cinqueAnni.pnlMediano];
    const pnl90 = [oggi, mc.seiMesi.percentile90 - costo, mc.unAnno.percentile90 - costo, mc.cinqueAnni.percentile90 - costo];

    const chart = new Chart(this.pnlChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: ['Oggi', '6 Mesi', '1 Anno', '5 Anni'],
        datasets: [
          {
            label: '10° Percentile',
            data: pnl10,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33,150,243,0.08)',
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 8,
          },
          {
            label: '50° Percentile',
            data: pnl50,
            borderColor: '#F44336',
            backgroundColor: 'rgba(244,67,54,0.08)',
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 8,
          },
          {
            label: '90° Percentile',
            data: pnl90,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76,175,80,0.08)',
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx =>
                ` ${ctx.dataset.label}: €${(ctx.parsed.y as number).toLocaleString('it-IT', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
            },
          },
        },
        scales: {
          y: {
            title: { display: true, text: 'P&L (€)' },
            ticks: {
              callback: v =>
                (Number(v) >= 0 ? '+' : '') +
                Number(v).toLocaleString('it-IT', { maximumFractionDigits: 0 }) + '€',
            },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // ── Helper privato ───────────────────────────────────────────────────────

  private allocationPercent(tipo: 'STOCK' | 'CRYPTO'): number {
    if (!this.scenario || this.scenario.budgetIniziale === 0) return 0;
    const invested = this.scenario.transazioni
      .filter(t => t.tipoAsset === tipo)
      .reduce((s, t) => s + t.quantita * t.prezzoDiAcquisto, 0);
    return (invested / this.scenario.budgetIniziale) * 100;
  }
}
