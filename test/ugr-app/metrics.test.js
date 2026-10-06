import { describe, it, expect } from 'vitest';
import {
  calculateConfigMetrics,
  calculateConfigDeadHours,
  calculateConfigDays,
  findConflicts,
} from '../../public/ugr/src/app/domain/metrics.js';

// Caracterización de métricas y conflictos (T02.4): fijan el comportamiento
// legacy de app.js (`calculateConfig*` y `detectConflicts`) una vez que el
// monolito delega en el dominio ESM. Funciones puras: fixtures propias, sin
// DOM ni globals de datos, en el entorno node de Vitest.

/** Catálogo propio (NO el global SUBJECTS) con mañana/tarde y prácticas. */
function makeSubjects() {
  return [
    {
      codigo: 'MAT',
      nombre: 'Matemáticas I',
      curso: 1,
      grupos: [
        {
          letra: 'A',
          turno: 'mañana',
          teoria: [
            { dia: 'Lunes', inicio: '09:00', fin: '10:00' },
            { dia: 'Lunes', inicio: '12:00', fin: '13:00' },
          ],
          practicas: {
            subgrupos: ['A1'],
            A1: [{ dia: 'Miércoles', inicio: '10:00', fin: '11:30' }],
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
    },
    {
      codigo: 'FIS',
      nombre: 'Física',
      curso: 1,
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
    },
  ];
}

/** Entrada de horario con las claves que consume `findConflicts`. */
function entry(overrides) {
  return {
    codigo: 'MAT',
    nombre: 'Matemáticas I',
    tipo: 'Teoría',
    grupo: 'A',
    dia: 'Lunes',
    inicio: '09:00',
    fin: '10:00',
    ...overrides,
  };
}

describe('findConflicts', () => {
  it('mismo código (teoría y práctica de la materia) → sin conflicto', () => {
    const entries = [
      entry({ inicio: '09:00', fin: '11:00' }),
      entry({ tipo: 'Práctica', grupo: 'Subgrupo A1', inicio: '10:00', fin: '12:00' }),
    ];
    expect(findConflicts(entries)).toEqual([]);
  });

  it('tramos solapados en días distintos → sin conflicto', () => {
    const entries = [entry({ inicio: '09:00', fin: '11:00' }), entry({ codigo: 'FIS', dia: 'Martes', inicio: '10:00', fin: '12:00' })];
    expect(findConflicts(entries)).toEqual([]);
  });

  it('tramos adyacentes (fin == inicio) → sin conflicto', () => {
    const entries = [entry({ inicio: '09:00', fin: '10:00' }), entry({ codigo: 'FIS', inicio: '10:00', fin: '11:00' })];
    expect(findConflicts(entries)).toEqual([]);
  });

  it('solape real → conflicto con la forma legacy exacta (claves y orden)', () => {
    const entries = [
      entry({ inicio: '09:00', fin: '11:00' }),
      entry({
        codigo: 'FIS',
        nombre: 'Física',
        tipo: 'Práctica',
        grupo: 'Subgrupo B1',
        inicio: '10:00',
        fin: '12:00',
      }),
    ];

    const conflicts = findConflicts(entries);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      codigo1: 'MAT',
      nombre1: 'Matemáticas I',
      tipo1: 'Teoría A',
      dia: 'Lunes',
      inicio: '09:00',
      fin: '11:00',
      codigo2: 'FIS',
      nombre2: 'Física',
      tipo2: 'Práctica Subgrupo B1',
    });
    expect(Object.keys(conflicts[0])).toEqual([
      'codigo1',
      'nombre1',
      'tipo1',
      'dia',
      'inicio',
      'fin',
      'codigo2',
      'nombre2',
      'tipo2',
    ]);
  });

  it('varias entradas → un conflicto por par solapado, en orden de doble bucle', () => {
    const entries = [
      entry({ inicio: '09:00', fin: '11:00' }), // MAT 09-11
      entry({ codigo: 'FIS', inicio: '10:00', fin: '11:00' }), // FIS 10-11 → solapa con MAT
      entry({ codigo: 'ED', nombre: 'ED', inicio: '11:00', fin: '12:00' }), // adyacente → no
      entry({ codigo: 'ALG', nombre: 'ALG', inicio: '09:30', fin: '10:30' }), // solapa con MAT y FIS
    ];

    const conflicts = findConflicts(entries);
    expect(conflicts.map((c) => [c.codigo1, c.codigo2])).toEqual([
      ['MAT', 'FIS'],
      ['MAT', 'ALG'],
      ['FIS', 'ALG'],
    ]);
  });
});

describe('calculateConfigMetrics', () => {
  it('suma teoría+práctica en el turno del grupo (mañana y tarde) con horas a 1 decimal', () => {
    const subjects = makeSubjects();
    const m = calculateConfigMetrics(
      { MAT: true, FIS: true },
      { MAT: { teoria: 'A', practica: 'A1' }, FIS: { teoria: 'B', practica: null } },
      { subjects }
    );

    // MAT-A (mañana): 09-10 + 12-13 + práct. 10:00-11:30 = 3.5 h.
    // FIS-B (tarde): 16:30-18:30 = 2 h.
    expect(m.manana).toBe(3.5);
    expect(m.tarde).toBe(2);
    expect(m.profScore).toBe(0);
    expect(m.profCount).toBe(0);
    // MAT A + FIS B en el mismo curso → letras distintas → false.
    expect(m.sameGroupPerYear).toBe(false);
  });

  it('misma letra de grupo en todos los cursos → sameGroupPerYear true', () => {
    const subjects = makeSubjects();
    const m = calculateConfigMetrics(
      { MAT: true, FIS: true },
      { MAT: { teoria: 'A', practica: null }, FIS: { teoria: 'A', practica: null } },
      { subjects }
    );
    expect(m.sameGroupPerYear).toBe(true);
    // Solo mañana: MAT-A teoría 2 h (09-10 y 12-13) + FIS-A 2 h (08-10).
    expect(m.manana).toBe(4);
    expect(m.tarde).toBe(0);
  });

  it('dificultad y peso inyectados puntuán (profScore/profCount por materia con lookup)', () => {
    const subjects = makeSubjects();
    const m = calculateConfigMetrics(
      { MAT: true, FIS: true },
      { MAT: { teoria: 'A', practica: null }, FIS: { teoria: 'A', practica: null } },
      {
        subjects,
        dificultad: (codigo, letra) => (codigo === 'MAT' && letra === 'A' ? 'naranja' : null),
        difficultyScore: (d) => (d === 'naranja' ? 5 : 3),
      }
    );
    expect(m.profScore).toBe(5);
    expect(m.profCount).toBe(1);
  });

  it('sin dificultad pero con puntito inyectado → peso por defecto 3 por profesor', () => {
    const subjects = makeSubjects();
    const m = calculateConfigMetrics(
      { MAT: true, FIS: true },
      { MAT: { teoria: 'A', practica: null }, FIS: { teoria: 'A', practica: null } },
      { subjects, dificultad: () => 'verde' }
    );
    expect(m.profScore).toBe(6);
    expect(m.profCount).toBe(2);
  });

  it('redondea las horas a 1 decimal (1.25 h → 1.3)', () => {
    const subjects = [
      {
        codigo: 'LAB',
        nombre: 'Laboratorio',
        curso: 2,
        grupos: [
          {
            letra: 'A',
            turno: 'mañana',
            teoria: [{ dia: 'Jueves', inicio: '09:00', fin: '10:15' }],
            practicas: { subgrupos: [] },
          },
        ],
      },
    ];
    const m = calculateConfigMetrics({ LAB: true }, { LAB: { teoria: 'A', practica: null } }, { subjects });
    expect(m.manana).toBe(1.3);
    expect(m.tarde).toBe(0);
  });

  it('selección vacía → todo a cero y sameGroupPerYear true (vacío es true)', () => {
    const m = calculateConfigMetrics({}, {}, { subjects: makeSubjects() });
    expect(m).toEqual({ manana: 0, tarde: 0, profScore: 0, profCount: 0, sameGroupPerYear: true });
  });
});

describe('calculateConfigDeadHours', () => {
  it('hueco entre clases del mismo turno → horas muertas (9-10 y 12-13 = 2.0 h)', () => {
    const subjects = makeSubjects();
    const dead = calculateConfigDeadHours(
      { MAT: true },
      { MAT: { teoria: 'A', practica: 'A1' } },
      { subjects }
    );
    // Lunes: (13:00 − 09:00 − 2 h de clase) = 2.0 h; Miércoles tiene una sola
    // sesión → no cuenta.
    expect(dead).toBe(2);
  });

  it('el tramo de mediodía entre mañana y tarde NO es hueco (2.0 y no 4.0)', () => {
    const subjects = [
      {
        codigo: 'MAN',
        nombre: 'Mañana',
        curso: 1,
        grupos: [
          {
            letra: 'A',
            turno: 'mañana',
            teoria: [
              { dia: 'Lunes', inicio: '09:00', fin: '10:00' },
              { dia: 'Lunes', inicio: '12:00', fin: '13:00' },
            ],
            practicas: { subgrupos: [] },
          },
        ],
      },
      {
        codigo: 'TAR',
        nombre: 'Tarde',
        curso: 2,
        grupos: [
          {
            letra: 'A',
            turno: 'tarde',
            teoria: [{ dia: 'Lunes', inicio: '15:00', fin: '17:00' }],
            practicas: { subgrupos: [] },
          },
        ],
      },
    ];
    const dead = calculateConfigDeadHours(
      { MAN: true, TAR: true },
      { MAN: { teoria: 'A', practica: null }, TAR: { teoria: 'A', practica: null } },
      { subjects }
    );
    // Solo el hueco de la mañana (09-10 … 12-13): si el día entero se
    // agrupara junto, saldría 4.0 h (09:00→17:00 − 4 h de clase).
    expect(dead).toBe(2);
  });

  it('clases solapadas: el solape se suma dos veces en "sum" (regla legacy) → 1.0 h', () => {
    const subjects = makeSubjects();
    // Lunes: FIS-A 08-10, MAT-A 09-10 (contenida) y 12-13. El rango es
    // 08:00→13:00 (300 min) pero la suma de sesiones da 240 min (09-10
    // contada dos veces) → (300 − 240)/60 = 1.0 h, no 2.0.
    const dead = calculateConfigDeadHours(
      { MAT: true, FIS: true },
      { MAT: { teoria: 'A', practica: null }, FIS: { teoria: 'A', practica: null } },
      { subjects }
    );
    expect(dead).toBe(1);
  });
});

describe('calculateConfigDays', () => {
  it('cuenta días con clase por franja (<14 h = mañana)', () => {
    const subjects = makeSubjects();
    const days = calculateConfigDays(
      { MAT: true, FIS: true },
      { MAT: { teoria: 'A', practica: 'A1' }, FIS: { teoria: 'B', practica: null } },
      { subjects }
    );
    // Mañana: Lunes (teoría MAT, duplicada pero es un set) + Miércoles (práct.).
    // Tarde: Martes (FIS-B).
    expect(days).toEqual({ manana: 2, tarde: 1 });
  });

  it('una sesión que empieza exactamente a las 14:00 cuenta como tarde', () => {
    const subjects = makeSubjects();
    const days = calculateConfigDays(
      { MAT: true, FIS: true },
      { MAT: { teoria: 'B', practica: 'B1' }, FIS: { teoria: 'A', practica: null } },
      { subjects }
    );
    // MAT-B: teoría Martes 16:00 y práctica Martes 14:00 → tarde.
    // FIS-A: Lunes 08:00 → mañana.
    expect(days).toEqual({ manana: 1, tarde: 1 });
  });
});
