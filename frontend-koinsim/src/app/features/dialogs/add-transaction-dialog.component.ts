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
  templateUrl: './add-transaction-dialog.component.html',
  styleUrls: ['./add-transaction-dialog.component.css'],
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
