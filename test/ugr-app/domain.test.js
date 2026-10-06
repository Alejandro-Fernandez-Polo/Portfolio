import { describe, it, expect } from 'vitest';
import { timeToMinutes, timesOverlap } from '../../public/ugr/src/app/domain/schedule.js';
import { calcPropuestaCreditos } from '../../public/ugr/src/app/domain/proposals.js';

// Caracterización de las reglas puras extraídas de public/ugr/app.js (T02.x):
// fijan el comportamiento legacy exacto (minutos, solapes estrictos, créditos)
// antes de que el monolito delegue en ellas vía `deps.domain`.
// Sin DOM ni globals: corren en el entorno node de Vitest.

describe('timeToMinutes', () => {
  it('convierte medianoche a 0', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('convierte 09:30 a 570', () => {
    expect(timeToMinutes('09:30')).toBe(570);
  });

  it('convierte 21:00 a 1260', () => {
    expect(timeToMinutes('21:00')).toBe(1260);
  });
});

describe('timesOverlap', () => {
  it('tramos solapados → true', () => {
    expect(timesOverlap('09:00', '11:00', '10:00', '12:00')).toBe(true);
  });

  it('tramos adyacentes (fin == inicio) → false', () => {
    expect(timesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false);
    expect(timesOverlap('10:00', '11:00', '09:00', '10:00')).toBe(false);
  });

  it('tramos disjuntos → false', () => {
    expect(timesOverlap('09:00', '10:00', '11:00', '12:00')).toBe(false);
  });

  it('tramos idénticos → true', () => {
    expect(timesOverlap('09:00', '10:00', '09:00', '10:00')).toBe(true);
  });
});

describe('calcPropuestaCreditos', () => {
  it('propuesta null → 0', () => {
    expect(calcPropuestaCreditos(null)).toBe(0);
  });

  it('propuesta sin mappings → 0', () => {
    expect(calcPropuestaCreditos({})).toBe(0);
  });

  it('mapping con creditos explícitos → ese valor', () => {
    expect(calcPropuestaCreditos({ mappings: [{ creditos: 5 }] })).toBe(5);
  });

  it('mapping sin creditos ni tipo → 6 por defecto', () => {
    expect(calcPropuestaCreditos({ mappings: [{}] })).toBe(6);
  });

  it("mapping de tipo 'bloque' sin creditos → 24", () => {
    expect(calcPropuestaCreditos({ mappings: [{ tipo: 'bloque' }] })).toBe(24);
  });

  it('mezcla de mappings suma los valores', () => {
    expect(
      calcPropuestaCreditos({
        mappings: [{ creditos: 5 }, { tipo: 'bloque' }, {}, { creditos: 3, tipo: 'bloque' }],
      })
    ).toBe(5 + 24 + 6 + 3);
  });
});
