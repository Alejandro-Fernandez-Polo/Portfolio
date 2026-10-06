import { describe, it, expect } from 'vitest';
import {
  getSubgrupoForApellido,
  buildGroupChoice,
  applyTurnoPreference,
  applyApellidoSubgroups,
} from '../../public/ugr/src/app/domain/selection.js';

// Caracterización de la selección y las reglas de grupo (B3-a): fijan el
// comportamiento legacy de `app.js` (`getSubgrupoForApellido`,
// `initGroupChoice`, `applyGroupPreference` y `applyApellidoRule`) una vez que
// el monolito delega en el dominio ESM. Funciones puras: fixtures propias, sin
// DOM ni globals, en el entorno node de Vitest.

/** Materia con dos grupos (mañana/tarde) y dos subgrupos en A. */
function makeMat() {
  return {
    codigo: 'MAT',
    nombre: 'Matemáticas I',
    grupos: [
      {
        letra: 'A',
        turno: 'mañana',
        teoria: [{ dia: 'Lunes', inicio: '09:00', fin: '10:00' }],
        practicas: {
          subgrupos: ['A1', 'A2'],
          A1: [{ dia: 'Miércoles', inicio: '10:00', fin: '11:30' }],
          A2: [{ dia: 'Jueves', inicio: '12:00', fin: '13:30' }],
        },
      },
      {
        letra: 'B',
        turno: 'tarde',
        teoria: [{ dia: 'Martes', inicio: '16:00', fin: '18:00' }],
        practicas: {
          subgrupos: ['B1'],
          B1: [{ dia: 'Martes', inicio: '14:00', fin: '16:00' }],
        },
      },
    ],
  };
}

/** Materia sin subgrupos de prácticas en ninguno de sus grupos. */
function makeSinPracticas() {
  return {
    codigo: 'FIS',
    nombre: 'Física',
    grupos: [
      {
        letra: 'A',
        turno: 'mañana',
        teoria: [{ dia: 'Lunes', inicio: '08:00', fin: '10:00' }],
        practicas: { subgrupos: [] },
      },
      {
        letra: 'B',
        turno: 'tarde',
        teoria: [{ dia: 'Martes', inicio: '16:30', fin: '18:30' }],
        practicas: { subgrupos: [] },
      },
    ],
  };
}

/** Materia cuyo grupo de tarde NO tiene prácticas (la de mañana sí). */
function makePracticasSoloManana() {
  return {
    codigo: 'LAB',
    nombre: 'Laboratorio',
    grupos: [
      {
        letra: 'A',
        turno: 'mañana',
        teoria: [{ dia: 'Lunes', inicio: '11:00', fin: '12:00' }],
        practicas: { subgrupos: ['A1'], A1: [{ dia: 'Lunes', inicio: '12:00', fin: '14:00' }] },
      },
      {
        letra: 'B',
        turno: 'tarde',
        teoria: [{ dia: 'Martes', inicio: '16:00', fin: '17:00' }],
        practicas: { subgrupos: [] },
      },
    ],
  };
}

describe('getSubgrupoForApellido', () => {
  it('tramos A–F → 1', () => {
    expect(getSubgrupoForApellido('Alonso')).toBe(1);
    expect(getSubgrupoForApellido('Fernández')).toBe(1);
  });

  it('tramos G–M → 2', () => {
    expect(getSubgrupoForApellido('García')).toBe(2);
    expect(getSubgrupoForApellido('Márquez')).toBe(2);
  });

  it('tramos N–S → 3', () => {
    expect(getSubgrupoForApellido('Navarro')).toBe(3);
    expect(getSubgrupoForApellido('Sánchez')).toBe(3);
  });

  it('tramos T–Z → 4', () => {
    expect(getSubgrupoForApellido('Torres')).toBe(4);
    expect(getSubgrupoForApellido('Zapata')).toBe(4);
  });

  it('minúsculas se comparan en mayúsculas (g → 2)', () => {
    expect(getSubgrupoForApellido('garcía')).toBe(2);
    expect(getSubgrupoForApellido('fuentes')).toBe(1);
  });

  it('inicial acentuada cae fuera de A–Z → null (regla legacy)', () => {
    expect(getSubgrupoForApellido('ávalos')).toBe(null);
  });

  it('vacío o sin valor → null', () => {
    expect(getSubgrupoForApellido('')).toBe(null);
    expect(getSubgrupoForApellido(null)).toBe(null);
    expect(getSubgrupoForApellido(undefined)).toBe(null);
  });

  it('primer carácter no letra → null', () => {
    expect(getSubgrupoForApellido('1234')).toBe(null);
    expect(getSubgrupoForApellido('!García')).toBe(null);
    expect(getSubgrupoForApellido('Ñuñez')).toBe(null);
  });
});

