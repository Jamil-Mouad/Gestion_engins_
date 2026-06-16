import { StatusLabelPipe } from './status-label.pipe';

describe('StatusLabelPipe', () => {
  let pipe: StatusLabelPipe;

  beforeEach(() => { pipe = new StatusLabelPipe(); });

  it('returns empty string for null', () => expect(pipe.transform(null)).toBe(''));
  it('returns empty string for undefined', () => expect(pipe.transform(undefined)).toBe(''));
  it('returns empty string for empty string', () => expect(pipe.transform('')).toBe(''));

  it('translates vehicule statuts', () => {
    expect(pipe.transform('in-service')).toBe('En service');
    expect(pipe.transform('workshop')).toBe('En atelier');
    expect(pipe.transform('maintenance')).toBe('En maintenance');
    expect(pipe.transform('out-of-service')).toBe('Hors service');
  });

  it('translates intervention statuts', () => {
    expect(pipe.transform('ouvert')).toBe('Ouvert');
    expect(pipe.transform('en_cours')).toBe('En cours');
    expect(pipe.transform('cloture')).toBe('Clôturé');
  });

  it('translates vidange statuts', () => {
    expect(pipe.transform('a_faire')).toBe('À faire');
    expect(pipe.transform('fait')).toBe('Fait');
    expect(pipe.transform('depasse')).toBe('Dépassé');
  });

  it('translates pneu statuts', () => {
    expect(pipe.transform('ok')).toBe('OK');
    expect(pipe.transform('warn')).toBe('Attention');
    expect(pipe.transform('empty')).toBe('Épuisé');
  });

  it('returns the raw value for unknown status (fallback)', () => {
    expect(pipe.transform('custom_status')).toBe('custom_status');
  });
});
