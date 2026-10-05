import { describe, it, expect } from 'vitest';
import {
  buildSubjectRows,
  buildCourseBars,
  buildSummary,
  buildProjection,
  buildEquivalenceRows,
} from '../../public/ugr/src/progress/index.js';

// Formato legacy (data.js): codigo/nombre/creditos/curso/cuatrimestre.
const SUBJECTS = [
  { codigo: 'FFT', nombre: 'Fundamentos Físicos', creditos: 6, curso: 1, cuatrimestre: 1 },
  { codigo: 'ALEM', nombre: 'Álgebra Lineal', creditos: 6, curso: 1, cuatrimestre: 1 },
  { codigo: 'SO', nombre: 'Sistemas Operativos', creditos: 6, curso: 2, cuatrimestre: 1 },
  { codigo: 'OPT', nombre: 'Optativa Libre', creditos: 6, curso: 'Opt', cuatrimestre: 2 },
];

const CATALOG = [
  ...SUBJECTS,
  { codigo: 'FP', nombre: 'Fundamentos de Programación', creditos: 6, curso: 1, cuatrimestre: 1 },
];

// Entradas con la forma de CONVALIDACIONES (convalidaciones.js).
const ENTRIES = [
  {
    id: '011013-FFT',
    origen: 'UNED',
    uned: { codigo: '011013', nombre: 'Fundamentos Físicos de la Informática' },
    ugr: { codigo: 'FFT', nombre: 'Fundamentos Físicos y Tecnológicos' },
    creditos: 6,
  },
  {
    id: 'FP-COMBINADA',
    origen: 'UNED+GS',
    uned: { codigo: '901020', nombre: 'Fundamentos de Programación' },
    ugr: { codigo: 'FP', nombre: 'Fundamentos de Programación' },
    creditos: 6,
  },
  {
    id: 'X-GHOST',
    origen: 'UNED',
    uned: { codigo: '999', nombre: 'Materia inexistente' },
    ugr: { codigo: 'NOEXISTE', nombre: 'Asignatura Fantasma' },
    creditos: 6,
  },
];

describe('buildSubjectRows', () => {
  it('normaliza cada asignatura con code/name/curso/term/ects/status', () => {
    const rows = buildSubjectRows(SUBJECTS, {});
    expect(rows).toHaveLength(4);
    expect(rows.find((row) => row.code === 'FFT')).toMatchObject({
      code: 'FFT',
      name: 'Fundamentos Físicos',
      curso: 1,
      term: 1,
      ects: 6,
      status: 'pending',
    });
  });

  it('ordena por curso con las optativas al final', () => {
    const rows = buildSubjectRows(SUBJECTS, {});
    expect(rows.map((row) => row.curso)).toEqual([1, 1, 2, 'Opt']);
    expect(rows[rows.length - 1].code).toBe('OPT');
  });

  it('aplica los estados válidos y trata los inválidos como pendientes', () => {
    const rows = buildSubjectRows(SUBJECTS, {
      FFT: 'sup',
      ALEM: 'pass',
      SO: 'enroll',
      OPT: 'aprobada',
    });
    const byCode = Object.fromEntries(rows.map((row) => [row.code, row.status]));
    expect(byCode).toEqual({ FFT: 'sup', ALEM: 'pass', SO: 'enroll', OPT: 'pending' });
  });

  it('acepta el formato canónico code/ects/course/term', () => {
    const rows = buildSubjectRows([{ code: 'X', ects: 3, course: 2, term: 1 }], {});
    expect(rows[0]).toMatchObject({ code: 'X', name: 'X', curso: 2, term: 1, ects: 3 });
  });

  it('ignora entradas sin código y tolera datos no-array', () => {
    expect(buildSubjectRows([null, {}, { nombre: 'Sin código' }, SUBJECTS[0]], {})).toHaveLength(1);
    expect(buildSubjectRows(null, null)).toEqual([]);
    expect(buildSubjectRows(undefined, 'roto')).toEqual([]);
  });
});

