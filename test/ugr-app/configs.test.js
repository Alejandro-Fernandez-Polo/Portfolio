import { describe, it, expect } from 'vitest';
import {
  isConfigFavorited,
  findDuplicateConfig,
  buildConfigFromState,
  sortSavedConfigs,
  applyConfigToState,
  removeConfigById,
  buildSingleConfigExport,
  buildBatchConfigExport,
  parseConfigImport,
  configFilename,
  isConfigBlocked,
  buildBlockPayload,
  selectVisibleConfigs,
  paginateConfigs,
} from '../../public/ugr/src/app/domain/configs.js';

// Caracterización de las reglas de configuraciones guardadas (B4-a, B4-b,
// B4-c y B4-d): fijan el comportamiento legacy de `app.js`
// (`isConfigFavorited`, `findDuplicateConfig`, el objeto de `saveConfig`, el
// comparador de `sortSavedConfigs`, desde B4-b cargar/borrar/exportar/importar,
// desde B4-c los bloqueos de configuraciones y desde B4-d el pipeline de
// listado que consume `renderSavedConfigs`) una vez que el monolito delega en
// el dominio ESM. Funciones puras: fixtures propias, sin DOM ni globals, en el
// entorno node de Vitest.

/** Catálogo propio (NO el global SUBJECTS), con mañana/tarde y prácticas. */
function makeSubjects() {
  return [
    {
      codigo: 'MAT',
      nombre: 'Matemáticas I',
      curso: 1,
      grupos: [
        {
          letra: 'A',
          turno: 'mañana',
          teoria: [
            { dia: 'Lunes', inicio: '09:00', fin: '10:00' },
            { dia: 'Lunes', inicio: '12:00', fin: '13:00' },
          ],
          practicas: {
            subgrupos: ['A1'],
            A1: [{ dia: 'Miércoles', inicio: '10:00', fin: '11:30' }],
          },
        },
        {
          letra: 'B',
          turno: 'tarde',
          teoria: [{ dia: 'Martes', inicio: '16:00', fin: '18:00' }],
          practicas: {
            subgrupos: ['B1'],
            B1: [{ dia: 'Martes', inicio: '14:00', fin: '16:00' }],
          },
        },
      ],
    },
    {
      codigo: 'FIS',
      nombre: 'Física',
      curso: 1,
      grupos: [
        {
          letra: 'A',
          turno: 'mañana',
          teoria: [{ dia: 'Lunes', inicio: '08:00', fin: '10:00' }],
          practicas: { subgrupos: [] },
        },
        {
          letra: 'B',
          turno: 'tarde',
          teoria: [{ dia: 'Martes', inicio: '16:30', fin: '18:30' }],
          practicas: { subgrupos: [] },
        },
      ],
    },
  ];
}

/** Configuración guardada mínima; los campos que no importan se rellenan. */
function cfg(overrides = {}) {
  return {
    id: 1,
    name: 'Horario',
    selectedSubjects: {},
    groupChoices: {},
    apellido: 'Pérez',
    turnoPreferente: 'indiferente',
    ...overrides,
  };
}

describe('isConfigFavorited', () => {
  it('favorita → true', () => {
    expect(isConfigFavorited({ favorite: true })).toBe(true);
  });

  it('bandera en false → false', () => {
    expect(isConfigFavorited({ favorite: false })).toBe(false);
  });

  it('config antigua sin la bandera (undefined) → false', () => {
    expect(isConfigFavorited({ name: 'Horario #1' })).toBe(false);
  });
});

describe('findDuplicateConfig', () => {
  const guardada = cfg({
    name: 'Guardada',
    selectedSubjects: { MAT: true, FIS: false },
    groupChoices: { MAT: { teoria: 'A', practica: 'A1' }, FIS: { teoria: 'B', practica: null } },
  });

  it('mismas materias (por truthiness) y misma teoría → duplicado', () => {
    const dup = findDuplicateConfig(
      [guardada],
      { MAT: { teoria: 'A', practica: 'A1' }, FIS: { teoria: 'B', practica: null } },
      { MAT: true, FIS: false }
    );
    expect(dup).toBe(guardada);
  });

  it('difiere la selección de materias → sin duplicado', () => {
    const dup = findDuplicateConfig(
      [guardada],
      { MAT: { teoria: 'A', practica: 'A1' }, FIS: { teoria: 'B', practica: null } },
      { MAT: true, FIS: true }
    );
    expect(dup).toBeUndefined();
  });

  it('difiere la teoría de alguna materia → sin duplicado', () => {
    const dup = findDuplicateConfig(
      [guardada],
      { MAT: { teoria: 'B', practica: 'B1' }, FIS: { teoria: 'B', practica: null } },
      { MAT: true, FIS: false }
    );
    expect(dup).toBeUndefined();
  });

  it('la práctica se ignora: misma teoría con distinto subgrupo → duplicado', () => {
    const dup = findDuplicateConfig(
      [guardada],
      { MAT: { teoria: 'A', practica: null }, FIS: { teoria: 'B', practica: null } },
      { MAT: true, FIS: false }
    );
    expect(dup).toBe(guardada);
  });

  it('lista vacía → undefined', () => {
    expect(
      findDuplicateConfig([], { MAT: { teoria: 'A', practica: null } }, { MAT: true })
    ).toBeUndefined();
  });
});

