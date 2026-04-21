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
  template: `
    <div class="auth-wrapper">
      <mat-card class="auth-card">
        <!-- Logo / titolo -->
        <mat-card-header class="auth-header">
          <mat-icon class="auth-logo">show_chart</mat-icon>
          <mat-card-title>Koinsim</mat-card-title>
          <mat-card-subtitle>Simulatore di portafoglio</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <mat-tab-group animationDuration="200ms">

            <!-- ── Tab Login ────────────────────────────────────── -->
            <mat-tab label="Accedi">
              <form
                [formGroup]="loginForm"
                (ngSubmit)="onLogin()"
                class="auth-form"
              >
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nome utente</mat-label>
                  <input matInput formControlName="nomeUtente" autocomplete="username" />
                  <mat-error *ngIf="loginForm.get('nomeUtente')?.hasError('required')">
                    Campo obbligatorio
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Password</mat-label>
                  <input
                    matInput
                    [type]="hideLogin ? 'password' : 'text'"
                    formControlName="password"
                    autocomplete="current-password"
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="hideLogin = !hideLogin"
                  >
                    <mat-icon>{{ hideLogin ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                    Campo obbligatorio
                  </mat-error>
                </mat-form-field>

                <button
                  mat-raised-button
                  color="primary"
                  class="full-width submit-btn"
                  type="submit"
                  [disabled]="loginForm.invalid || loading"
                >
                  @if (loading) {
                    <mat-spinner diameter="20" />
                  } @else {
                    Accedi
                  }
                </button>
              </form>
            </mat-tab>

            <!-- ── Tab Registrazione ───────────────────────────── -->
            <mat-tab label="Registrati">
              <form
                [formGroup]="registerForm"
                (ngSubmit)="onRegister()"
                class="auth-form"
              >
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nome utente</mat-label>
                  <input matInput formControlName="nomeUtente" autocomplete="username" />
                  <mat-error *ngIf="registerForm.get('nomeUtente')?.hasError('required')">
                    Campo obbligatorio
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" autocomplete="email" type="email" />
                  <mat-error *ngIf="registerForm.get('email')?.hasError('required')">
                    Campo obbligatorio
                  </mat-error>
                  <mat-error *ngIf="registerForm.get('email')?.hasError('email')">
                    Email non valida
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Password</mat-label>
                  <input
                    matInput
                    [type]="hideReg ? 'password' : 'text'"
                    formControlName="password"
                    autocomplete="new-password"
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="hideReg = !hideReg"
                  >
                    <mat-icon>{{ hideReg ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  <mat-error *ngIf="registerForm.get('password')?.hasError('required')">
                    Campo obbligatorio
                  </mat-error>
                  <mat-error *ngIf="registerForm.get('password')?.hasError('minlength')">
                    Minimo 6 caratteri
                  </mat-error>
                </mat-form-field>

                <button
                  mat-raised-button
                  color="primary"
                  class="full-width submit-btn"
                  type="submit"
                  [disabled]="registerForm.invalid || loading"
                >
                  @if (loading) {
                    <mat-spinner diameter="20" />
                  } @else {
                    Registrati
                  }
                </button>
              </form>
            </mat-tab>

          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a237e 0%, #3f51b5 100%);
    }
    .auth-card {
      width: 380px;
      padding: 8px;
    }
    .auth-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 0 8px;
    }
    .auth-logo {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #3f51b5;
      margin-bottom: 8px;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px 0;
    }
    .full-width { width: 100%; }
    .submit-btn {
      margin-top: 8px;
      height: 44px;
    }
    mat-spinner { margin: 0 auto; }
  `],
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
