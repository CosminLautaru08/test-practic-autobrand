import { Route } from '@angular/router';
import { authGuard, loginRedirectGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login/login.component';
import { AppShellComponent } from './layout/app-shell.component';
import { ProductListComponent } from './product-list/product-list.component';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [loginRedirectGuard],
    component: LoginComponent,
  },
  {
    path: '',
    canActivate: [authGuard],
    component: AppShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: ProductListComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