describe('buildConfigFromState', () => {
  const state = {
    selectedSubjects: { MAT: true, FIS: false },
    groupChoices: { MAT: { teoria: 'A', practica: 'A1' } },
    apellido: 'García',
    turnoPreferente: 'mañana',
  };

  it('construye la forma persistible con id, nombre, perfil y selección', () => {
    const config = buildConfigFromState(state, 1234, 'Horario #7');
    expect(config).toEqual({
      id: 1234,
      name: 'Horario #7',
      selectedSubjects: { MAT: true, FIS: false },
      groupChoices: { MAT: { teoria: 'A', practica: 'A1' } },
      apellido: 'García',
      turnoPreferente: 'mañana',
    });
  });

  it('selectedSubjects es copia: mutar el estado no mueve la config', () => {
    const config = buildConfigFromState(state, 1, 'H');
    state.selectedSubjects.MAT = false;
    expect(config.selectedSubjects.MAT).toBe(true);
    state.selectedSubjects.MAT = true;
  });

  it('groupChoices es clon profunda (deep clone), no la misma referencia', () => {
    const config = buildConfigFromState(state, 1, 'H');
    expect(config.groupChoices).not.toBe(state.groupChoices);
    expect(config.groupChoices.MAT).not.toBe(state.groupChoices.MAT);

    state.groupChoices.MAT.teoria = 'B';
    state.groupChoices.MAT.extra = { anidado: true };
    expect(config.groupChoices.MAT).toEqual({ teoria: 'A', practica: 'A1' });
    state.groupChoices.MAT.teoria = 'A';
    delete state.groupChoices.MAT.extra;
  });
});

