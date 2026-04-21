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
  templateUrl: './scenario-list.component.html',
  styleUrls: ['./scenario-list.component.css'],
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
