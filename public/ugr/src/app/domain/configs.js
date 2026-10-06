/**
 * Reglas puras de configuraciones guardadas (Bloque 4, rebanadas B4-a a B4-d).
 *
 * Extraídas del monolito `public/ugr/app.js` sin cambio de comportamiento:
 * aquí vive la única implementación y el IIFE clásico delega vía
 * `deps.domain`. Funciones puras — sin DOM, sin globals, sin estado: la lista
 * de configuraciones, el estado actual y los datos de materias/dificultad
 * llegan por parámetro, de modo que puedan probarse con fixtures propias.
 *
 * B4-a cubre búsqueda/orden/objeto persistible; B4-b añade la aplicación de
 * una config al estado, el borrado por id y la serialización/parseo de
 * export/import. Los formatos de fichero (claves `version`/`type`/
 * `exportedAt`) son contrato con ficheros ya exportados por personas
 * usuarias: no se tocan. B4-c aporta los bloqueos y B4-d el pipeline puro
 * de listado (filtrar → ordenar → paginar) que consume `renderSavedConfigs`.
 */

import { calculateConfigDays, calculateConfigDeadHours, calculateConfigMetrics } from './metrics.js';

/**
 * ¿Está marcada una configuración como favorita?
 *
 * Réplica de `app.js` `isConfigFavorited`: la ausencia de la bandera (configs
 * antiguas persistidas sin `favorite`) cuenta como `false`.
 *
 * @param {Object} config configuración guardada.
 * @returns {boolean} `true` solo si `config.favorite` es truthy.
 */
export function isConfigFavorited(config) {
  return !!config.favorite;
}

/**
 * Busca una configuración guardada equivalente a la que se va a crear.
 *
 * Réplica exacta de `app.js` `findDuplicateConfig`, con la diferencia de que
 * la lista de candidatas llega por parámetro en vez de leer el `savedConfigs`
 * del cierre (el IIFE pasa el suyo). Dos configs son duplicadas cuando tienen
 * exactamente las MISMAS materias seleccionadas (comparadas por truthiness,
 * para tolerar claves con valor `false`) y, para esas claves, la misma teoría.
 * La práctica se ignora a propósito: cambiar de subgrupo no es "el mismo
 * horario" para el aviso legacy.
 *
 * @param {Array<Object>} configs lista de configuraciones guardadas.
 * @param {Object} newGroupChoices elecciones `codigo → {teoria, practica}` de
 *   la nueva configuración.
 * @param {Object} newSelectedSubjects selección `codigo → boolean` de la nueva
 *   configuración.
 * @returns {Object|undefined} la primera coincidencia o `undefined`.
 */
export function findDuplicateConfig(configs, newGroupChoices, newSelectedSubjects) {
  return configs.find(cfg => {
    const sameSubjects = Object.keys(newSelectedSubjects).every(
      k => !!newSelectedSubjects[k] === !!cfg.selectedSubjects[k]
    );
    if (!sameSubjects) return false;
    return Object.keys(newGroupChoices).every(k =>
      cfg.groupChoices[k] &&
      cfg.groupChoices[k].teoria === newGroupChoices[k].teoria
    );
  });
}

/**
 * Construye la forma persistible de una configuración a partir del estado.
 *
 * Réplica del objeto que arma `app.js` `saveConfig`: `selectedSubjects` y
 * `groupChoices` se copian (el segundo con clonación profunda) porque el
 * estado vivo se muta al cambiar de selección y la copia guardada no debe
 * moverse con él. `id` lo aporta el llamante (`Date.now()` en legacy).
 *
 * @param {Object} estado estado actual (`selectedSubjects`, `groupChoices`,
 *   `apellido`, `turnoPreferente`).
 * @param {number} id identificador de la configuración.
 * @param {string} name nombre visible introducido por la persona.
 * @returns {Object} copia lista para `savedConfigs`/persistencia.
 */
export function buildConfigFromState(estado, id, name) {
  return {
    id,
    name: name,
    selectedSubjects: { ...estado.selectedSubjects },
    groupChoices: JSON.parse(JSON.stringify(estado.groupChoices)),
    apellido: estado.apellido,
    turnoPreferente: estado.turnoPreferente,
  };
}

