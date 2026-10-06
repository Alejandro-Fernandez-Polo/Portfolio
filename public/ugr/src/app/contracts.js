/**
 * Contratos internos de la composición `/ugr` (JSDoc puro, sin runtime).
 *
 * Solo documentación: este módulo no aporta valores en tiempo de ejecución y
 * termina en `export {}` para que los tooling lo traten como ESM.
 *
 * Los tipos de dominio (Session, Group, Subject, UgrCatalog, FilterSpec,
 * Problem, GroupChoice, Solution, CatalogMeta…) ya están definidos en
 * `public/ugr/src/solver/types.js`: aquí NO se duplican, se referencian desde
 * ese fichero cuando hiciera falta.
 */

/**
 * Dependencias que recibe la composición (`createUgrApp(deps)`, T01.4). Todo se
 * inyecta desde la fachada de arranque: ningún feature resuelve globals por
 * nombre ni toca `localStorage` directamente.
 *
 * @typedef {Object} UgrAppDependencies
 * @property {Object} store API de `window.__ugrStore` publicada por bootstrap
 *   (`dispatch`, `subscribe`, `getState`).
 * @property {Object} catalog API de `window.__ugrCatalog` (módulo catalog:
 *   `getCatalog`, `saveCatalog`, `getActiveCatalogKey`, …).
 * @property {Object} solver API de `window.__ugrSolver` (`solve`, `solveTopK`,
 *   `cancel`, `explain`, `getCatalog`, `listModules`).
 * @property {Object} progress API de `window.__ugrProgress` (créditos,
 *   equivalencias y estados de convalidación).
 * @property {UgrLegacyData} legacyData Frontera a los datos clásicos de los
 *   scripts `data.js` / `convalidaciones.js` / `propuestas.js` / `docentes.js`.
 * @property {UgrPersistence} persistence Persistencia residual en
 *   `localStorage` (las claves que hoy conserva `app.js` fuera del store).
 * @property {UgrDomain} domain Reglas puras de dominio: única implementación,
 *   servida a `app.js` (script clásico) vía `deps.domain` para que el monolito
 *   delegue en vez de duplicarlas.
 * @property {Element} root Raíz DOM donde montan los features.
 * @property {boolean} degraded `true` en modo degradado (sin IndexedDB), el
 *   mismo flag que `window.__ugrDegraded`.
 */

