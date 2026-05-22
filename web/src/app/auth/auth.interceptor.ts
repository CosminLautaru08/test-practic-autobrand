import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AUTH_API_URL } from '../core/api.config';
import { AuthSessionService } from './auth-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  const token = session.getToken();
  const isLoginRequest = request.url.startsWith(`${AUTH_API_URL}/login`);

  const authorizedRequest =
    token && !isLoginRequest
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : request;

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      const isUnauthorized = error.status === 401;
      const isAuthRequest = request.url.startsWith(AUTH_API_URL);

      if (isUnauthorized && !isAuthRequest) {
        const redirectTo = router.url.startsWith('/login') ? '/' : router.url;

        session.clear();
        void router.navigate(['/login'], {
          queryParams: {
            redirectTo,
          },
        });
      }

      return throwError(() => error);
    }),
  );
};
