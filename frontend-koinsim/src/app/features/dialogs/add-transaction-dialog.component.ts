import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { TransazioneCreateRequest } from '../../core/models/models';

@Component({
  selector: 'app-add-transaction-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Aggiungi Transazione</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">

        <!-- Tipo asset -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tipo asset</mat-label>
          <mat-select formControlName="tipoAsset">
            <mat-option value="STOCK">Azione (STOCK)</mat-option>
            <mat-option value="CRYPTO">Criptovaluta (CRYPTO)</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('tipoAsset')?.hasError('required')">
            Campo obbligatorio
          </mat-error>
        </mat-form-field>

        <!-- Simbolo -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Simbolo</mat-label>
          <input matInput formControlName="simbolo" [placeholder]="simboloHint" />
          <mat-hint>{{ simboloHint }}</mat-hint>
          <mat-error *ngIf="form.get('simbolo')?.hasError('required')">
            Campo obbligatorio
          </mat-error>
        </mat-form-field>

        <!-- Percentuale budget -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>% del budget da investire</mat-label>
          <input matInput type="number" formControlName="percentuale" min="0.01" max="100" step="0.1" />
          <span matTextSuffix>%</span>
          <mat-hint>Budget disponibile: {{ data?.budgetRimanente | currency:'EUR':'symbol':'1.0-0' }}</mat-hint>
          <mat-error *ngIf="form.get('percentuale')?.hasError('required')">Campo obbligatorio</mat-error>
          <mat-error *ngIf="form.get('percentuale')?.hasError('min')">Deve essere maggiore di 0</mat-error>
          <mat-error *ngIf="form.get('percentuale')?.hasError('max')">Non può superare il 100%</mat-error>
        </mat-form-field>

        <p class="info-text">
          Prezzo e data di acquisto vengono recuperati automaticamente dal sistema.
        </p>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annulla</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="form.invalid"
        (click)="confirm()"
      >
        Aggiungi
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px;
      min-width: 380px;
    }
    .full-width { width: 100%; }
    .info-text {
      font-size: 12px;
      color: #888;
      margin: 4px 0 0;
    }
  `],
})
export class AddTransactionDialogComponent {
  private dialogRef = inject(MatDialogRef<AddTransactionDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    tipoAsset: ['STOCK', Validators.required],
    simbolo: ['', Validators.required],
    percentuale: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(100)]],
  });

  get simboloHint(): string {
    return this.form.get('tipoAsset')?.value === 'STOCK'
      ? 'Ticker maiuscolo (es. AAPL, TSLA)'
      : 'ID CoinGecko minuscolo (es. bitcoin, ethereum)';
  }

  confirm(): void {
    if (this.form.invalid) return;
    const raw = this.form.value;
    const tipo = raw.tipoAsset as 'STOCK' | 'CRYPTO';
    const simbolo = tipo === 'STOCK'
      ? raw.simbolo!.toUpperCase()
      : raw.simbolo!.toLowerCase();

    const req: TransazioneCreateRequest = {
      simbolo,
      tipoAsset: tipo,
      percentuale: raw.percentuale!,
    };
    this.dialogRef.close(req);
  }
}
