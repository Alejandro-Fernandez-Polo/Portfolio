import { describe, it, expect } from 'vitest';

import { reducer } from '../../public/ugr/src/store/reducer.js';

// La pestaña de datos se llamó `asignaturas`: el store traduce ese nombre para
// que un estado guardado antes del cambio no deje la vista en blanco.

const setView = (view) => ({ type: 'ui/setView', payload: { view } });

describe('reducer: ui/setView', () => {
  it('traduce el nombre antiguo de la pestaña de datos', () => {
    expect(reducer(null, setView('asignaturas')).ui.view).toBe('datos');
  });

  it('deja pasar los nombres válidos tal cual', () => {
    expect(reducer(null, setView('datos')).ui.view).toBe('datos');
    expect(reducer(null, setView('horario')).ui.view).toBe('horario');
    expect(reducer(null, setView('progreso')).ui.view).toBe('progreso');
  });
});