/**
 * Reglas puras de dominio (`src/app/domain/schedule.js`,
 * `src/app/domain/proposals.js`, `src/app/domain/metrics.js`,
 * `src/app/domain/selection.js`, `src/app/domain/calendar.js` y
 * `src/app/domain/configs.js`).
 *
 * Sin DOM ni globals: se exponen por la composición porque `app.js` es un
 * script clásico que no puede importar ESM y delega en `deps.domain`. Las de
 * métricas y calendario reciben `subjects` y los lookups por parámetro en cada
 * llamada (el monolito pasa `SUBJECTS` y sus helpers de dificultad); las de
 * selección mutan los mapas que el llamante posee (`groupChoices`) y dejan la
 * persistencia (`saveState`) en `app.js`.
 *
 * @typedef {Object} UgrDomain
 * @property {(t: string) => number} timeToMinutes `"HH:MM"` → minutos.
 * @property {(s1: string, e1: string, s2: string, e2: string) => boolean} timesOverlap
 *   `true` si dos tramos comparten minuto (adyacentes = no).
 * @property {(p: Object|null) => number} calcPropuestaCreditos Suma de créditos
 *   de una propuesta (0 si no tiene `mappings`).
 * @property {(selectedSubjects: Object, groupChoices: Object, ctx: {subjects: Array,
 *   dificultad?: Function, difficultyScore?: Function}) => {manana: number,
 *   tarde: number, profScore: number, profCount: number, sameGroupPerYear: boolean}}
 *   calculateConfigMetrics Horas por turno, puntuación de profesores y grupo
 *   repetido por curso (horas a 1 decimal).
 * @property {(selectedSubjects: Object, groupChoices: Object,
 *   ctx: {subjects: Array}) => number} calculateConfigDeadHours Horas muertas
 *   por día y turno (mañana < 14:00 / tarde ≥ 14:00), a 1 decimal.
 * @property {(selectedSubjects: Object, groupChoices: Object,
 *   ctx: {subjects: Array}) => {manana: number, tarde: number}}
 *   calculateConfigDays Número de días con clases por turno.
 * @property {(entries: Array<Object>) => Array<Object>} findConflicts Pares de
 *   entradas solapadas con las claves legacy (`codigo1`, `tipo1`, `dia`, …).
 * @property {(apellido: string) => number|null} getSubgrupoForApellido
 *   Subgrupo preferente por inicial del apellido (A–F→1 … T–Z→4); `null` si
 *   no hay tramo aplicable.
 * @property {(subject: Object) => {teoria: string, practica: string|null}|null}
 *   buildGroupChoice Elección por defecto (primer grupo + primer subgrupo);
 *   `null` si la materia no tiene `grupos[0]` (el guard "ya existe" vive en
 *   `app.js`).
 * @property {(choice: Object|null, subject: Object, turno: string) => Object|null}
 *   applyTurnoPreference Muta `choice` al primer grupo del turno preferente
 *   (`indiferente` → no-op), conservando el número de subgrupo si es posible.
 * @property {(selectedSubjects: Object, groupChoices: Object, subjects: Array,
 *   apellido: string) => void} applyApellidoSubgroups Aplica la regla por
 *   apellido mutando `groupChoices[codigo].practica`; sin `saveState`.
 * @property {(selectedSubjects: Object, groupChoices: Object, subjects: Array)
 *   => Array<Object>} buildActiveSchedule Entradas del horario activo con las
 *   claves legacy (`codigo`, `tipo`, `grupo`, `letra`, …).
 * @property {(conflicts: Array<Object>) => Set<string>} buildConflictSet Claves
 *   `${codigo}-${dia}-${inicio}` de ambos lados de cada conflicto.
 * @property {(config: Object) => boolean} isConfigFavorited `!!config.favorite`
 *   (configs antiguas sin la bandera cuentan como `false`).
 * @property {(configs: Array<Object>, newGroupChoices: Object,
 *   newSelectedSubjects: Object) => Object|undefined} findDuplicateConfig
 *   Primera configuración con las mismas materias (por truthiness) y la misma
 *   teoría en esas claves; la práctica se ignora. La lista llega por
 *   parámetro (el monolito pasa su `savedConfigs`).
 * @property {(estado: Object, id: number, name: string) => Object}
 *   buildConfigFromState Objeto persistible de `saveConfig`: copia de
 *   `selectedSubjects`, clon profundo de `groupChoices`, `apellido` y
 *   `turnoPreferente`.
 * @property {(configs: Array<Object>, opts?: {field?: string, dir?: 'asc'|
 *   'desc', subjects?: Array, dificultad?: Function, difficultyScore?: Function})
 *   => Array<Object>} sortSavedConfigs Copia ordenada: favoritos primero y
 *   después por `field` (`name`/`turno` comparan dentro de su rama; el resto
 *   al final con `dir`; campo desconocido → `0`). `subjects` y los lookups de
 *   dificultad se inyectan para `manana`/`tarde`/`deadHours`/`profScore`/
 *   `sameGroup`.
 * @property {(estado: Object, config: Object) => Object} applyConfigToState
 *   Mutante de `loadConfig`: copia `selectedSubjects`, clona en profundidad
 *   `groupChoices` y asigna `apellido`/`turnoPreferente`; devuelve el MISMO
 *   `estado`. Sin DOM/store/persistencia (siguen en `app.js`).
 * @property {(configs: Array<Object>, id: number|string) => Array<Object>}
 *   removeConfigById Copia filtrada sin el `id` indicado (el llamante
 *   reasigna su binding).
 * @property {(config: Object, exportedAt: string) => Object}
 *   buildSingleConfigExport `{version: 1, type: 'ugr-horario-config',
 *   exportedAt, config}` con `config` clonada en profundidad; `exportedAt` es
 *   ISO y lo aporta el llamante (dominio puro, testeable).
 * @property {(configs: Array<Object>, exportedAt: string) => Object}
 *   buildBatchConfigExport Mismo contrato con `type: 'ugr-horario-configs-batch'`
 *   y `configs` clonados.
 * @property {(data: Object) => Array<Object>|null} parseConfigImport Valida un
 *   JSON importado: single → `[config]`, batch → `configs`, resto → `null`.
 *   NO asigna `id` (eso es efecto de `app.js`); `data` nulo lanza como legacy.
 * @property {(name: string) => string} configFilename
 *   `config-${name.replace(/\s+/g, '-').toLowerCase()}.json`.
 * @property {(blocks: Array<Object>, config: Object, subjects: Array) => boolean}
 *   isConfigBlocked `true` si algún bloqueo activo excluye la config:
 *   `subject` (materia seleccionada + misma teoría), `subject-only` (materia
 *   seleccionada) o `curso` (alguna materia del curso con esa teoría). El
 *   ALMACENAMIENTO de `blocks` sigue en el store (lo inyecta el llamante con
 *   `getBlocks()`); tipo desconocido → `false`.
 * @property {(type: string, values: {subject?: string, group?: string,
 *   curso?: string, cursoGroup?: string}) => Object|null} buildBlockPayload
 *   Payload del comando `blocks/add` a partir de los valores crudos de los
 *   selects del panel (`curso` → `parseInt`); `null` si falta algún valor
 *   obligatorio o el `type` es desconocido — el llamante hace `return` sin
 *   re-renderizar, como el guard legacy.
 * @property {(configs: Array<Object>, opts?: {sortField?: string, sortDir?:
 *   'asc'|'desc', showFavoritesOnly?: boolean, maxManana?: number,
 *   maxTarde?: number, blocks?: Array, subjects?: Array, dificultad?: Function,
 *   difficultyScore?: Function}) => Array<Object>} selectVisibleConfigs
 *   Pipeline puro de `renderSavedConfigs`: ordena (favoritos primero + la
 *   columna elegida) y descarta bloqueadas, no favoritas si
 *   `showFavoritesOnly` y las que superen los techos `maxManana`/`maxTarde`
 *   (`0` = sin techo). No muta la entrada; `blocks`/`subjects` los inyecta el
 *   llamante (`getBlocks()`/`SUBJECTS`).
 * @property {(list: Array<Object>, page?: number, pageSize?: number) =>
 *   {totalEntries: number, totalPages: number, page: number,
 *   entries: Array<Object>}} paginateConfigs Recorta la lista visible a la
 *   página pedida: `totalPages` ≥ 1 y `page` siempre dentro de `[1,
 *   totalPages]` (fuera de rango → primera/última); `entries` es el slice de
 *   esa página.
 */

