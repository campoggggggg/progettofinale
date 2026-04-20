import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
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
import { PortfolioService } from '../../core/services/portfolio.service';
import { Transazione, TransazioneRequest } from '../../core/models/models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTableModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatTooltipModule, MatChipsModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Portafoglio Reale</h1>
          <p>Gestisci le tue transazioni di acquisto</p>
        </div>
      </div>

      <!-- Add transaction form -->
      <div class="form-card">
        <h3><mat-icon>add_circle</mat-icon> Aggiungi Transazione</h3>
        <form [formGroup]="form" (ngSubmit)="addTransaction()" class="transaction-form">
          <mat-form-field appearance="outline">
            <mat-label>Simbolo</mat-label>
            <input matInput formControlName="simbolo" placeholder="es. BTC, AAPL" style="text-transform:uppercase">
            <mat-hint>Bitcoin → bitcoin, Apple → AAPL</mat-hint>
            <mat-error *ngIf="form.get('simbolo')?.hasError('required')">Obbligatorio</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tipo Asset</mat-label>
            <mat-select formControlName="tipoAsset">
              <mat-option value="CRYPTO">🔮 Crypto</mat-option>
              <mat-option value="STOCK">📈 Azione</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('tipoAsset')?.hasError('required')">Obbligatorio</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Quantità</mat-label>
            <input matInput formControlName="quantita" type="number" step="0.0001" min="0.0001">
            <mat-error *ngIf="form.get('quantita')?.hasError('required')">Obbligatorio</mat-error>
            <mat-error *ngIf="form.get('quantita')?.hasError('min')">Deve essere > 0</mat-error>
          </mat-form-field>

          <button mat-flat-button class="btn-primary submit-btn" type="submit" [disabled]="saving">
            <mat-spinner *ngIf="saving" diameter="18" />
            <mat-icon *ngIf="!saving">add</mat-icon>
            <span>{{ saving ? 'Aggiunta...' : 'Aggiungi' }}</span>
          </button>
        </form>
      </div>

      <!-- Table -->
      <div class="table-card">
        <div class="card-top">
          <h3>Le tue Transazioni <span class="count-badge">{{ transactions.length }}</span></h3>
        </div>

        <div *ngIf="loading" class="loading-overlay">
          <mat-spinner diameter="40" />
        </div>

        <div *ngIf="!loading && transactions.length === 0" class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <h3>Nessuna transazione</h3>
          <p>Aggiungi il tuo primo asset sopra</p>
        </div>

        <div *ngIf="!loading && transactions.length > 0" class="table-wrapper">
          <table mat-table [dataSource]="transactions">
            <ng-container matColumnDef="simbolo">
              <th mat-header-cell *matHeaderCellDef>Simbolo</th>
              <td mat-cell *matCellDef="let t">
                <div class="symbol-cell">
                  <div class="sym-icon" [class.crypto]="t.tipoAsset === 'CRYPTO'" [class.stock]="t.tipoAsset === 'STOCK'">
                    {{ t.simbolo.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <span class="sym-name">{{ t.simbolo.toUpperCase() }}</span>
                    <span class="badge" [class.badge-crypto]="t.tipoAsset === 'CRYPTO'" [class.badge-stock]="t.tipoAsset === 'STOCK'">
                      {{ t.tipoAsset }}
                    </span>
                  </div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="quantita">
              <th mat-header-cell *matHeaderCellDef>Quantità</th>
              <td mat-cell *matCellDef="let t">{{ t.quantita }}</td>
            </ng-container>

            <ng-container matColumnDef="prezzo">
              <th mat-header-cell *matHeaderCellDef>Prezzo Acquisto</th>
              <td mat-cell *matCellDef="let t">{{ t.prezzoDiAcquisto | currency:'EUR':'symbol':'1.2-2' }}</td>
            </ng-container>

            <ng-container matColumnDef="data">
              <th mat-header-cell *matHeaderCellDef>Data</th>
              <td mat-cell *matCellDef="let t">{{ t.dataAcquisto | date:'dd/MM/yyyy' }}</td>
            </ng-container>

            <ng-container matColumnDef="azioni">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let t">
                <button mat-icon-button class="btn-danger" (click)="deleteTransaction(t)" matTooltip="Elimina">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; @media (max-width: 768px) { padding: 20px 16px; } }
    .page-header { margin-bottom: 24px; h1 { font-size: 24px; font-weight: 700; } p { color: var(--text-secondary); margin-top: 4px; } }

    .form-card, .table-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 20px;
      h3 {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        mat-icon { color: var(--accent-teal); font-size: 20px; height: 20px; width: 20px; }
      }
    }

    .transaction-form {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr auto;
      gap: 12px;
      align-items: flex-start;
      @media (max-width: 768px) { grid-template-columns: 1fr 1fr; }
      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }
    .submit-btn {
      height: 56px;
      border-radius: 10px !important;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      @media (max-width: 480px) { width: 100%; }
    }

    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; h3 { margin-bottom: 0; } }
    .count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,212,170,0.15);
      color: var(--accent-teal);
      border-radius: 20px;
      padding: 2px 10px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }

    .table-wrapper { overflow-x: auto; }
    table { width: 100%; }

    .symbol-cell { display: flex; align-items: center; gap: 10px; }
    .sym-icon {
      width: 34px; height: 34px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px;
      &.crypto { background: rgba(99,102,241,0.2); color: var(--accent-purple); }
      &.stock { background: rgba(0,212,170,0.15); color: var(--accent-teal); }
    }
    .sym-name { font-weight: 600; font-size: 13px; margin-right: 6px; }
  `]
})
export class TransactionsComponent implements OnInit {
  private portfolioService = inject(PortfolioService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  transactions: Transazione[] = [];
  loading = true;
  saving = false;
  columns = ['simbolo', 'quantita', 'prezzo', 'data', 'azioni'];

  form = this.fb.group({
    simbolo: ['', Validators.required],
    tipoAsset: ['CRYPTO', Validators.required],
    quantita: [null as number | null, [Validators.required, Validators.min(0.0001)]]
  });

  ngOnInit(): void {
    this.loadTransactions();
  }

  private loadTransactions(): void {
    this.portfolioService.getTransazioni().subscribe({
      next: (data) => { this.transactions = data; this.loading = false; },
      error: () => { this.loading = false; this.snack.open('Errore nel caricamento', 'Chiudi', { duration: 3000 }); }
    });
  }

  addTransaction(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const req: TransazioneRequest = {
      simbolo: this.form.value.simbolo!.toLowerCase(),
      tipoAsset: this.form.value.tipoAsset as any,
      quantita: this.form.value.quantita!
    };
    this.portfolioService.addTransazione(req).subscribe({
      next: () => {
        this.saving = false;
        this.form.reset({ tipoAsset: 'CRYPTO' });
        this.loadTransactions();
        this.snack.open('Transazione aggiunta!', 'OK', { duration: 2500, panelClass: 'snack-success' });
      },
      error: (err) => {
        this.saving = false;
        const msg = err.error?.message ?? 'Errore durante il salvataggio';
        this.snack.open(msg, 'Chiudi', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }

  deleteTransaction(t: Transazione): void {
    if (!confirm(`Eliminare ${t.simbolo.toUpperCase()} (${t.quantita})?`)) return;
    this.portfolioService.deleteTransazione(t.id).subscribe({
      next: () => {
        this.transactions = this.transactions.filter(x => x.id !== t.id);
        this.snack.open('Transazione eliminata', 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Errore durante l\'eliminazione', 'Chiudi', { duration: 3000 })
    });
  }
}