describe('sortSavedConfigs', () => {
  it('los favoritos van siempre primero, ganando al campo (name asc y desc)', () => {
    const noFav = cfg({ id: 1, name: 'Horario #1' });
    const fav = cfg({ id: 2, name: 'Horario #99', favorite: true });
    const input = [noFav, fav];

    const asc = sortSavedConfigs(input, { field: 'name', dir: 'asc' });
    const desc = sortSavedConfigs(input, { field: 'name', dir: 'desc' });
    expect(asc.map(c => c.id)).toEqual([2, 1]);
    expect(desc.map(c => c.id)).toEqual([2, 1]);
    // No muta la entrada: la copia se ordena, la original queda intacta.
    expect(input.map(c => c.id)).toEqual([1, 2]);
  });

  it('name ordena por el número de #N (numérico, no lexicográfico)', () => {
    const list = [cfg({ id: 1, name: 'Horario #10' }), cfg({ id: 2, name: 'Horario #2' }), cfg({ id: 3, name: 'Horario #1' })];
    expect(sortSavedConfigs(list, { field: 'name', dir: 'asc' }).map(c => c.id)).toEqual([3, 2, 1]);
    expect(sortSavedConfigs(list, { field: 'name', dir: 'desc' }).map(c => c.id)).toEqual([1, 2, 3]);
  });

  it('name sin #N → 0 (primer puesto en asc)', () => {
    const list = [cfg({ id: 1, name: 'Sin numero' }), cfg({ id: 2, name: 'Horario #5' })];
    expect(sortSavedConfigs(list, { field: 'name', dir: 'asc' }).map(c => c.id)).toEqual([1, 2]);
  });

  it('count compara materias seleccionadas (solo las truthy)', () => {
    const list = [
      cfg({ id: 1, selectedSubjects: { MAT: true, FIS: false } }),
      cfg({ id: 2, selectedSubjects: { MAT: true, FIS: true, ED: true } }),
      cfg({ id: 3, selectedSubjects: { MAT: true, FIS: true } }),
    ];
    expect(sortSavedConfigs(list, { field: 'count', dir: 'asc' }).map(c => c.id)).toEqual([1, 3, 2]);
    expect(sortSavedConfigs(list, { field: 'count', dir: 'desc' }).map(c => c.id)).toEqual([2, 3, 1]);
  });

  it('turno usa localeCompare (asc: indiferente < mañana < tarde)', () => {
    const list = [
      cfg({ id: 1, turnoPreferente: 'tarde' }),
      cfg({ id: 2, turnoPreferente: 'indiferente' }),
      cfg({ id: 3, turnoPreferente: 'mañana' }),
    ];
    expect(sortSavedConfigs(list, { field: 'turno', dir: 'asc' }).map(c => c.id)).toEqual([2, 3, 1]);
    expect(sortSavedConfigs(list, { field: 'turno', dir: 'desc' }).map(c => c.id)).toEqual([1, 3, 2]);
  });

  it('manana/tarde ordenan por días con clase en cada franja (fixtures propias)', () => {
    const manana = cfg({
      id: 1,
      selectedSubjects: { MAT: true },
      groupChoices: { MAT: { teoria: 'A', practica: 'A1' } }, // Lunes + Miércoles
    });
    const tarde = cfg({
      id: 2,
      selectedSubjects: { FIS: true },
      groupChoices: { FIS: { teoria: 'B', practica: null } }, // Martes
    });
    const subjects = makeSubjects();
    const opts = { subjects };

    expect(sortSavedConfigs([manana, tarde], { ...opts, field: 'manana', dir: 'asc' }).map(c => c.id)).toEqual([2, 1]);
    expect(sortSavedConfigs([manana, tarde], { ...opts, field: 'manana', dir: 'desc' }).map(c => c.id)).toEqual([1, 2]);
    expect(sortSavedConfigs([manana, tarde], { ...opts, field: 'tarde', dir: 'asc' }).map(c => c.id)).toEqual([1, 2]);
    expect(sortSavedConfigs([manana, tarde], { ...opts, field: 'tarde', dir: 'desc' }).map(c => c.id)).toEqual([2, 1]);
  });

  it('deadHours calcula los huecos, salvo que la config traiga el valor', () => {
    const conHueco = cfg({ id: 1, selectedSubjects: { MAT: true }, groupChoices: { MAT: { teoria: 'A', practica: 'A1' } } }); // 2.0 h
    const sinHueco = cfg({ id: 2, selectedSubjects: { FIS: true }, groupChoices: { FIS: { teoria: 'B', practica: null } } }); // 0
    const subjects = makeSubjects();

    const computed = sortSavedConfigs([sinHueco, conHueco], { subjects, field: 'deadHours', dir: 'asc' });
    expect(computed.map(c => c.id)).toEqual([2, 1]);

    // Valor precargado en la config: manda sobre el cálculo (regla legacy
    // `deadHours != null`). `precargado` no selecciona nada — sus huecos
    // calculados serían 0 — pero trae `deadHours: 50`, así que en desc sale
    // el primero SOLO si manda el valor precargado.
    const precargado = cfg({ id: 3, deadHours: 50 });
    const cached = sortSavedConfigs([sinHueco, precargado], { subjects, field: 'deadHours', dir: 'desc' });
    expect(cached.map(c => c.id)).toEqual([3, 2]);
  });

  it('profScore usa los lookups de dificultad inyectados', () => {
    const dificil = cfg({ id: 1, selectedSubjects: { MAT: true }, groupChoices: { MAT: { teoria: 'A', practica: null } } });
    const sinProf = cfg({ id: 2, selectedSubjects: { FIS: true }, groupChoices: { FIS: { teoria: 'A', practica: null } } });
    const opts = {
      subjects: makeSubjects(),
      dificultad: (codigo, letra) => (codigo === 'MAT' && letra === 'A' ? 'naranja' : null),
      difficultyScore: (d) => (d === 'naranja' ? 5 : 3),
    };

    expect(sortSavedConfigs([dificil, sinProf], { ...opts, field: 'profScore', dir: 'asc' }).map(c => c.id)).toEqual([2, 1]);
    expect(sortSavedConfigs([dificil, sinProf], { ...opts, field: 'profScore', dir: 'desc' }).map(c => c.id)).toEqual([1, 2]);
  });

  it('sameGroup: misma letra en todos los cursos → 1, letras distintas → 0', () => {
    const mismaLetra = cfg({
      id: 1,
      selectedSubjects: { MAT: true, FIS: true },
      groupChoices: { MAT: { teoria: 'A', practica: null }, FIS: { teoria: 'A', practica: null } },
    });
    const letrasDistintas = cfg({
      id: 2,
      selectedSubjects: { MAT: true, FIS: true },
      groupChoices: { MAT: { teoria: 'A', practica: null }, FIS: { teoria: 'B', practica: null } },
    });
    const opts = { subjects: makeSubjects() };

    expect(sortSavedConfigs([mismaLetra, letrasDistintas], { ...opts, field: 'sameGroup', dir: 'asc' }).map(c => c.id)).toEqual([2, 1]);
    expect(sortSavedConfigs([mismaLetra, letrasDistintas], { ...opts, field: 'sameGroup', dir: 'desc' }).map(c => c.id)).toEqual([1, 2]);
  });

  it('campo desconocido → comparator 0 (conserva el orden de entrada)', () => {
    const list = [cfg({ id: 1, name: 'A #3' }), cfg({ id: 2, name: 'B #1' })];
    expect(sortSavedConfigs(list, { field: 'inexistente' }).map(c => c.id)).toEqual([1, 2]);
  });

  it('opciones por defecto: field=name, dir=asc', () => {
    const list = [cfg({ id: 1, name: 'Horario #4' }), cfg({ id: 2, name: 'Horario #2' })];
    expect(sortSavedConfigs(list).map(c => c.id)).toEqual([2, 1]);
  });
});

// ─── B4-b: cargar, borrar, exportar e importar ───────────────

