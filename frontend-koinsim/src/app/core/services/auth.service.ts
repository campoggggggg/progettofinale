import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly BASE = '/api/auth';

  registrazione(req: LoginRequest): Observable<void> {
    // Il backend ritorna 201 con body vuoto: responseType 'text' evita l'errore di parsing JSON
    return this.http.post(`${this.BASE}/registrazione`, req, { responseType: 'text' as const }).pipe(
      tap(() => {})
    ) as unknown as Observable<void>;
  }

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.BASE}/login`, req).pipe(
      tap(res => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
      })
    );
  }

  refresh(): Observable<{ accessToken: string }> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http
      .post<{ accessToken: string }>(`${this.BASE}/refresh`, { refreshToken })
      .pipe(tap(res => localStorage.setItem('accessToken', res.accessToken)));
  }

  logout(): void {
    this.http.post(`${this.BASE}/logout`, {}).subscribe({ error: () => {} });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.router.navigate(['/auth']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }
}
