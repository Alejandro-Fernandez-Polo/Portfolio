import { describe, it, expect } from 'vitest';
import {
  buildDocentScores,
  buildProblem,
  blockedEmptySubjects,
  feasibilitySignature,
} from '../../public/ugr/src/app/domain/problem.js';
import { difficultyScore } from '../../public/ugr/src/solver/catalog.js';

// Caracterización de la construcción del problema del solver.
// Fija dos cosas: el filtrado que ya hacía `app.js` (existe, cuatrimestre,
// superadas) y las decisiones de producto —«Desconocido» no
// puntúa y el modo profesores vacía las puntuaciones y retira el bloqueo—.
// Funciones puras: fixtures propias, sin DOM ni globals.

/** Catálogo propio con dos cuatrimestres y grupos con/sin dificultad. */
function makeCatalog() {
  return [
    {
      codigo: 'MAT',
      cuatrimestre: 1,
      grupos: [
        { letra: 'A', turno: 'mañana', teoria: [], practicas: { subgrupos: [] } },
        { letra: 'B', turno: 'tarde', teoria: [], practicas: { subgrupos: [] } },
      ],
    },
    {
      codigo: 'FIS',
      cuatrimestre: 1,
      grupos: [
        { letra: 'A', turno: 'mañana', teoria: [], practicas: { subgrupos: [] } },
        { letra: 'B', turno: 'tarde', teoria: [], practicas: { subgrupos: [] } },
      ],
    },
    {
      codigo: 'SEG',
      cuatrimestre: 2,
      grupos: [
        { letra: 'A', turno: 'mañana', teoria: [], practicas: { subgrupos: [] } },
      ],
    },
  ];
}

/** Dificultad por grupo: MAT-A difícil, MAT-B desconocida, FIS sin dato. */
function makeDificultad() {
  return (codigo, letra) => {
    if (codigo === 'MAT' && letra === 'A') return 'naranja';
    if (codigo === 'MAT' && letra === 'B') return 'gris';
    return null;
  };
}

const FILTERS = [
  { type: 'freeDays', value: ['viernes'] },
  { type: 'blockGroups', value: ['MAT-B'] },
];

describe('buildDocentScores', () => {
  it('solo puntúa las dificultades conocidas (`gris` y el hueco se omiten)', () => {
    const scores = buildDocentScores(
      ['MAT', 'FIS'],
      makeCatalog(),
      makeDificultad(),
      difficultyScore
    );
    expect(scores).toEqual({ 'MAT-A': 3 });
  });

  it('sin ningún dato de dificultad devuelve un mapa vacío', () => {
    const scores = buildDocentScores(
      ['FIS'],
      makeCatalog(),
      () => null,
      difficultyScore
    );
    expect(scores).toEqual({});
  });

  it('ignora códigos que no están en el catálogo y termina de recorrer grupos', () => {
    const scores = buildDocentScores(
      ['NOEXISTE', 'MAT'],
      makeCatalog(),
      () => 'cyan',
      difficultyScore
    );
    expect(scores).toEqual({ 'MAT-A': 6, 'MAT-B': 6 });
  });
});

describe('buildProblem', () => {
  it('deja fuera lo no seleccionado y lo de otro cuatrimestre', () => {
    const problem = buildProblem({
      selectedSubjects: { MAT: true, FIS: true, SEG: true, TAL: false },
      catalog: makeCatalog(),
      cuatrimestre: 1,
      dificultad: makeDificultad(),
      difficultyScore,
    });
    expect(problem.subjects).toEqual(['MAT', 'FIS']);
    expect(problem.excludedPassed).toEqual([]);
  });

  it('las superadas salen del dominio y se informan en `excludedPassed`', () => {
    const problem = buildProblem({
      selectedSubjects: { MAT: true, FIS: true },
      catalog: makeCatalog(),
      cuatrimestre: 1,
      passedCodes: ['FIS'],
      dificultad: makeDificultad(),
      difficultyScore,
    });
    expect(problem.subjects).toEqual(['MAT']);
    expect(problem.excludedPassed).toEqual(['FIS']);
  });

  it('mantiene la etiqueta de catálogo `legacy` (clave de caché del solver)', () => {
    const problem = buildProblem({ selectedSubjects: {}, catalog: makeCatalog() });
    expect(problem.catalogVersion).toBe('legacy');
  });

  it('con el modo profesores apagado conserva los filtros y puntúa', () => {
    const problem = buildProblem({
      selectedSubjects: { MAT: true, FIS: true },
      catalog: makeCatalog(),
      filters: FILTERS,
      dificultad: makeDificultad(),
      difficultyScore,
    });
    expect(problem.filters).toEqual(FILTERS);
    expect(problem.docentScores).toEqual({ 'MAT-A': 3 });
  });

  it('con el modo profesores encendido vacía las puntuaciones y retira `blockGroups`', () => {
    const problem = buildProblem({
      selectedSubjects: { MAT: true, FIS: true },
      catalog: makeCatalog(),
      filters: FILTERS,
      ignoreDocents: true,
      dificultad: makeDificultad(),
      difficultyScore,
    });
    expect(problem.docentScores).toEqual({});
    // El bloqueo es cosa del panel «Bloquear profesores»: si el modo lo deja
    // activo, decidiría desde una interfaz que ya no se ve. El resto de filtros
    // del usuario se respetan.
    expect(problem.filters).toEqual([{ type: 'freeDays', value: ['viernes'] }]);
  });
});

// ─── Bloqueo y firma del problema (extraídos en V2) ─────────────────────────

describe('blockedEmptySubjects', () => {
  const SUBJECTS = [
    { codigo: 'FFT', grupos: [{ letra: 'A' }, { letra: 'B' }] },
    { codigo: 'ALG', grupos: [{ letra: 'A' }] },
  ];

  it('marca la asignatura cuyos grupos están todos bloqueados', () => {
    expect(blockedEmptySubjects({ subjects: ['FFT', 'ALG'] }, { subjects: SUBJECTS, blocked: ['ALG-A'] })).toEqual(['ALG']);
    // Con un grupo libre, no se marca.
    expect(blockedEmptySubjects({ subjects: ['FFT'] }, { subjects: SUBJECTS, blocked: ['FFT-A'] })).toEqual([]);
  });

  it('con «Ignorar profesores» no puede quedar nada vacío (el motor ya no mira el bloqueo)', () => {
    expect(blockedEmptySubjects({ subjects: ['ALG'] }, { subjects: SUBJECTS, blocked: ['ALG-A'], ignoreDocents: true })).toEqual([]);
  });

  it('un código que no está en el catálogo no se marca', () => {
    expect(blockedEmptySubjects({ subjects: ['XX'] }, { subjects: SUBJECTS, blocked: ['XX-A'] })).toEqual([]);
  });
});

describe('feasibilitySignature', () => {
  it('es la misma si no cambian ni asignaturas ni filtros', () => {
    const a = { subjects: ['FFT'], filters: [{ type: 'maxDays', value: 3 }] };
    const b = { subjects: ['FFT'], filters: [{ type: 'maxDays', value: 3 }] };
    expect(feasibilitySignature(a)).toBe(feasibilitySignature(b));
    expect(feasibilitySignature({ ...a, filters: [] })).not.toBe(feasibilitySignature(a));
  });
});
