import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import {
  Chart, LineController, LineElement, PointElement,
  LinearScale, CategoryScale, Tooltip, Legend, Filler
} from 'chart.js';
import { ScenarioService } from '../../core/services/scenario.service';
import { ScenarioResponse, ProiezioneScenario, TransazioneScenarioRequest } from '../../core/models/models';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

@Component({
  selector: 'app-scenario-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTableModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule, MatChipsModule
  ],
  template: `
    <div class="page">
      <!-- Back + Header -->
      <div class="page-header">
        <a routerLink="/scenarios" mat-button class="back-btn">
          <mat-icon>arrow_back</mat-icon> Scenari
        </a>
        <div class="header-info" *ngIf="scenario">
          <h1>{{ scenario.nome }}</h1>
          <p>{{ scenario.descrizione }}</p>
        </div>
      </div>

      <div *ngIf="loading" class="loading-overlay"><mat-spinner diameter="48" /></div>

      <ng-container *ngIf="!loading && scenario">
        <!-- Budget Cards -->
        <div class="budget-grid">
          <div class="budget-card">
            <div class="budget-lbl">Budget Iniziale</div>
            <div class="budget-val">{{ scenario.budgetIniziale | currency:'EUR':'symbol':'1.2-2' }}</div>
          </div>
          <div class="budget-card">
            <div class="budget-lbl">Budget Rimanente</div>
            <div class="budget-val" [class.text-danger]="scenario.budgetRimanente < 0" [class.text-success]="scenario.budgetRimanente > 0">
              {{ scenario.budgetRimanente | currency:'EUR':'symbol':'1.2-2' }}
            </div>
          </div>
          <div class="budget-card">
            <div class="budget-lbl">Transazioni</div>
            <div class="budget-val accent">{{ scenario.transazioni?.length ?? 0 }}</div>
          </div>
          <div class="budget-card">
            <div class="budget-lbl">Creato il</div>
            <div class="budget-val-sm">{{ scenario.dataCreazione | date:'dd/MM/yyyy HH:mm' }}</div>
          </div>
        </div>

        <!-- Add Transaction -->
        <div class="form-card">
          <h3><mat-icon>add_shopping_cart</mat-icon> Aggiungi Asset allo Scenario</h3>
          <form [formGroup]="txForm" (ngSubmit)="addTransaction()" class="tx-form">
            <mat-form-field appearance="outline">
              <mat-label>Simbolo</mat-label>
              <input matInput formControlName="simbolo" placeholder="es. bitcoin, AAPL">
              <mat-error *ngIf="txForm.get('simbolo')?.hasError('required')">Obbligatorio</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select formControlName="tipoAsset">
                <mat-option value="CRYPTO">🔮 Crypto</mat-option>
                <mat-option value="STOCK">📈 Azione</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Quantità</mat-label>
              <input matInput formControlName="quantita" type="number" step="0.0001" min="0.0001">
              <mat-error *ngIf="txForm.get('quantita')?.hasError('required')">Obbligatorio</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Data Acquisto</mat-label>
              <input matInput formControlName="dataAcquisto" type="date">
              <mat-error *ngIf="txForm.get('dataAcquisto')?.hasError('required')">Obbligatorio</mat-error>
            </mat-form-field>

            <button mat-flat-button class="btn-primary submit-btn" type="submit" [disabled]="txSaving">
              <mat-spinner *ngIf="txSaving" diameter="18" />
              <mat-icon *ngIf="!txSaving">add</mat-icon>
              {{ txSaving ? '' : 'Aggiungi' }}
            </button>
          </form>
        </div>

        <!-- Transactions Table -->
        <div class="table-card" *ngIf="scenario.transazioni?.length > 0">
          <h3>Asset nello Scenario</h3>
          <div class="table-wrapper">
            <table mat-table [dataSource]="scenario.transazioni">
              <ng-container matColumnDef="simbolo">
                <th mat-header-cell *matHeaderCellDef>Asset</th>
                <td mat-cell *matCellDef="let t">
                  <div class="sym-cell">
                    <div class="sym-icon" [class.crypto]="t.tipoAsset === 'CRYPTO'" [class.stock]="t.tipoAsset === 'STOCK'">
                      {{ t.simbolo.charAt(0).toUpperCase() }}
                    </div>
                    <span class="sym-name">{{ t.simbolo.toUpperCase() }}</span>
                    <span class="badge" [class.badge-crypto]="t.tipoAsset === 'CRYPTO'" [class.badge-stock]="t.tipoAsset === 'STOCK'">
                      {{ t.tipoAsset }}
                    </span>
                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="quantita">
                <th mat-header-cell *matHeaderCellDef>Quantità</th>
                <td mat-cell *matCellDef="let t">{{ t.quantita }}</td>
              </ng-container>
              <ng-container matColumnDef="prezzo">
                <th mat-header-cell *matHeaderCellDef>Prezzo Unitario</th>
                <td mat-cell *matCellDef="let t">{{ t.prezzoUnitario | currency:'EUR':'symbol':'1.2-2' }}</td>
              </ng-container>
              <ng-container matColumnDef="data">
                <th mat-header-cell *matHeaderCellDef>Data Acquisto</th>
                <td mat-cell *matCellDef="let t">{{ t.dataAcquisto | date:'dd/MM/yyyy' }}</td>
              </ng-container>
              <ng-container matColumnDef="azioni">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let t">
                  <button mat-icon-button class="btn-danger" (click)="removeTransaction(t.id)" matTooltip="Rimuovi">
                    <mat-icon>remove_circle_outline</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="txColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: txColumns;"></tr>
            </table>
          </div>
        </div>

        <!-- Projections -->
        <div class="projections-card">
          <div class="proj-header">
            <h3><mat-icon>trending_up</mat-icon> Proiezioni Monte Carlo</h3>
            <button mat-stroked-button (click)="loadProjections()" [disabled]="projLoading" class="proj-btn">
              <mat-spinner *ngIf="projLoading" diameter="16" style="display:inline-block;margin-right:6px" />
              <mat-icon *ngIf="!projLoading">calculate</mat-icon>
              {{ projLoading ? 'Calcolo...' : 'Calcola Proiezioni' }}
            </button>
          </div>

          <div *ngIf="proiezioni" class="proj-content">
            <!-- Projection KPIs -->
            <div class="proj-kpi-grid">
              <div class="proj-kpi" *ngFor="let p of projectionPoints">
                <div class="proj-kpi-label">{{ p.label }}</div>
                <div class="proj-kpi-val" [class.text-success]="p.pnl >= 0" [class.text-danger]="p.pnl < 0">
                  {{ p.value | currency:'EUR':'symbol':'1.0-0' }}
                </div>
                <div class="proj-kpi-pnl" [class.text-success]="p.pnl >= 0" [class.text-danger]="p.pnl < 0">
                  {{ p.pnl >= 0 ? '+' : '' }}{{ p.pnlPerc | number:'1.1-1' }}%
                  <span class="estimated" *ngIf="p.stimato">• stimato</span>
                </div>
              </div>
            </div>
            <!-- Chart -->
            <div class="chart-wrapper">
              <canvas #lineChart></canvas>
            </div>
          </div>

          <div *ngIf="!proiezioni && !projLoading" class="empty-proj">
            <mat-icon>ssid_chart</mat-icon>
            <p>Clicca "Calcola Proiezioni" per simulare l'andamento del portafoglio</p>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; @media (max-width: 768px) { padding: 20px 16px; } }
    .page-header { margin-bottom: 24px; }
    .back-btn { color: var(--text-secondary) !important; margin-bottom: 16px; padding-left: 0 !important; }
    .header-info { h1 { font-size: 24px; font-weight: 700; } p { color: var(--text-secondary); margin-top: 4px; } }

    .budget-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 20px;
      @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
    }
    .budget-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px 18px;
    }
    .budget-lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    .budget-val { font-size: 20px; font-weight: 700; &.accent { color: var(--accent-teal); } }
    .budget-val-sm { font-size: 14px; font-weight: 500; color: var(--text-primary); }

    .form-card, .table-card, .projections-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 20px;
      h3 { font-size: 15px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; mat-icon { color: var(--accent-teal); } }
    }
    .tx-form {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr auto;
      gap: 12px;
      align-items: flex-start;
      @media (max-width: 900px) { grid-template-columns: 1fr 1fr; }
      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }
    .submit-btn { height: 56px; border-radius: 10px !important; font-weight: 600; display: flex; align-items: center; gap: 4px; }

    .table-wrapper { overflow-x: auto; }
    table { width: 100%; }
    .sym-cell { display: flex; align-items: center; gap: 8px; }
    .sym-icon {
      width: 30px; height: 30px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 12px;
      &.crypto { background: rgba(99,102,241,0.2); color: var(--accent-purple); }
      &.stock { background: rgba(0,212,170,0.15); color: var(--accent-teal); }
    }
    .sym-name { font-weight: 600; font-size: 13px; }

    .proj-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; h3 { margin-bottom: 0; } }
    .proj-btn { color: var(--accent-teal) !important; border-color: rgba(0,212,170,0.4) !important; display: flex; align-items: center; gap: 6px; }

    .proj-content { margin-top: 20px; }
    .proj-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
      @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
    }
    .proj-kpi {
      background: var(--bg-elevated);
      border-radius: 10px;
      padding: 14px 16px;
    }
    .proj-kpi-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    .proj-kpi-val { font-size: 18px; font-weight: 700; }
    .proj-kpi-pnl { font-size: 12px; font-weight: 500; margin-top: 2px; }
    .estimated { color: var(--text-muted); font-weight: 400; }
    .chart-wrapper { position: relative; height: 280px; }
    .empty-proj { text-align: center; padding: 40px 20px; color: var(--text-muted); mat-icon { font-size: 40px; height: 40px; width: 40px; opacity: 0.4; display: block; margin: 0 auto 12px; } p { font-size: 13px; } }
  `]
})
export class ScenarioDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private scenarioService = inject(ScenarioService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  scenario: ScenarioResponse | null = null;
  proiezioni: ProiezioneScenario | null = null;
  loading = true;
  txSaving = false;
  projLoading = false;

  txColumns = ['simbolo', 'quantita', 'prezzo', 'data', 'azioni'];

  txForm = this.fb.group({
    simbolo: ['', Validators.required],
    tipoAsset: ['CRYPTO', Validators.required],
    quantita: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    dataAcquisto: [new Date().toISOString().substring(0, 10), Validators.required]
  });

  get scenarioId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  get projectionPoints() {
    if (!this.proiezioni) return [];
    return [
      { label: 'Oggi', ...this.proiezioni.odierno, value: this.proiezioni.odierno.valorePortafoglio },
      { label: '6 Mesi', ...this.proiezioni.seiMesi, value: this.proiezioni.seiMesi.valorePortafoglio },
      { label: '1 Anno', ...this.proiezioni.unAnno, value: this.proiezioni.unAnno.valorePortafoglio },
      { label: '5 Anni', ...this.proiezioni.cinqueAnni, value: this.proiezioni.cinqueAnni.valorePortafoglio },
    ];
  }

  ngOnInit(): void {
    this.scenarioService.getScenario(this.scenarioId).subscribe({
      next: (s) => { this.scenario = s; this.loading = false; },
      error: () => { this.loading = false; this.snack.open('Errore nel caricamento', 'Chiudi', { duration: 3000 }); }
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  addTransaction(): void {
    if (this.txForm.invalid) { this.txForm.markAllAsTouched(); return; }
    this.txSaving = true;
    const req: TransazioneScenarioRequest = {
      simbolo: this.txForm.value.simbolo!.toLowerCase(),
      tipoAsset: this.txForm.value.tipoAsset as any,
      quantita: this.txForm.value.quantita!,
      dataAcquisto: this.txForm.value.dataAcquisto!
    };
    this.scenarioService.aggiungiTransazione(this.scenarioId, req).subscribe({
      next: () => {
        this.txSaving = false;
        this.txForm.reset({ tipoAsset: 'CRYPTO', dataAcquisto: new Date().toISOString().substring(0, 10) });
        this.reloadScenario();
        this.snack.open('Asset aggiunto!', 'OK', { duration: 2500, panelClass: 'snack-success' });
      },
      error: (err) => {
        this.txSaving = false;
        this.snack.open(err.error?.message ?? 'Errore durante l\'aggiunta', 'Chiudi', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }

  removeTransaction(txId: number): void {
    if (!confirm('Rimuovere questo asset dallo scenario?')) return;
    this.scenarioService.rimuoviTransazione(this.scenarioId, txId).subscribe({
      next: () => {
        this.reloadScenario();
        this.snack.open('Asset rimosso', 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Errore durante la rimozione', 'Chiudi', { duration: 3000 })
    });
  }

  loadProjections(): void {
    this.projLoading = true;
    this.scenarioService.getProiezioni(this.scenarioId).subscribe({
      next: (proj) => {
        this.proiezioni = proj;
        this.projLoading = false;
        setTimeout(() => this.buildLineChart(), 100);
      },
      error: (err) => {
        this.projLoading = false;
        this.snack.open(err.error?.message ?? 'Errore nel calcolo delle proiezioni', 'Chiudi', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }

  private reloadScenario(): void {
    this.scenarioService.getScenario(this.scenarioId).subscribe({
      next: (s) => { this.scenario = s; },
      error: () => {}
    });
  }

  private buildLineChart(): void {
    if (!this.lineChartRef || !this.proiezioni) return;
    this.chart?.destroy();

    const points = this.projectionPoints;
    const isPositive = points[points.length - 1].pnl >= 0;
    const color = isPositive ? '#10b981' : '#ef4444';

    this.chart = new Chart(this.lineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: points.map(p => p.label),
        datasets: [{
          label: 'Valore Portafoglio',
          data: points.map(p => p.value),
          borderColor: color,
          backgroundColor: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: color,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` €${(ctx.parsed.y as number).toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#64748b' }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#64748b',
              callback: (v) => `€${Number(v).toLocaleString('it-IT')}`
            }
          }
        }
      }
    });
  }
}