/**
 * Adaptador de datos clásicos (`src/app/adapters/legacyData.js`).
 *
 * Esos datos se declaran con `const`/`let` en el global lexical de scripts
 * clásicos y NO son propiedades de `window`, así que un módulo ESM no puede
 * resolverlos por nombre: llegan a la composición como referencias o thunks.
 * `PROPUESTAS` es `let` y `app.js` la reasigna en `loadPropuestas`, por eso se
 * expone como thunk que se invoca en cada lectura (una referencia directa
 * quedaría congelada en el valor del arranque).
 *
 * @typedef {Object} UgrLegacyData
 * @property {() => Array} getSubjects `SUBJECTS` (materias por defecto, con las
 *   ediciones locales encima).
 * @property {() => Array} getDefaultSubjects `DEFAULT_SUBJECTS` (copia inicial).
 * @property {() => Array} getConvalidaciones `CONVALIDACIONES`.
 * @property {() => Array|null} getPropuestas `PROPUESTAS`; puede ser `null`
 *   antes de poblarse, leer siempre vía thunk.
 * @property {() => Array} getDocentes `DOCENTES`.
 */

/**
 * Persistencia residual legacy (`src/app/adapters/persistence.js`). Cubre solo
 * las claves de `localStorage` que hoy escribe `app.js` fuera del store;
 * `selection`, `blocks`, `propuestas` del store, `ui.compareIds` y `progress`
 * son dominio de los comandos/selectores del store y no pasan por aquí.
 *
 * @typedef {Object} UgrPersistence
 * @property {() => Array} loadSavedConfigs Configuraciones guardadas en las
 *   ranuras `ugr-horario-saved-configs-0/1/2`; JSON corrupto ignorado por
 *   ranura.
 * @property {(list: Array) => void} saveAllConfigs Vacía las tres ranuras y
 *   reparte la lista round-robin.
 * @property {() => Array} loadSolverFilters Filtros `ugr-solver-filters`.
 * @property {(filters: Array) => void} saveSolverFilters
 * @property {() => Array|null} loadSubjects Snapshot `ugr-horario-subjects`;
 *   `null` cuando no hay snapshot utilizable (el llamante conserva sus datos
 *   actuales, como hacía el monolito).
 * @property {(list: Array) => void} saveSubjects
 * @property {() => Array} loadSavedPropuestas `ugr-propuestas-guardadas`.
 * @property {(list: Array) => void} saveSavedPropuestas
 * @property {() => Object|null} loadDegradedState Espejo `ugr-horario-state`
 *   del modo degradado; `null` si no existe o el JSON está roto.
 * @property {(state: Object) => void} saveDegradedState
 */

/**
 * Ciclo de vida de un feature extraído del monolito. `mount` instala listeners
 * y render una sola vez; `destroy` retira exactamente lo que instaló, para que
 * un reinicio desde devtools no deje callbacks duplicados.
 *
 * @typedef {Object} UgrFeature
 * @property {(root: Element, deps: UgrAppDependencies) => void} mount Monta el
 *   feature bajo `root` usando solo las dependencias inyectadas.
 * @property {() => void} destroy Desmonta listeners, timers y nodos creados por
 *   `mount`; debe ser seguro de llamar más de una vez.
 */

export {};
