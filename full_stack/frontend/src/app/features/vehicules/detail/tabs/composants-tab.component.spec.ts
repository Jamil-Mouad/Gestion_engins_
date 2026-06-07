import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
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
      imports: [LucideAngularModule.pick({})],
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
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads tree on init via GET /api/v1/composants/tree', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    const comp = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    expect(req.request.method).toBe('GET');
    req.flush([makeNode({ id: 1 }), makeNode({ id: 2, designation: 'Freinage' })]);

    expect(comp.tree().length).toBe(2);
    expect(comp.loading()).toBe(false);
  });

  it('sets loading=false on error', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    const comp = fixture.componentInstance;
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush('error', { status: 500, statusText: 'Server Error' });
    expect(comp.loading()).toBe(false);
  });

  it('viewMode defaults to "tree"', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance.viewMode()).toBe('tree');
  });

  it('toggleExpand adds and removes id from expandedIds', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
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
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance.selectedId()).toBeNull();
  });

  it('selectedNode defaults to null', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance.selectedNode()).toBeNull();
  });

  it('categorieLabel returns correct label for known category', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance.categorieLabel('moteur')).toBe('Moteur');
    expect(fixture.componentInstance.categorieLabel('pneumatique')).toBe('Pneumatique');
    expect(fixture.componentInstance.categorieLabel('freinage')).toBe('Freinage');
  });

  it('categorieLabel returns "—" for null/undefined', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    expect(fixture.componentInstance.categorieLabel(null)).toBe('—');
    expect(fixture.componentInstance.categorieLabel(undefined)).toBe('—');
  });

  it('visibleTableCols includes action column at end', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    const req = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    req.flush([]);
    const cols = fixture.componentInstance.visibleTableCols();
    expect(cols[cols.length - 1].id).toBe('actions');
  });

  it('onTableColumnsApplied updates tableColIds and closes manager', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
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
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);

    comp.openCreateRoot();
    expect(comp.showCreateModal()).toBe(true);
    expect(comp.modalMode()).toBe('create');
  });

  it('modalTitle computed returns "Ajouter composant" for create mode', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);

    comp.modalMode.set('create');
    expect(comp.modalTitle()).toBe('Ajouter composant');
  });

  it('modalTitle computed returns "Modifier composant" for edit mode', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);

    comp.modalMode.set('edit');
    expect(comp.modalTitle()).toBe('Modifier composant');
  });

  it('currentImageUrl returns null when no selected node', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);
    expect(comp.currentImageUrl()).toBeNull();
  });

  it('currentImageUrl returns imageUrl from selectedDetail when available', () => {
    const fixture = TestBed.createComponent(ComposantsTabComponent);
    const comp = fixture.componentInstance;
    const initReq = httpMock.expectOne((r) => r.url === '/api/v1/composants/tree');
    initReq.flush([]);

    comp.selectedDetail.set({ imageUrl: 'http://example.com/img.jpg' } as any);
    expect(comp.currentImageUrl()).toBe('http://example.com/img.jpg');
  });
});
