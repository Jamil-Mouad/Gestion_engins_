# INTERSIG FleetTracker — Frontend Angular 21 (spec détaillée)

**Source :** prototype hi-fi `hifi_final/*.jsx` + plan v6 (`plan.md`)
**Cible :** Angular **21** standalone components + Signals + RxJS, déployé en SPA derrière Nginx (VM2)
**API :** REST/JSON via `/api/v1/` — Bearer JWT — SSE streaming pour `/ai/chat`
**Date :** Avril 2026 — v1

---

## Sommaire

1. [Choix techniques & justification](#1-choix-techniques--justification)
2. [Packages npm](#2-packages-npm)
3. [Structure du projet](#3-structure-du-projet)
4. [Configuration Tailwind & design tokens](#4-configuration-tailwind--design-tokens)
5. [Routing & lazy loading](#5-routing--lazy-loading)
6. [Couche HTTP & interceptors](#6-couche-http--interceptors)
7. [Services métier (1 par domaine API)](#7-services-métier-1-par-domaine-api)
8. [State management — Signals + RxJS](#8-state-management--signals--rxjs)
9. [Authentification & guards](#9-authentification--guards)
10. [Composants partagés (design system)](#10-composants-partagés-design-system)
11. [Pages (17 écrans) — détail par page](#11-pages-17-écrans--détail-par-page)
12. [Forms & validation](#12-forms--validation)
13. [Streaming SSE pour le chatbot](#13-streaming-sse-pour-le-chatbot)
14. [Dashboard widgets drag-drop](#14-dashboard-widgets-drag-drop)
15. [i18n & formatage MAD / dates FR](#15-i18n--formatage-mad--dates-fr)
16. [Tests & qualité](#16-tests--qualité)
17. [Build & déploiement](#17-build--déploiement)

---

## 1. Choix techniques & justification

| Décision | Raison |
|---|---|
| **Angular 21 standalone** (pas de NgModule) | Standard depuis Angular 17, moins de boilerplate, lazy loading direct |
| **Signals** comme state local | Réactivité fine, integration native Angular 21, plus simple que `BehaviorSubject` pour state UI |
| **RxJS** pour les flux async (HTTP, SSE, debounced search) | Reste le standard pour HTTP + opérateurs (`switchMap`, `debounceTime`, `retry`) |
| **Pas de NgRx** | App de 4-5 utilisateurs, 17 écrans — Signals + services suffisent. NgRx ajouterait du boilerplate sans valeur |
| **Tailwind CSS** | Le prototype JSX utilise déjà du styling inline avec tokens (T.primary, T.fontH…). Tailwind formalise ces tokens dans `tailwind.config.js`, le passage est direct |
| **angular-gridster2** | Spécifié plan §10 — drag-drop dashboard widgets |
| **Pas de Material / PrimeNG** | Le hi-fi est custom (palette #F7941D, polices Montserrat/Open Sans/JetBrains Mono). Une lib UI imposerait son propre look — on garde des composants maison |
| **`@angular/cdk`** | Pour overlay (modals, toasts, tooltips), virtual scroll (tableaux 1500+ lignes), drag-drop natif léger |
| **ngx-charts** ou **echarts-angular** | Pour le graphe Disponibilité (12 mois area chart) et le donut Coûts. Choix : **ngx-charts** (plus léger, API déclarative simple) |
| **flow Control natif** (`@if`, `@for`, `@switch`) | Angular 17+, plus rapide que `*ngIf`/`*ngFor` |
| **`HttpClient` + `withInterceptorsFromDi()`** | Configuration moderne, JWT et erreurs centralisés |

---

## 2. Packages npm

```json
{
  "dependencies": {
    "@angular/animations": "^21.0.2",
    "@angular/cdk": "^21.0.2",
    "@angular/common": "^21.0.2",
    "@angular/compiler": "^21.0.2",
    "@angular/core": "^21.0.2",
    "@angular/forms": "^21.0.2",
    "@angular/platform-browser": "^21.0.2",
    "@angular/platform-browser-dynamic": "^21.0.2",
    "@angular/router": "^21.0.2",
    "angular-gridster2": "^18.0.0",
    "@swimlane/ngx-charts": "^20.5.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.6.0",
    "zone.js": "~0.14.0",
    "date-fns": "^3.6.0",
    "lucide-angular": "^0.395.0",
    "ngx-toastr": "^19.0.0"
  },
  "devDependencies": {
    "@angular/cli": "^21.0.2",
    "@angular/compiler-cli": "^21.0.2",
    "@types/jasmine": "~5.1.0",
    "jasmine-core": "~5.1.0",
    "karma": "~6.4.0",
    "karma-chrome-launcher": "~3.2.0",
    "karma-coverage": "~2.2.0",
    "karma-jasmine": "~5.1.0",
    "karma-jasmine-html-reporter": "~2.1.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "typescript": "~5.4.0",
    "cypress": "^13.13.0",
    "@cypress/schematic": "^2.5.0",
    "prettier": "^3.3.0",
    "eslint": "^9.7.0",
    "@angular-eslint/eslint-plugin": "^21.0.2"
  }
}
```

**Justification rapide :**
- `lucide-angular` : icônes (le proto utilise déjà des icônes type Lucide — `bell`, `truck`, `wrench`)
- `date-fns` : formatage `Mars 2026`, `il y a 2h`, plus léger que moment.js
- `ngx-toastr` : système de toasts (le proto a un `Toasts` component, on retrouve la même API)
- `angular-gridster2` : drag-drop widgets dashboard
- `@swimlane/ngx-charts` : graphe Disponibilité (area) + Coûts (donut)
- `cypress` : E2E (sprint Buffer)
- Pas de `@ngrx/*`, pas de `lodash` (utilitaires inline ou natifs ES2022)

---

## 3. Structure du projet

```
src/
├── app/
│   ├── core/                          # Singletons : services racine, interceptors, guards
│   │   ├── auth/
│   │   │   ├── auth.service.ts        # login, register, JWT storage
│   │   │   ├── auth.guard.ts          # canActivate
│   │   │   ├── auth.interceptor.ts    # ajoute Bearer JWT
│   │   │   └── auth.types.ts
│   │   ├── http/
│   │   │   ├── api.config.ts          # baseUrl /api/v1
│   │   │   ├── error.interceptor.ts
│   │   │   └── http-helper.ts
│   │   ├── notifications/
│   │   │   └── notif-bell.service.ts  # polling /notifications/non-lues/count
│   │   └── app.config.ts              # provideRouter, provideHttpClient, etc.
│   │
│   ├── shared/                        # Composants/pipes/directives réutilisables
│   │   ├── components/
│   │   │   ├── top-bar/
│   │   │   ├── status-badge/
│   │   │   ├── sev-badge/
│   │   │   ├── urgency-badge/
│   │   │   ├── request-status-badge/
│   │   │   ├── kpi-card/
│   │   │   ├── empty-state/
│   │   │   ├── confirm-modal/
│   │   │   ├── data-table/            # Tableau générique avec colonnes configurables
│   │   │   ├── filter-chips/
│   │   │   ├── search-input/
│   │   │   ├── pagination/
│   │   │   ├── upload-dropzone/
│   │   │   ├── axle-schema/           # SVG essieux (4x2, 6x4, plateau-2x2)
│   │   │   ├── tire-card/
│   │   │   ├── toast-host/
│   │   │   └── bell-dropdown/
│   │   ├── pipes/
│   │   │   ├── mad.pipe.ts            # 487 200 → "487 200 MAD"
│   │   │   ├── km.pipe.ts             # 1842310 → "1,84M km"
│   │   │   ├── relative-time.pipe.ts  # "il y a 2h"
│   │   │   └── safe-html.pipe.ts
│   │   └── directives/
│   │       ├── click-outside.directive.ts
│   │       └── auto-focus.directive.ts
│   │
│   ├── features/                      # Une feature = un écran (ou un groupe lié)
│   │   ├── auth/                      # S01
│   │   │   ├── login.component.ts
│   │   │   └── register.component.ts
│   │   ├── dashboard/                 # S02
│   │   │   ├── dashboard.component.ts
│   │   │   ├── widgets/
│   │   │   │   ├── kpi-dispo.widget.ts
│   │   │   │   ├── kpi-cout.widget.ts
│   │   │   │   ├── kpi-km.widget.ts
│   │   │   │   ├── kpi-km-cum.widget.ts
│   │   │   │   ├── chart-dispo.widget.ts
│   │   │   │   ├── chart-couts-donut.widget.ts
│   │   │   │   ├── alerts-list.widget.ts
│   │   │   │   └── interventions-recent.widget.ts
│   │   │   └── manage-widgets.modal.ts
│   │   ├── vehicules/                 # S03 + S04
│   │   │   ├── list/
│   │   │   ├── detail/
│   │   │   │   ├── tabs/
│   │   │   │   │   ├── infos.tab.ts
│   │   │   │   │   ├── interventions.tab.ts
│   │   │   │   │   ├── pneus.tab.ts        # uniquement si type=camion
│   │   │   │   │   ├── vidanges.tab.ts
│   │   │   │   │   ├── kpis.tab.ts
│   │   │   │   │   ├── historique.tab.ts
│   │   │   │   │   └── composants.tab.ts
│   │   │   ├── new-vehicule.modal.ts
│   │   │   └── manage-columns.modal.ts
│   │   ├── interventions/             # S05
│   │   │   ├── list.component.ts
│   │   │   └── new-intervention.modal.ts
│   │   ├── composants/                # S06
│   │   │   ├── catalog.component.ts
│   │   │   ├── tree.component.ts
│   │   │   └── new-composant.modal.ts
│   │   ├── pneus/                     # S07 + S07b
│   │   │   ├── gestion-pneus.component.ts
│   │   │   ├── fiche-pneu.component.ts
│   │   │   ├── tabs/
│   │   │   │   ├── overview.tab.ts
│   │   │   │   ├── activite.tab.ts
│   │   │   │   ├── inspections.tab.ts
│   │   │   │   └── historique.tab.ts
│   │   │   └── new-inspection.modal.ts
│   │   ├── vidanges/                  # S08
│   │   │   └── vidanges.component.ts
│   │   ├── historique/                # S10
│   │   │   └── historique.component.ts
│   │   ├── chatbot/                   # S11
│   │   │   ├── chatbot.component.ts
│   │   │   └── message-bubble.component.ts
│   │   ├── import-export/             # S12
│   │   │   ├── import-export.component.ts
│   │   │   ├── releves-upload.component.ts
│   │   │   └── export-form.component.ts
│   │   ├── notifications/             # S13
│   │   │   └── notifications.component.ts
│   │   ├── tableau-journees/          # S16
│   │   │   └── tableau-journees.component.ts
│   │   ├── profile/                   # S17
│   │   │   └── profile.component.ts
│   │   └── demandes-achat/            # S19
│   │       ├── list.component.ts
│   │       ├── detail.modal.ts
│   │       └── new-demande.modal.ts
│   │
│   ├── layout/
│   │   └── app-shell.component.ts     # Top bar + <router-outlet/>
│   │
│   └── app.routes.ts
│
├── assets/
│   ├── fonts/                         # Montserrat, Open Sans, JetBrains Mono (woff2)
│   ├── icons/
│   └── logo/
│
├── environments/
│   ├── environment.ts                 # apiUrl: 'http://localhost:8080/api/v1'
│   └── environment.prod.ts            # apiUrl: 'http://vm2.local/api/v1'
│
├── styles/
│   ├── index.css                      # @tailwind base/components/utilities
│   ├── tokens.css                     # variables CSS pour tokens (mode dark futur)
│   └── animations.css                 # screenEnter, fadeIn, spin (depuis le hi-fi)
│
├── index.html
└── main.ts
```

**Règles de nommage :**
- Composants : `kebab-case.component.ts` ; classe `XxxComponent`
- Services : `*.service.ts` ; classe `XxxService` ; `@Injectable({ providedIn: 'root' })`
- Modèles : un fichier `*.types.ts` par domaine, exports nommés (`Vehicule`, `Camion`, `Intervention`…)
- Modales : `*.modal.ts` (composants standalone consommés via CDK Overlay)

---

## 4. Configuration Tailwind & design tokens

Les tokens sont **calqués 1-pour-1** sur ceux du prototype JSX (`T.primary`, `T.fontH`, etc.).

### `tailwind.config.js`

```js
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F7941D',
          soft:    '#FEF1E1',
          text:    '#B45F0B',
          hover:   '#E5841A',
        },
        dark:     '#1A1A1A',
        n50:      '#FAFAFA',
        n100:     '#F5F5F5',
        n200:     '#E8E8E8',
        n300:     '#D4D4D4',
        n500:     '#737373',
        n700:     '#404040',
        n900:     '#171717',
        success:  '#16A34A',
        warning:  '#D97706',
        critical: '#DC2626',
        info:     '#2563EB',
      },
      fontFamily: {
        heading:  ['Montserrat', 'system-ui', 'sans-serif'],
        body:     ['Open Sans', 'system-ui', 'sans-serif'],
        mono:     ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Échelle calquée sur le proto
        xs:   ['11px', '14px'],
        sm:   ['12px', '16px'],
        base: ['13px', '20px'],
        lg:   ['14px', '20px'],
        xl:   ['16px', '24px'],
        '2xl':['18px', '24px'],
        '3xl':['22px', '28px'],
        '4xl':['28px', '36px'],
      },
      borderRadius: {
        'r4':  '4px',
        'r8':  '8px',
        'r12': '12px',
        'r16': '16px',
      },
      boxShadow: {
        'sh-sm': '0 1px 2px rgba(0,0,0,0.04)',
        'sh-md': '0 4px 12px rgba(0,0,0,0.08)',
        'sh-xl': '0 16px 40px rgba(0,0,0,0.12)',
      },
      spacing: {
        topbar: '72px',
      },
    },
  },
  plugins: [],
};
```

### `tokens.css`

```css
:root {
  --ft-surface:        #FFFFFF;
  --ft-surface-2:      #F5F5F5;
  --ft-border:         #E8E8E8;
  --ft-text-primary:   #171717;
  --ft-text-muted:     #737373;
  --ft-topbar-bg:      #1A1A1A;
}
```

Les tokens CSS permettent un mode dark futur (changer 6 variables suffit).

### Polices

Importées localement dans `src/assets/fonts/` (woff2) — `@font-face` dans `styles/index.css` pour éviter Google Fonts (pas d'Internet sur VM2).

---

## 5. Routing & lazy loading

### `app.routes.ts`

```ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },

  {
    path: '',
    loadComponent: () => import('./layout/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '',                  redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',         loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'vehicules',         loadComponent: () => import('./features/vehicules/list/list.component').then(m => m.VehiculesListComponent) },
      { path: 'vehicules/:id',     loadComponent: () => import('./features/vehicules/detail/detail.component').then(m => m.VehiculeDetailComponent) },
      { path: 'interventions',     loadComponent: () => import('./features/interventions/list.component').then(m => m.InterventionsListComponent) },
      { path: 'composants',        loadComponent: () => import('./features/composants/catalog.component').then(m => m.ComposantsCatalogComponent) },
      { path: 'pneus/:id',         loadComponent: () => import('./features/pneus/fiche-pneu.component').then(m => m.FichePneuComponent) },
      { path: 'vidanges',          loadComponent: () => import('./features/vidanges/vidanges.component').then(m => m.VidangesComponent) },
      { path: 'historique',        loadComponent: () => import('./features/historique/historique.component').then(m => m.HistoriqueComponent) },
      { path: 'chatbot',           loadComponent: () => import('./features/chatbot/chatbot.component').then(m => m.ChatbotComponent) },
      { path: 'import-export',     loadComponent: () => import('./features/import-export/import-export.component').then(m => m.ImportExportComponent) },
      { path: 'notifications',     loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'tableau-journees',  loadComponent: () => import('./features/tableau-journees/tableau-journees.component').then(m => m.TableauJourneesComponent) },
      { path: 'profil',            loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'demandes-achat',    loadComponent: () => import('./features/demandes-achat/list.component').then(m => m.DemandesAchatListComponent) },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
```

Chaque feature est lazy-loaded → bundle initial < 300 ko.

---

## 6. Couche HTTP & interceptors

### `app.config.ts`

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor]),
      withFetch(), // pour SSE compatibility
    ),
    provideAnimations(),
    provideToastr({ positionClass: 'toast-bottom-right', timeOut: 4000 }),
    { provide: API_BASE_URL, useValue: environment.apiUrl },
  ],
};
```

### `auth.interceptor.ts`

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).accessToken();
  if (token && !req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
```

### `error.interceptor.ts`

```ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout();
        router.navigateByUrl('/login');
      } else if (err.status >= 500) {
        toastr.error('Erreur serveur — réessayez');
      } else if (err.status === 403) {
        toastr.warning('Action non autorisée');
      } else if (err.error?.error) {
        toastr.error(err.error.error);
      }
      return throwError(() => err);
    }),
  );
};
```

---

## 7. Services métier (1 par domaine API)

Chaque service expose des méthodes typées qui retournent des `Observable<T>`. Les types correspondent aux tables du plan §8.

### `vehicules.service.ts`

```ts
@Injectable({ providedIn: 'root' })
export class VehiculesService {
  private http = inject(HttpClient);
  private base = inject(API_BASE_URL);

  list(params: VehiculeFilters = {}): Observable<Page<Vehicule>> {
    return this.http.get<Page<Vehicule>>(`${this.base}/vehicules`, { params: toParams(params) });
  }
  get(id: number): Observable<VehiculeDetail> {
    return this.http.get<VehiculeDetail>(`${this.base}/vehicules/${id}`);
  }
  create(body: NewVehiculePayload): Observable<Vehicule> {
    return this.http.post<Vehicule>(`${this.base}/vehicules`, body);
  }
  update(id: number, body: Partial<NewVehiculePayload>): Observable<Vehicule> {
    return this.http.put<Vehicule>(`${this.base}/vehicules/${id}`, body);
  }
  setStatut(id: number, statut: VehiculeStatut): Observable<void> {
    return this.http.patch<void>(`${this.base}/vehicules/${id}/statut`, { statut });
  }
  historique(id: number, p: HistoriqueFilters): Observable<Page<HistoriqueEntry>> { … }
  kpis(id: number): Observable<VehiculeKpis> { … }
  /* + camion-specific */
  getCamionDetails(vehiculeId: number): Observable<CamionDetails> {
    return this.http.get<CamionDetails>(`${this.base}/camions/${vehiculeId}/details`);
  }
  updateCamionDetails(vehiculeId: number, body: CamionDetails): Observable<CamionDetails> {
    return this.http.put<CamionDetails>(`${this.base}/camions/${vehiculeId}/details`, body);
  }
}
```

### Liste exhaustive des services (1 par groupe d'endpoints §9 du plan)

| Service | Fichier | Endpoints couverts |
|---|---|---|
| `AuthService` | `core/auth/auth.service.ts` | `/auth/*` |
| `VehiculesService` | `features/vehicules/vehicules.service.ts` | `/vehicules/*`, `/camions/*` |
| `InterventionsService` | `features/interventions/interventions.service.ts` | `/interventions/*` |
| `ComposantsService` | `features/composants/composants.service.ts` | `/composants/*` |
| `PneusService` | `features/pneus/pneus.service.ts` | `/pneus/*`, `/vehicules/{id}/pneus`, `/pneus/{id}/inspections` |
| `VidangesService` | `features/vidanges/vidanges.service.ts` | `/vidanges/*` |
| `RelevesService` | `features/import-export/releves.service.ts` | `/import/releves-compteurs`, `/vehicules/{id}/releves` |
| `KpisService` | `features/dashboard/kpis.service.ts` | `/kpis/*` |
| `NotificationsService` | `core/notifications/notifications.service.ts` | `/notifications/*` |
| `DemandesAchatService` | `features/demandes-achat/demandes-achat.service.ts` | `/demandes-achat/*`, `/fournisseurs/*` |
| `ImportExportService` | `features/import-export/import-export.service.ts` | `/import/*`, `/export/*` |
| `ChatbotService` | `features/chatbot/chatbot.service.ts` | `/ai/chat` (SSE), `/ai/health` |
| `TableauJourneesService` | `features/tableau-journees/tj.service.ts` | `/tableau-journees` |
| `UsersService` | `features/profile/users.service.ts` | `/users/me/*` |

Chaque service est `providedIn: 'root'` (singleton). Pas de `forRoot()`, pas de NgModule.

---

## 8. State management — Signals + RxJS

**Règle :**
- **Données serveur en cache local** → `signal()` exposé par le service ou par le composant
- **Flux async (HTTP, SSE, debounced search)** → `Observable` via RxJS
- **Bridge Signal ↔ Observable** : `toSignal()` (pour transformer un Observable en Signal) et `toObservable()` (l'inverse)

### Pattern type — `dashboard.component.ts`

```ts
@Component({…})
export class DashboardComponent {
  private kpisSvc = inject(KpisService);

  readonly kpis = toSignal(this.kpisSvc.getKpis(), { initialValue: undefined });
  readonly periode = signal('Mars 2026');
  readonly compactMode = signal(false);

  readonly disponibiliteSeries = toSignal(
    this.kpisSvc.disponibiliteTimeseries({ mois: 12 }),
    { initialValue: [] },
  );

  // Calcul dérivé
  readonly kpiHighlight = computed(() => {
    const k = this.kpis();
    if (!k) return null;
    return k.disponibilite < 90 ? 'critical' : 'ok';
  });
}
```

### Pattern type — `vehicules-list` avec recherche debounced

```ts
export class VehiculesListComponent {
  private svc = inject(VehiculesService);

  readonly searchControl = new FormControl('');
  readonly typeFilter = signal<VehiculeType | 'all'>('all');
  readonly statutFilter = signal<VehiculeStatut | 'all'>('all');
  readonly page = signal(0);

  // Combine plusieurs sources -> 1 Observable -> 1 Signal
  private readonly query$ = combineLatest([
    this.searchControl.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()),
    toObservable(this.typeFilter),
    toObservable(this.statutFilter),
    toObservable(this.page),
  ]).pipe(
    switchMap(([q, type, statut, page]) =>
      this.svc.list({ q: q ?? '', type, statut, page, size: 20 }).pipe(
        catchError(() => of({ content: [], total: 0 })),
      ),
    ),
    shareReplay(1),
  );

  readonly result = toSignal(this.query$, { initialValue: { content: [], total: 0 } });
}
```

### State partagé inter-composants

Pour un état partagé limité (ex : nombre de notifications non-lues affiché dans la top bar), un service expose un `Signal` :

```ts
@Injectable({ providedIn: 'root' })
export class NotifBellService {
  private http = inject(HttpClient);
  private base = inject(API_BASE_URL);

  private _unreadCount = signal(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  refresh() {
    this.http.get<{ count: number }>(`${this.base}/notifications/non-lues/count`)
      .subscribe(({ count }) => this._unreadCount.set(count));
  }

  markAllRead() {
    this.http.patch(`${this.base}/notifications/lire-tout`, {}).subscribe(() => this._unreadCount.set(0));
  }
}
```

Polling toutes les 60 s dans `app-shell.component.ts` :

```ts
private notifBell = inject(NotifBellService);

constructor() {
  this.notifBell.refresh();
  interval(60_000).pipe(takeUntilDestroyed()).subscribe(() => this.notifBell.refresh());
}
```

---

## 9. Authentification & guards

### `auth.service.ts`

```ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(localStorage.getItem('jwt'));

  readonly user = this._user.asReadonly();
  readonly accessToken = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/auth/login', { email, password }).pipe(
      tap(res => {
        localStorage.setItem('jwt', res.access_token);
        localStorage.setItem('jwt_refresh', res.refresh_token);
        this._token.set(res.access_token);
        this._user.set(res.user);
      }),
    );
  }

  register(payload: RegisterPayload): Observable<LoginResponse> { … }

  refresh(): Observable<{ access_token: string }> {
    const refresh = localStorage.getItem('jwt_refresh');
    return this.http.post<{ access_token: string }>('/auth/refresh', { refresh_token: refresh });
  }

  logout(): void {
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem('jwt');
    localStorage.removeItem('jwt_refresh');
  }
}
```

### `auth.guard.ts`

```ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigateByUrl('/login');
  return false;
};
```

JWT stocké dans `localStorage` (acceptable pour le contexte 4-5 utilisateurs internes ; pour exposition publique on passerait à HttpOnly cookies).

---

## 10. Composants partagés (design system)

Tous standalone. Les enums ci-dessous correspondent **exactement** aux valeurs CHECK CONSTRAINT du plan §8.

### `StatusBadge` (vehicule.statut)

```ts
@Component({
  selector: 'ft-status-badge',
  standalone: true,
  template: `
    <span class="px-2 py-1 rounded-r4 text-xs font-semibold"
          [class]="cls()">
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  status = input.required<'in-service' | 'workshop' | 'maintenance' | 'out-of-service'>();
  label = computed(() => LABELS[this.status()]);
  cls = computed(() => CLASSES[this.status()]);
}
const LABELS = { 'in-service':'En service', workshop:'Atelier', maintenance:'Maintenance', 'out-of-service':'Hors-service' };
const CLASSES = { 'in-service':'bg-green-50 text-green-700', workshop:'bg-amber-50 text-amber-700',
                  maintenance:'bg-blue-50 text-blue-700', 'out-of-service':'bg-red-50 text-red-700' };
```

### `SevBadge` (notifications.severite + interventions.categorie)

Mappe les enums `critical|warning|success|info` (notifs) ET `preventive|corrective|depannage|controle` (interventions). 2 inputs : `kind` (`'sev'|'cat'`) + `value`.

### `UrgencyBadge` & `RequestStatusBadge`

`Haute/Moyenne/Basse` et `Nouvelle/Approuvée/Rejetée/Clôturée` — utilisés exclusivement par S19.

### `KpiCard`

```ts
@Component({
  selector: 'ft-kpi-card',
  standalone: true,
  template: `
    <div class="bg-white rounded-r12 shadow-sh-sm p-4 border border-n200">
      <div class="text-xs uppercase tracking-wide text-n500 font-semibold">{{ label() }}</div>
      <div class="font-mono text-3xl text-dark mt-2">{{ value() }}</div>
      @if (delta()) {
        <div class="text-sm" [class.text-success]="delta()! > 0" [class.text-critical]="delta()! < 0">
          {{ delta()! > 0 ? '+' : '' }}{{ delta() }}%
        </div>
      }
    </div>
  `,
})
export class KpiCardComponent {
  label = input.required<string>();
  value = input.required<string>();
  delta = input<number | null>(null);
}
```

### `AxleSchema` — SVG essieux camion

Reprend strictement la logique du proto (`hifi-components.jsx` ll. 751-790).

```ts
@Component({
  selector: 'ft-axle-schema',
  standalone: true,
  template: `
    <svg [attr.viewBox]="viewBox()" class="w-full h-auto">
      @for (axle of axles(); track $index; let i = $index) {
        <!-- chassis line -->
        <line [attr.x1]="40" [attr.y1]="60 + i*80" [attr.x2]="360" [attr.y2]="60 + i*80" stroke="#404040" stroke-width="3"/>
        <!-- tires -->
        @for (pos of [...axle.left, ...axle.right]; track pos.position) {
          <g (click)="select.emit(pos.position)" class="cursor-pointer">
            <rect [attr.x]="pos.x" [attr.y]="pos.y" width="32" height="48" rx="4"
                  [attr.fill]="tireColor(pos.status)" stroke="#1A1A1A" stroke-width="1.5"/>
            <text [attr.x]="pos.x + 16" [attr.y]="pos.y + 28" text-anchor="middle"
                  font-family="JetBrains Mono" font-size="11" fill="white">{{ pos.position }}</text>
          </g>
        }
      }
    </svg>
  `,
})
export class AxleSchemaComponent {
  config = input.required<'4x2' | '6x4' | 'plateau-2x2'>();
  tires = input.required<Tire[]>();
  selectedPosition = input<number | null>(null);
  select = output<number>();

  axles = computed(() => buildAxles(this.config(), this.tires()));
  viewBox = computed(() => `0 0 400 ${this.axles().length * 80 + 40}`);

  tireColor(status: TireStatus) {
    return status === 'empty' ? '#DC2626' : status === 'warn' ? '#D97706' : '#16A34A';
  }
}
```

### `TireCard`

Affiche position, série, date montage, km parcourus, km restant, statut, pression PSI, profondeur. Inputs : `tire: Tire`. Émet `replace`, `inspect`, `permute`.

### `DataTable` générique

Supporte : colonnes configurables (visible/masquée), tri serveur, pagination serveur, sélection multi, scroll virtuel via `@angular/cdk/scrolling` quand >500 lignes (utile pour interventions historiques).

### `BellDropdown`

Cloche + badge `unreadCount()` + dropdown 5 dernières alertes critiques. Reprend le design de `BellDropdown` du proto (ll. 192-220 de `hifi-components.jsx`).

### `UploadDropzone`

Drag-and-drop file upload, validation `accept=".xlsx"`, prévisualisation taille + nom, émet `(filesSelected)`.

---

## 11. Pages (17 écrans) — détail par page

Pour chaque écran : route, composants importés, services consommés, signals/observables clés, formulaires, navigation sortante.

### S01 — `/login` (Login + Inscription)

- **Composants** : `LoginComponent` (tab Connexion + tab Inscription)
- **Service** : `AuthService.login()`, `AuthService.register()`
- **Form** : 2 ReactiveForms (`loginForm`, `registerForm`) avec validators `Validators.email`, `Validators.minLength(8)`, `passwordMatch` custom
- **Layout** : `grid-cols-2`, panneau gauche brand (logo + tagline + photo flotte), panneau droit form
- **Toaster** au login échoué ; redirection `/dashboard` au succès

### S02 — `/dashboard`

- **Service** : `KpisService` + `InterventionsService.recentes()` + `NotificationsService.critiques()`
- **Layout** : `<gridster>` avec `WIDGET_DEFS` (8 widgets, 4 visibles par défaut)
- **Signals**
  - `kpis` (toSignal)
  - `dashboardConfig` (depuis `users/me/dashboard-config`)
  - `compactMode` (signal local persisté en `localStorage`)
- **Modal** : `ManageWidgetsModal` (3 groupes : KPIs / Issues / Service)
- **Persistance** : à chaque drag/resize, debounce 1 s puis `PUT /users/me/dashboard-config` avec le layout sérialisé

### S03 — `/vehicules`

- **Service** : `VehiculesService.list()`
- **Toggle** : tableau ↔ cartes (signal `viewMode`)
- **Filter chips** : `Camion | Chariot | En service | Atelier | Maintenance` (signaux multi-select)
- **Modal `NewVehiculeModal`** : ReactiveForm conditionnel — si `type=camion` alors le panneau « Détails camion » (capacité, config_axle, expirations…) apparaît via `@if`
- **Modal `ManageColumnsModal`** : checkboxes des colonnes ; persisté par utilisateur côté `dashboardConfig.vehiculeColumns`

### S04 — `/vehicules/:id`

- Navigation par tabs (lien anchor `#interventions`, etc., ou `signal currentTab`)
- **7 tabs** :
  1. **Infos** : grid 2 colonnes — informations techniques + carte Conformité (visible uniquement si `vehicule.type==='camion'` via `@if`)
  2. **Interventions** : DataTable filtré par véhicule
  3. **Gestion pneus** : `<ft-axle-schema>` + panneau `<ft-tire-card>` à droite, **affiché uniquement si camion**
  4. **Vidanges** : tableau NBH huile/gasoil/air
  5. **KPIs** : 6 mini-KPIs (Dispo, Voyages/mois, Coût YTD, KM parcourus, KM cumulés, Conso gasoil)
  6. **Historique** : timeline filtrable
  7. **Composants** : tree view N1→N2→N3
- **Service** : `VehiculesService.get(id)` + `getCamionDetails(id)` (en parallèle via `forkJoin` si `type==='camion'`)

### S05 — `/interventions`

- **Tabs** : En cours / Terminées / Toutes (signal `tab`)
- **Filter chips** : 4 catégories (Préventive/Corrective/Dépannage/Contrôle) + recherche véhicule + plage dates
- **Modal `NewInterventionModal`** : ReactiveForm avec autocomplete véhicule (debounced 200 ms) et autocomplete composant (depuis `/composants/search`)
- **Action** : « Clôturer » → `PATCH /interventions/{id}/cloturer`

### S06 — `/composants`

- **Catalogue arborescent** : `TreeComponent` avec lazy-load enfants ; `GET /composants/tree` au chargement initial
- **Recherche autocomplete** sur référence/désignation (`debounceTime(250)` + `switchMap`)
- **Création à la volée** : modal mini-form (référence, désignation, partie, unité)

### S07 — `/vehicules/:id` onglet Pneus / OU page directe `/pneus`

Le proto a deux entrées : depuis fiche véhicule (onglet) ou page standalone. On garde **uniquement l'onglet** pour Angular (réduction de surface).

- **Composants** : `<ft-axle-schema>` clickable + `<ft-tire-card>` panneau droit
- **Toggle** : Tracteur (config_axle 6x4) / Semi-remorque (plateau-2x2)
- **Action** : `Permuter` (modal sélection nouvelle position) → `PATCH /pneus/{id}/permuter` ; `Remplacer` → `PATCH /pneus/{id}/remplacer`

### S07b — `/pneus/:id`

- **4 tabs** : Vue d'ensemble / Activité / Inspections / Historique
- **Tab Inspections** : `POST /pneus/{id}/inspections` (ReactiveForm : activity, pression_psi, profondeur_32e, méthode, notes)

### S08 — `/vidanges`

- **Tabs** : À faire / En cours / Fait
- **Vue planning calendaire 4 semaines** : grille SVG ou simple table avec semaines en colonnes
- **Action `Clôturer`** : `PATCH /vidanges/{id}/cloturer`

### S10 — `/historique`

- **Timeline filtrable** : par véhicule (autocomplete), période (date-pickers), partie, type d'intervention
- Rendu : groupes par année, items chronologiques (chip type + date + composant + coût + note)

### S11 — `/chatbot`

- **Composant `ChatbotComponent`** :
  - `messages = signal<ChatMessage[]>([])`
  - `currentResponse = signal<string>('')` (texte streamé en cours de réception)
  - `isThinking = signal(false)`
  - `suggestions = ['Prédiction CHR-042', 'Pneus en alerte', 'Coût mensuel mars']`
- **Submit** : voir §13 SSE
- **Bubbles** : différenciation user (orange) / bot (gris) ; sources panel à droite (chips composants/véhicules cités)

### S12 — `/import-export`

- **3 cards** :
  1. **Relevés compteurs km** : `<ft-upload-dropzone accept=".xlsx">` → `POST /import/releves-compteurs` → preview lignes parsées avant confirmation
  2. **Import général** : même pattern, `POST /import/excel`
  3. **Export** : checkboxes entités (Véhicules / Interventions / Composants / Pneus / Vidanges / KPIs) + sélecteur période + 2 boutons (Excel / PDF)
- **Tableau historique** : `GET /import/historique` (date, fichier, lignes ok/erreur, statut)

### S13 — `/notifications`

- **Tabs** : Tous / Non lues / Seuils / Système
- **Liste virtuelle** (`cdk-virtual-scroll-viewport`) si > 50 notifs
- **Click item** → marque lu (`PATCH /{id}/lire`) + navigate vers `target_screen` avec `target_id`
- **Bouton « Tout marquer lu »** → `PATCH /lire-tout`

### S16 — `/tableau-journees`

- **Date picker** (`<input type="date">`) → `GET /tableau-journees?date=`
- **Tableau** : 42 lignes véhicules + filtres (Marque/Type/Statut)
- **Footer** : 4 stats (Total / En service / Atelier / Maintenance)

### S17 — `/profil`

- **3 sections** : Infos personnelles (form), Sécurité (changement mot de passe), Préférences notifications (5 toggles : seuil_pneu, seuil_nbh, seuil_expiration, demande_achat, ai_chat)
- Persistance via `PUT /users/me`, `PUT /users/me/password`, `PUT /users/me/preferences-notifications`

### S19 — `/demandes-achat`

- **Liste** avec filtre statut + urgence
- **Modal `NewDemandeModal`** : ReactiveForm
  - select `composant` (autocomplete) OU input `piece_libre` (radio toggle)
  - `quantite`, `motif`, `urgence`, `fournisseur` (autocomplete + bouton « + ajouter »)
- **Modal `DemandeDetailModal`** : affiche tout + actions Approuver / Rejeter (modal sub-prompt pour `raison`) / Clôturer selon statut
- Toaster au succès : « Bon de commande généré pour {{ code }} »

---

## 12. Forms & validation

**Stratégie :** Reactive Forms partout (typés depuis Angular 14+).

```ts
this.form = this.fb.group({
  code: ['', [Validators.required, Validators.pattern(/^[A-Z]{3}-\d{3}$/)]],
  type: ['camion' as VehiculeType, Validators.required],
  marque: ['', Validators.required],
  modele: ['', Validators.required],
  matricule: ['', [Validators.required, Validators.pattern(/^[0-9]{1,5}-[A-Z]-[0-9]{1,2}$/)]],
  annee: [null, [Validators.min(1990), Validators.max(2030)]],
  // Bloc camion conditionnel
  camionDetails: this.fb.group({
    capaciteTonnes: [null],
    configAxle: ['6x4'],
    visiteTechTracteurExpiration: [null],
    visiteTechSemiExpiration: [null],
    carnetCirculationExpiration: [null],
    metrologieExpiration: [null],
    extincteurExpiration: [null],
  }),
});

// Activer/désactiver le sous-form selon type
this.form.controls.type.valueChanges.subscribe(type => {
  type === 'camion'
    ? this.form.controls.camionDetails.enable()
    : this.form.controls.camionDetails.disable();
});
```

**Affichage erreurs** : composant `<ft-field-error [control]="form.controls.email">` qui mappe les erreurs vers messages FR (`required → "Champ obligatoire"`, `email → "Email invalide"`, etc.).

**Validateurs custom utiles :**
- `passwordMatch` (S01 inscription)
- `nbhMultipleOf(1000)` pour `compteur_nbh_actuel`
- `dateAfter('today')` pour expirations futures

---

## 13. Streaming SSE pour le chatbot

Le backend expose `POST /ai/chat` en `text/event-stream`. Implémentation native via `fetch` + `ReadableStream` (compatible avec `withFetch()`).

```ts
@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private base = inject(API_BASE_URL);
  private auth = inject(AuthService);

  /** Émet chunk par chunk au fur et à mesure du streaming. Termine sur close. */
  chat(message: string, conversationId: string): Observable<ChatChunk> {
    return new Observable<ChatChunk>(subscriber => {
      const ctrl = new AbortController();
      (async () => {
        try {
          const res = await fetch(`${this.base}/ai/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.auth.accessToken()}`,
              Accept: 'text/event-stream',
            },
            body: JSON.stringify({ message, conversation_id: conversationId }),
            signal: ctrl.signal,
          });
          if (!res.body) throw new Error('No body');
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() ?? '';
            for (const block of lines) {
              if (!block.startsWith('data: ')) continue;
              const json = block.slice(6).trim();
              if (json === '[DONE]') { subscriber.complete(); return; }
              subscriber.next(JSON.parse(json));
            }
          }
          subscriber.complete();
        } catch (e) {
          subscriber.error(e);
        }
      })();
      return () => ctrl.abort();
    });
  }
}
```

Côté composant :

```ts
sendMessage(text: string) {
  const id = crypto.randomUUID();
  this.messages.update(m => [...m, { role: 'user', text }, { role: 'bot', text: '', sources: [], id }]);
  this.isThinking.set(true);

  this.chatbotSvc.chat(text, this.conversationId)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: chunk => {
        if (chunk.type === 'text') {
          this.messages.update(m => m.map(msg => msg.id === id ? { ...msg, text: msg.text + chunk.delta } : msg));
        } else if (chunk.type === 'sources') {
          this.messages.update(m => m.map(msg => msg.id === id ? { ...msg, sources: chunk.sources } : msg));
        }
      },
      complete: () => this.isThinking.set(false),
      error: () => { this.isThinking.set(false); this.toastr.error('Chatbot indisponible'); },
    });
}
```

`AbortController` permet d'annuler le stream si l'utilisateur quitte la page (cleanup auto via `takeUntilDestroyed`).

---

## 14. Dashboard widgets drag-drop

**Lib :** `angular-gridster2`. Configuration :

```ts
gridsterOptions: GridsterConfig = {
  gridType: 'fit',
  displayGrid: 'onDrag&Resize',
  pushItems: true,
  draggable: { enabled: true, ignoreContent: true, dragHandleClass: 'widget-handle' },
  resizable: { enabled: true },
  margin: 12,
  outerMargin: true,
  minCols: 6,
  maxCols: 12,
  minRows: 4,
};
```

Chaque widget est un composant standalone qui implémente l'interface `WidgetComponent` :

```ts
export interface WidgetComponent {
  readonly title: Signal<string>;
  refresh?(): void;
}
```

Définitions persistées dans `users.dashboard_config` JSONB :

```json
{
  "layout": [
    { "id": "kpi-dispo",  "x": 0, "y": 0, "cols": 3, "rows": 2 },
    { "id": "kpi-cout",   "x": 3, "y": 0, "cols": 3, "rows": 2 },
    { "id": "chart-dispo","x": 0, "y": 2, "cols": 8, "rows": 4 },
    { "id": "alerts",     "x": 8, "y": 2, "cols": 4, "rows": 4 }
  ],
  "hidden": ["kpi-km", "kpi-km-cum", "costs-donut"],
  "compactMode": false
}
```

Sauvegarde debounced (1 s) après chaque interaction utilisateur.

---

## 15. i18n & formatage MAD / dates FR

**Locale :** `fr-FR` chargée par défaut.

```ts
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
registerLocaleData(localeFr);

// app.config.ts
{ provide: LOCALE_ID, useValue: 'fr-FR' },
```

### Pipe `mad`

```ts
@Pipe({ name: 'mad', standalone: true, pure: true })
export class MadPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    if (v == null) return '—';
    return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MAD';
  }
}
```

### Pipe `km`

`1 842 310 km` ; au-delà de 1M, format compact : `1,84M km`.

### Pipe `relativeTime`

Wrap `formatDistanceToNow(date, { locale: fr, addSuffix: true })` de `date-fns`.

---

## 16. Tests & qualité

| Niveau | Outil | Cible |
|---|---|---|
| Unit | Jasmine + Karma | Services, pipes, validateurs, computed signals |
| Composant | `@angular/core/testing` + `TestBed` | Composants standalone (login, kpi-card, axle-schema) |
| E2E | Cypress | Parcours critiques (login → dashboard → fiche véhicule → nouvelle intervention → demande d'achat) |
| Lint | ESLint + `@angular-eslint` | Pre-commit hook (Husky) |
| Format | Prettier | Pre-commit hook |

**Couverture cible :** 70 % statements sur services et logique métier ; pas de cible sur la couche présentation pure (perte de temps).

---

## 17. Build & déploiement

### Commandes

```bash
npm run build           # ng build --configuration=production
npm run test            # ng test (Karma headless en CI)
npm run e2e             # cypress run
npm run lint            # eslint .
```

### Production build

```jsonc
// angular.json (extrait)
"production": {
  "budgets": [
    { "type": "initial", "maximumWarning": "350kb", "maximumError": "500kb" },
    { "type": "anyComponentStyle", "maximumWarning": "4kb" }
  ],
  "outputHashing": "all",
  "fileReplacements": [{ "replace": "src/environments/environment.ts", "with": "src/environments/environment.prod.ts" }]
}
```

### Dockerfile (multi-stage)

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

# Serve stage
FROM nginx:1.27-alpine
COPY --from=build /app/dist/fleettracker-web/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### `nginx.conf`

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  location /api/ { proxy_pass http://gateway:8080/api/; }
  location / { try_files $uri $uri/ /index.html; }
}
```

L'image est buildée par VM1 (CI), poussée au registry local, puis tirée par VM2 dans le `docker-compose.yml` aux côtés des 3 services backend.

---

## Annexe — Mapping prototype JSX → Angular

| Élément JSX (proto) | Équivalent Angular |
|---|---|
| `T.primary`, `T.fontH` | Tokens Tailwind `text-primary`, `font-heading` |
| `<TopBar>` | `<ft-top-bar>` dans `app-shell.component.ts` |
| `<StatusBadge status="...">` | `<ft-status-badge [status]="...">` |
| `<AxleSchema config="6x4">` | `<ft-axle-schema [config]="'6x4'">` |
| `<TireCard>` | `<ft-tire-card>` |
| `WIDGET_DEFS` | `app/features/dashboard/widgets/widget-registry.ts` |
| `Toasts` | `ngx-toastr` |
| Mocks `tractorTires`, `interventions` | Remplacés par appels services réels |
| `setScreen('dashboard')` | `router.navigateByUrl('/dashboard')` |
| `useState` | `signal()` |
| `useEffect` | `effect()` ou `toSignal` |
| `useCallback` | méthode de classe (Angular n'a pas besoin de mémoïsation) |

---

*Frontend Angular 21 — INTERSIG FleetTracker — Mouad Jamil — DAIA — Avril 2026 — v1*
