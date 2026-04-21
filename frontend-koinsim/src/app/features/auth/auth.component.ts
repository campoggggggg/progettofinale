import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTabsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
})
export class AuthComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  loading = false;
  hideLogin = true;
  hideReg = true;

  loginForm = this.fb.group({
    nomeUtente: ['', Validators.required],
    password: ['', Validators.required],
  });

  registerForm = this.fb.group({
    nomeUtente: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onLogin(): void {
    if (this.loginForm.invalid) return;
    this.loading = true;
    const { nomeUtente, password } = this.loginForm.value;
    this.auth.login({ nomeUtente: nomeUtente!, password: password! }).subscribe({
      next: () => this.router.navigate(['/scenari']),
      error: err => {
        this.loading = false;
        this.snack.open(
          err.error?.message ?? 'Credenziali non valide',
          'Chiudi',
          { duration: 4000 }
        );
      },
    });
  }

  onRegister(): void {
    if (this.registerForm.invalid) return;
    this.loading = true;
    const { nomeUtente, email, password } = this.registerForm.value;
    this.auth
      .registrazione({ nomeUtente: nomeUtente!, email: email!, password: password! })
      .subscribe({
        next: () => {
          this.loading = false;
          this.snack.open('Registrazione completata. Accedi!', 'OK', {
            duration: 4000,
          });
        },
        error: err => {
          this.loading = false;
          this.snack.open(
            err.error?.message ?? 'Errore nella registrazione',
            'Chiudi',
            { duration: 4000 }
          );
        },
      });
  }
}
