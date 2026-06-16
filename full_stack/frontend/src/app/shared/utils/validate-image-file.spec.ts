import { validateImageFile } from './validate-image-file';

function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('validateImageFile', () => {
  it('returns null for valid JPEG file under 5MB', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024);
    expect(validateImageFile(file)).toBeNull();
  });

  it('returns null for valid PNG file under 5MB', () => {
    const file = makeFile('image.png', 'image/png', 512 * 1024);
    expect(validateImageFile(file)).toBeNull();
  });

  it('returns null for valid WebP file under 5MB', () => {
    const file = makeFile('image.webp', 'image/webp', 100 * 1024);
    expect(validateImageFile(file)).toBeNull();
  });

  it('returns null for valid image/jpg MIME type', () => {
    const file = makeFile('photo.jpg', 'image/jpg', 100);
    expect(validateImageFile(file)).toBeNull();
  });

  it('returns error for unsupported type (PDF)', () => {
    const file = makeFile('document.pdf', 'application/pdf', 1024);
    const error = validateImageFile(file);
    expect(error).not.toBeNull();
    expect(error).toContain('Format non supporté');
  });

  it('returns error for unsupported type (GIF)', () => {
    const file = makeFile('anim.gif', 'image/gif', 1024);
    const error = validateImageFile(file);
    expect(error).toContain('Format non supporté');
  });

  it('returns error for file exceeding 5MB', () => {
    const fiveMBPlusOne = 5 * 1024 * 1024 + 1;
    const file = makeFile('big.jpg', 'image/jpeg', fiveMBPlusOne);
    const error = validateImageFile(file);
    expect(error).not.toBeNull();
    expect(error).toContain('Fichier trop volumineux');
  });

  it('returns null for file exactly at 5MB boundary', () => {
    const exactlyFiveMB = 5 * 1024 * 1024;
    const file = makeFile('exact.jpg', 'image/jpeg', exactlyFiveMB);
    expect(validateImageFile(file)).toBeNull();
  });

  it('error message includes actual size in MB for oversized file', () => {
    const bigFile = makeFile('huge.png', 'image/png', 6 * 1024 * 1024);
    const error = validateImageFile(bigFile);
    expect(error).toContain('Mo');
    expect(error).toContain('6.0');
  });
});
