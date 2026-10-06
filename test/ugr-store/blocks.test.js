import { describe, it, expect } from 'vitest';
import { initialState, reducer } from '../../public/ugr/src/store/reducer.js';

const addBlock = (payload) => ({ type: 'blocks/add', payload });
const removeBlock = (index) => ({ type: 'blocks/remove', payload: { index } });
const setAllBlocks = (blocks) => ({ type: 'blocks/setAll', payload: { blocks } });

describe('reducer: estado inicial blocks', () => {
  it('declara blocks como array vacío', () => {
    expect(initialState.blocks).toEqual([]);
  });
});

describe('reducer: blocks/add', () => {
  it('añade un bloqueo de tipo subject', () => {
    const s = reducer(null, addBlock({ type: 'subject', codigo: 'FFT', letra: 'A' }));
    expect(s.blocks).toHaveLength(1);
    expect(s.blocks[0]).toEqual({ type: 'subject', codigo: 'FFT', letra: 'A' });
    expect(s.rev).toBe(1);
  });

  it('añade un bloqueo de tipo subject-only', () => {
    const s = reducer(null, addBlock({ type: 'subject-only', codigo: 'SO' }));
    expect(s.blocks).toHaveLength(1);
    expect(s.blocks[0]).toEqual({ type: 'subject-only', codigo: 'SO' });
  });

  it('añade un bloqueo de tipo curso', () => {
    const s = reducer(null, addBlock({ type: 'curso', curso: 1, letra: 'B' }));
    expect(s.blocks).toHaveLength(1);
    expect(s.blocks[0]).toEqual({ type: 'curso', curso: 1, letra: 'B' });
  });

  it('rechaza entradas inválidas (misma referencia)', () => {
    const s0 = reducer(null, addBlock({ type: 'subject', codigo: 'FFT', letra: 'A' }));
    const s1 = reducer(s0, addBlock({ type: 'invalid' }));
    expect(s1).toBe(s0);
  });

  it('rechaza entradas con campos faltantes', () => {
    const s0 = reducer(null, addBlock({ type: 'subject', codigo: 'FFT' }));
    expect(s0.blocks).toHaveLength(0);
  });

  it('normaliza curso a número', () => {
    const s = reducer(null, addBlock({ type: 'curso', curso: '2', letra: 'A' }));
    expect(s.blocks[0].curso).toBe(2);
  });
});

describe('reducer: blocks/remove', () => {
  it('elimina un bloqueo por índice', () => {
    const s0 = reducer(null, addBlock({ type: 'subject', codigo: 'FFT', letra: 'A' }));
    const s1 = reducer(s0, addBlock({ type: 'subject-only', codigo: 'SO' }));
    const s2 = reducer(s1, removeBlock(0));
    expect(s2.blocks).toHaveLength(1);
    expect(s2.blocks[0].codigo).toBe('SO');
  });

  it('ignora índices fuera de rango', () => {
    const s0 = reducer(null, addBlock({ type: 'subject', codigo: 'FFT', letra: 'A' }));
    const s1 = reducer(s0, removeBlock(5));
    expect(s1).toBe(s0);
  });

  it('ignora índices negativos', () => {
    const s0 = reducer(null, addBlock({ type: 'subject', codigo: 'FFT', letra: 'A' }));
    const s1 = reducer(s0, removeBlock(-1));
    expect(s1).toBe(s0);
  });

  it('ignora índices no enteros', () => {
    const s0 = reducer(null, addBlock({ type: 'subject', codigo: 'FFT', letra: 'A' }));
    const s1 = reducer(s0, removeBlock('0'));
    expect(s1).toBe(s0);
  });
});

describe('reducer: blocks/setAll', () => {
  it('reemplaza todos los bloqueos', () => {
    const s0 = reducer(null, addBlock({ type: 'subject', codigo: 'FFT', letra: 'A' }));
    const s1 = reducer(s0, setAllBlocks([
      { type: 'subject-only', codigo: 'SO' },
      { type: 'curso', curso: 2, letra: 'B' },
    ]));
    expect(s1.blocks).toHaveLength(2);
    expect(s1.blocks[0].codigo).toBe('SO');
    expect(s1.blocks[1].curso).toBe(2);
  });

  it('filtra entradas inválidas del payload', () => {
    const s = reducer(null, setAllBlocks([
      { type: 'subject', codigo: 'FFT', letra: 'A' },
      { type: 'invalid' },
      { type: 'subject-only', codigo: 'SO' },
    ]));
    expect(s.blocks).toHaveLength(2);
  });

  it('ignora payload no array', () => {
    const s0 = reducer(null, addBlock({ type: 'subject', codigo: 'FFT', letra: 'A' }));
    const s1 = reducer(s0, setAllBlocks(null));
    expect(s1).toBe(s0);
  });

  it('ignora payload ausente', () => {
    const s0 = reducer(null, addBlock({ type: 'subject', codigo: 'FFT', letra: 'A' }));
    const s1 = reducer(s0, { type: 'blocks/setAll' });
    expect(s1).toBe(s0);
  });
});

describe('reducer: idempotencia blocks', () => {
  it('repetir blocks/add con la misma entrada añade duplicados (comportamiento actual)', () => {
    // El reducer no deduplica: la semántica de "mismo bloqueo" es responsabilidad
    // del caller. Este test documenta ese comportamiento.
    const s0 = reducer(null, addBlock({ type: 'subject', codigo: 'FFT', letra: 'A' }));
    const s1 = reducer(s0, addBlock({ type: 'subject', codigo: 'FFT', letra: 'A' }));
    expect(s1.blocks).toHaveLength(2);
  });

  it('blocks/remove en array vacío es no-op', () => {
    const s0 = reducer(null, { type: 'blocks/remove', payload: { index: 0 } });
    expect(s0.blocks).toEqual([]);
  });
});