describe('applyConfigToState', () => {
  it('copia los 4 campos al estado y devuelve el MISMO objeto (mutación in situ)', () => {
    const config = cfg({
      selectedSubjects: { MAT: true },
      groupChoices: { MAT: { teoria: 'A', practica: 'A1' } },
      apellido: 'González',
      turnoPreferente: 'tarde',
    });
    const estado = {
      selectedSubjects: { FIS: true },
      groupChoices: {},
      apellido: 'Viejo',
      turnoPreferente: 'mañana',
      otro: 'se conserva',
    };

    const devuelto = applyConfigToState(estado, config);

    expect(devuelto).toBe(estado); // misma referencia: el cierre de app.js reutiliza `state`
    expect(estado.selectedSubjects).toEqual({ MAT: true });
    expect(estado.groupChoices).toEqual({ MAT: { teoria: 'A', practica: 'A1' } });
    expect(estado.apellido).toBe('González');
    expect(estado.turnoPreferente).toBe('tarde');
    expect(estado.otro).toBe('se conserva'); // campos ajenos intactos
  });

  it('no deja referencias a la config: selectedSubjects copiado y groupChoices clon profundo', () => {
    const config = cfg({
      selectedSubjects: { MAT: true },
      groupChoices: { MAT: { teoria: 'A', practica: 'A1' } },
    });
    const estado = applyConfigToState({ selectedSubjects: {}, groupChoices: {} }, config);

    expect(estado.selectedSubjects).not.toBe(config.selectedSubjects);
    expect(estado.groupChoices).not.toBe(config.groupChoices);
    expect(estado.groupChoices.MAT).not.toBe(config.groupChoices.MAT);

    // Mutar el estado (siguiente selección) no mueve la config guardada…
    estado.selectedSubjects.MAT = false;
    estado.groupChoices.MAT.teoria = 'B';
    expect(config.selectedSubjects.MAT).toBe(true);
    expect(config.groupChoices.MAT.teoria).toBe('A');

    // …ni al revés: cargar otra vez no arrastra la mutación previa.
    applyConfigToState(estado, config);
    expect(estado.selectedSubjects).toEqual({ MAT: true });
    expect(estado.groupChoices).toEqual({ MAT: { teoria: 'A', practica: 'A1' } });
  });
});

describe('removeConfigById', () => {
  it('devuelve la lista sin el id indicado y sin mutar la original', () => {
    const list = [cfg({ id: 1 }), cfg({ id: 2 }), cfg({ id: 3 })];
    const resultado = removeConfigById(list, 2);

    expect(resultado.map(c => c.id)).toEqual([1, 3]);
    expect(list.map(c => c.id)).toEqual([1, 2, 3]);
    expect(resultado).not.toBe(list);
  });

  it('id inexistente → copia con el mismo contenido', () => {
    const list = [cfg({ id: 1 })];
    const resultado = removeConfigById(list, 999);
    expect(resultado).toEqual(list);
    expect(resultado).not.toBe(list);
  });

  it('lista vacía → lista vacía', () => {
    expect(removeConfigById([], 1)).toEqual([]);
  });
});

describe('buildSingleConfigExport / buildBatchConfigExport', () => {
  const config = cfg({
    id: 7,
    name: 'Mi Horario',
    selectedSubjects: { MAT: true },
    groupChoices: { MAT: { teoria: 'A', practica: 'A1' } },
  });
  const iso = '2026-01-02T03:04:05.000Z';

  it('single: formato exacto {version:1, type, exportedAt, config}', () => {
    expect(buildSingleConfigExport(config, iso)).toEqual({
      version: 1,
      type: 'ugr-horario-config',
      exportedAt: iso,
      config: {
        id: 7,
        name: 'Mi Horario',
        selectedSubjects: { MAT: true },
        groupChoices: { MAT: { teoria: 'A', practica: 'A1' } },
        apellido: 'Pérez',
        turnoPreferente: 'indiferente',
      },
    });
  });

  it('single: clona la config en profundidad (mutarla no altera el export)', () => {
    const data = buildSingleConfigExport(config, iso);
    expect(data.config).not.toBe(config);
    expect(data.config.groupChoices.MAT).not.toBe(config.groupChoices.MAT);

    config.groupChoices.MAT.teoria = 'B';
    config.selectedSubjects.MAT = false;
    expect(data.config.groupChoices.MAT.teoria).toBe('A');
    expect(data.config.selectedSubjects.MAT).toBe(true);
    config.groupChoices.MAT.teoria = 'A';
    config.selectedSubjects.MAT = true;
  });

  it('batch: formato exacto {version:1, type, exportedAt, configs} con la lista clonada', () => {
    const list = [config, cfg({ id: 8, name: 'Otra' })];
    const data = buildBatchConfigExport(list, iso);

    expect(data).toEqual({
      version: 1,
      type: 'ugr-horario-configs-batch',
      exportedAt: iso,
      configs: [
        expect.objectContaining({ id: 7, name: 'Mi Horario' }),
        expect.objectContaining({ id: 8, name: 'Otra' }),
      ],
    });
    expect(data.configs).not.toBe(list);
    expect(data.configs[0]).not.toBe(list[0]);
    expect(data.configs[0].groupChoices.MAT).not.toBe(list[0].groupChoices.MAT);

    list[0].groupChoices.MAT.teoria = 'B';
    expect(data.configs[0].groupChoices.MAT.teoria).toBe('A');
    list[0].groupChoices.MAT.teoria = 'A';
  });

  it('la fecha es el parámetro recibido (el dominio no lee el reloj)', () => {
    expect(buildSingleConfigExport(config, iso).exportedAt).toBe(iso);
    expect(buildBatchConfigExport([config], iso).exportedAt).toBe(iso);
  });
});