describe('buildCourseBars', () => {
  it('una barra por curso con ECTS totales, superados y porcentaje', () => {
    const bars = buildCourseBars(SUBJECTS, { FFT: 'sup', SO: 'sup' }, { totalECTS: 240 });
    expect(bars.find((bar) => bar.curso === 1)).toEqual({
      curso: 1,
      totalECTS: 12,
      passedECTS: 6,
      pct: 50,
    });
    expect(bars.find((bar) => bar.curso === 2)).toMatchObject({ totalECTS: 6, passedECTS: 6, pct: 100 });
    expect(bars.find((bar) => bar.curso === 'Opt')).toMatchObject({ totalECTS: 6, passedECTS: 0, pct: 0 });
  });

  it('la fila de optativas va tras los cursos y antes del total del plan', () => {
    const bars = buildCourseBars(SUBJECTS, {}, { totalECTS: 240 });
    expect(bars.map((bar) => bar.curso)).toEqual([1, 2, 'Opt', 'plan']);
  });

  it('la fila de plan usa plan.totalECTS y el total de ECTS superados', () => {
    const bars = buildCourseBars(SUBJECTS, { FFT: 'sup', SO: 'sup' }, { totalECTS: 60 });
    const plan = bars.find((bar) => bar.curso === 'plan');
    expect(plan).toEqual({ curso: 'plan', totalECTS: 60, passedECTS: 12, pct: 20 });
  });

  it('sin datos devuelve solo la fila del plan (240 por defecto)', () => {
    expect(buildCourseBars(undefined, null, undefined)).toEqual([
      { curso: 'plan', totalECTS: 240, passedECTS: 0, pct: 0 },
    ]);
  });
});

describe('buildSummary', () => {
  it('separa ECTS superados, en curso y pendientes con el % sobre el plan', () => {
    const summary = buildSummary(SUBJECTS, { FFT: 'sup', SO: 'enroll' }, { totalECTS: 240 });
    expect(summary).toMatchObject({
      ectsPassed: 6,
      ectsEnrolled: 6,
      ectsPending: 12,
      ectsTotal: 24,
      counts: { passed: 1, enrolled: 1, pending: 2 },
      totalECTS: 240,
      pct: 3, // 6/240 → 2.5% redondeado
    });
  });

  it('usa 240 ECTS si el plan no lo declara', () => {
    const summary = buildSummary(SUBJECTS, {}, {});
    expect(summary.totalECTS).toBe(240);
    expect(summary.pct).toBe(0);
    expect(summary.counts).toEqual({ passed: 0, enrolled: 0, pending: 4 });
  });

  it('los estados inválidos cuentan como pendientes, nunca como superados', () => {
    const summary = buildSummary(SUBJECTS, { FFT: 'aprobada', SO: 'enroll' }, { totalECTS: 60 });
    expect(summary.ectsPassed).toBe(0);
    expect(summary.counts.passed).toBe(0);
    expect(summary.pct).toBe(0);
  });
});

describe('buildProjection', () => {
  it('calcula ECTS restantes, cuatrimestres y porcentaje de avance', () => {
    const projection = buildProjection(SUBJECTS, { FFT: 'sup', SO: 'sup' }, { totalECTS: 240 });
    expect(projection).toEqual({
      passedECTS: 12,
      remainingECTS: 228,
      termsRemaining: 8, // ceil(228/30)
      pct: 5,
    });
  });

  it('plan parcial o ausente cae en 240 ECTS', () => {
    expect(buildProjection(SUBJECTS, {}, {})).toEqual({
      passedECTS: 0,
      remainingECTS: 240,
      termsRemaining: 8,
      pct: 0,
    });
  });

  it('grado cerrado y porcentaje clamped a 100', () => {
    const all = Object.fromEntries(SUBJECTS.map((subject) => [subject.codigo, 'sup']));
    expect(buildProjection(SUBJECTS, all, { totalECTS: 24 })).toEqual({
      passedECTS: 24,
      remainingECTS: 0,
      termsRemaining: 0,
      pct: 100,
    });
  });

  it('tolera entradas no-array sin lanzar', () => {
    expect(buildProjection(null, null, null)).toEqual({
      passedECTS: 0,
      remainingECTS: 240,
      termsRemaining: 8,
      pct: 0,
    });
  });
});

