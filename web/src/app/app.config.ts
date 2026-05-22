import {
  APP_INITIALIZER,
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth/auth.interceptor';
import { AuthService } from './auth/auth.service';
import { appRoutes } from './app.routes';

function initializeAuth() {
  const authService = inject(AuthService);

  return () => authService.restoreSession();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(appRoutes),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: initializeAuth,
    },
  ],
};