describe('parseConfigImport', () => {
  it('envoltorio single válido → [config]', () => {
    const config = cfg({ id: 11 });
    const data = { version: 1, type: 'ugr-horario-config', exportedAt: 'x', config };
    expect(parseConfigImport(data)).toEqual([config]);
  });

  it('envoltorio batch válido → el array configs (misma referencia)', () => {
    const configs = [cfg({ id: 12 }), cfg({ id: 13 })];
    const data = { version: 1, type: 'ugr-horario-configs-batch', exportedAt: 'x', configs };
    expect(parseConfigImport(data)).toBe(configs);
  });

  it('formato inválido → null (tipo desconocido, sin config o configs no-array)', () => {
    expect(parseConfigImport({ version: 1, type: 'otro-tipo', config: {} })).toBeNull();
    expect(parseConfigImport({ version: 1, type: 'ugr-horario-config' })).toBeNull();
    expect(parseConfigImport({ version: 1, type: 'ugr-horario-config', config: null })).toBeNull();
    expect(parseConfigImport({ version: 1, type: 'ugr-horario-configs-batch', configs: {} })).toBeNull();
    expect(parseConfigImport({ version: 1 })).toBeNull();
    expect(parseConfigImport({})).toBeNull();
  });

  it('JSON plano (string/number) → null, sin lanzar', () => {
    expect(parseConfigImport('hola')).toBeNull();
    expect(parseConfigImport(42)).toBeNull();
  });

  it('NO asigna id a las configs devueltas', () => {
    const sinId = { name: 'Sin id', selectedSubjects: {}, groupChoices: {} };
    const [resultado] = parseConfigImport({ type: 'ugr-horario-config', config: sinId });
    expect(resultado).toBe(sinId);
    expect(resultado).not.toHaveProperty('id');
  });
});

describe('configFilename', () => {
  it('espacios → guiones y minúsculas, manteniendo # y demás caracteres', () => {
    expect(configFilename('Mi Horario #1')).toBe('config-mi-horario-#1.json');
    expect(configFilename('Horario')).toBe('config-horario.json');
  });

  it('espacios consecutivos se colapsan (\\s+)', () => {
    expect(configFilename('Mi  Horario   Final')).toBe('config-mi-horario-final.json');
  });

  it('no toca acentos ni guiones existentes (réplica del template legacy)', () => {
    expect(configFilename('Horario Mañana #2')).toBe('config-horario-mañana-#2.json');
    expect(configFilename('ya-guionado')).toBe('config-ya-guionado.json');
  });
});

// ─── B4-c: bloqueos de configuraciones ───────────────────────

