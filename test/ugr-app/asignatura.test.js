import { describe, it, expect } from 'vitest';
import { buildAsignaturaFicha } from '../../public/ugr/src/app/domain/asignatura.js';

// La dificultad y la descripción son de la **asignatura** y van por modalidad
// (teoría y prácticas pueden diferir). El catálogo las trae como
// `dificultad: { teoria, practicas }` y `descripcion: { teoria, practicas }`.

describe('buildAsignaturaFicha', () => {
  it('separa dificultad y descripción por modalidad', () => {
    const ficha = buildAsignaturaFicha({
      codigo: 'SO',
      nombre: 'Sistemas Operativos',
      curso: 3,
      cuatrimestre: 1,
      creditos: 6,
      caracter: 'Obligatoria',
      mencion: 'Común',
      dificultad: { teoria: 'rojo', practicas: 'naranja' },
      descripcion: { teoria: 'Teoría densa', practicas: 'Prácticas en laboratorio' },
    });

    expect(ficha.codigo).toBe('SO');
    expect(ficha.dificultades).toEqual([
      { modalidad: 'Teoría', clave: 'rojo' },
      { modalidad: 'Prácticas', clave: 'naranja' },
    ]);
    expect(ficha.descripciones).toEqual([
      { modalidad: 'Teoría', texto: 'Teoría densa' },
      { modalidad: 'Prácticas', texto: 'Prácticas en laboratorio' },
    ]);
  });

  it('con una sola modalidad devuelve solo esa', () => {
    const ficha = buildAsignaturaFicha({
      codigo: 'X',
      dificultad: { practicas: 'amarillo' },
      descripcion: { practicas: 'Solo prácticas' },
    });
    expect(ficha.dificultades).toEqual([{ modalidad: 'Prácticas', clave: 'amarillo' }]);
    expect(ficha.descripciones).toEqual([{ modalidad: 'Prácticas', texto: 'Solo prácticas' }]);
  });

  it('sin dificultad ni descripción devuelve las listas vacías (muestra)', () => {
    const ficha = buildAsignaturaFicha({ codigo: 'FFT', nombre: 'Fundamentos Físicos' });
    expect(ficha.dificultades).toEqual([]);
    expect(ficha.descripciones).toEqual([]);
  });

  it('ignora descripciones vacías o en blanco', () => {
    const ficha = buildAsignaturaFicha({
      codigo: 'X',
      dificultad: { teoria: 'verde' },
      descripcion: { teoria: '   ', practicas: '' },
    });
    expect(ficha.dificultades).toEqual([{ modalidad: 'Teoría', clave: 'verde' }]);
    expect(ficha.descripciones).toEqual([]);
  });

  it('tolera una asignatura ausente o parcial', () => {
    expect(buildAsignaturaFicha().codigo).toBe('');
    expect(buildAsignaturaFicha(null)).toMatchObject({
      nombre: '',
      curso: 0,
      cuatrimestre: 0,
      creditos: 0,
      caracter: '',
      mencion: '',
    });
    expect(buildAsignaturaFicha({ codigo: 'X', curso: '3', creditos: '6' })).toMatchObject({
      curso: 3,
      creditos: 6,
    });
  });
});
