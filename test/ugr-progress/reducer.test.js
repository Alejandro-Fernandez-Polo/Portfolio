import { describe, it, expect } from 'vitest';
import { initialState, reducer } from '../../public/ugr/src/store/reducer.js';
import { STATUS } from '../../public/ugr/src/progress/status.js';

const setStatus = (code, status) => ({ type: 'progress/setStatus', payload: { code, status } });

describe('reducer: estado inicial', () => {
  it('declara progress con la forma canónica', () => {
    expect(initialState.progress).toEqual({
      credits: {},
      equivalences: [],
      plan: { totalECTS: 240 },
      mencion: '',
      fails: {},
    });
  });
});

describe('reducer: progress/setMencion', () => {
  it('guarda la mención elegida y admite volver a «sin decidir»', () => {
    const s0 = reducer(null, { type: 'progress/setMencion', payload: { mencion: 'CSI' } });
    expect(s0.progress.mencion).toBe('CSI');
    expect(s0.rev).toBe(1);
    const s1 = reducer(s0, { type: 'progress/setMencion', payload: { mencion: '' } });
    expect(s1.progress.mencion).toBe('');
    // Repetir la misma mención no toca el estado.
    expect(reducer(s0, { type: 'progress/setMencion', payload: { mencion: 'CSI' } })).toBe(s0);
    // Y un valor que no es texto se ignora.
    expect(reducer(s0, { type: 'progress/setMencion', payload: { mencion: 7 } })).toBe(s0);
  });
});

describe('reducer: progress/setStatus', () => {
  it('aplica un estado válido y sube rev', () => {
    const s = reducer(null, setStatus('FFT', STATUS.CONVALIDADA));
    expect(s.progress.credits.FFT).toBe('pass');
    expect(s.rev).toBe(1);
    expect(s.progress.updatedAt).toBeTruthy();
  });

  it('con estado vacío desmarca la asignatura', () => {
    const s0 = reducer(null, setStatus('FFT', STATUS.SUPERADA));
    const s1 = reducer(s0, setStatus('FFT', ''));
    expect(s1.progress.credits.FFT).toBeUndefined();
    expect(s1.rev).toBe(s0.rev + 1);
    // Desmarcar lo que ya estaba sin marcar no toca el estado.
    expect(reducer(s1, setStatus('FFT', ''))).toBe(s1);
  });

  it('ignora un estado inválido (misma referencia)', () => {
    const s0 = reducer(null, setStatus('FFT', 'pass'));
    const s1 = reducer(s0, setStatus('FFT', 'aprobada'));
    expect(s1).toBe(s0);
    expect(s1.progress.credits.FFT).toBe('pass');
  });

  it('ignora un código vacío', () => {
    const s0 = reducer(null, setStatus('FFT', 'pass'));
    expect(reducer(s0, setStatus('', 'sup'))).toBe(s0);
  });

  it('es idempotente: repetir el mismo estado no toca el estado', () => {
    const s0 = reducer(null, setStatus('FFT', 'pass'));
    const s1 = reducer(s0, setStatus('FFT', 'pass'));
    expect(s1).toBe(s0);
  });

  it('progress/setCredit sigue funcionando como alias', () => {
    const s = reducer(null, { type: 'progress/setCredit', payload: { code: 'SO', status: 'enroll' } });
    expect(s.progress.credits.SO).toBe('enroll');
  });

  it('transiciona de un estado válido a otro', () => {
    const s0 = reducer(null, setStatus('FFT', 'enroll'));
    const s1 = reducer(s0, setStatus('FFT', 'pass'));
    expect(s1.progress.credits.FFT).toBe('pass');
    expect(s1.rev).toBe(s0.rev + 1);
  });
});

