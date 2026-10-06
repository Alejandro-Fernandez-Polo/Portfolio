import { describe, it, expect } from 'vitest';
import { createCalendarView } from '../../public/ugr/src/app/features/calendar.js';

// Caracterización de la vista del calendario (B3-c controles + B3-d renders):
// fijan el comportamiento legacy (claves de storage, aria-pressed, guard de
// nodos ausentes, etiquetas accesibles y horas ocupadas) y, sobre todo, la
// idempotencia de mount()/destroy() — sin ella un `init()` repetido
// duplicaría los listeners de los botones estáticos.
// DOM falso mínimo (nada de jsdom) + storage falsa: entorno node.

/** Botón/nodo falso con el subconjunto de DOM que usa el feature. */
function makeEl(id) {
  const el = {
    id,
    hidden: false,
    style: {},
    attributes: {},
    classes: new Set(),
    listeners: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    addEventListener(type, handler) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      const handlers = this.listeners[type];
      if (!handlers) return;
      const index = handlers.indexOf(handler);
      if (index !== -1) handlers.splice(index, 1);
    },
    /** Dispara el evento como haría el navegador (copia defensiva). */
    fire(type) {
      const handlers = (this.listeners[type] || []).slice();
      handlers.forEach(handler => handler({ type, target: this }));
    },
    listenerCount(type) {
      return (this.listeners[type] || []).length;
    },
  };
  el.classList = {
    toggle(name, force) {
      const next = force === undefined ? !el.classes.has(name) : !!force;
      if (next) el.classes.add(name);
      else el.classes.delete(name);
      return next;
    },
    contains: name => el.classes.has(name),
  };
  return el;
}

/** Storage falsa sobre Map, misma interfaz que `localStorage`. */
function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    dump: () => Object.fromEntries(map),
  };
}

/** Constantes de rejilla idénticas a las legacy del IIFE (`DAYS`/`DAY_LABELS`). */
const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
const DAY_LABELS = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
};

/**
 * Monta el feature con los 5 nodos del calendario y deps mínimas falsas
 * (horario vacío, sin conflictos, sin dificultad) — suficientes para que los
 * renders internos corran en node sin jsdom. `overrides` sustituye cualquier
 * dep por caso concreto.
 */
function setup({ storage = makeStorage(), nodes = defaultNodes(), overrides = {} } = {}) {
  const document = { getElementById: id => nodes[id] || null };
  const deps = {
    document,
    window: { innerWidth: 1024, innerHeight: 768 },
    storage,
    getState: () => ({ groupChoices: {} }),
    getSubjects: () => [],
    getConflicts: () => [],
    getActiveSchedule: () => [],
    days: DAYS,
    dayLabels: DAY_LABELS,
    startHour: 8,
    endHour: 21,
    getDificultad: () => null,
    getDificultadLabel: d => `Nivel ${d}`,
    getDificultadColor: () => '#333',
    getProfName: () => '',
    ...overrides,
  };
  const feature = createCalendarView(deps);
  return { feature, storage, nodes, deps };
}

function defaultNodes() {
  return {
    calendar: makeEl('calendar'),
    'calendar-list': makeEl('calendar-list'),
    'btn-view-week': makeEl('btn-view-week'),
    'btn-view-list': makeEl('btn-view-list'),
    'btn-view-compact': makeEl('btn-view-compact'),
  };
}

describe('createCalendarView — getView', () => {
  it("devuelve 'week' por defecto y 'list' solo si está persistido", () => {
    expect(setup().feature.getView()).toBe('week');
    expect(
      setup({ storage: makeStorage({ 'ugr-calendar-view': 'list' }) }).feature.getView()
    ).toBe('list');
    expect(
      setup({ storage: makeStorage({ 'ugr-calendar-view': 'basura' }) }).feature.getView()
    ).toBe('week');
  });
});

