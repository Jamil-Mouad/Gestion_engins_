import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  imports: [CardComponent],
  template: `<app-card title="My Title">Body content</app-card>`,
})
class HostWithTitleComponent {}

@Component({
  standalone: true,
  imports: [CardComponent],
  template: `<app-card>Body only</app-card>`,
})
class HostNoTitleComponent {}

describe('CardComponent with title', () => {
  let fixture: ComponentFixture<HostWithTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostWithTitleComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostWithTitleComponent);
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should show the title', () => {
    const title = fixture.nativeElement.querySelector('.card-title-text');
    expect(title?.textContent?.trim()).toBe('My Title');
  });

  it('should show body content', () => {
    expect(fixture.nativeElement.textContent).toContain('Body content');
  });
});

describe('CardComponent without title', () => {
  let fixture: ComponentFixture<HostNoTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostNoTitleComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostNoTitleComponent);
    fixture.detectChanges();
  });

  it('should not render title row when title is not provided', () => {
    const titleRow = fixture.nativeElement.querySelector('.card-title-row');
    expect(titleRow).toBeNull();
  });

  it('should render body content', () => {
    expect(fixture.nativeElement.textContent).toContain('Body only');
  });
});
