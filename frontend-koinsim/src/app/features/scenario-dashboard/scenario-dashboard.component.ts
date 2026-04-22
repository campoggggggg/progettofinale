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
  private simulationPaths: number[][] = [];

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
      { label: '1 Anno', ...calc(mc.unAnno) },
      { label: '3 Anni', ...calc(mc.treAnni) },
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
        this.simulationPaths = this.generateSimulationPaths(mc, 500);
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

    const stockPalette  = ['#111439', '#1C1F5A', '#2E3580', '#3D4899', '#5060B8', '#7080C8'];
    const cryptoPalette = ['#A9A3E0', '#C9C5EB', '#7B74CC', '#8B84D4', '#6058B5', '#E6E4F5'];
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

    if (liquidita > 0) { labels.push('Liquidità'); data.push(liquidita); colors.push('#3498DB'); }

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
                return ` ${name}  ${pct}%  ($${val.toLocaleString('it-IT', { maximumFractionDigits: 0 })})`;
              },
            },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  /**
   * Grafico P&L Monte Carlo con 3 linee percentili (10°/50°/90°) calcolate empiricamente
   * da tutti i 61 mesi dei path, e fan di simulazioni in grigio.
   * X: 61 label mensili (visibili solo a Oggi / 6 Mesi / 1 Anno / 5 Anni)
   * Y: P&L in $ rispetto al costo totale
   */
  private drawPnlChart(): void {
    if (!this.pnlChartRef || !this.montecarlo) return;
    const existing = this.charts.find(c => c.canvas === this.pnlChartRef.nativeElement);
    if (existing) existing.destroy();

    const paths = this.simulationPaths;
    if (!paths.length) return;

    // Settimane: 0..260 (5 anni). Milestone: 0=Oggi, 52=1 Anno, 156=3 Anni, 260=5 Anni
    const totalWeeks = 260;
    const milestoneSet = new Set([0, 52, 156, 260]);

    // Percentili empirici a ogni settimana dai path simulati
    const p10Line: number[] = [];
    const p50Line: number[] = [];
    const p90Line: number[] = [];

    for (let w = 0; w <= totalWeeks; w++) {
      const vals = paths.map(p => p[w]).sort((a, b) => a - b);
      const n = vals.length;
      p10Line.push(vals[Math.floor(0.10 * n)] ?? 0);
      p50Line.push(vals[Math.floor(0.50 * n)] ?? 0);
      p90Line.push(vals[Math.floor(0.90 * n)] ?? 0);
    }

    // Asse X: 261 label settimanali, testo visibile solo ai 4 milestone
    const xLabels = Array.from({ length: totalWeeks + 1 }, (_, w) => {
      if (w === 0) return 'Oggi';
      if (w === 52) return '1 Anno';
      if (w === 156) return '3 Anni';
      if (w === 260) return '5 Anni';
      return '';
    });

    // Raggio dei punti: visibile solo ai milestone
    const pointRadii = xLabels.map((_, i) => milestoneSet.has(i) ? 5 : 0);
    const pointHoverRadii = xLabels.map((_, i) => milestoneSet.has(i) ? 8 : 0);

    const simulationFanPlugin = {
      id: 'simulationFan',
      beforeDatasetsDraw: (chart: any) => {
        const ctx2 = chart.ctx as CanvasRenderingContext2D;
        const xScale = chart.scales['x'];
        const yScale = chart.scales['y'];
        const area = chart.chartArea;

        ctx2.save();
        ctx2.beginPath();
        ctx2.rect(area.left, area.top, area.width, area.height);
        ctx2.clip();

        ctx2.strokeStyle = 'rgba(160,163,189,0.10)';
        ctx2.lineWidth = 0.7;

        for (const path of paths) {
          ctx2.beginPath();
          path.forEach((val, m) => {
            const x = xScale.getPixelForValue(m);
            const y = yScale.getPixelForValue(val);
            if (m === 0) ctx2.moveTo(x, y);
            else ctx2.lineTo(x, y);
          });
          ctx2.stroke();
        }

        ctx2.restore();
      },
    };

    const chart = new Chart(this.pnlChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: xLabels,
        datasets: [
          {
            label: '10° Percentile',
            data: p10Line,
            borderColor: '#E74C3C',
            backgroundColor: 'rgba(231,76,60,0.07)',
            fill: false,
            tension: 0,
            pointRadius: pointRadii,
            pointHoverRadius: pointHoverRadii,
          },
          {
            label: '50° Percentile',
            data: p50Line,
            borderColor: '#3498DB',
            backgroundColor: 'rgba(52,152,219,0.07)',
            fill: false,
            tension: 0,
            pointRadius: pointRadii,
            pointHoverRadius: pointHoverRadii,
          },
          {
            label: '90° Percentile',
            data: p90Line,
            borderColor: '#2ECC71',
            backgroundColor: 'rgba(46,204,113,0.07)',
            fill: false,
            tension: 0,
            pointRadius: pointRadii,
            pointHoverRadius: pointHoverRadii,
          },
        ],
      },
      plugins: [simulationFanPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (item: any) => milestoneSet.has(item.dataIndex),
            callbacks: {
              label: ctx => {
                const n = ctx.parsed.y as number;
                const abs = Math.abs(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return ` ${ctx.dataset.label}: ${n >= 0 ? '+$' : '-$'}${abs}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              callback: (_val: any, index: number) => xLabels[index],
            },
            grid: {
              color: (ctx: any) => milestoneSet.has(ctx.index) ? 'rgba(0,0,0,0.08)' : 'transparent',
            },
          },
          y: {
            title: { display: true, text: 'P&L ($)' },
            ticks: {
              callback: v => {
                const n = Number(v);
                const abs = Math.abs(n).toLocaleString('it-IT', { maximumFractionDigits: 0 });
                return (n >= 0 ? '+$' : '-$') + abs;
              },
            },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // ── Helper privati ───────────────────────────────────────────────────────

  private generateSimulationPaths(mc: ProiezioneMonteCarlo, nPaths: number): number[][] {
    const V0 = mc.seiMesi.valoreCorrente;
    const costo = mc.costoTotale;
    const oggi = V0 - costo;

    if (V0 <= 0) return [];

    const T = 0.5;
    const V_median = V0 + mc.seiMesi.pnlMediano;
    const P90 = mc.seiMesi.percentile90;

    if (V_median <= 0 || P90 <= 0) return [];

    const logMed = Math.log(Math.max(V_median, V0 * 0.0001) / V0);
    const logP90 = Math.log(Math.max(P90, V0 * 0.0001) / V0);
    const sigma = Math.max((logP90 - logMed) / (Math.sqrt(T) * 1.2816), 0.001);
    const annualDrift = logMed / T;

    // Passi settimanali: 0..260 settimane (5 anni), dt = 1/52 anno
    const dt = 1 / 52;
    const totalWeeks = 260;
    const paths: number[][] = [];

    for (let i = 0; i < nPaths; i++) {
      const path: number[] = [oggi];
      let logV = Math.log(V0);
      for (let w = 1; w <= totalWeeks; w++) {
        logV += annualDrift * dt + sigma * Math.sqrt(dt) * this.sampleNormal();
        path.push(Math.exp(logV) - costo);
      }
      paths.push(path);
    }

    return paths;
  }

  private sampleNormal(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private allocationPercent(tipo: 'STOCK' | 'CRYPTO'): number {
    if (!this.scenario || this.scenario.budgetIniziale === 0) return 0;
    const invested = this.scenario.transazioni
      .filter(t => t.tipoAsset === tipo)
      .reduce((s, t) => s + t.quantita * t.prezzoDiAcquisto, 0);
    return (invested / this.scenario.budgetIniziale) * 100;
  }
}
