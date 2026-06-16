import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LucideAngularModule, GripVertical } from 'lucide-angular';
import { provideAnimations } from '@angular/platform-browser/animations';

import { ColumnManagerModalComponent, ColumnDef, ALL_COLUMN_DEFS, DEFAULT_VISIBLE_IDS } from './column-manager-modal.component';

describe('ColumnManagerModalComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LucideAngularModule.pick({ GripVertical })],
      providers: [
        provideRouter([]),
        provideAnimations(),
      ],
    });
  });

  function createComponent(visibleIds = DEFAULT_VISIBLE_IDS) {
    const fixture = TestBed.createComponent(ColumnManagerModalComponent);
    fixture.componentInstance.currentVisible = visibleIds;
    fixture.detectChanges();
    return fixture;
  }

  it('creates the component', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('_visible signal is populated from currentVisible input', () => {
    const fixture = createComponent(['code', 'type']);
    expect(fixture.componentInstance._visible().length).toBe(2);
    expect(fixture.componentInstance._visible()[0].id).toBe('code');
  });

  it('available returns columns not in visible', () => {
    const fixture = createComponent(['code']);
    const available = fixture.componentInstance.available();
    expect(available.find(c => c.id === 'code')).toBeUndefined();
    expect(available.length).toBe(ALL_COLUMN_DEFS.length - 1);
  });

  it('filteredAvailable filters by searchQuery', () => {
    const fixture = createComponent([]);
    fixture.componentInstance.searchQuery.set('marque');
    const filtered = fixture.componentInstance.filteredAvailable();
    expect(filtered.every(c => c.label.toLowerCase().includes('marque'))).toBe(true);
  });

  it('filteredAvailable returns all available when searchQuery is empty', () => {
    const fixture = createComponent([]);
    fixture.componentInstance.searchQuery.set('');
    const filtered = fixture.componentInstance.filteredAvailable();
    expect(filtered.length).toBe(ALL_COLUMN_DEFS.length);
  });

  it('addColumn adds column to visible', () => {
    const fixture = createComponent([]);
    const colToAdd: ColumnDef = { id: 'code', label: 'Code', flex: 0.9 };
    fixture.componentInstance.addColumn(colToAdd);
    expect(fixture.componentInstance._visible().find(c => c.id === 'code')).toBeTruthy();
  });

  it('removeColumn removes column from visible', () => {
    const fixture = createComponent(['code', 'type']);
    const colToRemove: ColumnDef = { id: 'code', label: 'Code', flex: 0.9 };
    fixture.componentInstance.removeColumn(colToRemove);
    expect(fixture.componentInstance._visible().find(c => c.id === 'code')).toBeUndefined();
    expect(fixture.componentInstance._visible().length).toBe(1);
  });

  it('restoreDefaults resets to defaultVisibleIds', () => {
    const fixture = createComponent(['code']); // only code visible
    fixture.componentInstance.restoreDefaults();
    const visibleIds = fixture.componentInstance._visible().map(c => c.id);
    expect(visibleIds).toEqual(DEFAULT_VISIBLE_IDS);
  });

  it('apply emits applied event with visible column ids', () => {
    const fixture = createComponent(['code', 'type']);
    let emitted: string[] | undefined;
    fixture.componentInstance.applied.subscribe((ids: string[]) => { emitted = ids; });
    fixture.componentInstance.apply();
    expect(emitted).toEqual(['code', 'type']);
  });

  it('cancel emits cancel event', () => {
    const fixture = createComponent();
    let cancelled = false;
    fixture.componentInstance.cancel.subscribe(() => { cancelled = true; });
    fixture.componentInstance.cancel.emit();
    expect(cancelled).toBe(true);
  });

  it('renders cancel button in template', () => {
    const fixture = createComponent();
    const cancelBtn = fixture.nativeElement.querySelector('.btn-cancel');
    expect(cancelBtn).toBeTruthy();
  });

  it('renders apply button in template', () => {
    const fixture = createComponent();
    const applyBtn = fixture.nativeElement.querySelector('.btn-apply');
    expect(applyBtn).toBeTruthy();
  });

  it('drop moves items in visible array', () => {
    const fixture = createComponent(['code', 'type', 'statut']);
    const initial = fixture.componentInstance._visible().map(c => c.id);
    expect(initial[0]).toBe('code');

    fixture.componentInstance.drop({
      previousIndex: 0,
      currentIndex: 2,
      item: {} as any,
      container: {} as any,
      previousContainer: {} as any,
      isPointerOverContainer: true,
      distance: { x: 0, y: 0 },
      dropPoint: { x: 0, y: 0 },
      event: {} as any,
    });

    const reordered = fixture.componentInstance._visible().map(c => c.id);
    expect(reordered[2]).toBe('code');
  });
});