/**
 * Ordena configuraciones guardadas por la columna elegida.
 *
 * Réplica exacta del comparador de `app.js` `sortSavedConfigs`: los favoritos
 * van siempre primero y después aplica `field`. `name` compara el número de
 * `#N` del nombre (sin `#` → `0`) y `turno` usa `localeCompare`; ambos
 * respetan `dir` dentro de su rama. El resto de campos (`count`, `manana`,
 * `tarde`, `deadHours`, `profScore`, `sameGroup`) se calculan, se comparan al
 * final con la misma regla de dirección y un campo desconocido devuelve `0`
 * (no reordena), igual que legacy. No muta la entrada: devuelve una copia.
 *
 * @param {Array<Object>} configs configuraciones a ordenar.
 * @param {Object} [opts] criterio e inyecciones.
 * @param {string} [opts.field] columna (`name` por defecto, como el arranque
 *   del IIFE).
 * @param {'asc'|'desc'} [opts.dir] dirección (`asc` por defecto).
 * @param {Array} [opts.subjects] catálogo de materias (`SUBJECTS` en
 *   producción); requerido por los campos que miden días/horas/métricas.
 * @param {(codigo: string, letra: string) => string|null} [opts.dificultad]
 *   lookup de dificultad del profesor (solo lo consume `profScore`).
 * @param {(d: string) => number} [opts.difficultyScore] peso de una
 *   dificultad (solo lo consume `profScore`).
 * @returns {Array<Object>} nueva lista ordenada.
 */