describe('reducer: progress/setAll', () => {
  it('fusiona credits sin perder equivalences ni plan', () => {
    const s0 = reducer(null, {
      type: 'progress/setConvalidaciones',
      payload: { items: [{ origenes: [{ nombre: 'Cálculo I (UNED)' }], destinos: [{ codigo: 'FFT' }], creditos: 6 }] },
    });
    const s1 = reducer(s0, { type: 'progress/setAll', payload: { credits: { FFT: 'pass' } } });
    expect(s1.progress.credits.FFT).toBe('pass');
    expect(s1.progress.equivalences).toHaveLength(1);
    expect(s1.progress.plan).toEqual({ totalECTS: 240 });
  });

  it('filtra estados inválidos del payload', () => {
    const s = reducer(null, {
      type: 'progress/setAll',
      payload: { credits: { FFT: 'pass', SO: 'aprobada', DDSI: 'pending' } },
    });
    expect(s.progress.credits).toEqual({ FFT: 'pass', DDSI: 'pending' });
  });

  it('no rompe con payload ausente', () => {
    const s0 = reducer(null, setStatus('FFT', 'pass'));
    expect(reducer(s0, { type: 'progress/setAll' })).toBe(s0);
  });

  it('pisa el plan cuando el payload lo trae', () => {
    const s = reducer(null, { type: 'progress/setAll', payload: { plan: { totalECTS: 270 } } });
    expect(s.progress.plan.totalECTS).toBe(270);
  });
});

