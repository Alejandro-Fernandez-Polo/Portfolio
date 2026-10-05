import { describe, it, expect, vi, beforeEach } from 'vitest';

// db.js y commands.js se mockean: buildPayload/applyPlan tocan IndexedDB y el
// store, que en node no existen. Así se prueba solo la lógica del bundle.
vi.mock('../../public/ugr/src/store/db.js', () => ({
  get: vi.fn(),
  getAll: vi.fn(() => Promise.resolve([])),
  put: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
  transact: vi.fn(),
  isAvailable: vi.fn(() => true),
}));

vi.mock('../../public/ugr/src/store/commands.js', () => ({
  getDeviceId: vi.fn(() => 'device-test'),
  applyCommandsInTransaction: vi.fn(() => Promise.resolve()),
}));

import { buildPayload, buildMergePlan, applyPlan } from '../../public/ugr/src/backup/bundle.js';
import * as db from '../../public/ugr/src/store/db.js';
import * as commands from '../../public/ugr/src/store/commands.js';

// buildPayload lee legacyRefs de localStorage (ausente en node).
globalThis.localStorage = { getItem: () => null };

const USER_STATE_WITH_PROGRESS = {
  key: 'current',
  rev: 3,
  progress: {
    credits: { FFT: 'pass', SO: 'sup' },
    equivalences: [],
    plan: { totalECTS: 240 },
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
};

const USER_STATE_WITHOUT_PROGRESS = { key: 'current', rev: 1, progress: undefined };

const TABLE_PROGRESS = {
  credits: { FFT: 'pass', DDSI: 'pending' },
  equivalences: [],
  plan: { totalECTS: 240 },
  updatedAt: '2026-01-01T10:00:00.000Z',
};

function mockGet({ userState, tableProgress }) {
  db.get.mockImplementation((store, key) => {
    if (store === 'userState') return Promise.resolve(userState);
    if (store === 'progress') return Promise.resolve(tableProgress);
    return Promise.resolve(null);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.getAll.mockResolvedValue([]);
  db.isAvailable.mockReturnValue(true);
  // transact ejecuta el callback: así put recibe las acciones no-progreso.
  db.transact.mockImplementation(async (_stores, fn) => fn());
});

describe('buildPayload: progreso', () => {
  it('lee el progreso de userState.progress cuando existe', async () => {
    mockGet({ userState: USER_STATE_WITH_PROGRESS, tableProgress: TABLE_PROGRESS });
    const payload = await buildPayload();
    expect(payload.progress).toBe(USER_STATE_WITH_PROGRESS.progress);
    expect(db.get).not.toHaveBeenCalledWith('progress', 'main');
  });

  it('fallback a la tabla progress (key main) si userState no la trae', async () => {
    mockGet({ userState: USER_STATE_WITHOUT_PROGRESS, tableProgress: TABLE_PROGRESS });
    const payload = await buildPayload();
    expect(payload.progress).toEqual(TABLE_PROGRESS);
    expect(db.get).toHaveBeenCalledWith('progress', 'main');
  });
});

describe('buildMergePlan: progreso', () => {
  it('merge: gana el incoming más reciente', () => {
    const current = { progress: { credits: { FFT: 'pass' }, updatedAt: '2026-01-01T00:00:00.000Z' } };
    const incoming = { progress: { credits: { SO: 'sup' }, updatedAt: '2026-06-01T00:00:00.000Z' } };
    const plan = buildMergePlan(current, incoming, 'merge');
    const action = plan.actions.find((a) => a.section === 'progress');
    expect(action).toEqual({ section: 'progress', action: 'replace', data: incoming.progress });
  });

  it('merge: con incoming más antiguo, une credits (incoming gana por código)', () => {
    const current = {
      progress: { credits: { FFT: 'pass', DDSI: 'pending' }, equivalences: [{ from: { code: 'A' }, to: { code: 'FFT' }, ects: 6 }], updatedAt: '2026-06-01T00:00:00.000Z' },
    };
    const incoming = { progress: { credits: { FFT: 'sup', SO: 'enroll' }, updatedAt: '2026-01-01T00:00:00.000Z' } };
    const plan = buildMergePlan(current, incoming, 'merge');
    const action = plan.actions.find((a) => a.section === 'progress');
    expect(action.data.credits).toEqual({ FFT: 'sup', DDSI: 'pending', SO: 'enroll' });
    expect(action.data.equivalences).toHaveLength(1);
  });

  it('merge: sin fechas, une credits sin perder claves', () => {
    // Sin updatedAt en ninguno de los dos lados no hay ganador por fecha:
    // el plan debe ser la unión de ambos maps de credits.
    const current = { progress: { credits: { FFT: 'pass', DDSI: 'pending' }, plan: { totalECTS: 240 } } };
    const incoming = { progress: { credits: { SO: 'sup', FFT: 'sup' }, plan: { totalECTS: 240 } } };
    const plan = buildMergePlan(current, incoming, 'merge');
    const action = plan.actions.find((a) => a.section === 'progress');
    // Ninguna clave se pierde y, en empate por código, gana el incoming.
    expect(action.data.credits).toEqual({ FFT: 'sup', DDSI: 'pending', SO: 'sup' });
    expect(action.data.plan).toEqual({ totalECTS: 240 });
  });

  it('merge: sin incoming no hay acción de progreso', () => {
    const plan = buildMergePlan({ progress: TABLE_PROGRESS }, {}, 'merge');
    expect(plan.actions.find((a) => a.section === 'progress')).toBeUndefined();
  });

  it('replace: el progreso incoming se reemplaza entero', () => {
    const plan = buildMergePlan({ progress: TABLE_PROGRESS }, { progress: USER_STATE_WITH_PROGRESS.progress }, 'replace');
    const action = plan.actions.find((a) => a.section === 'progress');
    expect(action).toEqual({ section: 'progress', action: 'replace', data: USER_STATE_WITH_PROGRESS.progress });
  });
});

describe('applyPlan: progreso', () => {
  it('vuelca el progreso a userState vía comandos, nunca a la tabla progress', async () => {
    const progressData = { credits: { FFT: 'pass' }, equivalences: [], plan: { totalECTS: 240 } };
    await applyPlan({
      actions: [
        { section: 'progress', action: 'replace', data: progressData },
        { section: 'configs', action: 'upsert', data: { id: 1 } },
      ],
    });
    expect(commands.applyCommandsInTransaction).toHaveBeenCalledWith([
      { type: 'progress/setAll', payload: progressData },
    ]);
    const progressPuts = db.put.mock.calls.filter(([store]) => store === 'progress');
    expect(progressPuts).toHaveLength(0);
    // las acciones ajenas al progreso sí se escriben en su store
    expect(db.put).toHaveBeenCalledWith('configs', { id: 1 });
  });

  it('convierte acciones upsert de progreso en progress/setStatus', async () => {
    await applyPlan({
      actions: [{ section: 'progress', action: 'upsert', data: { code: 'SO', status: 'enroll' } }],
    });
    expect(commands.applyCommandsInTransaction).toHaveBeenCalledWith([
      { type: 'progress/setStatus', payload: { code: 'SO', status: 'enroll' } },
    ]);
  });

  it('sin acciones de progreso no toca el store de comandos', async () => {
    await applyPlan({ actions: [{ section: 'reviews', action: 'upsert', data: { docentKey: 'K' } }] });
    expect(commands.applyCommandsInTransaction).not.toHaveBeenCalled();
  });
});

// Round-trip completo del progreso: lo que exporta un dispositivo (buildPayload)
// se fusiona contra el estado local (buildMergePlan) y se aplica (applyPlan)
// sin escribir nunca en la tabla suelta `progress` (single-writer: userState).
describe('round-trip: buildPayload → buildMergePlan → applyPlan', () => {
  it('conserva el progreso importado vía comandos y jamás usa put("progress")', async () => {
    // Dispositivo remoto: su userState (con progreso) es lo que viaja en el bundle.
    const remoteUserState = {
      key: 'current',
      rev: 7,
      progress: {
        credits: { FFT: 'sup', SO: 'sup', ED: 'sup' },
        equivalences: [{ uned: { codigo: '011013' }, ugr: { codigo: 'FFT' }, creditos: 6 }],
        plan: { totalECTS: 240 },
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    };
    mockGet({ userState: remoteUserState, tableProgress: null });
    const payload = await buildPayload(); // export del remoto

    // Dispositivo local: progreso anterior al del bundle.
    const current = {
      userState: { key: 'current', rev: 3 },
      configs: [],
      reviews: [],
      progress: {
        credits: { EDAB: 'pass' },
        equivalences: [],
        plan: { totalECTS: 240 },
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const plan = buildMergePlan(current, payload, 'merge');
    await applyPlan(plan);

    // El progreso del bundle llega a userState como comando del store…
    expect(payload.progress).toBe(remoteUserState.progress);
    expect(commands.applyCommandsInTransaction).toHaveBeenCalledWith([
      { type: 'progress/setAll', payload: payload.progress },
    ]);
    // …y en ningún momento se escribe la tabla `progress`.
    expect(db.put.mock.calls.filter(([store]) => store === 'progress')).toHaveLength(0);
    // Las secciones ajenas al progreso sí van a sus stores.
    expect(db.put).toHaveBeenCalledWith('userState', remoteUserState);
  });
});
