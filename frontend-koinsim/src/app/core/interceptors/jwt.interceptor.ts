import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Aggiunge il Bearer token a ogni richiesta (tranne auth)
  const token = auth.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Se 401 e abbiamo un refresh token, proviamo a rinnovare
      if (err.status === 401 && !req.url.includes('/api/auth/')) {
        return auth.refresh().pipe(
          switchMap(res => {
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${res.accessToken}` },
            });
            return next(retried);
          }),
          catchError(() => {
            // Refresh fallito: forziamo il logout
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            router.navigate(['/auth']);
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