describe('reducer: convalidaciones y suspensos', () => {
  // Convalidación canónica mínima: origen + destino. Se usa como base en los casos.
  const convalidacion = (extra = {}) => ({
    origenes: [{ nombre: 'Cálculo I (UNED)' }],
    destinos: [{ codigo: 'CA' }],
    ...extra,
  });

  it('progress/setConvalidaciones reemplaza la lista entera y normaliza los destinos', () => {
    const s0 = reducer(null, {
      type: 'progress/setConvalidaciones',
      payload: { items: [convalidacion({ id: 'c1', creditos: 6, estado: 'aprobada' })] },
    });
    expect(s0.progress.equivalences).toHaveLength(1);
    // El destino se guarda siempre como `{ codigo, nombre }`, aunque falte el nombre.
    expect(s0.progress.equivalences[0].destinos).toEqual([{ codigo: 'CA', nombre: '' }]);
    expect(s0.rev).toBe(1);

    const s1 = reducer(s0, {
      type: 'progress/setConvalidaciones',
      payload: {
        items: [
          { origenes: [{ nombre: 'Bases de datos (UNED)' }], destinos: [{ codigo: 'BD', nombre: 'Bases de Datos' }] },
          // Sin destinos no es una convalidación (le falta una punta): se cae.
          { origenes: [{ nombre: 'Sin destino' }] },
        ],
      },
    });
    // Reemplaza, no acumula: la de `s0` desaparece y la inválida se descarta.
    expect(s1.progress.equivalences).toHaveLength(1);
    expect(s1.progress.equivalences[0].destinos).toEqual([{ codigo: 'BD', nombre: 'Bases de Datos' }]);
    expect(s1.progress.equivalences[0].origenes).toEqual([{ codigo: '', nombre: 'Bases de datos (UNED)' }]);
    // Sin estado explícito queda pendiente.
    expect(s1.progress.equivalences[0].estado).toBe('pendiente');
    expect(s1.rev).toBe(s0.rev + 1);
  });

  it('progress/setConvalidaciones sin `items` conserva la lista previa', () => {
    const s0 = reducer(null, {
      type: 'progress/setConvalidaciones',
      payload: { items: [convalidacion({ id: 'c1' })] },
    });
    // Un payload vacío (o ausente) no destruye datos: se devuelve el mismo estado.
    expect(reducer(s0, { type: 'progress/setConvalidaciones', payload: {} })).toBe(s0);
    expect(reducer(s0, { type: 'progress/setConvalidaciones' })).toBe(s0);
    expect(s0.progress.equivalences).toHaveLength(1);
  });

  it('progress/setEstadoConvalidacion cambia solo la indicada y es idempotente', () => {
    const s0 = reducer(null, {
      type: 'progress/setConvalidaciones',
      payload: {
        items: [
          { id: 'a', ...convalidacion() },
          { id: 'b', origenes: [{ nombre: 'Álgebra (UNED)' }], destinos: [{ codigo: 'AL' }] },
        ],
      },
    });
    const s1 = reducer(s0, { type: 'progress/setEstadoConvalidacion', payload: { id: 'b', estado: 'aprobada' } });
    expect(s1.progress.equivalences.find((c) => c.id === 'b').estado).toBe('aprobada');
    // Las demás se quedan como estaban.
    expect(s1.progress.equivalences.find((c) => c.id === 'a').estado).toBe('pendiente');
    expect(s1.rev).toBe(s0.rev + 1);

    // Mismo estado (o su vocabulario viejo, que se traduce igual) no toca nada.
    expect(reducer(s1, { type: 'progress/setEstadoConvalidacion', payload: { id: 'b', estado: 'aprobada' } })).toBe(s1);
    expect(reducer(s1, { type: 'progress/setEstadoConvalidacion', payload: { id: 'b', estado: 'concedida' } })).toBe(s1);
    // Estado inválido e id inexistente (o ausente) tampoco.
    expect(reducer(s1, { type: 'progress/setEstadoConvalidacion', payload: { id: 'b', estado: 'inventado' } })).toBe(s1);
    expect(reducer(s1, { type: 'progress/setEstadoConvalidacion', payload: { id: 'zzz', estado: 'rechazada' } })).toBe(s1);
    expect(reducer(s1, { type: 'progress/setEstadoConvalidacion', payload: { estado: 'rechazada' } })).toBe(s1);
  });

  it('progress/setFails guarda, borra con 0/negativo/no numérico y acota a 99', () => {
    const s0 = reducer(null, { type: 'progress/setFails', payload: { code: 'FFT', count: 3 } });
    expect(s0.progress.fails).toEqual({ FFT: 3 });
    expect(s0.rev).toBe(1);

    const s1 = reducer(s0, { type: 'progress/setFails', payload: { code: 'SO', count: 2 } });
    expect(s1.progress.fails).toEqual({ FFT: 3, SO: 2 });
    // Repetir el mismo valor no toca el estado.
    expect(reducer(s1, { type: 'progress/setFails', payload: { code: 'SO', count: 2 } })).toBe(s1);
    // 0 y vacío significan «sin suspensos»: se borra la clave, no se guarda un 0.
    expect(reducer(s1, { type: 'progress/setFails', payload: { code: 'SO', count: 0 } }).progress.fails).toEqual({ FFT: 3 });
    // Borrar una clave que no existía tampoco cambia nada.
    expect(reducer(s0, { type: 'progress/setFails', payload: { code: 'AL', count: 0 } })).toBe(s0);
    // Negativo y no numérico se tratan como 0: borran.
    expect(reducer(s1, { type: 'progress/setFails', payload: { code: 'FFT', count: -5 } }).progress.fails).toEqual({ SO: 2 });
    expect(reducer(s1, { type: 'progress/setFails', payload: { code: 'FFT', count: 'muchos' } }).progress.fails).toEqual({ SO: 2 });
    // Por encima de 99 se acota al tope.
    expect(reducer(s1, { type: 'progress/setFails', payload: { code: 'FFT', count: 1000 } }).progress.fails.FFT).toBe(99);
  });

  it('progress/setAll conserva mencion y fails y descarta el formato viejo de convalidación', () => {
    let s0 = reducer(null, { type: 'progress/setMencion', payload: { mencion: 'CSI' } });
    s0 = reducer(s0, { type: 'progress/setFails', payload: { code: 'FFT', count: 2 } });
    expect(s0.progress.mencion).toBe('CSI');
    expect(s0.progress.fails).toEqual({ FFT: 2 });

    const s1 = reducer(s0, {
      type: 'progress/setAll',
      payload: {
        credits: { CA: 'pass' },
        // La tabla vieja del autor (`uned`/`ugr`) ya no se restaura.
        equivalences: [{ uned: { nombre: 'Cálculo I (UNED)' }, ugr: { codigo: 'CA' } }],
      },
    });
    expect(s1.progress.credits.CA).toBe('pass');
    expect(s1.progress.equivalences).toEqual([]);
    // Lo que el payload no trae se conserva, no se pierde.
    expect(s1.progress.mencion).toBe('CSI');
    expect(s1.progress.fails).toEqual({ FFT: 2 });

    // Y lo que sí trae se fusiona con lo previo.
    const s2 = reducer(s1, { type: 'progress/setAll', payload: { fails: { SO: 4 } } });
    expect(s2.progress.fails).toEqual({ FFT: 2, SO: 4 });
    expect(s2.progress.mencion).toBe('CSI');
  });
});

describe('reducer: comandos ajenos', () => {
  it('devuelve el estado sin cambios para un comando desconocido', () => {
    const s0 = reducer(null, setStatus('FFT', 'pass'));
    expect(reducer(s0, { type: 'progress/unknown', payload: {} })).toBe(s0);
  });
});
