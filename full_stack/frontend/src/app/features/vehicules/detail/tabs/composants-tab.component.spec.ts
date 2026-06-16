import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import {
  LucideAngularModule, Search, Image, Plus, Pencil, Trash2,
  ChevronDown, ChevronRight, Upload, Download, Settings,
} from 'lucide-angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

import { ComposantsTabComponent } from './composants-tab.component';
import { ComposantNode } from '../../../../shared/models/composant.model';

function makeNode(overrides: Partial<ComposantNode> = {}): ComposantNode {
  return {
    id: 1,
    designation: 'Moteur',
    reference: 'MOT-001',
    categorie: 'moteur',
    unite: 'pièce',
    stock: 5,
    niveau: 1,
    vehiculeType: null,
    imageUrl: null,
    children: [],
    ...overrides,
  };
}

describe('ComposantsTabComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LucideAngularModule.pick({
        Search, Image, Plus, Pencil, Trash2,
        ChevronDown, ChevronRight, Upload, Download, Settings,
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
    httpMock.match(() => true).forEach(r => r.flush([]));
    httpMock.verify();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads tree on init via GET /api/v1/composants/tree', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    expect(req.request.method).toBe('GET');
    req.flush([makeNode({ id: 1 }), makeNode({ id: 2, designation: 'Freinage' })]);

    expect(comp.tree().length).toBe(2);
    expect(comp.loading()).toBe(false);
  });

  it('initial load uses the bound vehiculeId (per-vehicle tree, not template)', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.componentRef.setInput('vehiculeId', 283);
    fixture.detectChanges(); // ngOnInit runs after inputs are bound
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    expect(req.request.params.get('vehiculeId')).toBe('283');
    req.flush([]);
  });

  it('sets loading=false on error', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush('error', { status: 500, statusText: 'Server Error' });
    expect(comp.loading()).toBe(false);
  });

  it('viewMode defaults to "table"', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance.viewMode()).toBe('table');
  });

  it('toggleExpand adds and removes id from expandedIds', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);

    comp.toggleExpand(1);
    expect(comp.expandedIds().has(1)).toBe(true);
    comp.toggleExpand(1);
    expect(comp.expandedIds().has(1)).toBe(false);
  });

  it('selectedId defaults to null', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance.selectedId()).toBeNull();
  });

  it('selectedNode defaults to null', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance.selectedNode()).toBeNull();
  });

  it('categorieLabel returns correct label for known category', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance.categorieLabel('moteur')).toBe('Moteur');
    expect(fixture.componentInstance.categorieLabel('pneumatique')).toBe('Pneumatique');
    expect(fixture.componentInstance.categorieLabel('freinage')).toBe('Freinage');
  });

  it('categorieLabel returns "—" for null/undefined', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance.categorieLabel(null)).toBe('—');
    expect(fixture.componentInstance.categorieLabel(undefined)).toBe('—');
  });

  it('visibleTableCols includes action column at end', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    const cols = fixture.componentInstance.visibleTableCols();
    expect(cols[cols.length - 1].id).toBe('actions');
  });

  it('onTableColumnsApplied updates tableColIds and closes manager', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);

    comp.showColManager.set(true);
    comp.onTableColumnsApplied(['reference', 'designation']);
    expect(comp.tableColIds()).toEqual(['reference', 'designation']);
    expect(comp.showColManager()).toBe(false);
  });

  it('selectNode loads composant detail and sets selectedId', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([makeNode({ id: 1 })]);

    const node = makeNode({ id: 1 });
    comp.selectNode(node);

    const detailReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/1');
    detailReq.flush({ ...node, stock: 5 });

    expect(comp.selectedId()).toBe(1);
    expect(comp.detailLoading()).toBe(false);
  });

  it('selectNode does nothing if same node already selected', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);

    const node = makeNode({ id: 5 });
    comp.selectedId.set(5);
    comp.selectNode(node); // Same node — should not trigger HTTP
    // No HTTP request should be made
    httpMock.expectNone('/api/v1/composants/5');
  });

  it('onTreeRowClick selects node and toggles expand when has children', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);

    const node = makeNode({ id: 1, children: [makeNode({ id: 2, designation: 'Child' })] });
    comp.onTreeRowClick(node);

    const detailReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/1');
    detailReq.flush({ ...node });

    expect(comp.selectedId()).toBe(1);
    expect(comp.expandedIds().has(1)).toBe(true);
  });

  it('openCreateRoot sets modal mode and shows modal', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);

    comp.openCreateRoot();
    expect(comp.showCreateModal()).toBe(true);
    expect(comp.modalMode()).toBe('create');
  });

  it('modalTitle computed returns "Ajouter composant" for create mode', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);

    comp.modalMode.set('create');
    expect(comp.modalTitle()).toBe('Ajouter composant');
  });

  it('modalTitle computed returns "Modifier composant" for edit mode', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);

    comp.modalMode.set('edit');
    expect(comp.modalTitle()).toBe('Modifier composant');
  });

  it('table view shows only roots until a row is expanded', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([
      makeNode({ id: 1, children: [makeNode({ id: 2, designation: 'Culasse', niveau: 2 })] }),
      makeNode({ id: 3, designation: 'Freinage' }),
    ]);

    expect(comp.filteredNodes().map(n => n.id)).toEqual([1, 3]);

    comp.toggleTableRow(1);
    expect(comp.filteredNodes().map(n => n.id)).toEqual([1, 2, 3]);

    comp.toggleTableRow(1);
    expect(comp.filteredNodes().map(n => n.id)).toEqual([1, 3]);
  });

  it('search bypasses collapse and matches nested nodes', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([
      makeNode({ id: 1, children: [makeNode({ id: 2, designation: 'Culasse', niveau: 2, reference: null })] }),
    ]);

    comp.searchQuery.set('culasse');
    expect(comp.tableFilterActive()).toBe(true);
    expect(comp.filteredNodes().map(n => n.designation)).toEqual(['Culasse']);
  });

  it('deleteConfirmMessage mentions descendant count for a subtree', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);

    comp.askDelete(makeNode({ id: 1, children: [
      makeNode({ id: 2, niveau: 2, children: [makeNode({ id: 3, niveau: 3 })] }),
    ]}));
    expect(comp.deleteDescendants()).toBe(2);
    expect(comp.deleteConfirmMessage()).toContain('2 sous-composants');

    comp.askDelete(makeNode({ id: 9 }));
    expect(comp.deleteDescendants()).toBe(0);
    expect(comp.deleteConfirmMessage()).not.toContain('sous-composants');
  });

  it('treeRows renders unlimited depth when ancestors are expanded', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([
      makeNode({ id: 1, designation: 'Carrosserie', children: [
        makeNode({ id: 2, designation: 'Capot', niveau: 2, children: [
          makeNode({ id: 3, designation: 'Vérins', niveau: 3, children: [
            makeNode({ id: 4, designation: 'Joint vérin', niveau: 4 }),
          ]}),
        ]}),
      ]}),
    ]);

    expect(comp.treeRows().map(n => n.id)).toEqual([1]);

    comp.toggleExpand(1);
    comp.toggleExpand(2);
    expect(comp.treeRows().map(n => n.id)).toEqual([1, 2, 3]);

    comp.toggleExpand(3);
    expect(comp.treeRows().map(n => n.id)).toEqual([1, 2, 3, 4]);
  });

  it('tree view renders a niveau-4 node and a chevron on its N3 parent', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([
      makeNode({ id: 1, designation: 'Carrosserie', children: [
        makeNode({ id: 2, designation: 'Capot', niveau: 2, children: [
          makeNode({ id: 3, designation: 'Vérins', niveau: 3, children: [
            makeNode({ id: 4, designation: 'Joint vérin', niveau: 4 }),
          ]}),
        ]}),
      ]}),
    ]);

    comp.viewMode.set('tree');
    comp.toggleExpand(1);
    comp.toggleExpand(2);
    comp.toggleExpand(3);
    fixture.detectChanges();

    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.tree-item__label'),
    ).map(el => (el as HTMLElement).textContent?.trim());
    expect(labels).toContain('Joint vérin');

    const verinsRow = Array.from(
      fixture.nativeElement.querySelectorAll('.tree-item'),
    ).find(el => (el as HTMLElement).textContent?.includes('Vérins')) as HTMLElement;
    expect(verinsRow.querySelector('.tree-chevron')).toBeTruthy();
  });

  it('creating a sous-composant auto-expands its parent in both views', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);

    comp.openCreateChild(makeNode({ id: 3, designation: 'Vérins', niveau: 3 }));
    comp.newDesignation = 'Joint vérin';
    comp.onCreateSubmit();

    const postReq = httpMock.expectOne((r) => r.url === '/api/v1/composants' && r.method === 'POST');
    postReq.flush(makeNode({ id: 4, designation: 'Joint vérin', niveau: 4 }));
    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    reloadReq.flush([]);

    expect(comp.expandedIds().has(3)).toBe(true);
    expect(comp.tableExpandedIds().has(3)).toBe(true);
  });

  it('currentImageUrl returns null when no selected node', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);
    expect(comp.currentImageUrl()).toBeNull();
  });

  it('currentImageUrl returns imageUrl from selectedDetail when available', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    fixture.detectChanges(); // triggers ngOnInit → initial tree load
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);

    comp.selectedDetail.set({ imageUrl: 'http://example.com/img.jpg' } as any);
    expect(comp.currentImageUrl()).toBe('http://example.com/img.jpg');
  });
});
