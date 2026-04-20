import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _isLoggedIn = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this._isLoggedIn.asObservable();

  private hasToken(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  get username(): string {
    return localStorage.getItem('username') ?? '';
  }

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', req).pipe(
      tap(res => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('username', req.nomeUtente);
        this._isLoggedIn.next(true);
      })
    );
  }

  register(req: LoginRequest): Observable<void> {
    return this.http.post<void>('/api/auth/registrazione', req);
  }

  refresh(): Observable<{ accessToken: string }> {
    const refreshToken = localStorage.getItem('refreshToken') ?? '';
    return this.http.post<{ accessToken: string }>('/api/auth/refresh', { refreshToken }).pipe(
      tap(res => localStorage.setItem('accessToken', res.accessToken))
    );
  }

  logout(): void {
    this.http.post('/api/auth/logout', {}).subscribe({ complete: () => this.clearSession() });
  }

  private clearSession(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    this._isLoggedIn.next(false);
    this.router.navigate(['/login']);
  }

  forceLogout(): void {
    this.clearSession();
  }
}
