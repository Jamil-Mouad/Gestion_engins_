import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirm = control.get('confirm');
  return password && confirm && password.value !== confirm.value
    ? { passwordMismatch: true }
    : null;
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  tab = signal<'connexion' | 'inscription'>('connexion');
  loading = signal(false);
  errorMessage = signal('');
  remember = signal(false);
  showPassword = signal(false);
  showRegisterPassword = signal(false);
  showRegisterConfirm = signal(false);
  isAuthenticated = this.auth.isAuthenticated;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  registerForm = this.fb.group({
    prenom: ['', [Validators.required]],
    nom: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
    cgu: [false, [Validators.requiredTrue]],
  }, { validators: passwordMatchValidator });

  switchTab(next: 'connexion' | 'inscription'): void {
    this.tab.set(next);
    this.errorMessage.set('');
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');
    const { email, password } = this.loginForm.value;
    this.auth.login({ email: email!, password: password!, remember: this.remember() }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/dashboard']); },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.status === 401 ? 'Email ou mot de passe incorrect.' :
          err.status === 429 ? 'Trop de tentatives. Réessayez dans quelques secondes.' :
          'Erreur de connexion. Veuillez réessayer.');
      },
    });
  }

  onRegister(): void {
    if (this.registerForm.invalid) {
      if (this.registerForm.errors?.['passwordMismatch']) {
        this.errorMessage.set('Les mots de passe ne correspondent pas.');
      } else {
        this.errorMessage.set('Veuillez remplir tous les champs requis.');
      }
      this.registerForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    const { prenom, nom, email, password } = this.registerForm.value;
    this.auth.register({ prenom: prenom!, nom: nom!, email: email!, password: password! }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/dashboard']); },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.status === 409 ? 'Un compte existe déjà avec cet email.' :
          err.status === 422 ? 'Données invalides. Vérifiez les champs.' :
          'Erreur lors de la création du compte.');
      },
    });
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']), // Navigate anyway on error
    });
  }
}