describe('createCalendarView — applyView', () => {
  it("setView('list') persiste, oculta la rejilla, muestra la lista, pinta aria-pressed y renderiza la lista", () => {
    const { feature, storage, nodes } = setup();

    feature.setView('list');

    expect(storage.getItem('ugr-calendar-view')).toBe('list');
    expect(nodes.calendar.hidden).toBe(true);
    expect(nodes['calendar-list'].hidden).toBe(false);
    expect(nodes['btn-view-week'].attributes['aria-pressed']).toBe('false');
    expect(nodes['btn-view-list'].attributes['aria-pressed']).toBe('true');
    // El renderList YA NO se inyecta: applyView pinta la lista internamente.
    expect(nodes['calendar-list'].innerHTML).toContain('cal-list-table');
    expect(nodes['calendar-list'].innerHTML).toContain('Sin sesiones este día');
    // applyView termina SIEMPRE aplicando el compacto (la lista oculta el botón)
    expect(nodes['btn-view-compact'].hidden).toBe(true);
  });

  it("vuelve a 'week' y restaura la rejilla sin re-renderizar la lista", () => {
    const { feature, nodes } = setup({
      storage: makeStorage({ 'ugr-calendar-view': 'list' }),
    });

    feature.setView('week');

    expect(nodes.calendar.hidden).toBe(false);
    expect(nodes['calendar-list'].hidden).toBe(true);
    expect(nodes['btn-view-week'].attributes['aria-pressed']).toBe('true');
    expect(nodes['btn-view-list'].attributes['aria-pressed']).toBe('false');
    expect(nodes['calendar-list'].innerHTML).toBeUndefined();
    expect(nodes['btn-view-compact'].hidden).toBe(false);
  });

  it('no lanza si falta algún nodo (guard legacy)', () => {
    const nodes = defaultNodes();
    delete nodes['btn-view-list'];
    const { feature } = setup({ nodes });

    expect(() => feature.applyView()).not.toThrow();
    expect(nodes['calendar-list'].innerHTML).toBeUndefined();
  });
});

describe('createCalendarView — compacto', () => {
  it('applyCompact alterna is-compact y el aria-pressed del botón', () => {
    const { feature, nodes } = setup();

    feature.applyCompact();
    expect(nodes.calendar.classList.contains('is-compact')).toBe(false);
    expect(nodes['btn-view-compact'].attributes['aria-pressed']).toBe('false');

    feature.setCompact(true);
    expect(nodes.calendar.classList.contains('is-compact')).toBe(true);
    expect(nodes['btn-view-compact'].attributes['aria-pressed']).toBe('true');
  });

  it("setCompact(true) persiste '1' y setCompact(false) '0'", () => {
    const { feature, storage } = setup();

    feature.setCompact(true);
    expect(storage.getItem('ugr-calendar-compact')).toBe('1');
    expect(feature.isCompact()).toBe(true);

    feature.setCompact(false);
    expect(storage.getItem('ugr-calendar-compact')).toBe('0');
    expect(feature.isCompact()).toBe(false);
  });

  it('en vista lista el botón de compacto queda oculto', () => {
    const { feature, nodes } = setup();

    feature.setCompact(true);
    expect(nodes['btn-view-compact'].hidden).toBe(false);

    feature.setView('list');
    expect(nodes['btn-view-compact'].hidden).toBe(true);
  });
});

describe('createCalendarView — mount/destroy', () => {
  it('mount() dos veces no duplica listeners en ningún botón', () => {
    const { feature, nodes } = setup();

    feature.mount();
    feature.mount();

    expect(nodes['btn-view-week'].listenerCount('click')).toBe(1);
    expect(nodes['btn-view-list'].listenerCount('click')).toBe(1);
    expect(nodes['btn-view-compact'].listenerCount('click')).toBe(1);
  });

  it('los handlers montados cambian la vista y alternan el compacto', () => {
    const { feature, nodes } = setup();
    feature.mount();

    nodes['btn-view-list'].fire('click');
    expect(feature.getView()).toBe('list');

    nodes['btn-view-week'].fire('click');
    expect(feature.getView()).toBe('week');

    nodes['btn-view-compact'].fire('click');
    expect(feature.isCompact()).toBe(true);
  });

  it('destroy() retira los listeners (los clicks ya no hacen nada) y es seguro repetirlo', () => {
    const { feature, nodes } = setup();
    feature.mount();

    feature.destroy();
    feature.destroy();

    expect(nodes['btn-view-week'].listenerCount('click')).toBe(0);
    expect(nodes['btn-view-list'].listenerCount('click')).toBe(0);
    expect(nodes['btn-view-compact'].listenerCount('click')).toBe(0);

    nodes['btn-view-list'].fire('click');
    expect(feature.getView()).toBe('week');
  });

  it('tras destroy() se puede volver a montar sin duplicar', () => {
    const { feature, nodes } = setup();
    feature.mount();
    feature.destroy();
    feature.mount();

    expect(nodes['btn-view-week'].listenerCount('click')).toBe(1);
    expect(nodes['btn-view-list'].listenerCount('click')).toBe(1);
    expect(nodes['btn-view-compact'].listenerCount('click')).toBe(1);
  });

  it('mount() con nodos ausentes no lanza ni deja listeners colgando', () => {
    const nodes = { calendar: makeEl('calendar') };
    const { feature } = setup({ nodes });

    expect(() => feature.mount()).not.toThrow();
    expect(() => feature.destroy()).not.toThrow();
  });
});