describe('buildEquivalenceRows', () => {
  it('normaliza CONVALIDACIONES y marca la reconocida como superada', () => {
    const rows = buildEquivalenceRows(ENTRIES, null, CATALOG, { FFT: 'sup' });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      id: '011013-FFT',
      from: { code: '011013', name: 'Fundamentos Físicos de la Informática' },
      to: { code: 'FFT' },
      ects: 6,
      source: 'uned',
      estado: null,
      recognizedPassed: true,
      orphan: false,
      reason: '',
    });
    expect(rows[1]).toMatchObject({ source: 'gs', recognizedPassed: false });
  });

  it('detecta huérfanas y explica el motivo', () => {
    const rows = buildEquivalenceRows(ENTRIES, null, CATALOG, {});
    const orphan = rows.find((row) => row.to.code === 'NOEXISTE');
    expect(orphan.orphan).toBe(true);
    expect(orphan.recognizedPassed).toBe(false);
    expect(orphan.reason).toContain('NOEXISTE');
    expect(rows.filter((row) => row.orphan)).toHaveLength(1);
  });

  it('lee los estados del mapa legacy ugr-convalidaciones', () => {
    const rows = buildEquivalenceRows(
      ENTRIES,
      { '011013-FFT': { estado: 'concedida' }, 'FP-COMBINADA': { estado: 'pendiente' } },
      CATALOG,
      {},
    );
    expect(rows.map((row) => row.estado)).toEqual(['concedida', 'pendiente', null]);
  });

  it('acepta el array legacy con el estado ya colgado y aporta sus entradas', () => {
    const legacy = ENTRIES.map((entry) => ({ ...entry, estado: ' CONCEDIDA ' }));
    const rows = buildEquivalenceRows([], legacy, CATALOG, {});
    expect(rows).toHaveLength(3);
    // Normaliza mayúsculas y espacios; el estado inválido no llega aquí.
    expect(rows.every((row) => row.estado === 'concedida')).toBe(true);
    expect(rows.find((row) => row.to.code === 'FP').orphan).toBe(false);
  });

  it('deduplica por id (store + legacy) y por par origen/destino sin id', () => {
    const byId = buildEquivalenceRows(ENTRIES, ENTRIES, CATALOG, {});
    expect(byId).toHaveLength(3);

    const pair = { cursadaCodigo: '901020', reconocidaCodigo: 'FP', creditos: 6 };
    const byPair = buildEquivalenceRows([pair], [{ ...pair }], CATALOG, {});
    expect(byPair).toHaveLength(1);
    expect(byPair[0]).toMatchObject({ id: '', to: { code: 'FP' }, ects: 6 });
  });

  it('acepta el formato canónico from/to', () => {
    const rows = buildEquivalenceRows(
      [{ from: { code: '011013', name: 'Origen' }, to: { code: 'FFT', name: 'Destino' }, ects: 3 }],
      null,
      CATALOG,
      {},
    );
    expect(rows[0]).toMatchObject({
      from: { code: '011013', name: 'Origen' },
      to: { code: 'FFT', name: 'Destino' },
      ects: 3,
      source: 'uned',
    });
  });

  it('estados inválidos, entradas rotas y datos ausentes no lanzan', () => {
    const rows = buildEquivalenceRows(
      [null, 'texto', {}, { id: 'rota', estado: 42 }],
      { '011013-FFT': { estado: 'loquesea' }, sinEstado: {} },
      CATALOG,
      { FFT: 'aprobada' },
    );
    // Nada interpretable: las entradas sin extremos se descartan.
    expect(rows).toEqual([]);
    expect(buildEquivalenceRows(undefined, undefined, undefined, undefined)).toEqual([]);
    expect(buildEquivalenceRows(ENTRIES, 'roto', null, null)).toHaveLength(3);
  });
});
