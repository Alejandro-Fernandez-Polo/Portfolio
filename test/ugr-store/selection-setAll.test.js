import { describe, it, expect } from 'vitest';
import { reducer } from '../../public/ugr/src/store/reducer.js';

const setAll = (payload) => ({ type: 'selection/setAll', payload });

describe('reducer: selection/setAll', () => {
  it('set completo: reemplaza selectedSubjects, groupChoices y cuatrimestreActivo', () => {
    const s0 = reducer(null, { type: 'selection/toggleSubject', payload: { code: 'FFT' } });
    const s1 = reducer(s0, setAll({
      selectedSubjects: { SO: true, DDSI: true },
      groupChoices: { SO: { teoria: 'A', practica: 'A1' } },
      cuatrimestreActivo: 2,
    }));
    expect(s1.selection.selectedSubjects).toEqual({ SO: true, DDSI: true });
    expect(s1.selection.groupChoices).toEqual({ SO: { teoria: 'A', practica: 'A1' } });
    expect(s1.selection.cuatrimestreActivo).toBe(2);
    expect(s1.rev).toBe(s0.rev + 1);
  });

  it('parcial (solo selectedSubjects, como la migración legacy): no toca el resto', () => {
    const s0 = reducer(null, setAll({
      selectedSubjects: { FFT: true },
      groupChoices: { FFT: { teoria: 'B', practica: 'B2' } },
      cuatrimestreActivo: 2,
    }));
    const s1 = reducer(s0, setAll({ selectedSubjects: { SO: true } }));
    expect(s1.selection.selectedSubjects).toEqual({ SO: true });
    expect(s1.selection.groupChoices).toEqual({ FFT: { teoria: 'B', practica: 'B2' } });
    expect(s1.selection.cuatrimestreActivo).toBe(2);
    expect(s1.rev).toBe(s0.rev + 1);
  });

  it('payload ausente o no-objeto: misma referencia (no-op)', () => {
    const s0 = reducer(null, { type: 'selection/toggleSubject', payload: { code: 'FFT' } });
    expect(reducer(s0, { type: 'selection/setAll' })).toBe(s0);
    expect(reducer(s0, setAll(null))).toBe(s0);
    expect(reducer(s0, setAll('nope'))).toBe(s0);
    expect(reducer(s0, setAll(['FFT']))).toBe(s0);
  });

  it('campos inválidos se ignoran; ninguno válido → misma referencia', () => {
    const s0 = reducer(null, { type: 'selection/toggleSubject', payload: { code: 'FFT' } });
    expect(reducer(s0, setAll({ selectedSubjects: null }))).toBe(s0);
    expect(reducer(s0, setAll({ selectedSubjects: ['FFT'] }))).toBe(s0);
    expect(reducer(s0, setAll({ groupChoices: 'no' }))).toBe(s0);
    expect(reducer(s0, setAll({ cuatrimestreActivo: 3 }))).toBe(s0);
    expect(reducer(s0, setAll({ cuatrimestreActivo: '2' }))).toBe(s0);
    expect(reducer(s0, setAll({ cuatrimestreActivo: 0 }))).toBe(s0);
  });

  it('payload mixto: aplica solo los campos válidos y sube rev', () => {
    const s0 = reducer(null, { type: 'selection/toggleSubject', payload: { code: 'FFT' } });
    const s1 = reducer(s0, setAll({ selectedSubjects: { SO: true }, cuatrimestreActivo: 9 }));
    expect(s1.selection.selectedSubjects).toEqual({ SO: true });
    expect(s1.selection.cuatrimestreActivo).toBe(1);
    expect(s1.rev).toBe(s0.rev + 1);
  });

  it('idempotencia: repetir el mismo setAll no toca el estado (misma referencia)', () => {
    const payload = {
      selectedSubjects: { FFT: true },
      groupChoices: { FFT: { teoria: 'A', practica: 'A1' } },
      cuatrimestreActivo: 2,
    };
    const s0 = reducer(null, setAll(payload));
    const s1 = reducer(s0, setAll(payload));
    expect(s1).toBe(s0);
  });

  it('el store no comparte referencias con el payload (copia profunda)', () => {
    const payload = {
      selectedSubjects: { FFT: true },
      groupChoices: { FFT: { teoria: 'A', practica: 'A1' } },
    };
    const s0 = reducer(null, setAll(payload));
    payload.selectedSubjects.SO = true;
    payload.groupChoices.FFT.teoria = 'Z';
    expect(s0.selection.selectedSubjects).toEqual({ FFT: true });
    expect(s0.selection.groupChoices.FFT.teoria).toBe('A');
  });

  it('setAll vacío sobre selección existente la limpia (campo presente y válido)', () => {
    const s0 = reducer(null, setAll({
      selectedSubjects: { FFT: true },
      groupChoices: { FFT: { teoria: 'A', practica: 'A1' } },
    }));
    const s1 = reducer(s0, setAll({ selectedSubjects: {}, groupChoices: {} }));
    expect(s1.selection.selectedSubjects).toEqual({});
    expect(s1.selection.groupChoices).toEqual({});
    expect(s1.rev).toBe(s0.rev + 1);
  });
});
