import { describe, it, expect, beforeAll, vi } from "vitest";

// commands.js y db.js se mockean: el módulo kernel no puede tocar IndexedDB en
// node. El mock de commands usa el reducer real para que setStatus/getStatus
// ejerciten el contrato progress/setStatus de verdad.
vi.mock("../../public/ugr/src/store/db.js", () => ({
  open: vi.fn(() => Promise.resolve({ ok: true })),
  isAvailable: vi.fn(() => true),
  getStoreMode: vi.fn(() => "ready"),
  get: vi.fn(() => Promise.resolve(undefined)),
  put: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
  getAll: vi.fn(() => Promise.resolve([])),
  byIndex: vi.fn(() => Promise.resolve([])),
  transact: vi.fn((_stores, fn) => fn()),
  close: vi.fn(),
  stats: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("../../public/ugr/src/store/commands.js", async () => {
  const { reducer, initialState } = await vi.importActual("../../public/ugr/src/store/reducer.js");
  let state = initialState;
  const subs = new Set();
  return {
    getState: () => state,
    dispatch: (cmd) => {
      const ns = reducer(state, cmd);
      if (ns !== state) {
        state = ns;
        for (const h of subs) h(state);
      }
    },
    subscribe: (h) => {
      subs.add(h);
      return () => subs.delete(h);
    },
    initStore: async () => state,
    flush: async () => {},
    getDeviceId: () => "test-device",
  };
});

import { registerModule, startAll } from "../../public/ugr/src/kernel/registry.js";
import { bus } from "../../public/ugr/src/kernel/bus.js";
import { registerProgress } from "../../public/ugr/src/modules/progress.js";
import { getState, dispatch } from "../../public/ugr/src/store/commands.js";

const SUBJECTS = [
  { codigo: 'FFT', creditos: 6, curso: 1, cuatrimestre: 1 },
  { codigo: 'ALEM', creditos: 6, curso: 1, cuatrimestre: 1 },
  { codigo: 'SO', creditos: 6, curso: 2, cuatrimestre: 1 },
  { codigo: 'OPT', creditos: 6, curso: 'Opt', cuatrimestre: 2 },
];

let api;

beforeAll(async () => {
  // progress requiere store@^1: se registra el mismo contrato que en bootstrap.
  registerModule({
    id: "store",
    version: "1.0.0",
    api: {},
    requires: [],
    publishes: ["store:changed"],
    subscribes: [],
  });
  api = registerProgress();
  await startAll(bus);
});

describe("módulo progress: api", () => {
  it('getStatus devuelve null para asignaturas sin marcar', () => {
    expect(api.getStatus('FFT')).toBeNull();
  });

  it('setStatus escribe en el store y getStatus lo lee', () => {
    expect(api.setStatus('FFT', 'sup')).toBe(true);
    expect(api.getStatus('FFT')).toBe('sup');
    expect(getState().progress.credits.FFT).toBe('sup');
  });

  it('setStatus rechaza estados inválidos sin tocar el store', () => {
    const rev = getState().rev;
    expect(api.setStatus('SO', 'aprobada')).toBe(false);
    expect(getState().rev).toBe(rev);
  });

  it('getPassedCodes solo devuelve sup/pass', () => {
    api.setStatus('ALEM', 'pass');
    api.setStatus('SO', 'enroll');
    expect(api.getPassedCodes().sort()).toEqual(['ALEM', 'FFT']);
  });

  it('getSummary refleja los créditos', () => {
    const s = api.getSummary(SUBJECTS);
    expect(s.passed).toBe(2);
    expect(s.ectsPassed).toBe(12);
    expect(s.enrolled).toBe(1);
    expect(s.pending).toBe(1);
  });

  it('projectDegree calcula la proyección sobre plan.totalECTS', () => {
    const p = api.projectDegree(SUBJECTS);
    expect(p.totalECTS).toBe(240);
    expect(p.passedECTS).toBe(12);
    expect(p.remainingECTS).toBe(228);
    expect(p.termsRemaining).toBe(Math.ceil(228 / 30));
  });

  it('mapEquivalences normaliza y detecta huérfanas', () => {
    dispatch({
      type: 'progress/setMapping',
      payload: {
        mappings: [
          { uned: { codigo: '011013' }, ugr: { codigo: 'FFT' }, creditos: 6, origen: 'UNED' },
          { cursadaCodigo: '901072', reconocidaCodigo: '21', creditos: 6 },
        ],
      },
    });
    const { mappings, orphans } = api.mapEquivalences(SUBJECTS);
    expect(mappings).toHaveLength(1);
    expect(mappings[0]).toMatchObject({ from: { code: '011013' }, to: { code: 'FFT' }, ects: 6 });
    expect(orphans).toHaveLength(1);
    expect(orphans[0].to.code).toBe('21');
  });
});

describe("módulo progress: eventos", () => {
  it('reemite progress:changed cuando cambia el progreso', () => {
    const events = [];
    const off = bus.on('progress:changed', (env) => events.push(env.payload));
    api.setStatus('OPT', 'pending');
    off();
    expect(events).toHaveLength(1);
    expect(events[0].rev).toBe(getState().rev);
  });

  it('no reemite en cambios ajenos al progreso', () => {
    const events = [];
    const off = bus.on('progress:changed', (env) => events.push(env.payload));
    dispatch({ type: 'profile/setApellido', payload: { apellido: 'Test' } });
    off();
    expect(events).toHaveLength(0);
  });
});
