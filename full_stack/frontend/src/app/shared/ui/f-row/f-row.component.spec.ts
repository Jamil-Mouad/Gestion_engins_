import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FRowComponent } from './f-row.component';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  imports: [FRowComponent],
  template: `<app-f-row label="Immatriculation" [required]="true"><input type="text" /></app-f-row>`,
})
class HostComponent {}

describe('FRowComponent', () => {
  let fixture: ComponentFixture<FRowComponent>;
  let component: FRowComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FRowComponent] }).compileComponents();
    fixture = TestBed.createComponent(FRowComponent);
    component = fixture.componentInstance;
    component.label = 'Immatriculation';
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should display the label', () => {
    const label = fixture.nativeElement.querySelector('.f-row-label');
    expect(label?.textContent).toContain('Immatriculation');
  });

  it('should not show asterisk when required=false', () => {
    const asterisk = fixture.nativeElement.querySelector('.f-row-asterisk');
    expect(asterisk).toBeNull();
  });

  it('should show asterisk when required=true', () => {
    component.required = true;
    fixture.detectChanges();
    const asterisk = fixture.nativeElement.querySelector('.f-row-asterisk');
    expect(asterisk).toBeTruthy();
    expect(asterisk.textContent.trim()).toBe('*');
  });
});
