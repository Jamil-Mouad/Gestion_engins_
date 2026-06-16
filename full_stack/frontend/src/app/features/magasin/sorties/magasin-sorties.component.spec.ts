import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LucideAngularModule, Pencil, Trash2, Download, Settings, GripVertical, X } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';

import { MagasinSortiesComponent } from './magasin-sorties.component';
import { MagasinApiService } from '../services/magasin-api.service';
import { Sortie } from '../models/magasin.model';
import { Page } from '../../../shared/models/pagination.model';

const SORTIE: Sortie = {
  id: 1,
  dateSortie: '2026-06-10',
  totaliseur: 1234,
  quantiteLitres: 120,
  typeMouvement: 'SORTIE',
  destination: 'CHANTIER NORD',
  vehiculeId: 1,
  vehiculeCode: 'D31',
  tiers: false,
  compteur: 120000,
  demandeur: 'ALAMI',
  numeroBs: 'BS-9',
  source: 'SAISIE',
};

const PAGE: Page<Sortie> = { content: [SORTIE], page: 0, size: 20, totalElements: 1, totalPages: 1 };

describe('MagasinSortiesComponent', () => {
  let fixture: ComponentFixture<MagasinSortiesComponent>;
  let component: MagasinSortiesComponent;
  let apiSpy: jasmine.SpyObj<MagasinApiService>;

  beforeEach(async () => {
    localStorage.removeItem('magasin.sorties.columns');

    apiSpy = jasmine.createSpyObj('MagasinApiService', ['listSorties', 'exportExcel', 'deleteSortie']);
    apiSpy.listSorties.and.returnValue(of(PAGE));
    apiSpy.exportExcel.and.returnValue(of(new Blob()));

    await TestBed.configureTestingModule({
      imports: [
        MagasinSortiesComponent,
        LucideAngularModule.pick({ Pencil, Trash2, Download, Settings, GripVertical, X }),
      ],
      providers: [
        { provide: MagasinApiService, useValue: apiSpy },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MagasinSortiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('magasin.sorties.columns');
  });

  it('has a single unified search input (no separate vehicle-code field)', () => {
    const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('.filter-input');
    expect(inputs.length).toBe(1);
    expect((inputs[0] as HTMLInputElement).placeholder).toContain('code véhicule');
  });

  it('sends a vehicle code through the search param', fakeAsync(() => {
    component.onSearch('D31');
    tick(300);
    const lastCall = apiSpy.listSorties.calls.mostRecent().args[0];
    expect(lastCall?.search).toBe('D31');
    expect((lastCall as Record<string, unknown>)?.['vehiculeCode']).toBeUndefined();
  }));

  it('renders the default columns and the actions icons', () => {
    const el = fixture.nativeElement as HTMLElement;
    const headerText = el.textContent ?? '';
    expect(headerText).toContain('Destination');
    expect(headerText).not.toContain('Totaliseur');
    expect(el.querySelector('lucide-icon.row-action')).not.toBeNull();
    expect(el.textContent).not.toContain('✎');
    expect(el.textContent).not.toContain('🗑');
  });

  it('persists applied columns to localStorage', () => {
    component.onColumnsApplied(['date', 'quantite']);
    expect(JSON.parse(localStorage.getItem('magasin.sorties.columns') ?? '[]')).toEqual(['date', 'quantite']);
    fixture.detectChanges();
    expect(component.visibleCols().map(c => c.id)).toEqual(['date', 'quantite']);
  });

  it('export modal confirmation calls the export endpoint with the selected columns', () => {
    component.onExportConfirmed({ columns: ['date', 'quantite'], filters: {} });
    expect(apiSpy.exportExcel).toHaveBeenCalledWith(jasmine.objectContaining({
      entites: ['sorties'],
      columns: ['date', 'quantite'],
    }));
  });
});
