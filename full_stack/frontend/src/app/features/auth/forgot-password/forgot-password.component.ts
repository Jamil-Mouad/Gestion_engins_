import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  step = signal<1 | 2>(1);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  resendCooldown = signal(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  otpForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  requestReset(): void {
    if (this.emailForm.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');
    const email = this.emailForm.value.email!;

    this.auth.requestPasswordReset(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set(2);
        this.startResendCooldown();
      },
      error: () => {
        this.loading.set(false);
        this.step.set(2);
        this.startResendCooldown();
      },
    });
  }

  verifyOtp(): void {
    if (this.otpForm.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.verifyPasswordReset(
      this.emailForm.value.email!,
      this.otpForm.value.code!
    ).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.router.navigate(['/reset-password'], {
          state: { email: this.emailForm.value.email!, resetToken: res.reset_token }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const code = err.error?.code;
        if (code === 'INVALID_OTP') {
          this.errorMessage.set('Code incorrect ou déjà utilisé.');
        } else if (code === 'OTP_EXPIRED') {
          this.errorMessage.set('Code expiré. Cliquez sur "Renvoyer le code".');
        } else {
          this.errorMessage.set('Une erreur est survenue. Veuillez réessayer.');
        }
      },
    });
  }

  resendCode(): void {
    if (this.resendCooldown() > 0) return;
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.otpForm.reset();

    this.auth.requestPasswordReset(this.emailForm.value.email!).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set('Un nouveau code a été envoyé.');
        this.startResendCooldown();
      },
      error: () => {
        this.loading.set(false);
        this.successMessage.set('Un nouveau code a été envoyé.');
        this.startResendCooldown();
      },
    });
  }

  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }

  goBackToStep1(): void {
    this.step.set(1);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.otpForm.reset();
  }

  private startResendCooldown(): void {
    this.resendCooldown.set(30);
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown.update(v => {
        if (v <= 1) {
          clearInterval(this.cooldownInterval!);
          this.cooldownInterval = null;
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }
}
