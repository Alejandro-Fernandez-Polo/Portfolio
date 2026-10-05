import { describe, it, expect } from 'vitest';
import { isPassed, solvableCodes } from '../../public/ugr/src/progress/index.js';

const CODES = ['FFT', 'ALEM', 'SO', 'DDSI', 'OPT'];

describe('isPassed', () => {
  it('true para sup y pass', () => {
    expect(isPassed({ FFT: 'sup' }, 'FFT')).toBe(true);
    expect(isPassed({ FFT: 'pass' }, 'FFT')).toBe(true);
  });

  it('false para enroll, pending y asignaturas sin marcar', () => {
    expect(isPassed({ FFT: 'enroll' }, 'FFT')).toBe(false);
    expect(isPassed({ FFT: 'pending' }, 'FFT')).toBe(false);
    expect(isPassed({}, 'FFT')).toBe(false);
  });

  it('false para estados inválidos o credits no objeto', () => {
    expect(isPassed({ FFT: 'aprobada' }, 'FFT')).toBe(false);
    expect(isPassed({ FFT: 'SUP' }, 'FFT')).toBe(false);
    expect(isPassed(null, 'FFT')).toBe(false);
    expect(isPassed(undefined, 'FFT')).toBe(false);
  });
});

describe('solvableCodes', () => {
  it('excluye superadas (sup/pass) y mantiene el resto', () => {
    const { subjects, excluded } = solvableCodes(CODES, { FFT: 'sup', ALEM: 'pass', SO: 'enroll' });
    expect(subjects).toEqual(['SO', 'DDSI', 'OPT']);
    expect(excluded).toEqual(['FFT', 'ALEM']);
  });

  it('excludePassed:false conserva las superadas', () => {
    const { subjects, excluded } = solvableCodes(CODES, { FFT: 'sup' }, { excludePassed: false });
    expect(subjects).toEqual(CODES);
    expect(excluded).toEqual([]);
  });

  it('estados inválidos no excluyen', () => {
    const { subjects, excluded } = solvableCodes(CODES, { FFT: 'aprobada', ALEM: 'SUP' });
    expect(excluded).toEqual([]);
    expect(subjects).toEqual(CODES);
  });

  it('catálogo vacío → resultado vacío', () => {
    expect(solvableCodes([], {})).toEqual({ subjects: [], excluded: [] });
  });

  it('códigos o credits no array/objeto → resultado vacío', () => {
    expect(solvableCodes(null, null)).toEqual({ subjects: [], excluded: [] });
    expect(solvableCodes(undefined, undefined)).toEqual({ subjects: [], excluded: [] });
  });

  it('sin credits trata todo como planificable', () => {
    const { subjects, excluded } = solvableCodes(CODES, undefined);
    expect(subjects).toEqual(CODES);
    expect(excluded).toEqual([]);
  });
});