export function sortSavedConfigs(
  configs,
  { field = 'name', dir = 'asc', subjects = [], dificultad, difficultyScore } = {}
) {
  const ctx = { subjects, dificultad, difficultyScore };
  const sorted = [...configs];
  sorted.sort((a, b) => {
    const favA = a.favorite ? 1 : 0;
    const favB = b.favorite ? 1 : 0;
    if (favA !== favB) return favB - favA;

    let va, vb;
    switch (field) {
      case 'name': {
        const na = parseInt(a.name.match(/#(\d+)/)?.[1] || '0');
        const nb = parseInt(b.name.match(/#(\d+)/)?.[1] || '0');
        return dir === 'asc' ? na - nb : nb - na;
      }
      case 'count':
        va = Object.keys(a.selectedSubjects).filter(c => a.selectedSubjects[c]).length;
        vb = Object.keys(b.selectedSubjects).filter(c => b.selectedSubjects[c]).length;
        break;
      case 'turno':
        va = a.turnoPreferente; vb = b.turnoPreferente;
        return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      case 'manana': {
        const da = calculateConfigDays(a.selectedSubjects, a.groupChoices, ctx);
        const db = calculateConfigDays(b.selectedSubjects, b.groupChoices, ctx);
        va = da.manana; vb = db.manana; break;
      }
      case 'tarde': {
        const da = calculateConfigDays(a.selectedSubjects, a.groupChoices, ctx);
        const db = calculateConfigDays(b.selectedSubjects, b.groupChoices, ctx);
        va = da.tarde; vb = db.tarde; break;
      }
      case 'deadHours': {
        va = a.deadHours != null ? a.deadHours : calculateConfigDeadHours(a.selectedSubjects, a.groupChoices, ctx);
        vb = b.deadHours != null ? b.deadHours : calculateConfigDeadHours(b.selectedSubjects, b.groupChoices, ctx);
        break;
      }
      case 'profScore': {
        const ma = calculateConfigMetrics(a.selectedSubjects, a.groupChoices, ctx);
        const mb = calculateConfigMetrics(b.selectedSubjects, b.groupChoices, ctx);
        va = ma.profScore; vb = mb.profScore; break;
      }
      case 'sameGroup': {
        const ma = calculateConfigMetrics(a.selectedSubjects, a.groupChoices, ctx);
        const mb = calculateConfigMetrics(b.selectedSubjects, b.groupChoices, ctx);
        va = ma.sameGroupPerYear ? 1 : 0; vb = mb.sameGroupPerYear ? 1 : 0; break;
      }
      default: return 0;
    }
    if (field !== 'name' && field !== 'turno') {
      return dir === 'asc' ? va - vb : vb - va;
    }
    return 0;
  });
  return sorted;
}

/**
 * Aplica una configuración guardada al estado vivo.
 *
 * Réplica de `app.js` `loadConfig`. Mutante a propósito: el IIFE posee un único
 * `state` que el resto del módulo (DOM, store, recálculos) sigue leyendo, así
 * que reasignarlo desde fuera rompería esas referencias. `selectedSubjects` se
 * copia y `groupChoices` se clona en profundidad por el motivo inverso al de
 * `buildConfigFromState`: la config guardada no debe moverse cuando el estado
 * se mutate después de cargarla.
 *
 * No toca DOM, store ni persistencia — esos pasos (`pushProfileToStore`,
 * `saveState`, `updateAll`, toast) siguen en `app.js`.
 *
 * @param {Object} estado estado actual, mutado en sitio.
 * @param {Object} config configuración guardada a cargar.
 * @returns {Object} el MISMO `estado` (referencia), ya actualizado.
 */
export function applyConfigToState(estado, config) {
  estado.selectedSubjects = { ...config.selectedSubjects };
  estado.groupChoices = JSON.parse(JSON.stringify(config.groupChoices));
  estado.apellido = config.apellido;
  estado.turnoPreferente = config.turnoPreferente;
  return estado;
}

/**
 * Devuelve la lista sin la configuración indicada.
 *
 * Réplica de la línea de filtrado de `app.js` `deleteConfig`. Inmutable (la
 * clásica asignación `savedConfigs = …` del IIFE reasigna el binding local):
 * aquí solo se calcula la nueva lista, el confirm, la persistencia y el
 * render quedan en `app.js`.
 *
 * @param {Array<Object>} configs lista de configuraciones guardadas.
 * @param {number|string} id identificador a eliminar.
 * @returns {Array<Object>} copia filtrada (la entrada no se muta).
 */
export function removeConfigById(configs, id) {
  return configs.filter(c => c.id !== id);
}

/**
 * Envoltorio de exportación de UNA configuración.
 *
 * Fija el formato legacy exacto (`version`, `type`, `exportedAt`, `config`) que
 * `importSavedConfig` vuelve a reconocer: cambiar una clave rompería el
 * round-trip con ficheros ya exportados. `exportedAt` llega por parámetro en
 * vez de leer el reloj aquí, para que el dominio siga siendo puro y los tests
 * puedan fijar la fecha. La clonación en profundidad evita que mutar la config
 * viva altere un JSON ya preparado para descargar.
 *
 * @param {Object} config configuración a exportar.
 * @param {string} exportedAt marca temporal ISO (`new Date().toISOString()`).
 * @returns {Object} `{version: 1, type: 'ugr-horario-config', exportedAt, config}`.
 */
export function buildSingleConfigExport(config, exportedAt) {
  return {
    version: 1,
    type: 'ugr-horario-config',
    exportedAt,
    config: JSON.parse(JSON.stringify(config)),
  };
}

/**
 * Envoltorio de exportación BATCH de todas las guardadas.
 *
 * Mismo contrato que `buildSingleConfigExport` con `type`
 * `'ugr-horario-configs-batch'` y `configs`; la única copia es la lista entera
 * (los objetos ya son propios de `savedConfigs`). El nombre de fichero
 * (`ugr-horario-configs.json`) se decide en `app.js`, no aquí.
 *
 * @param {Array<Object>} configs configuraciones guardadas a exportar.
 * @param {string} exportedAt marca temporal ISO.
 * @returns {Object} `{version: 1, type: 'ugr-horario-configs-batch', exportedAt, configs}`.
 */
export function buildBatchConfigExport(configs, exportedAt) {
  return {
    version: 1,
    type: 'ugr-horario-configs-batch',
    exportedAt,
    configs: JSON.parse(JSON.stringify(configs)),
  };
}

/**
 * Valida un JSON importado y devuelve las configs que debe añadirse.
 *
 * Réplica de la comprobación de `app.js` `importSavedConfig`. Un envoltorio
 * single aporta `[config]`; un batch aporta su array `configs` (se asume ya
 * validado por el tipo); cualquier otra forma devuelve `null` y el llamante
 * muestra el toast de formato inválido. El acceso a `data.type` sin guardar es
 * intencionado: con `null`/`undefined` lanza igual que legacy, y el `try` de
 * `importSavedConfig` lo sigue traduciendo a "Error al leer el archivo".
 * NO asigna `id` aquí: la generación de identificadores (y el
 * push/persistencia) es efecto secundario de `app.js`.
 *
 * @param {Object} data JSON ya parseado del fichero leído.
 * @returns {Array<Object>|null} configs a añadir, o `null` si el formato no es válido.
 */
export function parseConfigImport(data) {
  if (data.type === 'ugr-horario-config' && data.config) {
    return [data.config];
  }
  if (data.type === 'ugr-horario-configs-batch' && Array.isArray(data.configs)) {
    return data.configs;
  }
  return null;
}

/**
 * Nombre de fichero de la exportación individual.
 *
 * Réplica exacta del template de `app.js` `exportSingleConfig`: espacios →
 * `-` y minúsculas, para que los nombres con espacios/acentos generen un
 * fichero descargable estable. Solo se sustituyen espacios (los acentos se
 * conservan, como en legacy).
 *
 * @param {string} name nombre visible de la configuración.
 * @returns {string} `config-<nombre-normalizado>.json`.
 */
export function configFilename(name) {
  return `config-${name.replace(/\s+/g, '-').toLowerCase()}.json`;
}

// ─── B4-c: bloqueos de configuraciones ───────────────────────

/**
 * ¿Excluye algún bloqueo activo a una configuración guardada?
 *
 * Réplica exacta de `app.js` `isConfigBlocked`, con la única diferencia de que
 * los dos datos que en legacy resolvía el cierre llegan por parámetro: `blocks`
 * (el IIFE obtiene `getBlocks()` del store, con su fallback local — el
 * ALMACENAMIENTO no se migra) y `subjects` (el catálogo `SUBJECTS`).
 *
 * Tres formas de bloqueo, con la semántica legacy intacta:
 * - `subject`: la materia está seleccionada Y su teoría coincide con la letra
 *   bloqueada (una materia seleccionada en otro grupo NO está bloqueada).
 * - `subject-only`: basta con que la materia esté seleccionada.
 * - `curso`: ALGUNA materia seleccionada del curso que coincida en `curso` y
 *   cuya teoría sea la letra bloqueada (un `find` de catálogo que puede no
 *   encontrar la materia → no bloquea).
 *
 * Cualquier otra `type` desconocida no bloquea (`false`), sin lanzar.
 *
 * @param {Array<Object>} blocks bloqueos activos (`state.blocks` del store).
 * @param {Object} config configuración guardada a evaluar.
 * @param {Array<Object>} subjects catálogo de materias (`SUBJECTS`).
 * @returns {boolean} `true` si algún bloqueo excluye la configuración.
 */
export function isConfigBlocked(blocks, config, subjects) {
  return blocks.some(filter => {
    if (filter.type === 'subject') {
      return config.selectedSubjects[filter.codigo] &&
             config.groupChoices[filter.codigo] &&
             config.groupChoices[filter.codigo].teoria === filter.letra;
    }
    if (filter.type === 'subject-only') {
      return config.selectedSubjects[filter.codigo];
    }
    if (filter.type === 'curso') {
      return Object.keys(config.selectedSubjects).some(codigo => {
        if (!config.selectedSubjects[codigo]) return false;
        const subject = subjects.find(s => s.codigo === codigo);
        if (!subject || subject.curso !== filter.curso) return false;
        const choice = config.groupChoices[codigo];
        return choice && choice.teoria === filter.letra;
      });
    }
    return false;
  });
}

/**
 * Traduce la selección cruda de los selects del panel a un payload de bloqueo.
 *
 * Réplica de la validación de `app.js` `addBlockFilter`: la parte impura
 * (leer los cuatro `<select>` del DOM) queda en el IIFE y aquí solo se decide
 * si el bloqueo es construible. Devolver `null` es el "validación fallida" del
 * legacy: el llamante hace `return` SIN re-renderizar, igual que el
 * `if (!sel || !sel.value) return;` original.
 *
 * Nota: `subject-only` solo exige `subject` (legacy tampoco miraba el grupo),
 * aunque el llamante pase el valor del resto de selects.
 *
 * @param {string} type tipo de bloqueo (`'subject'`, `'subject-only'`,
 *   `'curso'` o cualquier otra cosa → `null`).
 * @param {{subject?: string, group?: string, curso?: string, cursoGroup?: string}}
 *   values valores crudos de los selects (`''`/`undefined` = vacío).
 * @returns {Object|null} payload listo para `blocks/add`, o `null` si falta
 *   algún valor obligatorio o el `type` es desconocido.
 */
export function buildBlockPayload(type, values) {
  if (type === 'subject') {
    if (!values.subject || !values.group) return null;
    return { type: 'subject', codigo: values.subject, letra: values.group };
  }
  if (type === 'subject-only') {
    if (!values.subject) return null;
    return { type: 'subject-only', codigo: values.subject };
  }
  if (type === 'curso') {
    if (!values.curso || !values.cursoGroup) return null;
    return { type: 'curso', curso: parseInt(values.curso), letra: values.cursoGroup };
  }
  return null;
}

// ─── B4-d: pipeline de listado (filtrar → ordenar → paginar) ─

/**
 * Selecciona las configuraciones visibles de la tabla de guardadas.
 *
 * Réplica del tramo de filtrado/orden de `app.js` `renderSavedConfigs`, con la
 * única diferencia de que TODO el criterio y TODOS los datos llegan por
 * parámetro: el orden va primero (igual que legacy, que ordenaba y después
 * filtraba) vía `sortSavedConfigs`, y se descartan después las bloqueadas
 * (`isConfigBlocked`, misma implementación de este módulo), las no favoritas
 * si `showFavoritesOnly` y, si hay techos de días por turno, las que se
 * pasen de `maxManana`/`maxTarde` — `0` o ausente desactiva ese techo, como
 * el `configMaxManana`/`configMaxTarde` del cierre.
 *
 * Inmutable: `sortSavedConfigs` ya devuelve copia y los `filter` no tocan la
 * entrada, de modo que el `displayConfigs` (savedConfigs + solverResults) del
 * IIFE queda intacto.
 *
 * @param {Array<Object>} configs lista a mostrar (`getDisplayConfigs()`).
 * @param {Object} [opts] criterio y datos inyectados por el llamante.
 * @param {string} [opts.sortField] columna de orden (`'name'` por defecto).
 * @param {'asc'|'desc'} [opts.sortDir] dirección (`'asc'` por defecto).
 * @param {boolean} [opts.showFavoritesOnly] `true` → solo favoritas.
 * @param {number} [opts.maxManana] techo de días de mañana (`0` = sin techo).
 * @param {number} [opts.maxTarde] techo de días de tarde (`0` = sin techo).
 * @param {Array<Object>} [opts.blocks] bloqueos activos (`getBlocks()`).
 * @param {Array<Object>} [opts.subjects] catálogo de materias (`SUBJECTS`);
 *   necesario para los bloqueos `curso` y para medir días.
 * @param {(codigo: string, letra: string) => string|null} [opts.dificultad]
 *   lookup de dificultad (lo consume el orden `profScore`).
 * @param {(d: string) => number} [opts.difficultyScore] peso de una
 *   dificultad (lo consume el orden `profScore`).
 * @returns {Array<Object>} nueva lista ordenada y filtrada.
 */
export function selectVisibleConfigs(
  configs,
  {
    sortField = 'name',
    sortDir = 'asc',
    showFavoritesOnly = false,
    maxManana = 0,
    maxTarde = 0,
    blocks = [],
    subjects = [],
    dificultad,
    difficultyScore,
  } = {}
) {
  const ctx = { subjects, dificultad, difficultyScore };
  let visible = sortSavedConfigs(configs, { field: sortField, dir: sortDir, ...ctx });
  visible = visible.filter(c => !isConfigBlocked(blocks, c, subjects));
  if (showFavoritesOnly) {
    visible = visible.filter(c => isConfigFavorited(c));
  }
  if (maxManana > 0 || maxTarde > 0) {
    visible = visible.filter(c => {
      const d = calculateConfigDays(c.selectedSubjects, c.groupChoices, ctx);
      if (maxManana > 0 && d.manana > maxManana) return false;
      if (maxTarde > 0 && d.tarde > maxTarde) return false;
      return true;
    });
  }
  return visible;
}

/**
 * Recorta la lista visible a la página pedida, con los totales de la tabla.
 *
 * Réplica del tramo de paginación de `app.js` `renderSavedConfigs`: el número
 * de página se recorta SIEMPRE al rango `[1, totalPages]` (una página más
 * allá del final —el botón "Siguiente"— aterriza en la última, y un valor
 * fuera de rango negativo en la primera), y `totalPages` nunca baja de 1 para
 * que la vista pueda mostrar "Página 1 de 1". `pageSize` vacío/inválido
 * partiría en trozos infinitos, así que se asume el `CONFIG_PAGE_SIZE` que
 * inyecta el llamante.
 *
 * @param {Array<Object>} list lista ya filtrada (`selectVisibleConfigs`).
 * @param {number} [page] página pedida (`0`/`undefined`/`null` → 1).
 * @param {number} [pageSize] tamaño de página (≥ 1, p. ej. `CONFIG_PAGE_SIZE`).
 * @returns {{totalEntries: number, totalPages: number, page: number,
 *   entries: Array<Object>}} totales y entradas de la página resultante.
 */
export function paginateConfigs(list, page, pageSize) {
  const totalEntries = list.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const p = Math.min(Math.max(1, page || 1), totalPages);
  const start = (p - 1) * pageSize;
  return {
    totalEntries,
    totalPages,
    page: p,
    entries: list.slice(start, start + pageSize),
  };
}
