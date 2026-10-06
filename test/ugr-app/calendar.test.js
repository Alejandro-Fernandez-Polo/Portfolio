import { describe, it, expect } from 'vitest';
import { buildActiveSchedule, buildConflictSet } from '../../public/ugr/src/app/domain/calendar.js';

// Caracterización del calendario (B3-a): fijan la forma exacta de las entradas
// de horario y de las claves de conflicto que `app.js` pintaba antes de
// delegar. Datos puros: fixtures propias, sin DOM ni globals, entorno node.

/** Materia con teoría (2 sesiones) y dos subgrupos de prácticas. */
function makeMat() {
  return {
    codigo: 'MAT',
    nombre: 'Matemáticas I',
    grupos: [
      {
        letra: 'A',
        turno: 'mañana',
        teoria: [
          { dia: 'Lunes', inicio: '09:00', fin: '10:00' },
          { dia: 'Miércoles', inicio: '09:00', fin: '10:00' },
        ],
        practicas: {
          subgrupos: ['A1', 'A2'],
          A1: [{ dia: 'Viernes', inicio: '11:00', fin: '13:00' }],
          A2: [{ dia: 'Jueves', inicio: '12:00', fin: '14:00' }],
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

/** Materia sin prácticas. */
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
    ],
  };
}

describe('buildActiveSchedule', () => {
  it('teoría y práctica con las claves y valores legacy exactos', () => {
    const subjects = [makeMat()];
    const entries = buildActiveSchedule(
      { MAT: true },
      { MAT: { teoria: 'A', practica: 'A1' } },
      subjects
    );

    expect(entries).toHaveLength(3);
    expect(Object.keys(entries[0])).toEqual([
      'codigo',
      'nombre',
      'tipo',
      'grupo',
      'letra',
      'dia',
      'inicio',
      'fin',
      'color',
    ]);
    expect(entries[0]).toEqual({
      codigo: 'MAT',
      nombre: 'Matemáticas I',
      tipo: 'Teoría',
      grupo: 'Grupo A',
      letra: 'A',
      dia: 'Lunes',
      inicio: '09:00',
      fin: '10:00',
      color: 'MAT',
    });
    // La práctica lleva `letra: null` (el render no pide dificultad por
    // subgrupo) y el grupo como "Subgrupo <sub>".
    expect(entries[2]).toEqual({
      codigo: 'MAT',
      nombre: 'Matemáticas I',
      tipo: 'Práctica',
      grupo: 'Subgrupo A1',
      letra: null,
      dia: 'Viernes',
      inicio: '11:00',
      fin: '13:00',
      color: 'MAT',
    });
  });

  it('materia sin prácticas → solo sus sesiones de teoría', () => {
    const entries = buildActiveSchedule(
      { FIS: true },
      { FIS: { teoria: 'A', practica: null } },
      [makeSinPracticas()]
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].tipo).toBe('Teoría');
  });

  it('ignora materias no seleccionadas', () => {
    const entries = buildActiveSchedule(
      { MAT: false },
      { MAT: { teoria: 'A', practica: 'A1' } },
      [makeMat()]
    );
    expect(entries).toEqual([]);
  });

  it('ignora códigos inexistentes en el catálogo y materias sin elección', () => {
    expect(() => buildActiveSchedule({ ZZZ: true }, { ZZZ: { teoria: 'A' } }, [makeMat()])).not.toThrow();
    expect(buildActiveSchedule({ ZZZ: true }, {}, [makeMat()])).toEqual([]);
    expect(buildActiveSchedule({ MAT: true }, {}, [makeMat()])).toEqual([]);
  });

  it('ignora la elección si su grupo no existe en la materia', () => {
    const entries = buildActiveSchedule({ MAT: true }, { MAT: { teoria: 'Z', practica: 'A1' } }, [
      makeMat(),
    ]);
    expect(entries).toEqual([]);
  });

  it('práctica apuntando a un subgrupo inexistente → solo teoría', () => {
    const entries = buildActiveSchedule({ MAT: true }, { MAT: { teoria: 'B', practica: 'B9' } }, [
      makeMat(),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].tipo).toBe('Teoría');
    expect(entries[0].grupo).toBe('Grupo B');
  });

  it('recorre la selección en orden de claves', () => {
    const entries = buildActiveSchedule(
      { FIS: true, MAT: true },
      { FIS: { teoria: 'A', practica: null }, MAT: { teoria: 'A', practica: 'A2' } },
      [makeMat(), makeSinPracticas()]
    );
    expect(entries.map((e) => e.codigo)).toEqual(['FIS', 'MAT', 'MAT', 'MAT']);
    expect(entries[3].grupo).toBe('Subgrupo A2');
  });
});

describe('buildConflictSet', () => {
  it('añade las claves de ambas materias `${codigo}-${dia}-${inicio}`', () => {
    const set = buildConflictSet([
      { codigo1: 'MAT', codigo2: 'FIS', dia: 'Lunes', inicio: '09:00', fin: '10:00' },
    ]);
    expect(set).toBeInstanceOf(Set);
    expect([...set].sort()).toEqual(['FIS-Lunes-09:00', 'MAT-Lunes-09:00']);
  });

  it('deduplica cuando una materia se repite a la misma hora', () => {
    const set = buildConflictSet([
      { codigo1: 'MAT', codigo2: 'FIS', dia: 'Lunes', inicio: '09:00' },
      { codigo1: 'MAT', codigo2: 'ED', dia: 'Lunes', inicio: '09:00' },
    ]);
    // MAT-Lunes-09:00 aparece en los dos conflictos → una sola entrada.
    expect([...set].sort()).toEqual(['ED-Lunes-09:00', 'FIS-Lunes-09:00', 'MAT-Lunes-09:00']);
    expect(set.size).toBe(3);
  });

  it('conflictos vacíos → Set vacío', () => {
    expect(buildConflictSet([]).size).toBe(0);
  });
});