describe('buildGroupChoice', () => {
  it('primer grupo + primer subgrupo', () => {
    expect(buildGroupChoice(makeMat())).toEqual({ teoria: 'A', practica: 'A1' });
  });

  it('grupo sin prácticas → practica null', () => {
    expect(buildGroupChoice(makeSinPracticas())).toEqual({ teoria: 'A', practica: null });
  });

  it('materia sin grupos → null', () => {
    expect(buildGroupChoice({ codigo: 'VAC', nombre: 'Vacía', grupos: [] })).toBe(null);
  });
});

describe('applyTurnoPreference', () => {
  it('indiferente → no-op (misma referencia intacta)', () => {
    const choice = { teoria: 'A', practica: 'A2' };
    const result = applyTurnoPreference(choice, makeMat(), 'indiferente');
    expect(result).toBe(choice);
    expect(choice).toEqual({ teoria: 'A', practica: 'A2' });
  });

  it('sin elección (null) → no-op', () => {
    expect(applyTurnoPreference(null, makeMat(), 'tarde')).toBe(null);
  });

  it('cambia al primer grupo del turno y conserva el número de subgrupo si existe', () => {
    const choice = { teoria: 'A', practica: 'A1' };
    applyTurnoPreference(choice, makeMat(), 'tarde');
    // A → B y el "1" de A1 se mantiene como B1 (ofrecido por B).
    expect(choice).toEqual({ teoria: 'B', practica: 'B1' });
  });

  it('si el nuevo grupo no ofrece ese número, cae al primer subgrupo', () => {
    const choice = { teoria: 'A', practica: 'A2' };
    applyTurnoPreference(choice, makeMat(), 'tarde');
    // B solo tiene B1 → B2 no existe → primer subgrupo del grupo.
    expect(choice).toEqual({ teoria: 'B', practica: 'B1' });
  });

  it('elección sin práctica → primer subgrupo del grupo elegido', () => {
    const choice = { teoria: 'A', practica: null };
    applyTurnoPreference(choice, makeMat(), 'mañana');
    expect(choice).toEqual({ teoria: 'A', practica: 'A1' });
  });

  it('grupo del turno sin prácticas → practica null', () => {
    const choice = { teoria: 'A', practica: 'A1' };
    applyTurnoPreference(choice, makePracticasSoloManana(), 'tarde');
    expect(choice).toEqual({ teoria: 'B', practica: null });
  });

  it('turno sin grupos en la materia → la elección no cambia', () => {
    const choice = { teoria: 'A', practica: 'A1' };
    applyTurnoPreference(choice, makeMat(), 'fin de semana');
    expect(choice).toEqual({ teoria: 'A', practica: 'A1' });
  });
});

describe('applyApellidoSubgroups', () => {
  it('asigna el subgrupo de la regla cuando el grupo lo ofrece', () => {
    const subjects = [makeMat()];
    const groupChoices = { MAT: { teoria: 'A', practica: 'A1' } };
    applyApellidoSubgroups({ MAT: true }, groupChoices, subjects, 'García');
    // García → 2 → A2 disponible en el grupo A.
    expect(groupChoices.MAT.practica).toBe('A2');
  });

  it('no cambia la práctica cuando el subgrupo de la regla no existe', () => {
    const subjects = [makeMat()];
    // Grupo B solo tiene B1: García (2) pediría B2 → se conserva B1.
    const groupChoices = { MAT: { teoria: 'B', practica: 'B1' } };
    applyApellidoSubgroups({ MAT: true }, groupChoices, subjects, 'García');
    expect(groupChoices.MAT.practica).toBe('B1');
  });

  it('ignora las materias no seleccionadas', () => {
    const subjects = [makeMat()];
    const groupChoices = { MAT: { teoria: 'A', practica: 'A1' } };
    applyApellidoSubgroups({ MAT: false }, groupChoices, subjects, 'García');
    expect(groupChoices.MAT.practica).toBe('A1');
  });

  it('ignora códigos inexistentes en el catálogo y materias sin elección', () => {
    const subjects = [makeMat()];
    const groupChoices = { MAT: { teoria: 'A', practica: 'A1' } };
    expect(() =>
      applyApellidoSubgroups({ MAT: true, ZZZ: true }, groupChoices, subjects, 'García')
    ).not.toThrow();
    expect(groupChoices.MAT.practica).toBe('A2');

    const sinChoice = {};
    expect(() => applyApellidoSubgroups({ MAT: true }, sinChoice, subjects, 'García')).not.toThrow();
    expect(sinChoice).toEqual({});
  });

  it('apellido sin tramo aplicable → no-op', () => {
    const subjects = [makeMat()];
    const groupChoices = { MAT: { teoria: 'A', practica: 'A1' } };
    applyApellidoSubgroups({ MAT: true }, groupChoices, subjects, '123');
    expect(groupChoices.MAT.practica).toBe('A1');
  });

  it('materia sin prácticas en su grupo → se ignora', () => {
    const subjects = [makeSinPracticas()];
    const groupChoices = { FIS: { teoria: 'A', practica: null } };
    applyApellidoSubgroups({ FIS: true }, groupChoices, subjects, 'García');
    expect(groupChoices.FIS.practica).toBe(null);
  });
});
