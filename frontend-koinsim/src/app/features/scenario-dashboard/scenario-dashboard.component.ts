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
  TransazioneCreateRequest,
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
  templateUrl: './scenario-dashboard.component.html',
  styleUrls: ['./scenario-dashboard.component.css'],
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

  selectedPercentile: 10 | 50 | 90 = 50;

  get montecarloSummary(): { label: string; pnl: number; pnlPerc: number }[] {
    if (!this.montecarlo || !this.scenario) return [];

    const mc = this.montecarlo;
    const costoTotale = mc.costoTotale;
    const budget = this.scenario.budgetIniziale;
    const p = this.selectedPercentile;

    const calc = (r: { percentile10: number; percentile90: number; pnlMediano: number }) => {
      const pnl = p === 10 ? r.percentile10 - costoTotale
                : p === 90 ? r.percentile90 - costoTotale
                : r.pnlMediano;
      return { pnl, pnlPerc: budget > 0 ? (pnl / budget) * 100 : 0 };
    };

    return [
      { label: '6 Mesi', ...calc(mc.seiMesi) },
      { label: '1 Anno', ...calc(mc.unAnno) },
      { label: '5 Anni', ...calc(mc.cinqueAnni) },
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
    if ((this.scenario?.budgetRimanente ?? 0) <= 0) {
      this.snack.open('Budget esaurito: non puoi aggiungere ulteriori transazioni.', 'Chiudi', { duration: 4000 });
      return;
    }
    this.dialog
      .open(AddTransactionDialogComponent, {
        width: '460px',
        data: {
          budgetIniziale: this.scenario?.budgetIniziale ?? 0,
          budgetRimanente: this.scenario?.budgetRimanente ?? 0,
        }
      })
      .afterClosed()
      .subscribe((req: TransazioneCreateRequest | undefined) => {
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
    const liquidita = this.scenario.budgetRimanente;

    const labels: string[] = [];
    const data: number[] = [];
    const colors: string[] = [];

    const stockPalette = ['#4CAF50', '#81C784', '#2E7D32', '#A5D6A7', '#388E3C', '#C8E6C9'];
    const cryptoPalette = ['#FF9800', '#FFB74D', '#E65100', '#FFCC80', '#F57C00', '#FFE0B2'];
    let si = 0, ci = 0;

    for (const t of tx) {
      const cost = t.quantita * t.prezzoDiAcquisto;
      if (cost <= 0) continue;
      labels.push(t.simbolo);
      data.push(cost);
      if (t.tipoAsset === 'STOCK') {
        colors.push(stockPalette[si % stockPalette.length]);
        si++;
      } else {
        colors.push(cryptoPalette[ci % cryptoPalette.length]);
        ci++;
      }
    }

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
                const name = ctx.label ?? '';
                return ` ${name}  ${pct}%  (€${val.toLocaleString('it-IT', { maximumFractionDigits: 0 })})`;
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
    if (!this.pnlChartRef || !this.montecarlo) return;
    const existing = this.charts.find(c => c.canvas === this.pnlChartRef.nativeElement);
    if (existing) existing.destroy();

    const mc = this.montecarlo;
    const oggi = mc.seiMesi.valoreCorrente - mc.costoTotale;
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
