import { describe, it, expect } from 'vitest';
import { initialState, reducer } from '../../public/ugr/src/store/reducer.js';
import { STATUS } from '../../public/ugr/src/progress/status.js';

const setStatus = (code, status) => ({ type: 'progress/setStatus', payload: { code, status } });

describe('reducer: estado inicial', () => {
  it('declara progress con la forma canónica', () => {
    expect(initialState.progress).toEqual({
      credits: {},
      equivalences: [],
      plan: { totalECTS: 240 },
    });
  });
});

describe('reducer: progress/setStatus', () => {
  it('aplica un estado válido y sube rev', () => {
    const s = reducer(null, setStatus('FFT', STATUS.CONVALIDADA));
    expect(s.progress.credits.FFT).toBe('pass');
    expect(s.rev).toBe(1);
    expect(s.progress.updatedAt).toBeTruthy();
  });

  it('ignora un estado inválido (misma referencia)', () => {
    const s0 = reducer(null, setStatus('FFT', 'pass'));
    const s1 = reducer(s0, setStatus('FFT', 'aprobada'));
    expect(s1).toBe(s0);
    expect(s1.progress.credits.FFT).toBe('pass');
  });

  it('ignora un código vacío', () => {
    const s0 = reducer(null, setStatus('FFT', 'pass'));
    expect(reducer(s0, setStatus('', 'sup'))).toBe(s0);
  });

  it('es idempotente: repetir el mismo estado no toca el estado', () => {
    const s0 = reducer(null, setStatus('FFT', 'pass'));
    const s1 = reducer(s0, setStatus('FFT', 'pass'));
    expect(s1).toBe(s0);
  });

  it('progress/setCredit sigue funcionando como alias', () => {
    const s = reducer(null, { type: 'progress/setCredit', payload: { code: 'SO', status: 'enroll' } });
    expect(s.progress.credits.SO).toBe('enroll');
  });

  it('transiciona de un estado válido a otro', () => {
    const s0 = reducer(null, setStatus('FFT', 'enroll'));
    const s1 = reducer(s0, setStatus('FFT', 'pass'));
    expect(s1.progress.credits.FFT).toBe('pass');
    expect(s1.rev).toBe(s0.rev + 1);
  });
});

describe('reducer: progress/setAll', () => {
  it('fusiona credits sin perder equivalences ni plan', () => {
    const s0 = reducer(null, {
      type: 'progress/setMapping',
      payload: { mappings: [{ from: { code: '011013' }, to: { code: 'FFT' }, ects: 6 }] },
    });
    const s1 = reducer(s0, { type: 'progress/setAll', payload: { credits: { FFT: 'pass' } } });
    expect(s1.progress.credits.FFT).toBe('pass');
    expect(s1.progress.equivalences).toHaveLength(1);
    expect(s1.progress.plan).toEqual({ totalECTS: 240 });
  });

  it('filtra estados inválidos del payload', () => {
    const s = reducer(null, {
      type: 'progress/setAll',
      payload: { credits: { FFT: 'pass', SO: 'aprobada', DDSI: 'pending' } },
    });
    expect(s.progress.credits).toEqual({ FFT: 'pass', DDSI: 'pending' });
  });

  it('no rompe con payload ausente', () => {
    const s0 = reducer(null, setStatus('FFT', 'pass'));
    expect(reducer(s0, { type: 'progress/setAll' })).toBe(s0);
  });

  it('pisa el plan cuando el payload lo trae', () => {
    const s = reducer(null, { type: 'progress/setAll', payload: { plan: { totalECTS: 270 } } });
    expect(s.progress.plan.totalECTS).toBe(270);
  });
});

describe('reducer: progress/setMapping', () => {
  it('reemplaza equivalencias cuando el payload las trae', () => {
    const s0 = reducer(null, {
      type: 'progress/setMapping',
      payload: { mappings: [{ from: { code: 'A' }, to: { code: 'FFT' }, ects: 6 }] },
    });
    const s1 = reducer(s0, { type: 'progress/setMapping', payload: { mappings: [] } });
    expect(s1.progress.equivalences).toEqual([]);
  });

  it('conserva las equivalencias previas si falta mappings', () => {
    const s0 = reducer(null, {
      type: 'progress/setMapping',
      payload: { mappings: [{ from: { code: 'A' }, to: { code: 'FFT' }, ects: 6 }] },
    });
    const s1 = reducer(s0, { type: 'progress/setMapping', payload: {} });
    expect(s1.progress.equivalences).toHaveLength(1);
  });
});

describe('reducer: comandos ajenos', () => {
  it('devuelve el estado sin cambios para un comando desconocido', () => {
    const s0 = reducer(null, setStatus('FFT', 'pass'));
    expect(reducer(s0, { type: 'progress/unknown', payload: {} })).toBe(s0);
  });
});
