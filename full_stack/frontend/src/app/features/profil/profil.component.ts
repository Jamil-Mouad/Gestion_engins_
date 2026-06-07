import { Component, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfilService } from './profil.service';
import { User } from '../../shared/models/user.model';
import {
  SkeletonComponent,
  PageHeaderComponent,
  CardComponent,
  FRowComponent,
} from '../../shared/ui';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [ReactiveFormsModule, SkeletonComponent, PageHeaderComponent, CardComponent, FRowComponent],
  template: `
    <div class="profil-screen">

      <app-page-header title="Mon profil" />

      @if (loading()) {
        <div class="profil-loading">
          <app-skeleton [rows]="6" height="40px" />
        </div>
      } @else {
        <div class="profil-layout">

          <!-- ── Left column: avatar card ── -->
          <div class="profil-left">
            <app-card>
              <div class="profil-avatar-card">
                <div class="profil-avatar">
                  <span class="profil-avatar__initials">{{ initials() }}</span>
                </div>
                <div class="profil-avatar__info">
                  <h2 class="profil-avatar__name">{{ user()?.prenom }} {{ user()?.nom }}</h2>
                  <span class="profil-avatar__role">{{ user()?.role }}</span>
                </div>
                <div class="profil-avatar__meta">
                  <div class="profil-meta-row">
                    <span class="profil-meta-row__label">Email</span>
                    <span class="profil-meta-row__value">{{ user()?.email }}</span>
                  </div>
                  @if (user()?.telephone) {
                    <div class="profil-meta-row">
                      <span class="profil-meta-row__label">Téléphone</span>
                      <span class="profil-meta-row__value">{{ user()?.telephone }}</span>
                    </div>
                  }
                  <div class="profil-meta-row">
                    <span class="profil-meta-row__label">Statut</span>
                    <span class="profil-meta-row__value">{{ user()?.actif ? 'Actif' : 'Inactif' }}</span>
                  </div>
                </div>
              </div>
            </app-card>
          </div>

          <!-- ── Right column: forms ── -->
          <div class="profil-right">

            <!-- Section 1: Informations personnelles -->
            <app-card>
              <h3 class="profil__section-title">Informations personnelles</h3>
              <form class="profil-form" [formGroup]="infosForm" (ngSubmit)="saveInfos()">
                <div class="profil-form__grid">
                  <app-f-row label="Prénom">
                    <input type="text" formControlName="prenom" class="profil__input" placeholder="Prénom" />
                  </app-f-row>
                  <app-f-row label="Nom">
                    <input type="text" formControlName="nom" class="profil__input" placeholder="Nom" />
                  </app-f-row>
                  <app-f-row label="Email" [required]="true">
                    <input type="email" formControlName="email" class="profil__input" placeholder="email@exemple.com" />
                  </app-f-row>
                  <app-f-row label="Téléphone">
                    <input type="tel" formControlName="telephone" class="profil__input" placeholder="+212 6 00 00 00 00" />
                  </app-f-row>
                </div>
                <div class="profil-form__actions">
                  @if (infosSaved()) {
                    <span class="profil__success">Enregistré !</span>
                  }
                  <button type="submit" class="profil__btn" [disabled]="infosForm.invalid || saving()">Enregistrer</button>
                </div>
              </form>
            </app-card>

            <!-- Section 2: Sécurité -->
            <app-card>
              <h3 class="profil__section-title">Sécurité</h3>
              <form class="profil-form" [formGroup]="passwordForm" (ngSubmit)="savePassword()">
                <div class="profil-form__grid">
                  <app-f-row label="Mot de passe actuel">
                    <input type="password" formControlName="currentPassword" class="profil__input" placeholder="••••••••••••" />
                  </app-f-row>
                  <app-f-row label="Nouveau mot de passe">
                    <input type="password" formControlName="newPassword" class="profil__input" placeholder="••••••••••••" />
                  </app-f-row>
                  <app-f-row label="Confirmer">
                    <input type="password" formControlName="confirmPassword" class="profil__input" placeholder="••••••••••••" />
                  </app-f-row>
                </div>
                @if (passwordForm.errors?.['mismatch']) {
                  <span class="profil__error">Les mots de passe ne correspondent pas.</span>
                }
                <div class="profil-form__actions">
                  @if (passwordSaved()) {
                    <span class="profil__success">Mot de passe mis à jour !</span>
                  }
                  @if (passwordError()) {
                    <span class="profil__error">{{ passwordError() }}</span>
                  }
                  <button type="submit" class="profil__btn" [disabled]="passwordForm.invalid || saving()">Mettre à jour</button>
                </div>
              </form>
            </app-card>

          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .profil-screen {
      min-height: calc(100vh - 72px);
      background: #F5F5F5;
      animation: screenEnter 0.25s ease both;
    }

    .profil-loading {
      padding: 32px;
    }

    .profil-layout {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 24px;
      padding: 24px 32px 40px;
    }

    .profil-left {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .profil-right {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Avatar card */
    .profil-avatar-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .profil-avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: var(--color-primary, #F7941D);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(247, 148, 29, 0.3);
      flex-shrink: 0;
    }

    .profil-avatar__initials {
      font-family: 'Montserrat', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #fff;
    }

    .profil-avatar__info {
      text-align: center;
    }

    .profil-avatar__name {
      font-family: 'Montserrat', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: var(--color-text, #111827);
      margin: 0 0 4px;
    }

    .profil-avatar__role {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text-muted, #6B7280);
    }

    .profil-avatar__meta {
      width: 100%;
      border-top: 1px solid var(--color-border, #E5E7EB);
      padding-top: 16px;
    }

    .profil-meta-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 0;
      border-bottom: 1px solid var(--color-border, #E5E7EB);
    }

    .profil-meta-row__label {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text-muted, #6B7280);
    }

    .profil-meta-row__value {
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text, #111827);
    }

    /* Section headings */
    .profil__section-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text, #111827);
      margin: 0 0 16px;
    }

    /* Form grid */
    .profil-form {
      margin-top: 0;
    }

    .profil-form__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 16px;
    }

    .profil-form__actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
    }

    /* Inputs */
    .profil__input {
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      padding: 8px 12px;
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 6px;
      background: var(--color-surface, #fff);
      color: var(--color-text, #111827);
      width: 100%;
      box-sizing: border-box;
    }

    .profil__input:focus {
      outline: none;
      border-color: var(--color-primary, #F7941D);
    }

    .profil__input--readonly {
      background: #F9FAFB;
      color: var(--color-text-muted, #6B7280);
      cursor: not-allowed;
    }

    /* Button */
    .profil__btn {
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 20px;
      border-radius: 6px;
      border: none;
      background: var(--color-primary, #F7941D);
      color: #fff;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .profil__btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Feedback messages */
    .profil__success {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-success, #10B981);
    }

    .profil__error {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-danger, #EF4444);
    }
  `],
})
export class ProfilComponent {
  private profilService = inject(ProfilService);
  private fb = inject(FormBuilder);