describe('isConfigBlocked', () => {
  const subjects = makeSubjects(); // MAT y FIS, ambas de curso 1

  it('sin bloqueos → false (nunca bloquea)', () => {
    const config = cfg({
      selectedSubjects: { MAT: true },
      groupChoices: { MAT: { teoria: 'A', practica: 'A1' } },
    });
    expect(isConfigBlocked([], config, subjects)).toBe(false);
  });

  describe("type 'subject' (materia + grupo de teoría)", () => {
    const config = cfg({
      selectedSubjects: { MAT: true, FIS: true },
      groupChoices: { MAT: { teoria: 'A', practica: 'A1' }, FIS: { teoria: 'B', practica: null } },
    });

    it('materia seleccionada con la MISMA teoría → true', () => {
      expect(isConfigBlocked([{ type: 'subject', codigo: 'MAT', letra: 'A' }], config, subjects)).toBe(true);
      expect(isConfigBlocked([{ type: 'subject', codigo: 'FIS', letra: 'B' }], config, subjects)).toBe(true);
    });

    it('materia seleccionada con OTRA teoría → false (otro grupo no está bloqueado)', () => {
      expect(isConfigBlocked([{ type: 'subject', codigo: 'MAT', letra: 'B' }], config, subjects)).toBe(false);
    });

    it('materia NO seleccionada → false aunque la teoría coincida', () => {
      const sinMat = cfg({
        selectedSubjects: { FIS: true },
        groupChoices: { FIS: { teoria: 'B', practica: null } },
      });
      expect(isConfigBlocked([{ type: 'subject', codigo: 'MAT', letra: 'A' }], sinMat, subjects)).toBe(false);
    });

    it('seleccionada pero SIN groupChoices → false (la teoría no puede coincidir)', () => {
      const sinEleccion = cfg({ selectedSubjects: { MAT: true }, groupChoices: {} });
      expect(isConfigBlocked([{ type: 'subject', codigo: 'MAT', letra: 'A' }], sinEleccion, subjects)).toBe(false);
    });
  });

  describe("type 'subject-only' (basta la materia)", () => {
    it('materia seleccionada con cualquier grupo → true', () => {
      const config = cfg({
        selectedSubjects: { MAT: true },
        groupChoices: { MAT: { teoria: 'B', practica: null } },
      });
      expect(isConfigBlocked([{ type: 'subject-only', codigo: 'MAT' }], config, subjects)).toBe(true);
    });

    it('materia NO seleccionada → false', () => {
      const config = cfg({ selectedSubjects: { FIS: true }, groupChoices: {} });
      expect(isConfigBlocked([{ type: 'subject-only', codigo: 'MAT' }], config, subjects)).toBe(false);
    });

    it('seleccionada pero sin groupChoices → sigue siendo true (no mira la teoría)', () => {
      const config = cfg({ selectedSubjects: { MAT: true }, groupChoices: {} });
      expect(isConfigBlocked([{ type: 'subject-only', codigo: 'MAT' }], config, subjects)).toBe(true);
    });
  });

  describe("type 'curso' (alguna materia del curso con esa teoría)", () => {
    it('materia seleccionada del curso con esa teoría → true', () => {
      const config = cfg({
        selectedSubjects: { MAT: true },
        groupChoices: { MAT: { teoria: 'A', practica: null } },
      });
      expect(isConfigBlocked([{ type: 'curso', curso: 1, letra: 'A' }], config, subjects)).toBe(true);
    });

    it('ninguna materia del curso con esa teoría → false', () => {
      const config = cfg({
        selectedSubjects: { MAT: true, FIS: true },
        groupChoices: { MAT: { teoria: 'B', practica: null }, FIS: { teoria: 'B', practica: null } },
      });
      // Letra A: nadie la usa; curso 2: no existe en el catálogo fixture.
      expect(isConfigBlocked([{ type: 'curso', curso: 1, letra: 'A' }], config, subjects)).toBe(false);
      expect(isConfigBlocked([{ type: 'curso', curso: 2, letra: 'B' }], config, subjects)).toBe(false);
    });

    it('materia seleccionada cuyo código NO está en el catálogo → no la tiene en cuenta', () => {
      const config = cfg({
        selectedSubjects: { ZZ: true },
        groupChoices: { ZZ: { teoria: 'A', practica: null } },
      });
      expect(isConfigBlocked([{ type: 'curso', curso: 1, letra: 'A' }], config, subjects)).toBe(false);
    });

    it('solo cuenta lo seleccionado: una materia no seleccionada no bloquea', () => {
      const config = cfg({
        selectedSubjects: { MAT: false },
        groupChoices: { MAT: { teoria: 'A', practica: null } },
      });
      expect(isConfigBlocked([{ type: 'curso', curso: 1, letra: 'A' }], config, subjects)).toBe(false);
    });

    it('con varias materias, basta con que UNA coincida (.some)', () => {
      const config = cfg({
        selectedSubjects: { MAT: true, FIS: true },
        groupChoices: { MAT: { teoria: 'B', practica: null }, FIS: { teoria: 'A', practica: null } },
      });
      expect(isConfigBlocked([{ type: 'curso', curso: 1, letra: 'A' }], config, subjects)).toBe(true);
    });
  });

  it('tipo de bloqueo desconocido → false (sin lanzar)', () => {
    const config = cfg({
      selectedSubjects: { MAT: true },
      groupChoices: { MAT: { teoria: 'A', practica: null } },
    });
    expect(isConfigBlocked([{ type: 'turno', turno: 'mañana' }], config, subjects)).toBe(false);
    expect(isConfigBlocked([{}], config, subjects)).toBe(false);
  });

  it('cualquier bloqueo que coincida basta (or de la lista)', () => {
    const config = cfg({
      selectedSubjects: { MAT: true },
      groupChoices: { MAT: { teoria: 'A', practica: null } },
    });
    const blocks = [
      { type: 'subject', codigo: 'FIS', letra: 'A' }, // no coincide
      { type: 'subject-only', codigo: 'MAT' }, // coincide
    ];
    expect(isConfigBlocked(blocks, config, subjects)).toBe(true);
  });
});

