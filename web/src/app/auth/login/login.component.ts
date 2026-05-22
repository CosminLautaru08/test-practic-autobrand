import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authService
      .login(this.loginForm.getRawValue())
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(redirectTo);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMessage(error);
        },
      });
  }

  hasError(controlName: 'username' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];

    return control.invalid && (control.dirty || control.touched);
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
