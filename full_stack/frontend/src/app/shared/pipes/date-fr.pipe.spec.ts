import { DateFrPipe } from './date-fr.pipe';

describe('DateFrPipe', () => {
  let pipe: DateFrPipe;

  beforeEach(() => { pipe = new DateFrPipe(); });

  it('returns empty string for null', () => expect(pipe.transform(null)).toBe(''));
  it('returns empty string for undefined', () => expect(pipe.transform(undefined)).toBe(''));

  it('formats date in short format by default (dd/MM/yyyy)', () => {
    const result = pipe.transform('2026-05-20T00:00:00Z');
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('formats date in "short" format explicitly', () => {
    const result = pipe.transform('2026-01-15T00:00:00Z', 'short');
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('formats date in long format (french month name)', () => {
    const result = pipe.transform('2026-05-20T00:00:00Z', 'long');
    expect(result).toContain('2026');
    expect(result).toContain('mai');
  });

  it('formats date in datetime format (dd/MM/yyyy HH:mm)', () => {
    const result = pipe.transform('2026-05-20T14:30:00Z', 'datetime');
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it('returns value as-is when date is unparseable (catch branch)', () => {
    const invalid = 'not-a-date-at-all';
    const result = pipe.transform(invalid);
    expect(result).toBe(invalid);
  });
});
