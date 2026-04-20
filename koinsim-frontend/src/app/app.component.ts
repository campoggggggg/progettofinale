import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  template: `
    <div class="app-shell">
      <app-navbar *ngIf="auth.isLoggedIn$ | async" />
      <main class="main-content" [class.with-nav]="auth.isLoggedIn$ | async">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      min-height: 100vh;
      background: var(--bg-primary);
    }
    .main-content {
      min-height: 100vh;
      &.with-nav {
        padding-top: 64px;
        @media (max-width: 768px) {
          padding-top: 56px;
          padding-bottom: 70px;
        }
      }
    }
  `]
})
export class AppComponent {
  auth = inject(AuthService);
}