  loading = signal(true);
  saving = signal(false);
  infosSaved = signal(false);
  passwordSaved = signal(false);
  passwordError = signal('');
  user = signal<User | null>(null);

  initials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    const first = u.prenom?.[0] ?? '';
    const last = u.nom?.[0] ?? '';
    return (first + last).toUpperCase() || '?';
  });

  infosForm: FormGroup;
  passwordForm: FormGroup;

  constructor() {
    this.infosForm = this.fb.group({
      prenom:    ['', Validators.required],
      nom:       ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      telephone: [''],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatch });

    this.loadProfile();
  }

  private passwordMatch(group: FormGroup): { mismatch: boolean } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword !== confirmPassword ? { mismatch: true } : null;
  }

  loadProfile(): void {
    this.loading.set(true);
    this.profilService.getMe().subscribe({
      next: (user) => {
        this.user.set(user);
        this.infosForm.patchValue({
          prenom:    user.prenom,
          nom:       user.nom,
          email:     user.email,
          telephone: user.telephone ?? '',
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  saveInfos(): void {
    if (this.infosForm.invalid) return;
    this.saving.set(true);
    this.infosSaved.set(false);
    this.profilService.updateMe(this.infosForm.value).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.infosSaved.set(true);
        this.user.set(updated);
      },
      error: () => this.saving.set(false),
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) return;
    this.saving.set(true);
    this.passwordSaved.set(false);
    this.passwordError.set('');
    this.profilService.updatePassword(this.passwordForm.value).subscribe({
      next: () => { this.saving.set(false); this.passwordSaved.set(true); this.passwordForm.reset(); },
      error: (err) => { this.saving.set(false); this.passwordError.set(err?.error?.message ?? 'Erreur lors du changement de mot de passe.'); },
    });
  }
}