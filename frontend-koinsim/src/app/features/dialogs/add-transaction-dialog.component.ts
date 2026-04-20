import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TransazioneRequest } from '../../core/models/models';

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
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title>Aggiungi Transazione</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">

        <!-- Simbolo -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Simbolo</mat-label>
          <input matInput formControlName="simbolo" />
          <mat-hint>STOCK: ticker maiuscolo (es. AAPL, TSLA) · CRYPTO: nome minuscolo (es. bitcoin, ethereum)</mat-hint>
          <mat-error *ngIf="form.get('simbolo')?.hasError('required')">
            Campo obbligatorio
          </mat-error>
        </mat-form-field>

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

        <!-- Prezzo di acquisto -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Prezzo di acquisto (€)</mat-label>
          <input matInput type="number" formControlName="prezzoDiAcquisto" min="0.0001" step="0.01" />
          <span matTextPrefix>€&nbsp;</span>
          <mat-error *ngIf="form.get('prezzoDiAcquisto')?.hasError('required')">
            Campo obbligatorio
          </mat-error>
          <mat-error *ngIf="form.get('prezzoDiAcquisto')?.hasError('min')">
            Deve essere maggiore di 0
          </mat-error>
        </mat-form-field>

        <div style="display:flex; gap:16px">
          <!-- Percentuale Budget -->
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>% Budget</mat-label>
            <input matInput type="number" formControlName="percentuale" min="0.01" step="0.1" />
            <span matTextSuffix>%&nbsp;</span>
            <mat-hint>Budget: {{ data?.budgetIniziale | currency:'EUR':'symbol':'1.0-0' }}</mat-hint>
          </mat-form-field>

          <!-- Quantità -->
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Quantità</mat-label>
            <input matInput type="number" formControlName="quantita" min="0.0001" step="0.0001" />
            <mat-error *ngIf="form.get('quantita')?.hasError('required')">Obbligatorio</mat-error>
          </mat-form-field>
        </div>

        <!-- Data acquisto -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Data di acquisto</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="dataAcquisto" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
          <mat-error *ngIf="form.get('dataAcquisto')?.hasError('required')">
            Campo obbligatorio
          </mat-error>
        </mat-form-field>

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
  styles: [`.dialog-form { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; min-width: 360px; }
    .full-width { width: 100%; }`],
})
export class AddTransactionDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<AddTransactionDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    simbolo: ['', Validators.required],
    tipoAsset: ['STOCK', Validators.required],
    prezzoDiAcquisto: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    percentuale: [null as number | null, [Validators.min(0.01)]],
    quantita: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    dataAcquisto: [new Date(), Validators.required],
  });

  ngOnInit() {
    // Sincronizza percentuale -> quantità
    this.form.get('percentuale')?.valueChanges.subscribe(perc => {
      if (this.form.get('percentuale')?.dirty && perc != null) {
        const prezzo = this.form.get('prezzoDiAcquisto')?.value;
        const budget = this.data?.budgetIniziale;
        if (prezzo && prezzo > 0 && budget && budget > 0) {
          const importo = (budget * perc) / 100;
          const qta = Number((importo / prezzo).toFixed(6));
          this.form.get('quantita')?.setValue(qta, { emitEvent: false });
        }
      }
    });

    // Sincronizza quantità -> percentuale
    this.form.get('quantita')?.valueChanges.subscribe(qta => {
      if (this.form.get('quantita')?.dirty && qta != null) {
        const prezzo = this.form.get('prezzoDiAcquisto')?.value;
        const budget = this.data?.budgetIniziale;
        if (prezzo && prezzo > 0 && budget && budget > 0) {
          const perc = Number(((qta * prezzo) / budget * 100).toFixed(2));
          this.form.get('percentuale')?.setValue(perc, { emitEvent: false });
        }
      }
    });

    // Aggiorna quando cambia il prezzo
    this.form.get('prezzoDiAcquisto')?.valueChanges.subscribe(prezzo => {
      if (prezzo && prezzo > 0) {
        const budget = this.data?.budgetIniziale;
        const qta = this.form.get('quantita')?.value;
        const perc = this.form.get('percentuale')?.value;

        if (this.form.get('percentuale')?.dirty && perc) {
           const importo = (budget * perc) / 100;
           const newQta = Number((importo / prezzo).toFixed(6));
           this.form.get('quantita')?.setValue(newQta, { emitEvent: false });
        } else if (qta) {
           const newPerc = Number(((qta * prezzo) / budget * 100).toFixed(2));
           this.form.get('percentuale')?.setValue(newPerc, { emitEvent: false });
        }
      }
    });
  }

  confirm(): void {
    if (this.form.invalid) return;
    const raw = this.form.value;
    const date = raw.dataAcquisto as Date;
    // Formatta la data come stringa ISO YYYY-MM-DD per il backend
    const isoDate = date.toISOString().split('T')[0];

    const tipo = raw.tipoAsset as 'STOCK' | 'CRYPTO';
    // STOCK: ticker maiuscolo (es. AAPL). CRYPTO: ID CoinGecko minuscolo (es. bitcoin)
    const simbolo = tipo === 'STOCK'
      ? raw.simbolo!.toUpperCase()
      : raw.simbolo!.toLowerCase();

    const req: TransazioneRequest = {
      simbolo,
      tipoAsset: tipo,
      quantita: raw.quantita!,
      prezzoDiAcquisto: raw.prezzoDiAcquisto!,
      dataAcquisto: isoDate,
    };
    this.dialogRef.close(req);
  }
}
