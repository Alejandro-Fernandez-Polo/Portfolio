import { describe, it, expect } from 'vitest';
import {
  summarize,
  projectDegree,
  mapEquivalences,
  subjectCode,
  subjectEcts,
  subjectCourse,
  subjectTerm,
} from '../../public/ugr/src/progress/index.js';

// Formato legacy (data.js): codigo/creditos/curso/cuatrimestre.
const SUBJECTS = [
  { codigo: 'FFT', creditos: 6, curso: 1, cuatrimestre: 1 },
  { codigo: 'ALEM', creditos: 6, curso: 1, cuatrimestre: 1 },
  { codigo: 'SO', creditos: 6, curso: 2, cuatrimestre: 1 },
  { codigo: 'DDSI', creditos: 6, curso: 3, cuatrimestre: 1 },
  { codigo: 'OPT', creditos: 6, curso: 4, cuatrimestre: 2 },
];

describe('normalización de campos', () => {
  it('acepta codigo/code, creditos/ects, curso/course, cuatrimestre/term', () => {
    const canonical = { code: 'FFT', ects: 6, course: 1, term: 1 };
    expect(subjectCode(canonical)).toBe('FFT');
    expect(subjectEcts(canonical)).toBe(6);
    expect(subjectCourse(canonical)).toBe(1);
    expect(subjectTerm(canonical)).toBe(1);
    expect(subjectCourse({ curso: 'Opt' })).toBe('Opt');
  });
});

describe('summarize', () => {
  it('cuenta superados (sup+pass), en curso y pendientes (pending + sin marcar)', () => {
    const s = summarize(SUBJECTS, { FFT: 'pass', ALEM: 'sup', SO: 'enroll' });
    expect(s.passed).toBe(2);
    expect(s.enrolled).toBe(1);
    // DDSI y OPT no están marcadas → pendientes
    expect(s.pending).toBe(2);
    expect(s.ectsPassed).toBe(12);
    expect(s.ectsEnrolled).toBe(6);
    expect(s.ectsPending).toBe(12);
    expect(s.ectsTotal).toBe(30);
  });

  it('desglosa por curso', () => {
    const s = summarize(SUBJECTS, { FFT: 'pass', ALEM: 'sup', SO: 'enroll' });
    expect(s.byCourse['1']).toMatchObject({ passed: 2, ectsPassed: 12 });
    expect(s.byCourse['2']).toMatchObject({ enrolled: 1, ectsEnrolled: 6 });
    expect(s.byCourse['3']).toMatchObject({ pending: 1, ectsPending: 6 });
    expect(s.byCourse['4']).toMatchObject({ pending: 1, ectsPending: 6 });
  });

  it('desglosa por cuatrimestre (curso/term)', () => {
    const s = summarize(SUBJECTS, { FFT: 'pass', ALEM: 'sup', SO: 'enroll' });
    expect(s.byTerm['1/1']).toMatchObject({ course: 1, term: 1, passed: 2, ectsPassed: 12 });
    expect(s.byTerm['2/1']).toMatchObject({ course: 2, term: 1, enrolled: 1 });
    expect(s.byTerm['4/2']).toMatchObject({ course: 4, term: 2, pending: 1 });
  });

  it('funciona con el formato canónico code/ects/course/term', () => {
    const canonical = SUBJECTS.map((s) => ({
      code: s.codigo,
      ects: s.creditos,
      course: s.curso,
      term: s.cuatrimestre,
    }));
    const s = summarize(canonical, { FFT: 'pass', ALEM: 'sup', SO: 'enroll' });
    expect(s.ectsPassed).toBe(12);
    expect(s.byCourse['1'].passed).toBe(2);
  });

  it('trata estados inválidos como pendientes', () => {
    const s = summarize(SUBJECTS, { FFT: 'aprobada' });
    expect(s.passed).toBe(0);
    expect(s.pending).toBe(5);
  });

  it('vacío sin subjects ni credits', () => {
    const s = summarize([], {});
    expect(s.ectsTotal).toBe(0);
    expect(s.byCourse).toEqual({});
  });
});

