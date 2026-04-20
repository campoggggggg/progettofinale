import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScenarioService } from '../../core/services/scenario.service';
import { ScenarioResponse, ScenarioRequest } from '../../core/models/models';

@Component({
  selector: 'app-scenario-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule, MatTooltipModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Scenari di Simulazione</h1>
          <p>Crea portafogli virtuali e simula le proiezioni Monte Carlo</p>
        </div>
        <button mat-flat-button class="btn-primary" (click)="showForm = !showForm">
          <mat-icon>{{ showForm ? 'close' : 'add' }}</mat-icon>
          {{ showForm ? 'Annulla' : 'Nuovo Scenario' }}
        </button>
      </div>

      <!-- Create Form -->
      <div class="form-card" *ngIf="showForm">
        <h3><mat-icon>science</mat-icon> Nuovo Scenario</h3>
        <form [formGroup]="form" (ngSubmit)="createScenario()" class="scenario-form">
          <mat-form-field appearance="outline">
            <mat-label>Nome Scenario</mat-label>
            <input matInput formControlName="nome" placeholder="es. Portafoglio Aggressivo">
            <mat-error *ngIf="form.get('nome')?.hasError('required')">Obbligatorio</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Descrizione</mat-label>
            <textarea matInput formControlName="descrizione" rows="2" placeholder="Descrivi la strategia..."></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Budget Iniziale (€)</mat-label>
            <input matInput formControlName="budgetIniziale" type="number" min="1" placeholder="10000">
            <span matPrefix>€&nbsp;</span>
            <mat-error *ngIf="form.get('budgetIniziale')?.hasError('required')">Obbligatorio</mat-error>
            <mat-error *ngIf="form.get('budgetIniziale')?.hasError('min')">Deve essere > 0</mat-error>
          </mat-form-field>

          <button mat-flat-button class="btn-primary submit-btn" type="submit" [disabled]="saving">
            <mat-spinner *ngIf="saving" diameter="18" />
            <span>{{ saving ? 'Creazione...' : 'Crea Scenario' }}</span>
          </button>
        </form>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-overlay">
        <mat-spinner diameter="48" />
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading && scenari.length === 0 && !showForm" class="empty-state" style="margin-top:60px">
        <mat-icon>science</mat-icon>
        <h3>Nessuno scenario creato</h3>
        <p>Crea il tuo primo scenario di simulazione</p>
        <button mat-flat-button class="btn-primary" style="margin-top:16px" (click)="showForm = true">
          Crea Scenario
        </button>
      </div>

      <!-- Scenarios Grid -->
      <div *ngIf="!loading && scenari.length > 0" class="scenarios-grid">
        <div class="scenario-card" *ngFor="let s of scenari">
          <div class="scenario-header">
            <div class="scenario-icon">S</div>
            <div class="scenario-meta">
              <h3>{{ s.nome }}</h3>
              <span class="scenario-date">{{ s.dataCreazione | date:'dd MMM yyyy' }}</span>
            </div>
          </div>

          <p class="scenario-desc" *ngIf="s.descrizione">{{ s.descrizione }}</p>

          <!-- Budget Bar -->
          <div class="budget-section">
            <div class="budget-row">
              <span class="budget-label">Budget Iniziale</span>
              <span class="budget-val">{{ s.budgetIniziale | currency:'EUR':'symbol':'1.0-0' }}</span>
            </div>
            <div class="budget-bar-bg">
              <div class="budget-bar-fill" [style.width.%]="getBudgetPerc(s)"></div>
            </div>
            <div class="budget-row" style="margin-top: 6px">
              <span class="budget-label">Rimanente</span>
              <span class="budget-remaining" [class.low]="getBudgetPerc(s) < 20">
                {{ s.budgetRimanente | currency:'EUR':'symbol':'1.0-0' }}
                ({{ getBudgetPerc(s) | number:'1.0-0' }}%)
              </span>
            </div>
          </div>

          <div class="scenario-footer">
            <span class="tx-count">
              <mat-icon>receipt</mat-icon> {{ s.transazioni?.length ?? 0 }} transazioni
            </span>
            <div class="scenario-actions">
              <button mat-icon-button class="btn-danger" (click)="deleteScenario(s)" matTooltip="Elimina">
                <mat-icon>delete_outline</mat-icon>
              </button>
              <a [routerLink]="['/scenarios', s.id]" mat-flat-button class="btn-primary detail-btn">
                Dettaglio <mat-icon>arrow_forward</mat-icon>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; @media (max-width: 768px) { padding: 20px 16px; } }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;
      h1 { font-size: 24px; font-weight: 700; }
      p { color: var(--text-secondary); margin-top: 4px; }
      @media (max-width: 480px) { flex-direction: column; gap: 16px; }
    }

    .form-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 24px;
      h3 { font-size: 15px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; mat-icon { color: var(--accent-teal); } }
    }
    .scenario-form {
      display: grid;
      grid-template-columns: 1fr 1.5fr 1fr auto;
      gap: 12px;
      align-items: flex-start;
      @media (max-width: 900px) { grid-template-columns: 1fr 1fr; }
      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }
    .submit-btn { height: 56px; border-radius: 10px !important; font-weight: 600; display: flex; align-items: center; gap: 6px; }

    .scenarios-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }

    .scenario-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      transition: border-color 0.2s, transform 0.2s;
      &:hover { border-color: rgba(0,212,170,0.4); transform: translateY(-2px); }
    }
    .scenario-header { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
    .scenario-icon {
      width: 44px; height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(0,212,170,0.3), rgba(99,102,241,0.2));
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; color: var(--accent-teal);
    }
    .scenario-meta h3 { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .scenario-date { font-size: 12px; color: var(--text-muted); }
    .scenario-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5; }

    .budget-section { background: var(--bg-elevated); border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; }
    .budget-row { display: flex; justify-content: space-between; align-items: center; }
    .budget-label { font-size: 12px; color: var(--text-muted); }
    .budget-val { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .budget-remaining { font-size: 12px; font-weight: 600; color: var(--accent-teal); &.low { color: var(--danger); } }
    .budget-bar-bg { height: 6px; background: var(--border-color); border-radius: 3px; margin-top: 8px; overflow: hidden; }
    .budget-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent-teal), var(--accent-purple)); border-radius: 3px; transition: width 0.6s; }

    .scenario-footer { display: flex; justify-content: space-between; align-items: center; }
    .tx-count { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; mat-icon { font-size: 14px; height: 14px; width: 14px; } }
    .scenario-actions { display: flex; align-items: center; gap: 6px; }
    .detail-btn { height: 32px !important; font-size: 12px !important; border-radius: 8px !important; display: flex; align-items: center; gap: 4px; mat-icon { font-size: 14px; height: 14px; width: 14px; } }
  `]
})
export class ScenarioListComponent implements OnInit {
  private scenarioService = inject(ScenarioService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  scenari: ScenarioResponse[] = [];
  loading = true;
  saving = false;
  showForm = false;

  form = this.fb.group({
    nome: ['', Validators.required],
    descrizione: [''],
    budgetIniziale: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    this.loadScenari();
  }

  private loadScenari(): void {
    this.scenarioService.getScenari().subscribe({
      next: (data) => { this.scenari = data; this.loading = false; },
      error: () => { this.loading = false; this.snack.open('Errore nel caricamento degli scenari', 'Chiudi', { duration: 3000 }); }
    });
  }

  createScenario(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const req: ScenarioRequest = {
      nome: this.form.value.nome!,
      descrizione: this.form.value.descrizione ?? '',
      budgetIniziale: this.form.value.budgetIniziale!
    };
    this.scenarioService.creaScenario(req).subscribe({
      next: (created) => {
        this.saving = false;
        this.scenari.unshift(created);
        this.form.reset();
        this.showForm = false;
        this.snack.open('Scenario creato!', 'OK', { duration: 2500, panelClass: 'snack-success' });
      },
      error: () => { this.saving = false; this.snack.open('Errore nella creazione', 'Chiudi', { duration: 3000, panelClass: 'snack-error' }); }
    });
  }

  deleteScenario(s: ScenarioResponse): void {
    if (!confirm(`Eliminare lo scenario "${s.nome}"?`)) return;
    this.scenarioService.eliminaScenario(s.id).subscribe({
      next: () => {
        this.scenari = this.scenari.filter(x => x.id !== s.id);
        this.snack.open('Scenario eliminato', 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Errore durante l\'eliminazione', 'Chiudi', { duration: 3000 })
    });
  }

  getBudgetPerc(s: ScenarioResponse): number {
    if (!s.budgetIniziale || s.budgetIniziale === 0) return 0;
    return Math.max(0, (s.budgetRimanente / s.budgetIniziale) * 100);
  }
}
