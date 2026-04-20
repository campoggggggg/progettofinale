import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule],
  template: `
    <!-- Top Navbar Desktop -->
    <nav class="navbar">
      <div class="navbar-brand">
        <span class="brand-icon">₿</span>
        <span class="brand-name">KoinSim</span>
      </div>

      <div class="navbar-links hide-mobile">
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
          <mat-icon>dashboard</mat-icon> Dashboard
        </a>
        <a routerLink="/transactions" routerLinkActive="active" class="nav-link">
          <mat-icon>swap_horiz</mat-icon> Portafoglio
        </a>
        <a routerLink="/scenarios" routerLinkActive="active" class="nav-link">
          <mat-icon>science</mat-icon> Scenari
        </a>
        <a routerLink="/market-data" routerLinkActive="active" class="nav-link">
          <mat-icon>bar_chart</mat-icon> Market Data
        </a>
      </div>

      <div class="navbar-right hide-mobile">
        <span class="username">{{ auth.username }}</span>
        <button mat-icon-button [matMenuTriggerFor]="userMenu" matTooltip="Account">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item (click)="auth.logout()">
            <mat-icon>logout</mat-icon> Logout
          </button>
        </mat-menu>
      </div>
    </nav>

    <!-- Bottom Navigation Mobile -->
    <nav class="bottom-nav show-mobile">
      <a routerLink="/dashboard" routerLinkActive="active" class="bottom-nav-item">
        <mat-icon>dashboard</mat-icon>
        <span>Home</span>
      </a>
      <a routerLink="/transactions" routerLinkActive="active" class="bottom-nav-item">
        <mat-icon>account_balance_wallet</mat-icon>
        <span>Portfolio</span>
      </a>
      <a routerLink="/scenarios" routerLinkActive="active" class="bottom-nav-item">
        <mat-icon>science</mat-icon>
        <span>Scenari</span>
      </a>
      <a routerLink="/market-data" routerLinkActive="active" class="bottom-nav-item">
        <mat-icon>bar_chart</mat-icon>
        <span>Mercato</span>
      </a>
      <a class="bottom-nav-item" (click)="auth.logout()" style="cursor:pointer">
        <mat-icon>logout</mat-icon>
        <span>Esci</span>
      </a>
    </nav>
  `,
  styles: [`
    .navbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 64px;
      background: rgba(10,14,26,0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 32px;
      z-index: 1000;
    }
    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      flex-shrink: 0;
    }
    .brand-icon {
      font-size: 22px;
      background: linear-gradient(135deg, var(--accent-teal), var(--accent-purple));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 700;
    }
    .brand-name {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.5px;
    }
    .navbar-links {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      mat-icon { font-size: 18px; height: 18px; width: 18px; }
      &:hover { color: var(--text-primary); background: var(--bg-elevated); }
      &.active { color: var(--accent-teal); background: rgba(0,212,170,0.1); }
    }
    .navbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }
    .username {
      font-size: 13px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* Bottom nav mobile */
    .bottom-nav {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: 64px;
      background: rgba(10,14,26,0.98);
      backdrop-filter: blur(12px);
      border-top: 1px solid var(--border-color);
      display: none;
      align-items: center;
      justify-content: space-around;
      padding: 0 8px;
      z-index: 1000;
    }
    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 8px 12px;
      border-radius: 10px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 10px;
      font-weight: 500;
      transition: all 0.2s;
      mat-icon { font-size: 22px; height: 22px; width: 22px; }
      &.active { color: var(--accent-teal); }
      &:hover { color: var(--text-primary); }
    }

    .hide-mobile { display: flex; }
    .show-mobile { display: none; }

    @media (max-width: 768px) {
      .navbar { height: 56px; padding: 0 16px; }
      .hide-mobile { display: none !important; }
      .show-mobile { display: flex !important; }
      .navbar-links { display: none; }
    }
  `]
})
export class NavbarComponent {
  auth = inject(AuthService);
}
