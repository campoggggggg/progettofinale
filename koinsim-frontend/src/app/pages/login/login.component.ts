import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
    <div class="auth-bg">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">₿</div>
          <h1>KoinSim</h1>
          <p>Simula il tuo portafoglio crypto & stock</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          <mat-form-field appearance="outline">
            <mat-label>Nome utente</mat-label>
            <input matInput formControlName="nomeUtente" placeholder="Il tuo username">
            <mat-icon matPrefix>person</mat-icon>
            <mat-error *ngIf="form.get('nomeUtente')?.hasError('required')">Campo obbligatorio</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput [type]="hidePass ? 'password' : 'text'" formControlName="password">
            <mat-icon matPrefix>lock</mat-icon>
            <button mat-icon-button matSuffix type="button" (click)="hidePass = !hidePass">
              <mat-icon>{{ hidePass ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="form.get('password')?.hasError('required')">Campo obbligatorio</mat-error>
          </mat-form-field>

          <button mat-flat-button class="btn-primary submit-btn" type="submit" [disabled]="loading">
            <mat-spinner *ngIf="loading" diameter="20" color="accent" />
            <span *ngIf="!loading">Accedi</span>
          </button>
        </form>

        <div class="auth-footer">
          Non hai un account? <a routerLink="/register">Registrati</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-bg {
      min-height: 100vh;
      background: radial-gradient(ellipse at 50% 0%, rgba(0,212,170,0.12) 0%, transparent 60%), var(--bg-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 48px 40px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
      @media (max-width: 480px) { padding: 32px 24px; }
    }
    .auth-header {
      text-align: center;
      margin-bottom: 36px;
    }
    .logo {
      font-size: 40px;
      background: linear-gradient(135deg, var(--accent-teal), var(--accent-purple));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 26px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.5px;
    }
    p {
      color: var(--text-secondary);
      font-size: 13px;
      margin-top: 6px;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .submit-btn {
      margin-top: 8px;
      height: 48px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 12px !important;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .auth-footer {
      text-align: center;
      margin-top: 24px;
      color: var(--text-secondary);
      font-size: 13px;
      a { color: var(--accent-teal); text-decoration: none; font-weight: 500; &:hover { text-decoration: underline; } }
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  hidePass = true;
  loading = false;

  form = this.fb.group({
    nomeUtente: ['', Validators.required],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.login(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        const msg = err.status === 401 ? 'Credenziali non valide' : 'Errore di connessione';
        this.snack.open(msg, 'Chiudi', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }
}
