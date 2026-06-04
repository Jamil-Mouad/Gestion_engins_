import { Component, inject, signal, computed, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { VehiculeService } from '../vehicule.service';
import { Vehicule, VehiculeDetail, VehiculeType, VehiculeStatut, isCamionType } from '../../../shared/models/vehicule.model';
import { ModalShellComponent } from '../../../shared/ui/modal/modal-shell.component';
import { DoubleClickGuardDirective } from '../../../shared/directives/double-click-guard.directive';

@Component({
  selector: 'app-edit-vehicule-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalShellComponent, DoubleClickGuardDirective],
  template: `
    <app-modal-shell modalTitle="Modifier le véhicule" modalMaxWidth="960px" (onClose)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="edit-veh-form">

        <!-- ── Tab switcher (login-style sliding pill) ── -->
        @if (isCamionTypeSelected()) {
          <div class="tab-switcher" role="tablist">
            <div aria-hidden="true" class="tab-pill"
                 [style.left]="activeTab() === 'infos' ? '4px' : 'calc(50% + 2px)'"></div>
            <button type="button" role="tab" class="tab-btn"
                    [style.fontWeight]="activeTab() === 'infos' ? '700' : '500'"
                    [style.color]="activeTab() === 'infos' ? 'var(--color-text)' : 'var(--color-text-muted)'"
                    (click)="activeTab.set('infos')">Infos</button>
            <button type="button" role="tab" class="tab-btn"
                    [style.fontWeight]="activeTab() === 'documents' ? '700' : '500'"
                    [style.color]="activeTab() === 'documents' ? 'var(--color-text)' : 'var(--color-text-muted)'"
                    (click)="activeTab.set('documents')">Documents</button>
          </div>
        }

        <!-- ══ TAB: INFOS ══ -->
        @if (activeTab() === 'infos') {
          <div class="form-group">
            <label>Code</label>
            <input formControlName="code" placeholder="CAM-001" readonly class="field-readonly" />
          </div>

          <div class="form-group">
            <label>Type</label>
            <input formControlName="type" readonly class="field-readonly" />
          </div>

          @if (form.get('type')?.value === 'semi_remorque') {
            <div class="form-group">
              <label>Config essieux (semi)</label>
              <select formControlName="configAxleSemi">
                <option [ngValue]="null">— Non défini —</option>
                <option value="plateau-2x2">Plateau 2×2 (4 positions)</option>
                <option value="semi-2-essieux">Semi 2 essieux (8 positions)</option>
                <option value="semi-3-essieux">Semi 3 essieux (12 positions)</option>
              </select>
            </div>
          }

          <div class="form-row">
            <div class="form-group">
              <label>Marque</label>
              <input formControlName="marque" placeholder="Volvo" />
            </div>
            <div class="form-group">
              <label>Modèle</label>
              <input formControlName="modele" placeholder="FH16" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Matricule</label>
              <input formControlName="matricule" placeholder="A-123-456" />
            </div>
            <div class="form-group">
              <label>N° Chassis</label>
              <input formControlName="nChassis" placeholder="WDB123…" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Année</label>
              <input formControlName="annee" type="number" placeholder="2020" />
            </div>
            <div class="form-group">
              <label>Date mise en service</label>
              <input formControlName="dateMiseService" type="date" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Statut</label>
              <select formControlName="statut">
                @for (s of statutOptions; track s.value) {
                  <option [value]="s.value">{{ s.label }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Carburant</label>
              <select formControlName="carburant">
                @for (c of carburantOptions; track c.value) {
                  <option [value]="c.value">{{ c.label }}</option>
                }
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Photo</label>
            <div class="photo-field">
              <input formControlName="photoUrl" placeholder="https://…/photo.jpg" class="photo-url-input" />
              <input #fileInput type="file" accept="image/*" class="hidden-file-input" (change)="onPhotoFileChange($event)" />
              <button type="button" class="btn-upload" [disabled]="uploading()" (click)="fileInput.click()">
                {{ uploading() ? '...' : 'Choisir un fichier' }}
              </button>
            </div>
            @if (uploadError()) {
              <span class="upload-error">{{ uploadError() }}</span>
            }
            @if (form.get('photoUrl')?.value) {
              <img [src]="form.get('photoUrl')!.value" alt="Aperçu photo" class="photo-preview" (error)="onPhotoError($event)" />
            }
          </div>

          @if (isCamionTypeSelected()) {
            <div class="camion-subform">
              <h3>Détails camion</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>Capacité (tonnes)</label>
                  <input formControlName="capaciteTonnes" type="number" placeholder="25" />
                </div>
                <div class="form-group">
                  <label>Config axe</label>
                  <select formControlName="configAxle">
                    <option value="4x2">4x2</option>
                    <option value="6x4">6x4</option>
                    <option value="plateau-2x2">Plateau 2x2</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Compteur km</label>
                  <input formControlName="compteurKm" type="number" placeholder="0" />
                </div>
                <div class="form-group">
                  <label>Compteur heures</label>
                  <input formControlName="compteurHeures" type="number" placeholder="0" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Chauffeur — prénom</label>
                  <input formControlName="chauffeurPrenom" placeholder="Hassan" />
                </div>
                <div class="form-group">
                  <label>Chauffeur — nom</label>
                  <input formControlName="chauffeurNom" placeholder="Benali" />
                </div>
              </div>
            </div>
          }
        }

        <!-- ══ TAB: DOCUMENTS ══ -->
        @if (activeTab() === 'documents') {
          <div class="doc-section">
            <h3 class="doc-section__title">Visites & Réglementaire</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Visite technique — Tracteur</label>
                <input formControlName="visiteTechTracteurExpiration" type="date" />
              </div>
              <div class="form-group">
                <label>Visite technique — Semi-remorque</label>
                <input formControlName="visiteTechSemiExpiration" type="date" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Carnet de circulation — expiration</label>
                <input formControlName="carnetCirculationExpiration" type="date" />
              </div>
              <div class="form-group">
                <label>Métrologie — expiration</label>
                <input formControlName="metrologieExpiration" type="date" />
              </div>
            </div>
            <div class="form-group">
              <label>Extincteur — date d'expiration</label>
              <input formControlName="extincteurExpiration" type="date" />
            </div>
          </div>

          <div class="doc-section">
            <h3 class="doc-section__title">Batterie</h3>
            <div class="form-group">
              <label>Batterie — Modèle</label>
              <input formControlName="batterieModele" placeholder="Bosch S5 A08" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Batterie — Date d'achat</label>
                <input formControlName="batterieDateAchat" type="date" />
              </div>
              <div class="form-group">
                <label>Dernier contrôle batterie</label>
                <input formControlName="batterieDateControle" type="date" />
              </div>
            </div>
          </div>

          <div class="doc-section">
            <h3 class="doc-section__title">Consommation</h3>
            <div class="form-group">
              <label>Conso. gasoil (litres / mois)</label>
              <input formControlName="consoGasoilLitresMois" type="number" placeholder="0" />
            </div>
          </div>
        }

        @if (errorMessage()) {
          <div class="form-error">{{ errorMessage() }}</div>
        }

        <div class="form-actions">
          <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
          <button type="submit" class="btn-submit" [disabled]="form.invalid || submitting() || uploading()" [appDoubleClickGuard]="submitting()">
            {{ submitting() ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </form>
    </app-modal-shell>
  `,
  styles: [`
    .edit-veh-form { display: flex; flex-direction: column; gap: 16px; }

    /* Tab switcher — login-style sliding pill */
    .tab-switcher { position: relative; display: grid; grid-template-columns: 1fr 1fr; background: var(--color-n100, #F3F4F6); border-radius: 10px; padding: 4px; }
    .tab-pill { position: absolute; top: 4px; bottom: 4px; width: calc(50% - 6px); border-radius: 6px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,.12); transition: left 320ms cubic-bezier(0.34,1.25,0.64,1); pointer-events: none; z-index: 0; }
    .tab-btn { position: relative; z-index: 1; height: 36px; border: none; background: transparent; font-family: 'Montserrat',sans-serif; font-size: 13px; border-radius: 6px; cursor: pointer; transition: color 200ms; }

    /* Form fields */
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .form-group input, .form-group select { height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); }
    .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }

    /* Camion subform */
    .camion-subform { border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px; display: flex; flex-direction: column; gap: 12px; }
    .camion-subform h3 { font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 600; color: var(--color-text); margin: 0 0 4px; }

    /* Documents sections */
    .doc-section { display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px; }
    .doc-section:first-of-type { border-top: none; margin-top: 0; padding-top: 0; }
    .doc-section__title { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 700; color: var(--color-text); margin: 0; }

    /* Feedback */
    .form-error { background: #FEE2E2; color: #991B1B; padding: 8px 12px; border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .btn-cancel { background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; cursor: pointer; color: var(--color-text-muted); }
    .btn-submit { background: var(--color-primary); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-submit:hover { background: var(--color-primary-dark); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Photo */
    .photo-field { display: flex; gap: 8px; align-items: center; }
    .photo-url-input { flex: 1; height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); }
    .hidden-file-input { display: none; }
    .btn-upload { height: 40px; padding: 0 12px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); cursor: pointer; white-space: nowrap; flex-shrink: 0; }
    .btn-upload:hover { background: #F9FAFB; }
    .btn-upload:disabled { opacity: 0.5; cursor: not-allowed; }
    .upload-error { font-family: 'Open Sans', sans-serif; font-size: 12px; color: #991B1B; margin-top: 4px; }
    .photo-preview { width: 80px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid var(--color-border); margin-top: 6px; }
    .field-readonly { background: var(--color-n50, #F9FAFB) !important; color: var(--color-text-muted) !important; cursor: default; }
  `],
})
export class EditVehiculeModalComponent implements OnInit {
  private vehiculeService = inject(VehiculeService);

  @Input({ required: true }) vehicule!: VehiculeDetail;
  @Output() saved = new EventEmitter<Vehicule>();
  @Output() close = new EventEmitter<void>();

  activeTab = signal<'infos' | 'documents'>('infos');
  submitting = signal(false);
  uploading = signal(false);
  errorMessage = signal('');
  uploadError = signal('');
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  isCamionTypeSelected = computed(() => isCamionType(this.form.get('type')?.value ?? ''));

  typeOptions: { value: VehiculeType; label: string }[] = [
    { value: 'camion',          label: 'Camion' },
    { value: 'camion_tracteur', label: 'Camion (Tracteur)' },
    { value: 'voiture',         label: 'Voiture' },
    { value: 'semi_remorque',   label: 'Semi-remorque' },
    { value: 'chariot',         label: 'Chariot' },
    { value: 'chargeur',        label: 'Chargeur' },
    { value: 'bus',             label: 'Bus' },
    { value: 'balayeuse',       label: 'Balayeuse' },
    { value: 'pick_up',         label: 'Pick-up' },
  ];

  statutOptions: { value: VehiculeStatut; label: string }[] = [
    { value: 'in-service', label: 'En service' },
    { value: 'workshop', label: 'En atelier' },
    { value: 'maintenance', label: 'En maintenance' },
    { value: 'out-of-service', label: 'Hors service' },
  ];

  carburantOptions = [
    { value: 'gasoil',     label: 'Gasoil' },
    { value: 'essence',    label: 'Essence' },
    { value: 'electrique', label: 'Électrique' },
    { value: 'hybride',    label: 'Hybride' },
  ];

  form = inject(FormBuilder).group({
    // ── Infos ──
    code: ['', [Validators.required]],
    type: ['camion' as VehiculeType, [Validators.required]],
    marque: ['', [Validators.required]],
    modele: [''],
    matricule: [''],
    nChassis: [''],
    annee: [null as number | null],
    carburant: ['gasoil'],
    statut: ['in-service' as VehiculeStatut, [Validators.required]],
    dateMiseService: [null as string | null],
    photoUrl: ['' as string | null],
    // Camion technical
    capaciteTonnes: [null as number | null],
    configAxle: ['4x2' as '4x2' | '6x4' | 'plateau-2x2' | null],
    configAxleSemi: [null as 'plateau-2x2' | 'semi-2-essieux' | 'semi-3-essieux' | null],
    compteurKm: [null as number | null],
    compteurHeures: [null as number | null],
    chauffeurPrenom: ['' as string | null],
    chauffeurNom: ['' as string | null],
    // ── Documents (regulatory + battery) ──
    visiteTechTracteurExpiration: [null as string | null],
    visiteTechSemiExpiration: [null as string | null],
    carnetCirculationExpiration: [null as string | null],
    metrologieExpiration: [null as string | null],
    extincteurExpiration: [null as string | null],
    batterieModele: ['' as string | null],
    batterieDateAchat: [null as string | null],
    batterieDateControle: [null as string | null],
    consoGasoilLitresMois: [null as number | null],
  });

  ngOnInit(): void {
    const v = this.vehicule;
    const cd = v.camionDetails;
    this.form.patchValue({
      code: v.code,
      type: v.type,
      marque: v.marque,
      modele: v.modele ?? '',
      matricule: v.matricule ?? '',
      nChassis: v.nChassis ?? '',
      annee: v.annee ?? null,
      carburant: v.carburant ?? 'gasoil',
      statut: v.statut,
      dateMiseService: v.dateMiseService ?? null,
      photoUrl: v.photoUrl ?? '',
      configAxleSemi: v.configAxleSemi ?? null,
      // Camion technical
      capaciteTonnes: cd?.capaciteTonnes ?? null,
      configAxle: cd?.configAxle ?? '4x2',
      compteurKm: cd?.compteurKm ?? null,
      compteurHeures: cd?.compteurHeures ?? null,
      chauffeurPrenom: cd?.chauffeurPrenom ?? '',
      chauffeurNom: cd?.chauffeurNom ?? '',
      // Documents
      visiteTechTracteurExpiration: cd?.visiteTechTracteurExpiration ?? null,
      visiteTechSemiExpiration: cd?.visiteTechSemiExpiration ?? null,
      carnetCirculationExpiration: cd?.carnetCirculationExpiration ?? null,
      metrologieExpiration: cd?.metrologieExpiration ?? null,
      extincteurExpiration: cd?.extincteurExpiration ?? null,
      batterieModele: cd?.batterieModele ?? '',
      batterieDateAchat: cd?.batterieDateAchat ?? null,
      batterieDateControle: cd?.batterieDateControle ?? null,
      consoGasoilLitresMois: cd?.consoGasoilLitresMois ?? null,
    });
  }

  onPhotoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set('');
    this.vehiculeService.uploadPhoto(file).subscribe({
      next: (res) => {
        this.form.patchValue({ photoUrl: res.url });
        this.uploading.set(false);
      },
      error: (err: any) => {
        this.uploadError.set(err?.error?.error || 'Erreur lors du téléversement de la photo.');
        this.uploading.set(false);
      },
    });
  }

  onPhotoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    const fv = this.form.value;
    const isCamion = isCamionType(fv.type ?? '');

    const payload: any = {
      marque: fv.marque,
      modele: fv.modele || null,
      matricule: fv.matricule || null,
      nChassis: fv.nChassis || null,
      annee: fv.annee,
      carburant: fv.carburant || 'gasoil',
      statut: fv.statut,
      dateMiseService: fv.dateMiseService || null,
      photoUrl: fv.photoUrl || null,
      configAxleSemi: fv.configAxleSemi ?? null,
    };

    if (isCamion) {
      payload.camionDetails = {
        capaciteTonnes: fv.capaciteTonnes ?? null,
        configAxle: fv.configAxle ?? null,
        compteurKm: fv.compteurKm ?? null,
        compteurHeures: fv.compteurHeures ?? null,
        chauffeurPrenom: fv.chauffeurPrenom || null,
        chauffeurNom: fv.chauffeurNom || null,
        visiteTechTracteurExpiration: fv.visiteTechTracteurExpiration || null,
        visiteTechSemiExpiration: fv.visiteTechSemiExpiration || null,
        carnetCirculationExpiration: fv.carnetCirculationExpiration || null,
        metrologieExpiration: fv.metrologieExpiration || null,
        extincteurExpiration: fv.extincteurExpiration || null,
        batterieModele: fv.batterieModele || null,
        batterieDateAchat: fv.batterieDateAchat || null,
        batterieDateControle: fv.batterieDateControle || null,
        consoGasoilLitresMois: fv.consoGasoilLitresMois ?? null,
      };
    }

    this.vehiculeService.update(this.vehicule.id, payload).subscribe({
      next: (v) => {
        this.submitting.set(false);
        this.saved.emit(v);
        this.close.emit();
      },
      error: (err: any) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.error || err?.error?.message || 'Erreur lors de la modification du véhicule.');
      },
    });
  }
}
