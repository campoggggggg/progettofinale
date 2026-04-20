import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import {
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ScenarioRequest } from '../../core/models/models';

@Component({
  selector: 'app-create-scenario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Nuovo Scenario</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome scenario</mat-label>
          <input matInput formControlName="nome" />
          <mat-error *ngIf="form.get('nome')?.hasError('required')">
            Campo obbligatorio
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descrizione / Note</mat-label>
          <textarea matInput formControlName="descrizione" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Budget iniziale (€)</mat-label>
          <input matInput type="number" formControlName="budgetIniziale" min="1" />
          <span matTextPrefix>€&nbsp;</span>
          <mat-error *ngIf="form.get('budgetIniziale')?.hasError('required')">
            Campo obbligatorio
          </mat-error>
          <mat-error *ngIf="form.get('budgetIniziale')?.hasError('min')">
            Deve essere maggiore di 0
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
        Crea
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; min-width: 340px; }
    .full-width { width: 100%; }`],
})
export class CreateScenarioDialogComponent {
  private dialogRef = inject(MatDialogRef<CreateScenarioDialogComponent>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    nome: ['', Validators.required],
    descrizione: [''],
    budgetIniziale: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  confirm(): void {
    if (this.form.invalid) return;
    const req: ScenarioRequest = {
      nome: this.form.value.nome!,
      descrizione: this.form.value.descrizione ?? '',
      budgetIniziale: this.form.value.budgetIniziale!,
    };
    this.dialogRef.close(req);
  }
}