// ─── B3-d: etiqueta accesible y horas ocupadas ───────────────

describe('createCalendarView — buildEventLabel', () => {
  const entry = {
    codigo: 'MAT',
    nombre: 'Matemáticas I',
    tipo: 'Teoría',
    grupo: 'A',
    dia: 'lunes',
    inicio: '09:00',
    fin: '10:00',
    letra: 'A',
  };

  it('compone código, tipo, día en minúsculas, horario y grupo sin dificultad ni conflicto', () => {
    const { feature } = setup();

    expect(feature.buildEventLabel(entry, false)).toBe(
      'MAT — Teoría, lunes 09:00–10:00, A'
    );
  });

  it('añade la dificultad del profesor cuando la hay (día con tilde desde dayLabels)', () => {
    const { feature } = setup({ overrides: { getDificultad: () => 3 } });

    expect(feature.buildEventLabel({ ...entry, dia: 'miercoles' }, false)).toBe(
      'MAT — Teoría, miércoles 09:00–10:00, A, dificultad del profesor: Nivel 3'
    );
  });

  it('omite la dificultad si la entrada no tiene letra (aunque getDificultad devuelva dato)', () => {
    const { feature } = setup({ overrides: { getDificultad: () => 3 } });
    const sinLetra = { ...entry };
    delete sinLetra.letra;

    expect(feature.buildEventLabel(sinLetra, false)).toBe(
      'MAT — Teoría, lunes 09:00–10:00, A'
    );
  });

  it('marca el conflicto como sufijo final del label', () => {
    const { feature } = setup();

    expect(feature.buildEventLabel(entry, true)).toBe(
      'MAT — Teoría, lunes 09:00–10:00, A, en conflicto: solape de horario'
    );
  });
});

describe('createCalendarView — getBusyHours', () => {
  it('acumula cada hora entera que toca una sesión dentro de rango', () => {
    const { feature } = setup();

    const busy = feature.getBusyHours([{ dia: 'lunes', inicio: '09:00', fin: '11:00' }]);

    expect([...busy]).toEqual([9, 10]);
  });

  it('la hora de fin es exclusiva salvo el corte de media hora (20:30–21:00 → solo la 20)', () => {
    const { feature } = setup();

    const busy = feature.getBusyHours([{ dia: 'viernes', inicio: '20:30', fin: '21:00' }]);

    expect([...busy]).toEqual([20]);
  });

  it('ignora las entradas cuyo día no está en days', () => {
    const { feature } = setup();

    expect(
      feature.getBusyHours([{ dia: 'sabado', inicio: '09:00', fin: '10:00' }]).size
    ).toBe(0);
  });

  it('ignora las sesiones fuera del rango de horas (antes de startHour y desde endHour)', () => {
    const { feature } = setup();

    expect(
      feature.getBusyHours([{ dia: 'lunes', inicio: '07:00', fin: '08:00' }]).size
    ).toBe(0);
    expect(
      feature.getBusyHours([{ dia: 'lunes', inicio: '21:00', fin: '22:00' }]).size
    ).toBe(0);
  });

  it('mezcla entradas válidas y devuelve el rango correcto (fila 0 y medias horas incluidas)', () => {
    const { feature } = setup();

    const busy = feature.getBusyHours([
      { dia: 'lunes', inicio: '08:30', fin: '09:00' },
      { dia: 'martes', inicio: '12:00', fin: '13:30' },
      { dia: 'sabado', inicio: '10:00', fin: '11:00' },
    ]);

    expect([...busy]).toEqual([8, 12, 13]);
  });
});
