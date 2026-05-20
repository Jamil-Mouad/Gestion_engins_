import { CurrencyMadPipe } from './currency-mad.pipe';

describe('CurrencyMadPipe', () => {
  let pipe: CurrencyMadPipe;

  beforeEach(() => { pipe = new CurrencyMadPipe(); });

  it('returns empty string for null', () => expect(pipe.transform(null)).toBe(''));
  it('returns empty string for undefined', () => expect(pipe.transform(undefined)).toBe(''));

  it('formats a positive number as MAD currency', () => {
    const result = pipe.transform(1500);
    expect(result).not.toBe('');
    expect(result.toLowerCase()).toContain('mad');
  });

  it('formats zero as MAD currency', () => {
    const result = pipe.transform(0);
    expect(result).not.toBe('');
    expect(result.toLowerCase()).toContain('mad');
  });

  it('formats decimal number correctly', () => {
    const result = pipe.transform(24750.5);
    expect(result).not.toBe('');
  });
});
