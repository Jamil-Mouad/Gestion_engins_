import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LucideAngularModule, Search, MoreHorizontal } from 'lucide-angular';

import { ComposantsComponent } from './composants.component';
import { ComposantNode } from '../../shared/models/composant.model';

describe('ComposantsComponent', () => {
  let httpMock: HttpTestingController;

  const mockTree: ComposantNode[] = [
    {
      id: 1,
      designation: 'Moteur',
      niveau: 1,
      categorie: 'moteur',
      children: [
        {
          id: 2,
          designation: 'Culasse',
          niveau: 2,
          categorie: null,
          children: [
            { id: 3, designation: 'Joint de culasse', niveau: 3, categorie: null, children: [] },
          ],
        },
        { id: 4, designation: 'Piston', niveau: 2, categorie: null, children: [] },
      ],
    },
    { id: 5, designation: 'Pneu', niveau: 1, categorie: 'pneumatique', children: [] },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LucideAngularModule.pick({ Search, MoreHorizontal })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads tree on init via GET /api/v1/composants/tree', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne('/api/v1/composants/tree');
    expect(req.request.method).toBe('GET');
    req.flush(mockTree);

    expect(component.tree().length).toBe(2);
    expect(component.tree()[0].designation).toBe('Moteur');
    expect(component.loading()).toBe(false);
  });

  it('renders page header with title "Composants" after loading', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const header = nativeEl.querySelector('app-page-header');
    expect(header).toBeTruthy();
  });

  it('renders data rows for each top-level node after loading', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const rows = nativeEl.querySelectorAll('app-data-table-row');
    // 2 top-level nodes (Moteur + Pneu)
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when tree is empty', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush([]);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-empty-state')).toBeTruthy();
  });

  it('shows skeleton while loading', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();

    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
  });

  it('toggles node expansion on click', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    fixture.detectChanges();

    expect(component.expanded().has(1)).toBe(false);
    component.toggle(1);
    expect(component.expanded().has(1)).toBe(true);
    component.toggle(1);
    expect(component.expanded().has(1)).toBe(false);
  });

  it('renders children rows when node is expanded', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    fixture.detectChanges();

    component.toggle(1); // expand 'Moteur'
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    // Moteur(1) + Pneu(1) + Culasse(1) + Piston(1) = 4 rows
    const rows = nativeEl.querySelectorAll('app-data-table-row');
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('renders leaf nodes when child is expanded', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    fixture.detectChanges();

    component.toggle(1); // expand Moteur
    fixture.detectChanges();
    component.toggle(2); // expand Culasse
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    // Moteur(1)+Pneu(1)+Culasse(1)+Piston(1)+JointDeCulasse(1) = 5
    const rows = nativeEl.querySelectorAll('app-data-table-row');
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect((nativeEl as HTMLElement).textContent).toContain('Joint de culasse');
  });

  it('renders partie badges for nodes with categorie', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const badges = nativeEl.querySelectorAll('.partie-badge');
    // 2 top-level nodes with categories: moteur, pneumatique
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('sets loading to false on error', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.error(new ProgressEvent('error'));

    expect(component.loading()).toBe(false);
  });

  it('filters nodes by partie when partieFilter is set', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    fixture.detectChanges();

    component.partieFilter.set('moteur');
    fixture.detectChanges();

    // Only Moteur (categorie: 'moteur') should match
    expect(component.filteredNodes().length).toBe(1);
    expect(component.filteredNodes()[0].designation).toBe('Moteur');
  });

  it('filters nodes by searchQuery', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    fixture.detectChanges();

    component.searchQuery.set('pneu');
    fixture.detectChanges();

    expect(component.filteredNodes().length).toBe(1);
    expect(component.filteredNodes()[0].designation).toBe('Pneu');
  });

  it('renders filter chips for partie categories', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const chips = nativeEl.querySelectorAll('app-filter-chip');
    // "Toutes" + 7 parties (incl. 'autre') = 8
    expect(chips.length).toBe(8);
  });

  it('partieLabel returns correct display label', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush([]);

    expect(component.partieLabel('moteur')).toBe('Moteur');
    expect(component.partieLabel('electrique')).toBe('Électrique');
    expect(component.partieLabel(null)).toBe('—');
  });
});
