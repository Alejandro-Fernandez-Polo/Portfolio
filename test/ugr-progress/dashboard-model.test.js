import { describe, it, expect } from 'vitest';
import { STATUS } from '../../public/ugr/src/progress/status.js';
import {
  buildSubjectRows,
  buildCourseBars,
  buildCreditBreakdown,
  buildMenciones,
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
  it('una barra por curso, con los 60 ECTS del plan como máximo', () => {
    // El plan son 60 ECTS por curso; el catálogo trae además las optativas de
    // todas las menciones, así que el máximo no se saca de sumar asignaturas.
    const bars = buildCourseBars(SUBJECTS, { FFT: 'sup', SO: 'sup' }, { totalECTS: 240 });
    expect(bars.find((bar) => bar.curso === 1)).toEqual({
      curso: 1,
      totalECTS: 60,
      passedECTS: 6,
      pct: 10,
    });
    expect(bars.find((bar) => bar.curso === 2)).toMatchObject({ totalECTS: 60, passedECTS: 6, pct: 10 });
    expect(bars.find((bar) => bar.curso === 'Opt')).toMatchObject({ totalECTS: 60, passedECTS: 0, pct: 0 });
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
      // Lo pendiente es lo que falta para los 240 del título, no la suma de
      // todas las asignaturas del catálogo.
      ectsPending: 228,
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

// Plan con las piezas del grado: básicas, obligatorias, el módulo de una mención,
// una optativa libre y el TFG. Los créditos de mención son los de **una**
// mención, no los de las cinco: cada alumno cursa una.
const PLAN = [
  { codigo: 'FFT', nombre: 'Fundamentos Físicos', creditos: 6, curso: 1, cuatrimestre: 1, caracter: 'Básica', mencion: 'Común' },
  { codigo: 'SO', nombre: 'Sistemas Operativos', creditos: 6, curso: 2, cuatrimestre: 1, caracter: 'Obligatoria', mencion: 'Común' },
  { codigo: 'AA', nombre: 'Aprendizaje Automático', creditos: 6, curso: 4, cuatrimestre: 1, caracter: 'Obligatoria de Rama', mencion: 'CSI' },
  { codigo: 'TSI', nombre: 'Técnicas de los Sistemas Inteligentes', creditos: 6, curso: 4, cuatrimestre: 2, caracter: 'Obligatoria de Rama', mencion: 'CSI' },
  { codigo: 'DI', nombre: 'Derecho Informático', creditos: 6, curso: 4, cuatrimestre: 1, caracter: 'Optativa', mencion: 'Común' },
  { codigo: 'PFG', nombre: 'Proyecto Fin de Grado', creditos: 12, curso: 4, cuatrimestre: 2, caracter: 'Trabajo Fin de Grado', mencion: 'Común' },
];

describe('buildCreditBreakdown', () => {
  it('reparte los créditos por los bloques del grado, sin mezclar menciones', () => {
    const bloques = buildCreditBreakdown(PLAN, {});
    expect(bloques.map((b) => [b.clave, b.total])).toEqual([
      ['basica', 6],
      ['obligatoria', 6],
      ['mencion', 12],
      // Las optativas del plan son 30: es el requisito, no lo que hay en el
      // catálogo (que trae las de todas las menciones).
      ['optativa', 30],
      ['tfg', 12],
    ]);
    // La mención que se enseña en el bloque es una (el desglose va aparte).
    expect(bloques.find((b) => b.clave === 'mencion').detalle).toBe('CSI');
  });

  it('cuenta lo superado y deja en cero lo que no está marcado', () => {
    const bloques = buildCreditBreakdown(PLAN, {
      AA: STATUS.SUPERADA,
      PFG: STATUS.CONVALIDADA,
      SO: STATUS.EN_CURSO,
    });
    const porClave = Object.fromEntries(bloques.map((b) => [b.clave, b]));
    expect(porClave.mencion.passed).toBe(6);
    expect(porClave.tfg.passed).toBe(12);
    expect(porClave.obligatoria.passed).toBe(0);
    expect(porClave.basica.passed).toBe(0);
  });
});

describe('buildMenciones', () => {
  it('dice qué falta para la mención: hay que cursar el módulo entero', () => {
    const menciones = buildMenciones(PLAN, { AA: STATUS.SUPERADA }, [
      { codigo: 'CSI', nombre: 'Computación y Sistemas Inteligentes' },
    ]);
    expect(menciones).toHaveLength(1);
    expect(menciones[0]).toMatchObject({ codigo: 'CSI', total: 12, passed: 6, completa: false });
    expect(menciones[0].faltan.map((f) => f.code)).toEqual(['TSI']);
  });

  it('solo la marca como obtenida con el módulo completo', () => {
    const menciones = buildMenciones(PLAN, { AA: STATUS.SUPERADA, TSI: STATUS.CONVALIDADA }, [{ codigo: 'CSI' }]);
    expect(menciones[0].completa).toBe(true);
    expect(menciones[0].passed).toBe(12);
  });

  it('sin menciones en el catálogo no devuelve nada', () => {
    expect(buildMenciones(PLAN, {}, [])).toEqual([]);
  });
});

describe('buildSubjectRows: sin marcar no es pendiente', () => {
  it('señala con `marked` solo las asignaturas con estado propio', () => {
    const rows = buildSubjectRows(PLAN, { SO: STATUS.SUPERADA });
    expect(rows.find((r) => r.code === 'SO').marked).toBe(true);
    expect(rows.find((r) => r.code === 'FFT').marked).toBe(false);
  });
});

describe('buildSubjectRows: orden curso → cuatrimestre → tipo → nombre', () => {
  it('dentro del mismo curso y cuatrimestre manda el tipo, no el nombre', () => {
    // El mismo orden que la lista de datos: primero el curso, luego el
    // cuatrimestre, luego el tipo y por último el nombre.
    const rows = buildSubjectRows(
      [
        { codigo: 'ZZ', nombre: 'Zeta', creditos: 6, curso: 1, cuatrimestre: 1, caracter: 'Optativa', mencion: 'Común' },
        { codigo: 'AA', nombre: 'Alfa', creditos: 6, curso: 1, cuatrimestre: 1, caracter: 'Básica', mencion: 'Común' },
        { codigo: 'MM', nombre: 'Mmm', creditos: 6, curso: 1, cuatrimestre: 2, caracter: 'Básica', mencion: 'Común' },
      ],
      {},
    );
    expect(rows.map((r) => r.code)).toEqual(['AA', 'ZZ', 'MM']);
  });
});