describe('projectDegree', () => {
  it('calcula ECTS restantes y cuatrimestres a 30 ECTS', () => {
    const p = projectDegree(SUBJECTS, { FFT: 'pass', ALEM: 'sup', SO: 'pass' }, { totalECTS: 240 });
    expect(p.passedECTS).toBe(18);
    expect(p.remainingECTS).toBe(222);
    expect(p.termsRemaining).toBe(8); // ceil(222/30)
  });

  it('todos los ECTS del plan superados → grado cerrado', () => {
    const all = Object.fromEntries(SUBJECTS.map((s) => [s.codigo, 'pass']));
    const p = projectDegree(SUBJECTS, all, { totalECTS: 30 });
    expect(p.remainingECTS).toBe(0);
    expect(p.termsRemaining).toBe(0);
  });

  it('los créditos en curso no cuentan como superados', () => {
    const p = projectDegree(SUBJECTS, { FFT: 'enroll', ALEM: 'enroll' }, { totalECTS: 240 });
    expect(p.passedECTS).toBe(0);
    expect(p.remainingECTS).toBe(240);
  });

  it('clamp a 0 si se supera el total del plan', () => {
    const all = Object.fromEntries(SUBJECTS.map((s) => [s.codigo, 'pass']));
    const p = projectDegree(SUBJECTS, all, { totalECTS: 12 });
    expect(p.remainingECTS).toBe(0);
    expect(p.termsRemaining).toBe(0);
  });

  it('default 240 ECTS si el plan no lo declara', () => {
    const p = projectDegree(SUBJECTS, { FFT: 'pass' }, {});
    expect(p.totalECTS).toBe(240);
    expect(p.remainingECTS).toBe(234);
  });
});

describe('mapEquivalences', () => {
  it('normaliza el formato CONVALIDACIONES (uned/ugr/creditos)', () => {
    const { mappings, orphans } = mapEquivalences(
      [{ uned: { codigo: '011013' }, ugr: { codigo: 'FFT' }, creditos: 6, origen: 'UNED' }],
      SUBJECTS,
    );
    expect(mappings).toHaveLength(1);
    expect(orphans).toHaveLength(0);
    expect(mappings[0]).toMatchObject({
      from: { code: '011013' },
      to: { code: 'FFT' },
      ects: 6,
      source: 'uned',
    });
  });

  it('normaliza el formato de mappings de propuestas (cursada/reconocida)', () => {
    const { mappings } = mapEquivalences(
      [{ cursadaCodigo: '901020', reconocidaCodigo: 'FP', creditos: 6 }],
      [...SUBJECTS, { codigo: 'FP', creditos: 6, curso: 1, cuatrimestre: 1 }],
    );
    expect(mappings[0]).toMatchObject({ from: { code: '901020' }, to: { code: 'FP' }, ects: 6 });
  });

  it('detecta equivalencias huérfanas (código UGR inexistente)', () => {
    const { mappings, orphans } = mapEquivalences(
      [
        { uned: { codigo: '011013' }, ugr: { codigo: 'FFT' }, creditos: 6 },
        { cursadaCodigo: '901072', reconocidaCodigo: '21', creditos: 6 },
      ],
      SUBJECTS,
    );
    expect(mappings).toHaveLength(1);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].to.code).toBe('21');
    expect(orphans[0].reason).toContain('21');
  });

  it('etiqueta la source como gs cuando el origen es Grado Superior', () => {
    const { mappings } = mapEquivalences(
      [{ uned: { codigo: 'X' }, ugr: { codigo: 'FFT' }, creditos: 6, origen: 'GS' }],
      SUBJECTS,
    );
    expect(mappings[0].source).toBe('gs');
  });
});
