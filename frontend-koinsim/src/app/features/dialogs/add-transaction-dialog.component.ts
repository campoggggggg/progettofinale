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
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SimboloDisponibile, TipoAsset, TransazioneCreateRequest } from '../../core/models/models';
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
    MatButtonModule,
    MatAutocompleteModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './add-transaction-dialog.component.html',
  styleUrls: ['./add-transaction-dialog.component.css'],
})
export class AddTransactionDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<AddTransactionDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private marketDataService = inject(MarketDataService);
  private snack = inject(MatSnackBar);

  simboliDisponibili: SimboloDisponibile[] = [];
  filteredSimboli: SimboloDisponibile[] = [];
  loading = false;

  form = this.fb.group({
    simbolo: ['', Validators.required],
    tipoAsset: [null as TipoAsset | null, Validators.required],
    percentuale: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(100)]],
  });

  ngOnInit(): void {
    this.marketDataService.getSimboli().subscribe(lista => {
      this.simboliDisponibili = lista;
      this.filteredSimboli = lista;
    });

    this.form.get('simbolo')!.valueChanges.subscribe(val => {
      const upper = (val || '').toUpperCase();
      this.filteredSimboli = this.simboliDisponibili.filter(s =>
        s.simbolo.toUpperCase().includes(upper)
      );
      const match = this.simboliDisponibili.find(s => s.simbolo.toUpperCase() === upper);
      this.form.get('tipoAsset')!.setValue(match ? match.tipoAsset : null, { emitEvent: false });
    });
  }

  get isNuovoSimbolo(): boolean {
    const val = (this.form.get('simbolo')?.value || '').toUpperCase();
    return !!val && !this.simboliDisponibili.some(s => s.simbolo.toUpperCase() === val);
  }

  get budgetPercRimanente(): number {
    if (!this.data?.budgetIniziale) return 0;
    return (this.data.budgetRimanente / this.data.budgetIniziale) * 100;
  }

  confirm(): void {
    if (this.form.invalid || this.loading) return;
    const { simbolo, tipoAsset, percentuale } = this.form.value;

    const req: TransazioneCreateRequest = {
      simbolo: simbolo!.toUpperCase(),
      tipoAsset: tipoAsset!,
      percentuale: percentuale!,
    };

    if (!this.isNuovoSimbolo) {
      this.dialogRef.close(req);
      return;
    }

    // Simbolo nuovo: fetch dati storici da Stooq prima di creare la transazione
    this.loading = true;
    this.marketDataService.fetch({
      symbol: req.simbolo,
      type: req.tipoAsset,
      stooqSymbol: '',
    }).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(req);
      },
      error: err => {
        this.loading = false;
        const msg = err?.error?.message ?? 'Impossibile recuperare i dati per questo simbolo';
        this.snack.open(msg, 'Chiudi', { duration: 5000 });
      },
    });
  }
}
