import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import {
  LucideAngularModule, Search, Image,
  ChevronDown, ChevronRight, Pencil, Plus, Trash2, Download, Settings, GripVertical,
  LayoutGrid, Table2, Upload, Maximize2, X,
} from 'lucide-angular';

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
      imports: [LucideAngularModule.pick({
        Search, Image,
        ChevronDown, ChevronRight, Pencil, Plus, Trash2, Download, Settings, GripVertical,
        LayoutGrid, Table2, Upload, Maximize2, X,
      })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        provideToastr(),
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

  it('renders tree items for each top-level node after loading', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    component.viewMode.set('tree'); // explicitly set tree view (default is now flat)
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    // In tree view, top-level nodes render as .tree-item--l1 divs
    const rows = nativeEl.querySelectorAll('.tree-item--l1');
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

    expect(component.expandedIds().has(1)).toBe(false);
    component.toggle(1);
    expect(component.expandedIds().has(1)).toBe(true);
    component.toggle(1);
    expect(component.expandedIds().has(1)).toBe(false);
  });

  it('renders children items when node is expanded in tree view', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    component.viewMode.set('tree'); // explicitly set tree view (default is now flat)
    fixture.detectChanges();

    component.toggle(1); // expand 'Moteur' → shows Culasse + Piston as .tree-item--l2
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    // l1: Moteur + Pneu = 2; l2: Culasse + Piston = 2 → total tree-item ≥ 4
    const items = nativeEl.querySelectorAll('.tree-item');
    expect(items.length).toBeGreaterThanOrEqual(4);
  });

  it('renders leaf nodes when child is expanded in tree view', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    component.viewMode.set('tree'); // explicitly set tree view (default is now flat)
    fixture.detectChanges();

    component.toggle(1); // expand Moteur
    fixture.detectChanges();
    component.toggle(2); // expand Culasse → shows Joint de culasse as .tree-item--l3
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const items = nativeEl.querySelectorAll('.tree-item');
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect((nativeEl as HTMLElement).textContent).toContain('Joint de culasse');
  });

  it('renders partie badges for nodes with categorie in flat view', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    component.viewMode.set('flat');
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const badges = nativeEl.querySelectorAll('.partie-badge');
    // moteur + pneumatique nodes
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

  it('table view shows only roots by default (collapsed)', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);

    expect(component.flattenedFiltered().map(n => n.id)).toEqual([1, 5]);
  });

  it('toggleTableRow reveals children, then grandchildren', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);

    component.toggleTableRow(1); // expand Moteur
    expect(component.flattenedFiltered().map(n => n.id)).toEqual([1, 2, 4, 5]);

    component.toggleTableRow(2); // expand Culasse
    expect(component.flattenedFiltered().map(n => n.id)).toEqual([1, 2, 3, 4, 5]);

    component.toggleTableRow(1); // collapse Moteur hides whole subtree
    expect(component.flattenedFiltered().map(n => n.id)).toEqual([1, 5]);
  });

  it('search bypasses collapse and matches nested nodes', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);

    component.searchQuery.set('culasse');
    expect(component.tableFilterActive()).toBe(true);
    expect(component.flattenedFiltered().map(n => n.designation))
      .toEqual(['Culasse', 'Joint de culasse']);
  });

  it('gear button opens the column manager modal, not the export modal', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    (nativeEl.querySelector('.btn-settings') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.showColManager()).toBe(true);
    expect(component.showExportModal()).toBe(false);
    expect(nativeEl.querySelector('app-column-manager-modal')).toBeTruthy();
  });

  it('counts descendants of the delete target', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);

    component.confirmDelete(component.tree()[0]); // Moteur → Culasse, Joint, Piston
    expect(component.deleteDescendants()).toBe(3);

    component.confirmDelete(component.tree()[1]); // Pneu (leaf)
    expect(component.deleteDescendants()).toBe(0);
  });

  it('tree view renders a niveau-4 node when all ancestors are expanded', () => {
    const deepTree: ComposantNode[] = [
      {
        id: 1, designation: 'Carrosserie', niveau: 1, categorie: 'autre',
        children: [{
          id: 2, designation: 'Capot', niveau: 2, categorie: null,
          children: [{
            id: 3, designation: 'Vérins', niveau: 3, categorie: null,
            children: [
              { id: 4, designation: 'Joint vérin', niveau: 4, categorie: null, children: [] },
            ],
          }],
        }],
      },
    ];
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(deepTree);
    component.viewMode.set('tree');

    component.toggle(1);
    component.toggle(2);
    expect(component.treeRows().map(n => n.id)).toEqual([1, 2, 3]);
    component.toggle(3);
    expect(component.treeRows().map(n => n.id)).toEqual([1, 2, 3, 4]);

    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Joint vérin');
    const verinsRow = Array.from(nativeEl.querySelectorAll('.tree-item'))
      .find(el => el.textContent?.includes('Vérins')) as HTMLElement;
    expect(verinsRow.querySelector('.tree-chevron')).toBeTruthy();
  });

  it('saving a sous-composant auto-expands its parent in both views', () => {
    const fixture = TestBed.createComponent(ComposantsComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/composants/tree');
    req.flush(mockTree);

    component.openCreateChild(component.tree()[0].children[0]); // Culasse (id 2)
    component.onFormSaved();
    const reloadReq = httpMock.expectOne('/api/v1/composants/tree');
    reloadReq.flush(mockTree);

    expect(component.expandedIds().has(2)).toBe(true);
    expect(component.tableExpandedIds().has(2)).toBe(true);
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
