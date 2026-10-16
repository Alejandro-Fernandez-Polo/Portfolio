import { describe, it, expect } from 'vitest';
import { STATUS, ESTADO } from '../../public/ugr/src/progress/status.js';
import {
  buildSubjectRows,
  buildCourseBars,
  buildCreditBreakdown,
  buildMenciones,
  buildSummary,
  buildProjection,
  buildConvalidaciones,
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

// Entradas con la forma vieja de la tabla del autor (la que NO debe pasar el filtro).
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
      enrolledECTS: 0,
      pct: 10,
      enrolledPct: 0,
      totalPct: 10,
    });
    expect(bars.find((bar) => bar.curso === 2)).toMatchObject({ totalECTS: 60, passedECTS: 6, pct: 10 });
    expect(bars.find((bar) => bar.curso === 'Opt')).toMatchObject({ totalECTS: 60, passedECTS: 0, pct: 0 });
  });

  it('separa los ECTS en curso de los superados en cada curso y en el plan', () => {
    // Un curso con una superada y otra cursándose: los dos tramos van medidos
    // por separado y `totalPct` es la suma de ambos.
    const bars = buildCourseBars(SUBJECTS, { FFT: 'sup', SO: 'enroll' }, { totalECTS: 240 });
    expect(bars.find((bar) => bar.curso === 2)).toEqual({
      curso: 2,
      totalECTS: 60,
      passedECTS: 0,
      enrolledECTS: 6,
      pct: 0,
      enrolledPct: 10,
      totalPct: 10,
    });
    const plan = bars.find((bar) => bar.curso === 'plan');
    expect(plan).toMatchObject({ passedECTS: 6, enrolledECTS: 6, totalPct: 5 });
  });

  it('la fila de optativas va tras los cursos y antes del total del plan', () => {
    const bars = buildCourseBars(SUBJECTS, {}, { totalECTS: 240 });
    expect(bars.map((bar) => bar.curso)).toEqual([1, 2, 'Opt', 'plan']);
  });

  it('la fila de plan usa plan.totalECTS y el total de ECTS superados', () => {
    const bars = buildCourseBars(SUBJECTS, { FFT: 'sup', SO: 'sup' }, { totalECTS: 60 });
    const plan = bars.find((bar) => bar.curso === 'plan');
    expect(plan).toEqual({
      curso: 'plan',
      totalECTS: 60,
      passedECTS: 12,
      enrolledECTS: 0,
      pct: 20,
      enrolledPct: 0,
      totalPct: 20,
    });
  });

  it('sin datos devuelve solo la fila del plan (240 por defecto)', () => {
    expect(buildCourseBars(undefined, null, undefined)).toEqual([
      {
        curso: 'plan',
        totalECTS: 240,
        passedECTS: 0,
        enrolledECTS: 0,
        pct: 0,
        enrolledPct: 0,
        totalPct: 0,
      },
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

// Lo que ve la sección de convalidaciones: cada destino con el nombre y los ECTS
// que le da el catálogo activo, los tres grupos y los créditos reconocidos.
describe('buildConvalidaciones', () => {
  const LIBRE = { codigo: 'LIBRES', nombre: 'Créditos libres' };

  it('reparte en los tres grupos y resuelve nombre y ECTS de cada destino', () => {
    const grupos = buildConvalidaciones(
      [
        {
          id: 'a',
          origenes: [{ nombre: 'Cálculo I (UNED)' }],
          destinos: [{ codigo: 'FFT' }, { codigo: 'ALEM', nombre: 'Álgebra Lineal' }],
          creditos: 12,
          estado: ESTADO.APROBADA,
        },
        { id: 'b', origenes: [{ nombre: 'Física (UNED)' }], destinos: [{ codigo: 'SO' }], creditos: 6 },
        { id: 'c', origenes: [{ nombre: 'Química (UNED)' }], destinos: [{ codigo: 'FP' }], creditos: 6, estado: ESTADO.RECHAZADA },
      ],
      CATALOG,
    );

    expect(grupos.total).toBe(3);
    expect(grupos.aprobadas.map((c) => c.id)).toEqual(['a']);
    expect(grupos.pendientes.map((c) => c.id)).toEqual(['b']);
    expect(grupos.rechazadas.map((c) => c.id)).toEqual(['c']);

    const destinos = grupos.aprobadas[0].destinos;
    expect(destinos.map((d) => [d.code, d.name, d.ects])).toEqual([
      ['FFT', 'Fundamentos Físicos', 6],
      ['ALEM', 'Álgebra Lineal', 6],
    ]);
    expect(destinos.every((d) => d.fueraDelCatalogo === false)).toBe(true);
    // Solo las aprobadas cuentan como créditos reconocidos.
    expect(grupos.creditosReconocidos).toBe(12);
  });

  it('un destino que el catálogo no tiene se marca, y no se esconde', () => {
    const grupos = buildConvalidaciones(
      [{ id: 'x', origenes: [{ nombre: 'Otra carrera' }], destinos: [{ codigo: 'ZZ', nombre: 'Asignatura de fuera' }], creditos: 6 }],
      CATALOG,
    );
    expect(grupos.pendientes[0].destinos[0]).toMatchObject({
      code: 'ZZ',
      name: 'Asignatura de fuera',
      ects: 0,
      fueraDelCatalogo: true,
    });
  });

  it('los créditos libres no son una asignatura: ni ECTS ni marca de fuera', () => {
    const grupos = buildConvalidaciones(
      [{ id: 'l', origenes: [{ nombre: 'Curso de la UNED' }], destinos: [LIBRE], creditos: 9, estado: ESTADO.APROBADA }],
      CATALOG,
    );
    expect(grupos.aprobadas[0].destinos[0]).toEqual({
      code: 'LIBRES',
      name: 'Créditos libres',
      ects: 0,
      libre: true,
      fueraDelCatalogo: false,
    });
    // Y sus créditos sí cuentan: son créditos reconocidos.
    expect(grupos.creditosReconocidos).toBe(9);
  });

  it('sin convalidaciones no hay grupos ni créditos reconocidos', () => {
    const grupos = buildConvalidaciones([], CATALOG);
    expect(grupos.total).toBe(0);
    expect(grupos.creditosReconocidos).toBe(0);
    expect(grupos.pendientes).toEqual([]);
  });
});
