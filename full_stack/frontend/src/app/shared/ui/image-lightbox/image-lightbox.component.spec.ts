import { TestBed } from '@angular/core/testing';
import { ImageLightboxComponent } from './image-lightbox.component';

describe('ImageLightboxComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    // Remove any portal appended to body by the lightbox during tests
    document.querySelector('app-lb-portal')?.remove();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows dash placeholder when src is null', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    fixture.componentInstance.src = null;
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('.no-img')).toBeTruthy();
    expect(nativeEl.querySelector('.thumb')).toBeFalsy();
  });

  it('shows thumbnail when src is provided', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    fixture.componentInstance.src = 'http://example.com/photo.jpg';
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('.thumb')).toBeTruthy();
    expect(nativeEl.querySelector('.no-img')).toBeFalsy();
  });

  it('open signal defaults to false', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('clicking thumbnail opens lightbox', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    fixture.componentInstance.src = 'http://example.com/photo.jpg';
    fixture.detectChanges();

    const thumb = fixture.nativeElement.querySelector('.thumb') as HTMLElement;
    thumb.click();
    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('lightbox overlay renders on document.body when opened', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    fixture.componentInstance.src = 'http://example.com/photo.jpg';
    fixture.componentInstance.openLightbox();
    fixture.detectChanges();
    expect(document.body.querySelector('.lb-backdrop')).toBeTruthy();
  });

  it('lightbox overlay is not on document.body when closed', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    fixture.componentInstance.src = 'http://example.com/photo.jpg';
    fixture.detectChanges();
    expect(document.body.querySelector('.lb-backdrop')).toBeFalsy();
  });

  it('clicking close button closes lightbox', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    fixture.componentInstance.src = 'http://example.com/photo.jpg';
    fixture.componentInstance.openLightbox();
    fixture.detectChanges();

    const closeBtn = document.body.querySelector('.lb-btn[aria-label="Fermer"]') as HTMLElement;
    closeBtn.click();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('pressing Escape key closes lightbox', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    fixture.componentInstance.src = 'http://example.com/photo.jpg';
    fixture.componentInstance.openLightbox();
    fixture.detectChanges();

    fixture.componentInstance.onEsc();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('onThumbError hides the thumbnail image', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    fixture.componentInstance.src = 'http://example.com/photo.jpg';
    fixture.detectChanges();

    const img = document.createElement('img');
    img.style.display = 'block';
    const event = { target: img } as unknown as Event;
    fixture.componentInstance.onThumbError(event);
    expect(img.style.display).toBe('none');
  });

  it('onFullError sets alt text on full image', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    fixture.componentInstance.src = 'http://example.com/photo.jpg';
    fixture.detectChanges();

    const img = document.createElement('img');
    img.alt = '';
    const event = { target: img } as unknown as Event;
    fixture.componentInstance.onFullError(event);
    expect(img.alt).toBe('Image non disponible');
  });

  it('shows dash when src is undefined', () => {
    const fixture = TestBed.createComponent(ImageLightboxComponent);
    fixture.componentInstance.src = undefined;
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('.no-img')).toBeTruthy();
  });
});
