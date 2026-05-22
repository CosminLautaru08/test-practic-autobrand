import { Injectable, signal } from '@angular/core';
import { AuthProfile } from './auth.models';

export const AUTH_TOKEN_STORAGE_KEY = 'autobrand.access_token';

type JwtPayload = {
  exp?: number;
};

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly userSignal = signal<AuthProfile | null>(null);

  readonly user = this.userSignal.asReadonly();

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }

  setUser(user: AuthProfile | null): void {
    this.userSignal.set(user);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();

    return Boolean(token) && !this.isTokenExpired(token);
  }

  clear(): void {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    this.userSignal.set(null);
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeTokenPayload(token);

    if (!payload?.exp) {
      return false;
    }

    return payload.exp * 1000 <= Date.now();
  }

  private decodeTokenPayload(token: string): JwtPayload | null {
    try {
      const [, rawPayload] = token.split('.');

      if (!rawPayload) {
        return null;
      }

      const normalizedPayload = rawPayload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(rawPayload.length / 4) * 4, '=');

      return JSON.parse(window.atob(normalizedPayload)) as JwtPayload;
    } catch {
      return null;
    }
  }
}
