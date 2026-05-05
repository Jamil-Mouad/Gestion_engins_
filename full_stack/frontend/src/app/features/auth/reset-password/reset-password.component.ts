import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const pw = control.get('newPassword');
  const confirm = control.get('confirmPassword');
  return pw && confirm && pw.value !== confirm.value ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  private email = '';
  private resetToken = '';

  resetForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordMatchValidator });

  ngOnInit(): void {
    const state = history.state as { email?: string; resetToken?: string };
    if (!state?.email || !state?.resetToken) {
      this.router.navigate(['/forgot-password']);
      return;
    }
    this.email = state.email;
    this.resetToken = state.resetToken;
  }

  onSubmit(): void {
    if (this.resetForm.invalid) {
      if (this.resetForm.errors?.['passwordMismatch']) {
        this.errorMessage.set('Les mots de passe ne correspondent pas.');
      } else {
        this.errorMessage.set('Veuillez remplir tous les champs requis.');
      }
      this.resetForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.confirmPasswordReset({
      email: this.email,
      reset_token: this.resetToken,
      new_password: this.resetForm.value.newPassword!,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/login'], { queryParams: { reset: 'success' } });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const code = err.error?.code;
        if (code === 'INVALID_OTP') {
          this.errorMessage.set('Lien de réinitialisation invalide. Recommencez la procédure.');
        } else if (code === 'OTP_EXPIRED') {
          this.errorMessage.set('Lien expiré. Recommencez la procédure.');
        } else {
          this.errorMessage.set('Une erreur est survenue. Veuillez réessayer.');
        }
      },
    });
  }
}
