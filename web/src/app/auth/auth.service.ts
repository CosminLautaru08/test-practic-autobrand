import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  firstValueFrom,
  Observable,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { AUTH_API_URL } from '../core/api.config';
import { AuthSessionService } from './auth-session.service';
import { AuthProfile, LoginCredentials, LoginResponse } from './auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);

  readonly user = this.session.user;

  login(credentials: LoginCredentials): Observable<AuthProfile> {
    return this.http
      .post<LoginResponse>(`${AUTH_API_URL}/login`, credentials)
      .pipe(
        tap((response) => {
          this.session.setToken(response.access_token);
        }),
        switchMap(() => this.fetchProfile()),
        catchError((error: HttpErrorResponse) => {
          this.session.clear();
          return throwError(() => error);
        }),
      );
  }

  logout(shouldRedirect = true): void {
    this.session.clear();

    if (shouldRedirect) {
      void this.router.navigate(['/login']);
    }
  }

  isAuthenticated(): boolean {
    return this.session.isAuthenticated();
  }

  getToken(): string | null {
    return this.session.getToken();
  }

  async restoreSession(): Promise<void> {
    if (!this.session.isAuthenticated()) {
      this.session.clear();
      return;
    }

    try {
      await firstValueFrom(this.fetchProfile());
    } catch {
      this.session.clear();
    }
  }

  private fetchProfile(): Observable<AuthProfile> {
    return this.http.get<AuthProfile>(`${AUTH_API_URL}/profile`).pipe(
      tap((user) => {
        this.session.setUser(user);
      }),
    );
  }
}
