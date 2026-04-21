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
  templateUrl: './create-scenario-dialog.component.html',
  styleUrls: ['./create-scenario-dialog.component.css'],
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
