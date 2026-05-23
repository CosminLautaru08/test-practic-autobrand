import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loginForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(64)]],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });

  errorMessage = '';
  isSubmitting = false;

  submit(): void {
    if (this.loginForm.invalid || this.isSubmitting) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const redirectTo =
      this.route.snapshot.queryParamMap.get('redirectTo') || '/';

    this.clearAuthErrorState();
    this.isSubmitting = true;

    this.authService
      .login(this.loginForm.getRawValue())
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(redirectTo);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMessage(error);

          if (error.status === 401) {
            const passwordControl = this.loginForm.controls.password;
            passwordControl.setErrors({
              ...(passwordControl.errors ?? {}),
              invalidCredentials: true,
            });
            passwordControl.markAsTouched();
          }

          this.cdr.markForCheck();
        },
      });
  }

  hasError(controlName: 'username' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];

    return control.invalid && (control.dirty || control.touched);
  }

  clearAuthErrorState(): void {
    this.errorMessage = '';

    const passwordControl = this.loginForm.controls.password;
    const passwordErrors = passwordControl.errors;

    if (!passwordErrors?.['invalidCredentials']) {
      return;
    }

    const { invalidCredentials, ...remainingErrors } = passwordErrors;

    void invalidCredentials;
    passwordControl.setErrors(
      Object.keys(remainingErrors).length > 0 ? remainingErrors : null,
    );
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.loginForm.controls.password;

    if (passwordControl.errors?.['required']) {
      return 'Password is required.';
    }

    if (passwordControl.errors?.['invalidCredentials']) {
      return 'Wrong password. Please try again.';
    }

    return '';
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'API server could not be reached. Start the backend and try again.';
    }

    if (error.status === 401) {
      return 'Username or password is incorrect.';
    }

    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return 'Login failed. Please try again.';
  }
}
