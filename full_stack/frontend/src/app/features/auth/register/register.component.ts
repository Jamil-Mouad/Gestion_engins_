import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  registerForm = this.fb.group({
    prenom: ['', [Validators.required]],
    nom: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.errorMessage.set('Veuillez remplir tous les champs requis.');
      this.registerForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    const { prenom, nom, email, password } = this.registerForm.value;
    this.auth.register({ prenom: prenom!, nom: nom!, email: email!.trim().toLowerCase(), password: password! }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/vehicules']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.status === 409
          ? 'Un compte existe déjà avec cet email.'
          : err.status === 422
            ? 'Données invalides. Vérifiez les champs.'
            : 'Erreur lors de la création du compte.');
      },
    });
  }
}