describe('buildBlockPayload', () => {
  it("type 'subject' completo → {type, codigo, letra}", () => {
    expect(buildBlockPayload('subject', { subject: 'MAT', group: 'A' })).toEqual({
      type: 'subject',
      codigo: 'MAT',
      letra: 'A',
    });
  });

  it("type 'subject' con algún valor vacío → null", () => {
    expect(buildBlockPayload('subject', { subject: '', group: 'A' })).toBeNull();
    expect(buildBlockPayload('subject', { subject: 'MAT', group: '' })).toBeNull();
    expect(buildBlockPayload('subject', { subject: '', group: '' })).toBeNull();
    expect(buildBlockPayload('subject', {})).toBeNull();
  });

  it("type 'subject-only' → solo exige la materia (el grupo se ignora)", () => {
    expect(buildBlockPayload('subject-only', { subject: 'MAT' })).toEqual({
      type: 'subject-only',
      codigo: 'MAT',
    });
    expect(buildBlockPayload('subject-only', { subject: 'MAT', group: '' })).toEqual({
      type: 'subject-only',
      codigo: 'MAT',
    });
    expect(buildBlockPayload('subject-only', { subject: '' })).toBeNull();
    expect(buildBlockPayload('subject-only', {})).toBeNull();
  });

  it("type 'curso' → parseInt del curso (el select da string)", () => {
    const payload = buildBlockPayload('curso', { curso: '2', cursoGroup: 'B' });
    expect(payload).toEqual({ type: 'curso', curso: 2, letra: 'B' });
    expect(payload.curso).toBeTypeOf('number');
  });

  it("type 'curso' con algún valor vacío → null", () => {
    expect(buildBlockPayload('curso', { curso: '', cursoGroup: 'A' })).toBeNull();
    expect(buildBlockPayload('curso', { curso: '1', cursoGroup: '' })).toBeNull();
    expect(buildBlockPayload('curso', {})).toBeNull();
  });

  it('type desconocida → null (el llamante no re-renderiza)', () => {
    expect(buildBlockPayload('turno', { subject: 'MAT', group: 'A', curso: '1', cursoGroup: 'A' })).toBeNull();
    expect(buildBlockPayload(undefined, { subject: 'MAT' })).toBeNull();
    expect(buildBlockPayload('', {})).toBeNull();
  });
});

// ─── B4-d: pipeline de listado (filtrar → ordenar → paginar) ─

describe('selectVisibleConfigs', () => {
  /** Segunda materia de tarde en DOS días distintos (para techos de días). */
  function makeTardeSubjects() {
    return [
      {
        codigo: 'VET',
        nombre: 'Veterinaria',
        curso: 3,
        grupos: [
          {
            letra: 'A',
            turno: 'tarde',
            teoria: [
              { dia: 'Lunes', inicio: '16:00', fin: '18:00' },
              { dia: 'Miércoles', inicio: '16:00', fin: '18:00' },
            ],
            practicas: { subgrupos: [] },
          },
        ],
      },
    ];
  }

  it('ordena por sortField (favoritos primero) sin mutar la entrada', () => {
    const input = [
      cfg({ id: 1, name: 'Horario #10' }),
      cfg({ id: 2, name: 'Horario #2' }),
      cfg({ id: 3, name: 'Horario #99', favorite: true }),
    ];

    const asc = selectVisibleConfigs(input, { sortField: 'name', sortDir: 'asc' });
    const desc = selectVisibleConfigs(input, { sortField: 'name', sortDir: 'desc' });

    // Orden `name` numérico por `#N`: favorito primero; asc → #2 antes que #10.
    expect(asc.map(c => c.id)).toEqual([3, 2, 1]);
    expect(desc.map(c => c.id)).toEqual([3, 1, 2]);
    expect(input.map(c => c.id)).toEqual([1, 2, 3]); // la entrada queda intacta
    expect(asc).not.toBe(input);
  });

  it('ordena por una columna numérica (count) con la dirección indicada', () => {
    const list = [
      cfg({ id: 1, selectedSubjects: { MAT: true, FIS: true } }),
      cfg({ id: 2, selectedSubjects: { MAT: true } }),
    ];
    expect(selectVisibleConfigs(list, { sortField: 'count', sortDir: 'asc' }).map(c => c.id)).toEqual([2, 1]);
    expect(selectVisibleConfigs(list, { sortField: 'count', sortDir: 'desc' }).map(c => c.id)).toEqual([1, 2]);
  });

  it('showFavoritesOnly descarta las no favoritas (y sin la bandera)', () => {
    const list = [
      cfg({ id: 1, favorite: true }),
      cfg({ id: 2 }),
      cfg({ id: 3, favorite: false }),
    ];
    expect(selectVisibleConfigs(list, { showFavoritesOnly: true }).map(c => c.id)).toEqual([1]);
    // Sin el flag (o en false) no se filtra, como el toggle del toolbar.
    expect(selectVisibleConfigs(list, {}).map(c => c.id)).toEqual([1, 2, 3]);
    expect(selectVisibleConfigs(list, { showFavoritesOnly: false }).map(c => c.id)).toEqual([1, 2, 3]);
  });

  it('excluye las configs que bloquea algún bloqueo activo', () => {
    const subjects = makeSubjects();
    const conMat = cfg({ id: 1, selectedSubjects: { MAT: true }, groupChoices: { MAT: { teoria: 'A', practica: null } } });
    const sinMat = cfg({ id: 2, selectedSubjects: { FIS: true }, groupChoices: { FIS: { teoria: 'A', practica: null } } });
    const blocks = [{ type: 'subject-only', codigo: 'MAT' }];

    expect(selectVisibleConfigs([conMat, sinMat], { blocks, subjects }).map(c => c.id)).toEqual([2]);
    expect(selectVisibleConfigs([conMat, sinMat], { blocks: [], subjects }).map(c => c.id)).toEqual([1, 2]);
  });

  it('techos maxManana/maxTarde descartan solo los que se pasan (0 o ausente = sin techo)', () => {
    const subjects = [...makeSubjects(), ...makeTardeSubjects()];
    const manana2 = cfg({ id: 1, selectedSubjects: { MAT: true }, groupChoices: { MAT: { teoria: 'A', practica: 'A1' } } }); // 2 mañanas
    const tarde2 = cfg({ id: 2, selectedSubjects: { VET: true }, groupChoices: { VET: { teoria: 'A', practica: null } } }); // 2 tardes
    const tarde1 = cfg({ id: 3, selectedSubjects: { FIS: true }, groupChoices: { FIS: { teoria: 'B', practica: null } } }); // 1 tarde
    const list = [manana2, tarde2, tarde1];

    expect(selectVisibleConfigs(list, { subjects, maxManana: 1 }).map(c => c.id)).toEqual([2, 3]);
    expect(selectVisibleConfigs(list, { subjects, maxTarde: 1 }).map(c => c.id)).toEqual([1, 3]);
    expect(selectVisibleConfigs(list, { subjects, maxManana: 2, maxTarde: 2 }).map(c => c.id)).toEqual([1, 2, 3]);
    expect(selectVisibleConfigs(list, { subjects }).map(c => c.id)).toEqual([1, 2, 3]);
    expect(selectVisibleConfigs(list, { subjects, maxManana: 0, maxTarde: 0 }).map(c => c.id)).toEqual([1, 2, 3]);
  });

  it('combina orden + filtros (el orden va primero, como en renderSavedConfigs)', () => {
    const subjects = makeSubjects();
    const list = [
      cfg({ id: 1, name: 'Horario #1', favorite: true, selectedSubjects: { MAT: true }, groupChoices: { MAT: { teoria: 'A', practica: null } } }),
      cfg({ id: 2, name: 'Horario #2', selectedSubjects: { MAT: true }, groupChoices: { MAT: { teoria: 'A', practica: null } } }),
      cfg({ id: 3, name: 'Horario #3', favorite: true, selectedSubjects: { FIS: true }, groupChoices: { FIS: { teoria: 'B', practica: null } } }),
    ];
    const blocks = [{ type: 'subject-only', codigo: 'MAT' }];

    const out = selectVisibleConfigs(list, {
      sortField: 'name',
      sortDir: 'asc',
      showFavoritesOnly: true,
      blocks,
      subjects,
    });

    expect(out.map(c => c.id)).toEqual([3]); // #1 bloqueada, #2 no favorita
  });
});

