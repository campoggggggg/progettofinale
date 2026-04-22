import { Component, inject, OnInit } from '@angular/core';
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
import { SimboloDisponibile, TransazioneCreateRequest } from '../../core/models/models';
import { MarketDataService } from '../../core/services/market-data.service';

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
export class AddTransactionDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<AddTransactionDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private marketDataService = inject(MarketDataService);

  simboliDisponibili: SimboloDisponibile[] = [];

  form = this.fb.group({
    simboloSelezionato: [null as SimboloDisponibile | null, Validators.required],
    percentuale: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(100)]],
  });

  ngOnInit(): void {
    this.marketDataService.getSimboli().subscribe(lista => {
      this.simboliDisponibili = lista;
    });
  }

  get budgetPercRimanente(): number {
    if (!this.data?.budgetIniziale) return 0;
    return (this.data.budgetRimanente / this.data.budgetIniziale) * 100;
  }

  confirm(): void {
    if (this.form.invalid) return;
    const { simboloSelezionato, percentuale } = this.form.value;

    const req: TransazioneCreateRequest = {
      simbolo: simboloSelezionato!.simbolo,
      tipoAsset: simboloSelezionato!.tipoAsset,
      percentuale: percentuale!,
    };
    this.dialogRef.close(req);
  }
}
