import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScenarioService } from '../../core/services/scenario.service';
import { AuthService } from '../../core/services/auth.service';
import { ScenarioResponse, ScenarioRequest } from '../../core/models/models';
import { CreateScenarioDialogComponent } from '../dialogs/create-scenario-dialog.component';

@Component({
  selector: 'app-scenario-list',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  template: `
    <!-- Toolbar -->
    <mat-toolbar color="primary">
      <mat-icon style="margin-right:8px">show_chart</mat-icon>
      <span>Koinsim</span>
      <span class="spacer"></span>
      <button mat-icon-button (click)="auth.logout()" matTooltip="Logout">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <div class="list-container">

      <!-- Header -->
      <div class="list-header">
        <h2>I tuoi scenari</h2>
        <button mat-raised-button color="primary" (click)="openCreate()">
          <mat-icon>add</mat-icon> Nuovo scenario
        </button>
      </div>

      <!-- Loading -->
      @if (loading) {
        <div class="center-spinner">
          <mat-spinner />
        </div>
      }

      <!-- Lista scenari -->
      @if (!loading && scenari.length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">folder_open</mat-icon>
          <p>Nessuno scenario ancora. Crea il tuo primo scenario!</p>
        </div>
      }

      <div class="scenari-grid">
        @for (s of scenari; track s.id) {
          <mat-card class="scenario-card" (click)="openDashboard(s.id)">
            <mat-card-header>
              <mat-icon mat-card-avatar color="primary">pie_chart</mat-icon>
              <mat-card-title>{{ s.nome }}</mat-card-title>
              <mat-card-subtitle>
                Creato il {{ s.dataCreazione | date:'dd/MM/yyyy' }}
              </mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <p class="scenario-desc">{{ s.descrizione || '—' }}</p>

              <div class="scenario-budget">
                <div class="budget-item">
                  <span class="budget-label">Budget</span>
                  <span class="budget-val">{{ s.budgetIniziale | currency:'EUR':'symbol':'1.0-0' }}</span>
                </div>
                <div class="budget-item">
                  <span class="budget-label">Speso</span>
                  <span class="budget-val speso">
                    {{ s.budgetIniziale - s.budgetRimanente | currency:'EUR':'symbol':'1.0-0' }}
                  </span>
                </div>
                <div class="budget-item">
                  <span class="budget-label">Disponibile</span>
                  <span class="budget-val rimanente">
                    {{ s.budgetRimanente | currency:'EUR':'symbol':'1.0-0' }}
                  </span>
                </div>
              </div>

              <mat-chip-set>
                <mat-chip>{{ s.transazioni.length }} posizioni</mat-chip>
              </mat-chip-set>
            </mat-card-content>

            <mat-card-actions align="end">
              <button
                mat-icon-button
                color="warn"
                matTooltip="Elimina scenario"
                (click)="deleteScenario($event, s.id)"
              >
                <mat-icon>delete</mat-icon>
              </button>
              <button mat-button color="primary">
                Apri dashboard <mat-icon>arrow_forward</mat-icon>
              </button>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [`
    .list-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    .list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .list-header h2 { margin: 0; font-size: 1.5rem; }
    .scenari-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .scenario-card {
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.2s;
      &:hover { box-shadow: 0 6px 20px rgba(0,0,0,.15); transform: translateY(-2px); }
    }
    .scenario-desc { color: #666; font-size: 0.9rem; margin: 8px 0; min-height: 20px; }
    .scenario-budget {
      display: flex;
      gap: 16px;
      margin: 12px 0;
    }
    .budget-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .budget-label { font-size: 0.75rem; color: #888; }
    .budget-val { font-weight: 500; font-size: 1rem; }
    .budget-val.speso { color: #e53935; }
    .budget-val.rimanente { color: #43a047; }
    .center-spinner { display: flex; justify-content: center; padding: 64px; }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px;
      color: #999;
    }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; }
    .spacer { flex: 1 1 auto; }
  `],
})
export class ScenarioListComponent implements OnInit {
  auth = inject(AuthService);
  private scenarioSvc = inject(ScenarioService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  scenari: ScenarioResponse[] = [];
  loading = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.scenarioSvc.lista().subscribe({
      next: s => { this.scenari = s; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openCreate(): void {
    this.dialog
      .open(CreateScenarioDialogComponent, { width: '420px' })
      .afterClosed()
      .subscribe((req: ScenarioRequest | undefined) => {
        if (!req) return;
        this.scenarioSvc.crea(req).subscribe({
          next: () => {
            this.snack.open('Scenario creato!', 'OK', { duration: 3000 });
            this.load();
          },
          error: err =>
            this.snack.open(
              err.error?.message ?? 'Errore nella creazione',
              'Chiudi',
              { duration: 4000 }
            ),
        });
      });
  }

  openDashboard(id: number): void {
    this.router.navigate(['/scenari', id]);
  }

  deleteScenario(event: Event, id: number): void {
    event.stopPropagation();
    if (!confirm('Eliminare questo scenario?')) return;
    this.scenarioSvc.elimina(id).subscribe({
      next: () => {
        this.snack.open('Scenario eliminato', 'OK', { duration: 3000 });
        this.load();
      },
      error: () =>
        this.snack.open('Errore durante l\'eliminazione', 'Chiudi', { duration: 4000 }),
    });
  }
}