describe('paginateConfigs', () => {
  const list = Array.from({ length: 7 }, (_, i) => cfg({ id: i + 1, name: `Horario #${i + 1}` }));

  it('página 1 → primeras entradas y totales correctos', () => {
    expect(paginateConfigs(list, 1, 3)).toEqual({
      totalEntries: 7,
      totalPages: 3,
      page: 1,
      entries: [list[0], list[1], list[2]],
    });
  });

  it('página intermedia/última → slice exacto de su rango', () => {
    const segunda = paginateConfigs(list, 2, 3);
    expect(segunda.page).toBe(2);
    expect(segunda.entries.map(c => c.id)).toEqual([4, 5, 6]);

    const ultima = paginateConfigs(list, 3, 3);
    expect(ultima.page).toBe(3);
    expect(ultima.entries.map(c => c.id)).toEqual([7]);
    expect(ultima.totalPages).toBe(3);
    expect(ultima.totalEntries).toBe(7);
  });

  it('recorta por debajo de 1 → página 1 (0, negativo, null/undefined)', () => {
    expect(paginateConfigs(list, 0, 3).page).toBe(1);
    expect(paginateConfigs(list, -5, 3).page).toBe(1);
    expect(paginateConfigs(list, null, 3).page).toBe(1);
    expect(paginateConfigs(list, undefined, 3).page).toBe(1);
    expect(paginateConfigs(list, undefined, 3).entries.map(c => c.id)).toEqual([1, 2, 3]);
  });

  it('recorta por encima de totalPages → última página (como el botón "Siguiente")', () => {
    const r = paginateConfigs(list, 99, 3);
    expect(r.page).toBe(3);
    expect(r.entries.map(c => c.id)).toEqual([7]);
    expect(r.totalPages).toBe(3);
  });

  it('lista vacía → totalPages 1, página 1 y entries [] (sin página 0)', () => {
    expect(paginateConfigs([], 5, 50)).toEqual({
      totalEntries: 0,
      totalPages: 1,
      page: 1,
      entries: [],
    });
  });

  it('la lista llena por páginas no crea página fantasma y no se muta la entrada', () => {
    const seis = list.slice(0, 6);
    expect(paginateConfigs(seis, 1, 3).totalPages).toBe(2);
    // Pedir la página 3 con solo 2 disponibles → se recorta a la 2.
    expect(paginateConfigs(seis, 3, 3).page).toBe(2);

    const r = paginateConfigs(list, 1, 3);
    expect(r.entries).not.toBe(list);
    expect(list.map(c => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
