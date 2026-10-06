/* ═══════════════════════════════════════════════════════════════
   UGR Horario - App Logic
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────
  const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
  const DAY_LABELS = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes' };
  const START_HOUR = 8;
  const END_HOUR = 21;
  let compareIds = [];

  let state = {
    selectedSubjects: {},  // { codigo: true }
    groupChoices: {},      // { codigo: { teoria: letra, practica: subgrupo } }
    apellido: '',
    turnoPreferente: 'indiferente',
    cuatrimestreActivo: 1,
    propuestas: [],
    propuestaActivaId: null,
    vistaConvalidaciones: 'oficial',
  };

  const CONFIG_STORAGE_SLOTS = 3;

  function getStorageKey(slot) {
    return `ugr-horario-saved-configs-${slot}`;
  }

  function saveAllConfigs(list) {
    // Delegación B4-e: la implementación vive en el adaptador ESM.
    getPersistence().saveAllConfigs(list);
  }

  // B4-e: la carga real se hace en `init()` (vía `getPersistence().loadSavedConfigs()`),
  // cuando la composición ESM ya está montada. Este IIFE es un script clásico:
  // no puede resolver el `import()` del adaptador durante la evaluación del
  // cierre, así que aquí solo se siembra el binding vacío. Mientras `init()`
  // no haya terminado, cualquier lector ve `[]` en lugar de una copia legacy.
  let savedConfigs = [];
  let savedPropuestasInternas = JSON.parse(localStorage.getItem('ugr-propuestas-guardadas') || '[]');
  let configSortField = 'name';
  let configSortDir = 'asc';
  // Bloqueos de configuraciones: viven en el store (persistidos en IDB).
  // Fallback local si el store no está disponible (modo degradado).
  let localBlockFilters = [];
  let blockStoreSubscribed = false;

  function getBlocks() {
    if (window.__ugrStore && typeof window.__ugrStore.getState === 'function') {
      const state = window.__ugrStore.getState();
      return state && Array.isArray(state.blocks) ? state.blocks : [];
    }
    return localBlockFilters;
  }

  function dispatchBlock(cmd) {
    if (window.__ugrStore && typeof window.__ugrStore.dispatch === 'function') {
      window.__ugrStore.dispatch(cmd);
    } else {
      // Fallback: aplicar localmente y re-renderizar
      if (cmd.type === 'blocks/add') {
        localBlockFilters.push(cmd.payload);
      } else if (cmd.type === 'blocks/remove') {
        localBlockFilters.splice(cmd.payload.index, 1);
      } else if (cmd.type === 'blocks/setAll') {
        localBlockFilters = cmd.payload.blocks || [];
      }
      renderBlockFilters();
      renderSavedConfigs();
    }
  }

  function ensureBlockStoreSubscription() {
    if (blockStoreSubscribed) return;
    if (window.__ugrStore && typeof window.__ugrStore.subscribe === 'function') {
      window.__ugrStore.subscribe(() => {
        renderBlockFilters();
        renderSavedConfigs();
      });
      blockStoreSubscribed = true;
    }
  }

  // ─── Perfil en el store (Fase B) ────────────────────────────
  // `state.apellido`/`state.turnoPreferente` siguen siendo la caché que lee el
  // render: el store es la capa de persistencia (C3) y la verdad que viaja a
  // IndexedDB, mientras que `saveState()` solo toca localStorage en modo
  // degradado.
  function __getStore() {
    return (window.__ugrStore && typeof window.__ugrStore.getState === 'function') ? window.__ugrStore : null;
  }

  // El store solo manda como persistencia si bootstrap lo abrió y el IndexedDB
  // está disponible. En modo degradado `initStore()` deja igualmente un estado
  // en memoria (no persistible), así que sin este corte app.js dejaría de
  // escribir localStorage y los cambios del usuario se perderían al recargar.
  function isStoreAuthoritative() {
    return !!(__getStore() && !window.__ugrDegraded);
  }

  function dispatchStore(cmd) {
    const store = __getStore();
    if (store && typeof store.dispatch === 'function') store.dispatch(cmd);
  }

  // Ningún `push...ToStore()` puede correr antes de que `loadState()` hidrate la
  // caché: un `state` por defecto (vacío) llegaría al store como un
  // `selection/setAll` destructivo y borraría datos ya migrados. `saveState()`
  // es alcanzable antes de terminar el arranque (p. ej. desde catálogos), de
  // ahí la guarda en el origen y no solo en `init()`.
  let stateHydrated = false;

  function pushProfileToStore() {
    if (!stateHydrated || !__getStore()) return;
    dispatchStore({ type: 'profile/setApellido', payload: { apellido: state.apellido || '' } });
    dispatchStore({ type: 'profile/setTurno', payload: { turno: state.turnoPreferente || 'indiferente' } });
  }

  function hydrateProfileFromStore() {
    const store = __getStore();
    if (!store) return;
    const p = store.getState() && store.getState().profile;
    if (!p) return;
    if (typeof p.apellido === 'string') state.apellido = p.apellido;
    if (typeof p.turnoPreferente === 'string') state.turnoPreferente = p.turnoPreferente;
  }

  function ensureProfileStoreSubscription() {
    const store = __getStore();
    if (!store || typeof store.subscribe !== 'function') return;
    store.subscribe(() => hydrateProfileFromStore());
  }

  // ─── Selección en el store ─────────────────────────────────
  // `state.selectedSubjects`/`state.groupChoices`/`state.cuatrimestreActivo`
  // siguen siendo la caché que lee el render: el store es la persistencia y el
  // destino de la verdad de la migración legacy (selection/setAll).
  function pushSelectionToStore() {
    if (!stateHydrated) return;
    const store = __getStore();
    if (!store) return;
    // Copias profundas: el reducer clona igualmente, pero el payload no debe
    // compartir referencias con la caché local (mutaciones posteriores del
    // usuario no deben reescribir un dispatch ya emitido).
    dispatchStore({ type: 'selection/setAll', payload: {
      selectedSubjects: { ...state.selectedSubjects },
      groupChoices: JSON.parse(JSON.stringify(state.groupChoices)),
      cuatrimestreActivo: state.cuatrimestreActivo,
    }});
  }

  function hydrateSelectionFromStore() {
    const store = __getStore();
    if (!store) return;
    const s = store.getState();
    if (!s || !s.selection) return;
    // No pisar el estado local con un store vacío (arranque pre-migración:
    // userState inicial sin datos de selección). Si el store sí tiene datos,
    // la caché local pasa a ser un espejo del store.
    if (Object.keys(s.selection.selectedSubjects || {}).length || Object.keys(s.selection.groupChoices || {}).length) {
      state.selectedSubjects = { ...s.selection.selectedSubjects };
      state.groupChoices = JSON.parse(JSON.stringify(s.selection.groupChoices || {}));
    }
    if (s.selection.cuatrimestreActivo === 1 || s.selection.cuatrimestreActivo === 2) {
      state.cuatrimestreActivo = s.selection.cuatrimestreActivo;
    }
  }

  function ensureSelectionStoreSubscription() {
    const store = __getStore();
    if (!store || typeof store.subscribe !== 'function') return;
    store.subscribe(() => hydrateSelectionFromStore());
  }

  // ─── Propuestas en el store ─────────────────────────────────
  // `state.propuestas`/`state.propuestaActivaId`/`state.vistaConvalidaciones`
  // siguen siendo la caché que lee el render: el store es la persistencia.
  // El orden importa: `propuestas/setAll` resetea `activeId` al primer item,
  // así que `setActive` tiene que emitirse después.
  function pushPropuestasToStore() {
    if (!stateHydrated) return;
    const store = __getStore ? __getStore() : null;
    if (!store) return;
    dispatchStore({ type: 'propuestas/setAll', payload: { items: state.propuestas || [] } });
    dispatchStore({ type: 'propuestas/setActive', payload: { id: state.propuestaActivaId || null } });
    dispatchStore({ type: 'propuestas/setVista', payload: { vista: state.vistaConvalidaciones || 'oficial' } });
  }

  function hydratePropuestasFromStore() {
    const store = __getStore ? __getStore() : null;
    if (!store) return;
    const s = store.getState();
    if (!s || !s.propuestas) return;
    // Store vacío (arranque pre-migración): no pisar la caché local, que es
    // la que acaba de cargar localStorage. Con datos, el store manda.
    if (Array.isArray(s.propuestas.items) && s.propuestas.items.length) {
      state.propuestas = JSON.parse(JSON.stringify(s.propuestas.items));
      state.propuestaActivaId = s.propuestas.activeId || (state.propuestas[0] ? state.propuestas[0].id : null);
    }
    if (s.propuestas.vista) state.vistaConvalidaciones = s.propuestas.vista;
  }

  // `compareIds` no se guarda en localStorage (es efímero), pero sí vive en el
  // store para sobrevivir a un reload: `loadState()` lo hidrata al arrancar y
  // los toggle lo reenvían.
  function pushCompareIdsToStore() {
    if (!stateHydrated) return;
    const store = __getStore ? __getStore() : null;
    if (!store) return;
    dispatchStore({ type: 'ui/setCompareIds', payload: { ids: Array.isArray(compareIds) ? [...compareIds] : [] } });
  }

  function hydrateCompareIdsFromStore() {
    const store = __getStore();
    if (!store) return;
    const ui = store.getState() && store.getState().ui;
    if (ui && Array.isArray(ui.compareIds)) compareIds = [...ui.compareIds];
  }

  // Corte único entre "el store existe" y "el store tiene datos de usuario".
  // Un userState recién creado (o solo con defaults de Fase 5) no debe ganarle
  // a un `ugr-horario-state` legacy que aún no se ha migrado: en ese caso la
  // caché sigue el fallback y el push posterior siembra el store.
  function storeHasUserData(s) {
    if (!s) return false;
    const p = s.profile || {};
    if ((p.apellido && p.apellido.trim()) || (p.turnoPreferente && p.turnoPreferente !== 'indiferente')) return true;
    const sel = s.selection || {};
    if (Object.keys(sel.selectedSubjects || {}).length) return true;
    if (Object.keys(sel.groupChoices || {}).length) return true;
    if (s.propuestas && Array.isArray(s.propuestas.items) && s.propuestas.items.length) return true;
    if (s.ui && Array.isArray(s.ui.compareIds) && s.ui.compareIds.length) return true;
    if (s.blocks && s.blocks.length) return true;
    const progress = s.progress || {};
    if (progress.credits && Object.keys(progress.credits).length) return true;
    if (Array.isArray(progress.equivalences) && progress.equivalences.length) return true;
    return false;
  }

  // Hidratación única de las cuatro rebanadas que app.js cachea. Devuelve true
  // si el store aportó datos; false = store virgen → el llamante cae al
  // fallback legacy. Se llama solo desde `loadState()`; la reactividad en vivo
  // la hacen las suscripciones de cada rebanada.
  function hydrateAllFromStore() {
    const store = isStoreAuthoritative() ? __getStore() : null;
    if (!store) return false;
    const s = store.getState();
    if (!storeHasUserData(s)) return false;
    hydrateProfileFromStore();
    hydrateSelectionFromStore();
    hydratePropuestasFromStore();
    hydrateCompareIdsFromStore();
    return true;
  }

  function ensurePropuestasStoreSubscription() {
    const store = __getStore ? __getStore() : null;
    if (!store || typeof store.subscribe !== 'function') return;
    // Solo hidratación: nunca dispatch desde aquí, o el store re-notificaría
    // en bucle infinito.
    store.subscribe(() => hydratePropuestasFromStore());
  }

  let configMaxManana = 0;
  let configMaxTarde = 0;
  let configPage = 1;
  let configShowFavoritesOnly = false;
  const CONFIG_PAGE_SIZE = 50;

  // ─── Solver (Fase 1) ────────────────────────────────────────
  const SOLVER_FILTER_TYPES = [
    'freeDays', 'maxDays', 'maxMorningDays', 'maxAfternoonDays',
    'earliestStart', 'latestEnd', 'blockGroups', 'preferTurno', 'maxGaps',
  ];
  let solverResults = [];
  let solverFilters = loadSolverFilters();
  let solverBusy = false;
  let solverRunSeq = 0;
  let solverIdSeq = 1000000000;

  const SOLVER_STRATEGIES = {
    balanced:   { label: 'Equilibrado',        weights: { deadHours: 1, days: 0.8, afternoons: 0.6, mornings: 0, earlyStart: 0.4, loadVariance: 0.5, filters: 1, professor: 0.5 } },
    professors: { label: 'Mejores profesores', weights: { professor: 1000, deadHours: 1, days: 0.3, afternoons: 0, mornings: 0, earlyStart: 0.2, loadVariance: 0.2, filters: 1 } },
    morning:    { label: 'Priorizar mañana',   weights: { afternoons: 1000, professor: 1, deadHours: 0.5, days: 0.3, mornings: 0, earlyStart: 0.2, loadVariance: 0.2, filters: 1 } },
    afternoon:  { label: 'Priorizar tarde',    weights: { mornings: 1000, professor: 1, deadHours: 0.5, days: 0.3, afternoons: 0, earlyStart: 0.2, loadVariance: 0.2, filters: 1 } },
    compact:    { label: 'Menos horas muertas', weights: { deadHours: 1000, professor: 1, days: 0.3, afternoons: 0, mornings: 0, earlyStart: 0.2, loadVariance: 0.2, filters: 1 } },
    shortWeek:  { label: 'Menos días',         weights: { days: 1000, deadHours: 1, professor: 0.5, afternoons: 0, mornings: 0, earlyStart: 0.2, loadVariance: 0.2, filters: 1 } },
  };
  let solverStrategy = localStorage.getItem('ugr-solver-strategy') || 'balanced';
  if (!SOLVER_STRATEGIES[solverStrategy]) solverStrategy = 'balanced';

  const DEFAULT_SUBJECTS = JSON.parse(JSON.stringify(SUBJECTS));

  let convalidacionesEstados = JSON.parse(localStorage.getItem('ugr-convalidaciones') || '{}');

  let PROPUESTAS = JSON.parse(localStorage.getItem('ugr-propuestas') || 'null');

  let conflicts = [];

  // ─── Init ───────────────────────────────────────────────────
  async function init() {
    console.log('UGR Horario v1.0.0');
    // Composición ESM (Bloque 1) al PRINCIPIO: cualquier render/persistencia
    // posterior (y las funciones de dominio delegadas) necesitan `ugrAppInstance`
    // ya montado. No fatal si el import falla — el monolito sigue siendo la
    // fachada operativa y `getDomain()` avisará solo si alguien lo consulta.
    await ensureUgrApp();
    // B4-e: las configuraciones guardadas se cargan aquí, cuando la composición
    // ESM (y su adaptador de persistencia) ya está montada. Si el import o el
    // adaptador fallan, arranca sin configs en vez de romper.
    try { savedConfigs = getPersistence().loadSavedConfigs(); } catch (e) { savedConfigs = []; }
    // B3-b: la vista de materias vive en ESM (features/subjects.js). Se monta
    // antes del primer `renderSubjects()` para que ese render ya delegue; no
    // fatal si el import falla — la delegación queda en no-op.
    await ensureSubjectsView();
    // B3-c: los controles de vista del calendario (semana/lista + compacto)
    // viven en ESM. Se cargan antes de `setupActions()` para que ese montaje
    // ya encuentre el feature; no fatal si el import falla — la delegación y
    // el montaje quedan en no-op.
    await ensureCalendarViewFeature();
    const catalogCodesChanged = await bootstrapCatalogState();
    loadPropuestas();
    // Orden de arranque (C3): HIDRATAR → SUSCRIBIR → PUSH.
    // 1) `loadState()` trae lo ya persistido (store si tiene datos de usuario,
    //    si no el espejo legacy) y solo entonces levanta `stateHydrated`, la
    //    guarda que bloquea cualquier push hecho con la caché por defecto.
    // 2) Las suscripciones van después: la hidratación inicial es un paso
    //    único y controlado; en vivo, cada dispatch del store re-sincroniza.
    // 3) Con la caché ya igualada al store, los pushes vuelcan lo cargado de
    //    localStorage si el store estaba virgen (siembra) y son no-op si no.
    loadState();
    ensureProfileStoreSubscription();
    ensureSelectionStoreSubscription();
    ensurePropuestasStoreSubscription();
    pushProfileToStore();
    pushSelectionToStore();
    pushPropuestasToStore();
    pushCompareIdsToStore();
    if (catalogCodesChanged && pruneSelectionsToActiveCatalog()) saveState();
    renderSubjects();
    setupTabs();
    setupConfig();
    setupActions();
    setupNavigation();
    setupPropuestas();
    setupCatalogUI();
    updateAll();
    checkUrlShare();
    checkUrlPropuesta();
    renderBlockFilters();
    ensureBlockStoreSubscription();
    setupSolver();
  }

  // ─── Persistencia ───────────────────────────────────────────
  function saveState() {
    // Antes de hidratar, la caché sigue en sus defaults: escribir ahora (al
    // espejo o al store) borraría datos ya persistidos por el usuario.
    if (!stateHydrated) return;
    if (window.__ugr && window.__ugr.legacy && window.__ugr.legacy.start) {
      window.dispatchEvent(new CustomEvent("ugr:stateChanged", { detail: state }));
    }
    if (isStoreAuthoritative()) {
      // Modo normal: el store (IDB) es la única persistencia y el espejo
      // `ugr-horario-state` queda retirado (no se mantiene una segunda verdad
      // que además quedaría congelada desde C3). `vistaConvalidaciones` solo
      // cambia por aquí, de ahí que lo cubra pushPropuestas; compareIds por si
      // algún camino mutó la caché sin pasar por toggleCompareId. El perfil se
      // envía también porque hay rutas (p. ej. importar configuración) que
      // cambian `state.apellido` sin pasar por su input handler.
      pushProfileToStore();
      pushSelectionToStore();
      pushPropuestasToStore();
      pushCompareIdsToStore();
      return;
    }
    // Modo degradado (sin IndexedDB): el store en memoria no sobrevive al
    // reload, así que localStorage vuelve a ser la única garantía.
    localStorage.setItem('ugr-horario-state', JSON.stringify(state));
  }

  function calcPropuestaCreditos(p) {
    // Delegación T02.5: la única implementación vive en ESM (src/app/domain).
    return getDomain().calcPropuestaCreditos(p);
  }

  function loadState() {
    // 1) Fuente de verdad: el store. Solo manda si bootstrap lo abrió, el IDB
    //    está disponible y trae datos de usuario; un store virgen (arranque
    //    limpio o migración pendiente) cae al fallback de abajo para no tapar
    //    con defaults lo que haya en el espejo legacy.
    if (!hydrateAllFromStore()) {
      // 2) Fallback legacy / pre-migración / degradado: espejo C3 previo.
      try {
        const saved = localStorage.getItem('ugr-horario-state');
        if (saved) {
          const parsed = JSON.parse(saved);
          state = { ...state, ...parsed };
        }
      } catch (e) { /* ignore corrupt mirror */ }
    }
    // La caché ya refleja lo persistido: a partir de aquí se permiten los
    // pushes (fin de la ventana en la que un estado vacío podría pisar datos).
    stateHydrated = true;
    // Migración propuestas
    if (!state.propuestas || !Array.isArray(state.propuestas) || state.propuestas.length === 0) {
      if (PROPUESTAS && PROPUESTAS.length > 0) {
        state.propuestas = PROPUESTAS;
      } else if (typeof PROPUESTAS_INICIALES !== 'undefined') {
        state.propuestas = JSON.parse(JSON.stringify(PROPUESTAS_INICIALES));
      }
      state.propuestaActivaId = state.propuestas[0] ? state.propuestas[0].id : null;
      state.vistaConvalidaciones = 'oficial';
      saveState();
      savePropuestas();
    }
    // Migrar vieja prop-foto con 9 filas 1-a-1 a bloque 4↔4
    state.propuestas.forEach(p=>{
      if (p.id==='prop-foto-54' && p.mappings.length===9 && !p.mappings.some(m=>m.tipo==='bloque')) {
        const first4 = p.mappings.slice(0,4);
        const rest = p.mappings.slice(4);
        p.mappings = [{ tipo:'bloque', id:'bloque-1-4', cursadas: first4.map(m=>({codigo:m.cursadaCodigo,nombre:m.cursada})), reconocidas: first4.map(m=>({codigo:m.reconocidaCodigo,nombre:m.reconocida})), creditos:24, calificacion:7.5, nota:'Bloque 4↔4 — concesión conjunta' }, ...rest];
        p.totalCreditos = calcPropuestaCreditos(p);
      }
      // Recalcular total por si desfasado
      p.totalCreditos = calcPropuestaCreditos(p);
    });
    if (!state.vistaConvalidaciones) state.vistaConvalidaciones = 'oficial';
    // Restore UI from state
    const apellidoInput = document.getElementById('apellido');
    const turnoSelect = document.getElementById('turno-preferente');
    if (apellidoInput) apellidoInput.value = state.apellido || '';
    if (turnoSelect) turnoSelect.value = state.turnoPreferente || 'indiferente';
  }

  function loadPropuestas() {
    try {
      if (PROPUESTAS === null) {
        if (typeof PROPUESTAS_INICIALES !== 'undefined') {
          PROPUESTAS = JSON.parse(JSON.stringify(PROPUESTAS_INICIALES));
          localStorage.setItem('ugr-propuestas', JSON.stringify(PROPUESTAS));
        } else {
          PROPUESTAS = [];
        }
      }
    } catch (e) { PROPUESTAS = []; }
  }

  function savePropuestas() {
    PROPUESTAS = state.propuestas;
    localStorage.setItem('ugr-propuestas', JSON.stringify(PROPUESTAS));
    pushPropuestasToStore();
  }

  function resolveUgrCodigo(codigo) {
    if (!codigo) return codigo;
    const up = String(codigo).toUpperCase().trim();
    const equivalencias = typeof EQUIVALENCIA_CODIGOS !== 'undefined' ? EQUIVALENCIA_CODIGOS : {};
    if (equivalencias[up]) return equivalencias[up];
    return codigo;
  }
  function getUgrMeta(codigo) {
    if (!codigo) return null;
    const up = String(codigo).toUpperCase().trim();
    if (up==='OPT' || up==='OPTATIVAS' || up==='CREDITOS_OPTATIVOS') return { curso: 'Opt', cuatrimestre: '-', nombre: 'Créditos Optativos', codigoReal: 'OPT' };
    const real = resolveUgrCodigo(codigo);
    const s = SUBJECTS.find(x=> x.codigo===real);
    if (s) return { curso: s.curso, cuatrimestre: s.cuatrimestre, nombre: s.nombre, codigoReal: real };
    if (typeof CONVALIDACIONES !== 'undefined') {
      const c = CONVALIDACIONES.find(x=> x.ugr && (x.ugr.codigo===codigo || x.ugr.codigo===real));
      if (c && c.ugr) {
        const s2 = SUBJECTS.find(x=> x.codigo===c.ugr.codigo);
        if (s2) return { curso: s2.curso, cuatrimestre: s2.cuatrimestre, nombre: s2.nombre, codigoReal: s2.codigo };
        return { curso: '-', cuatrimestre: '-', nombre: c.ugr.nombre, codigoReal: c.ugr.codigo };
      }
    }
    return null;
  }
  function formatCursoCuatri(meta) {
    if (!meta || meta.curso==='-' || meta.curso==null) return '';
    if (meta.curso==='Opt') return 'Optativa';
    return `${meta.curso}º · ${meta.cuatrimestre}ºC`;
  }
  let propuestasSortCurso = null; // null | 'asc' | 'desc'
  function sortMappingsByCurso(mappings) {
    if (!propuestasSortCurso) return mappings;
    const copy=[...mappings];
    const getCurso = (m)=>{
      if (m.tipo==='bloque') {
        const cursos = m.reconocidas.map(r=>{ const meta=getUgrMeta(r.codigo); const v=meta? meta.curso : 99; return v==='Opt'? 5 : v; }).filter(c=>typeof c==='number');
        return cursos.length ? Math.min(...cursos) : 99;
      }
      const meta=getUgrMeta(m.reconocidaCodigo);
      if (!meta) return 99;
      return meta.curso==='Opt' ? 5 : meta.curso;
    };
    const getCuatri = (m)=>{
      if (m.tipo==='bloque') return 0;
      const meta=getUgrMeta(m.reconocidaCodigo);
      return meta ? meta.cuatrimestre : 99;
    };
    copy.sort((a,b)=>{
      const ca=getCurso(a), cb=getCurso(b);
      if (ca!==cb) return propuestasSortCurso==='asc' ? ca-cb : cb-ca;
      const qa=getCuatri(a), qb=getCuatri(b);
      if (qa!==qb) return propuestasSortCurso==='asc' ? qa-qb : qb-qa;
      const codeA = a.tipo==='bloque' ? a.reconocidas[0]?.codigo : a.reconocidaCodigo;
      const codeB = b.tipo==='bloque' ? b.reconocidas[0]?.codigo : b.reconocidaCodigo;
      return propuestasSortCurso==='asc' ? String(codeA).localeCompare(String(codeB)) : String(codeB).localeCompare(String(codeA));
    });
    return copy;
  }
  function getUgrOptions() {
    const seen = new Map();
    SUBJECTS.forEach(s=> { if(!seen.has(s.codigo)) seen.set(s.codigo, s.nombre); });
    if (typeof CONVALIDACIONES !== 'undefined') CONVALIDACIONES.forEach(c=>{ if(c.ugr && !seen.has(c.ugr.codigo)) seen.set(c.ugr.codigo, c.ugr.nombre); });
    if (!seen.has('OPT')) seen.set('OPT', 'Créditos Optativos');
    return Array.from(seen.entries()).map(([codigo,nombre])=>({codigo,nombre})).sort((a,b)=>{
      if (a.codigo==='OPT') return 1;
      if (b.codigo==='OPT') return -1;
      return a.codigo.localeCompare(b.codigo);
    });
  }
  function getUnedOptions() {
    const seen = new Map();
    if (typeof CONVALIDACIONES !== 'undefined') CONVALIDACIONES.forEach(c=>{ if(c.uned && !seen.has(c.uned.codigo)) seen.set(c.uned.codigo, c.uned.nombre); });
    if (typeof PROPUESTAS_INICIALES !== 'undefined') PROPUESTAS_INICIALES.forEach(p=> p.mappings.forEach(m=>{
      if(m.cursadaCodigo && m.cursada) seen.set(m.cursadaCodigo, m.cursada);
      if(m.cursadas) m.cursadas.forEach(cc=> seen.set(cc.codigo, cc.nombre));
    }));
    // Añadir DAW como opción genérica (usa el mismo código que la propuesta foto)
    if (!seen.has('901020+DAW')) seen.set('901020+DAW', 'Fundamentos de Programación (T.S. en Desarrollo de Aplicaciones Web) — DAW');
    if (!seen.has('DAW')) seen.set('DAW', 'DAW — T.S. en Desarrollo de Aplicaciones Web');
    // Ordenar: DAW primero, resto por código
    const arr = Array.from(seen.entries()).map(([codigo,nombre])=>({codigo,nombre}));
    arr.sort((a,b)=>{
      if(a.codigo==='DAW') return -1;
      if(b.codigo==='DAW') return 1;
      return a.codigo.localeCompare(b.codigo);
    });
    return arr;
  }
  function populateMapeoSelects() {
    const ugrSel = document.getElementById('mapeo-reconocida-select');
    const unedSel = document.getElementById('mapeo-cursada-select');
    if (ugrSel) {
      const opts = getUgrOptions();
      ugrSel.innerHTML = '<option value="">-- Selecciona UGR --</option>' + opts.map(o=>{
        const meta=getUgrMeta(o.codigo);
        const extra = meta ? ` · ${formatCursoCuatri(meta)}` : '';
        return `<option value="${o.codigo}|${o.nombre}">${o.codigo} - ${o.nombre}${extra}</option>`;
      }).join('');
    }
    if (unedSel) {
      const opts = getUnedOptions();
      unedSel.innerHTML = '<option value="">-- Selecciona UNED / DAW --</option>' + opts.map(o=>`<option value="${o.codigo}|${o.nombre}">${o.codigo} - ${o.nombre}</option>`).join('');
    }
  }

  // ─── Tabs ───────────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.cuatrimestreActivo = parseInt(tab.dataset.cuatrimestre);
        renderSubjects();
        updateControlPanel();
      });
    });
    // Activate correct tab
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', parseInt(tab.dataset.cuatrimestre) === state.cuatrimestreActivo);
    });
  }

  // ─── Config ─────────────────────────────────────────────────
  function setupConfig() {
    document.getElementById('apellido').addEventListener('input', (e) => {
      state.apellido = e.target.value.trim();
      // Escritura optimista local + espejo en el store (persiste en IDB).
      dispatchStore({ type: 'profile/setApellido', payload: { apellido: state.apellido } });
      applyApellidoRule();
      saveState();
      updateAll();
    });

    document.getElementById('turno-preferente').addEventListener('change', (e) => {
      state.turnoPreferente = e.target.value;
      // Escritura optimista local + espejo en el store (persiste en IDB).
      dispatchStore({ type: 'profile/setTurno', payload: { turno: state.turnoPreferente } });
      saveState();
      updateAll();
    });
  }

  // ─── Apellido Rule ──────────────────────────────────────────
  function getSubgrupoForApellido(apellido) {
    // Delegación B3-a: la única implementación vive en ESM
    // (src/app/domain/selection.js).
    return getDomain().getSubgrupoForApellido(apellido);
  }

  function applyApellidoRule() {
    // Guard legacy: sin tramo aplicable no se toca nada (ni se persiste).
    const subgrupoNum = getSubgrupoForApellido(state.apellido);
    if (!subgrupoNum) return;

    // Delegación B3-a: solo la mutación de `groupChoices` vive en ESM; la
    // persistencia sigue siendo responsabilidad de este monolito.
    getDomain().applyApellidoSubgroups(
      state.selectedSubjects,
      state.groupChoices,
      SUBJECTS,
      state.apellido
    );
    saveState();
  }

  // ─── Render Subjects ────────────────────────────────────────
  function renderSubjects() {
    // Delegación B3-b: el render y sus handlers viven en ESM
    // (src/app/features/subjects.js). Antes de que la vista esté montada
    // (o si su import falló) es un no-op: nunca se cae a una copia legacy.
    const view = getSubjectsView();
    if (view) view.render();
  }

  // ─── Update All ─────────────────────────────────────────────
  function updateAll() {
    detectConflicts();
    renderSubjects();
    renderGroupConfig();
    renderCalendar();
    renderConflicts();
    renderSummary();
    updateSummaryBar();
    updateButtons();
  }

  // ─── Get Active Schedule ────────────────────────────────────
  function getActiveSchedule() {
    // Delegación B3-a: la única construcción de entradas vive en ESM
    // (src/app/domain/calendar.js); este monolito solo inyecta el estado.
    return getDomain().buildActiveSchedule(state.selectedSubjects, state.groupChoices, SUBJECTS);
  }

  // ─── Config Metrics ─────────────────────────────────────────
  function calculateConfigMetrics(selectedSubjects, groupChoices) {
    // Delegación T02.4: la única implementación vive en ESM
    // (src/app/domain/metrics.js); aquí solo se inyectan los datos legacy.
    return getDomain().calculateConfigMetrics(selectedSubjects, groupChoices, {
      subjects: SUBJECTS,
      dificultad: getDificultad,
      difficultyScore: getDifficultyScore,
    });
  }

  function calculateConfigDeadHours(selectedSubjects, groupChoices) {
    // Delegación T02.4: la única implementación vive en ESM (metrics.js).
    return getDomain().calculateConfigDeadHours(selectedSubjects, groupChoices, {
      subjects: SUBJECTS,
    });
  }

  function calculateConfigDays(selectedSubjects, groupChoices) {
    // Delegación T02.4: la única implementación vive en ESM (metrics.js).
    return getDomain().calculateConfigDays(selectedSubjects, groupChoices, {
      subjects: SUBJECTS,
    });
  }

  function addBlockFilter(type) {
    // Delegación B4-c: validar y construir el payload es regla pura
    // (src/app/domain/configs.js `buildBlockPayload`); aquí solo se leen los
    // selects del panel. El `return` temprano con payload nulo es legacy: NO
    // se re-renderiza cuando la validación falla (ni con `type` desconocida,
    // que en ese caso solo re-renderiza, como siempre).
    if (type === 'subject' || type === 'subject-only' || type === 'curso') {
      const payload = getDomain().buildBlockPayload(type, {
        subject: (document.getElementById('block-subject-select') || {}).value,
        group: (document.getElementById('block-subject-group') || {}).value,
        curso: (document.getElementById('block-curso-select') || {}).value,
        cursoGroup: (document.getElementById('block-curso-group') || {}).value,
      });
      if (!payload) return;
      dispatchBlock({ type: 'blocks/add', payload });
    }
    configPage = 1;
    renderBlockFilters();
    renderSavedConfigs();
  }

  function removeBlockFilter(index) {
    dispatchBlock({ type: 'blocks/remove', payload: { index } });
    configPage = 1;
    renderBlockFilters();
    renderSavedConfigs();
  }

  function renderBlockFilters() {
    const panel = document.getElementById('block-filters-panel');
    if (!panel) return;

    const subjects = SUBJECTS.filter(s => s.grupos && s.grupos.length > 0);
    const allGroups = new Set();
    subjects.forEach(s => s.grupos.forEach(g => allGroups.add(g.letra)));
    const groupOptions = [...allGroups].sort().map(g => `<option value="${g}">${g}</option>`).join('');

    const cursoGroups = {};
    subjects.forEach(s => {
      if (!cursoGroups[s.curso]) cursoGroups[s.curso] = new Set();
      s.grupos.forEach(g => cursoGroups[s.curso].add(g.letra));
    });

    let html = '<div class="block-filters-container">';
    html += '<button class="btn btn-sm btn-secondary block-filters-toggle" id="btn-toggle-block-filters">';
    const blocks = getBlocks();
    html += `Bloqueos${blocks.length > 0 ? ` (${blocks.length})` : ''}`;
    html += '</button>';
    html += '<div class="block-filters-body" style="display:none">';

    if (blocks.length > 0) {
      html += '<div class="block-filters-active">';
      blocks.forEach((f, i) => {
        let label;
        if (f.type === 'subject') {
          label = `${f.codigo} \u00D7 Grupo ${f.letra}`;
        } else if (f.type === 'subject-only') {
          label = `${f.codigo} (todas)`;
        } else {
          label = `${f.curso}\u00BA Curso \u00D7 Grupo ${f.letra}`;
        }
        html += `<span class="block-chip">${label}<button class="block-chip-remove" data-block-idx="${i}">\u00D7</button></span>`;
      });
      html += '</div>';
    }

    html += '<div class="block-filters-form">';
    html += '<div class="block-filter-row">';
    html += '<span class="block-filter-label">Asignatura:</span>';
    html += '<select id="block-subject-select" class="block-filter-select">';
    html += '<option value="">Seleccionar...</option>';
    subjects.forEach(s => {
      html += `<option value="${s.codigo}">${s.nombre} (${s.curso}\u00BA)</option>`;
    });
    html += '</select>';
    html += '<select id="block-subject-group" class="block-filter-select"><option value="">Grupo</option></select>';
    html += '<button class="btn btn-sm btn-primary" data-block-add="subject">+ Bloquear</button>';
    html += '<button class="btn btn-sm btn-primary" data-block-add="subject-only">+ Bloquear Asig.</button>';
    html += '</div>';

    html += '<div class="block-filter-row">';
    html += '<span class="block-filter-label">Curso:</span>';
    html += '<select id="block-curso-select" class="block-filter-select">';
    html += '<option value="">Seleccionar...</option>';
    [1, 2, 3, 4].forEach(c => {
      html += `<option value="${c}">${c}\u00BA Curso</option>`;
    });
    html += '</select>';
    html += '<select id="block-curso-group" class="block-filter-select"><option value="">Grupo</option></select>';
    html += '<button class="btn btn-sm btn-primary" data-block-add="curso">+ Bloquear Curso</button>';
    html += '</div>';

    html += '<div class="block-filter-row">';
    html += '<span class="block-filter-label">M\u00E1x d\u00EDas:</span>';
    html += '<label class="day-filter-label">Ma\u00F1ana:</label>';
    html += '<input type="number" id="block-max-manana" class="block-filter-input" min="0" max="5" value="' + configMaxManana + '">';
    html += '<label class="day-filter-label">Tarde:</label>';
    html += '<input type="number" id="block-max-tarde" class="block-filter-input" min="0" max="5" value="' + configMaxTarde + '">';
    html += '<button class="btn btn-sm btn-primary" id="btn-apply-day-filter">Aplicar</button>';
    if (configMaxManana > 0 || configMaxTarde > 0) {
      html += '<button class="btn btn-sm btn-danger" id="btn-clear-day-filter">Limpiar</button>';
    }
    html += '</div>';

    html += '</div>';
    html += '</div>';
    html += '</div>';

    panel.innerHTML = html;

    panel.querySelector('#btn-toggle-block-filters').addEventListener('click', () => {
      const body = panel.querySelector('.block-filters-body');
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });

    panel.querySelectorAll('.block-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => removeBlockFilter(parseInt(btn.dataset.blockIdx)));
    });

    panel.querySelectorAll('[data-block-add]').forEach(btn => {
      btn.addEventListener('click', () => addBlockFilter(btn.dataset.blockAdd));
    });

    const subjectSelect = panel.querySelector('#block-subject-select');
    const subjectGroup = panel.querySelector('#block-subject-group');
    if (subjectSelect && subjectGroup) {
      subjectSelect.addEventListener('change', () => {
        const subj = subjects.find(s => s.codigo === subjectSelect.value);
        if (subj) {
          subjectGroup.innerHTML = '<option value="">Grupo</option>' +
            subj.grupos.map(g => `<option value="${g.letra}">${g.letra} (${g.turno})</option>`).join('');
        } else {
          subjectGroup.innerHTML = '<option value="">Grupo</option>';
        }
      });
    }

    const cursoSelect = panel.querySelector('#block-curso-select');
    const cursoGroup = panel.querySelector('#block-curso-group');
    if (cursoSelect && cursoGroup) {
      cursoSelect.addEventListener('change', () => {
        const c = parseInt(cursoSelect.value);
        if (c && cursoGroups[c]) {
          cursoGroup.innerHTML = '<option value="">Grupo</option>' +
            [...cursoGroups[c]].sort().map(g => `<option value="${g}">${g}</option>`).join('');
        } else {
          cursoGroup.innerHTML = '<option value="">Grupo</option>';
        }
      });
    }

    const applyDayBtn = panel.querySelector('#btn-apply-day-filter');
    if (applyDayBtn) {
      applyDayBtn.addEventListener('click', () => {
        const mananaInput = panel.querySelector('#block-max-manana');
        const tardeInput = panel.querySelector('#block-max-tarde');
        configMaxManana = parseInt(mananaInput.value) || 0;
        configMaxTarde = parseInt(tardeInput.value) || 0;
        configPage = 1;
        renderBlockFilters();
        renderSavedConfigs();
      });
    }

    const clearDayBtn = panel.querySelector('#btn-clear-day-filter');
    if (clearDayBtn) {
      clearDayBtn.addEventListener('click', () => {
        configMaxManana = 0;
        configMaxTarde = 0;
        configPage = 1;
        renderBlockFilters();
        renderSavedConfigs();
      });
    }
  }

  function getEntriesForConfig(config) {
    const savedSel = { ...state.selectedSubjects };
    const savedGrp = JSON.parse(JSON.stringify(state.groupChoices));
    state.selectedSubjects = { ...config.selectedSubjects };
    state.groupChoices = JSON.parse(JSON.stringify(config.groupChoices));
    const entries = getActiveSchedule();
    state.selectedSubjects = savedSel;
    state.groupChoices = savedGrp;
    return entries;
  }

  function renderMiniCalendar(container, entries) {
    let html = '<div class="cal-header"></div>';
    DAYS.forEach(d => { html += `<div class="cal-header">${DAY_LABELS[d]}</div>`; });
    for (let h = START_HOUR; h < END_HOUR; h++) {
      html += `<div class="cal-time">${h}:00</div>`;
      DAYS.forEach(dia => {
        html += `<div class="cal-cell" data-dia="${dia}" data-hour="${h}"></div>`;
      });
    }
    container.innerHTML = html;

    entries.forEach(entry => {
      const startMin = timeToMinutes(entry.inicio);
      const endMin = timeToMinutes(entry.fin);
      const startRow = Math.floor((startMin - START_HOUR * 60) / 60);
      const topOffset = ((startMin - START_HOUR * 60) % 60) / 60 * 100;
      const height = ((endMin - startMin) / 60) * 100;
      const cell = container.querySelector(`.cal-cell[data-dia="${entry.dia}"][data-hour="${START_HOUR + startRow}"]`);
      if (!cell) return;
      const eventDiv = document.createElement('div');
      eventDiv.className = 'cal-event';
      eventDiv.dataset.subject = entry.codigo;
      eventDiv.tabIndex = 0;
      eventDiv.setAttribute('role', 'group');
      // B3-d: la etiqueta accesible vive en el feature ESM; sin feature el
      // aria-label queda vacío (mismo no-op que el resto de delegaciones).
      const calView = getCalendarViewFeature();
      eventDiv.setAttribute('aria-label', calView ? calView.buildEventLabel(entry, false) : '');
      eventDiv.style.top = topOffset + '%';
      eventDiv.style.height = height + '%';
      eventDiv.innerHTML = `<div class="event-label">${entry.codigo}</div><div class="event-type">${entry.tipo}</div>`;
      if (entry.letra) {
        const diff = getDificultad(entry.codigo, entry.letra);
        if (diff) {
          const dot = document.createElement('span');
          dot.className = `event-diff-dot mini diff-${diff}`;
          dot.title = getDificultadLabel(diff);
          eventDiv.appendChild(dot);
        }
      }
      cell.style.position = 'relative';
      cell.appendChild(eventDiv);
    });
  }

  function toggleCompareId(id) {
    const idx = compareIds.indexOf(id);
    if (idx >= 0) {
      compareIds.splice(idx, 1);
    } else if (compareIds.length < 4) {
      compareIds.push(id);
    }
    // Mutación in-place sobre la caché: sin este push la selección a comparar
    // solo viviría en memoria.
    pushCompareIdsToStore();
    updateCompareButton();
    renderSavedConfigs();
  }

  function toggleFavorite(id) {
    const config = savedConfigs.find(c => c.id === id);
    if (config) {
      config.favorite = !config.favorite;
      saveAllConfigs(savedConfigs);
      renderSavedConfigs();
    }
  }

  function updateCompareButton() {
    const btn = document.getElementById('btn-compare-floating');
    const countEl = document.getElementById('compare-count');
    if (compareIds.length >= 2) {
      btn.style.display = 'flex';
      countEl.textContent = compareIds.length;
    } else {
      btn.style.display = 'none';
    }
  }

  function openCompare(ids) {
    const allConfigs = getDisplayConfigs();
    const configs = ids.map(id => allConfigs.find(c => c.id === id)).filter(Boolean);
    if (configs.length < 2) return;

    const container = document.getElementById('compare-content');
    let html = `<div class="compare-grid">`;

    configs.forEach(cfg => {
      html += `<div class="compare-side">`;
      html += `<div class="compare-label">${cfg.name}</div>`;
      html += `<div class="compare-calendar-wrap"><div class="compare-cal mini-calendar" data-cfg-id="${cfg.id}"></div></div>`;
      html += `</div>`;
    });

    html += '</div>';
    container.innerHTML = html;

    configs.forEach(cfg => {
      const calEl = container.querySelector(`.compare-cal[data-cfg-id="${cfg.id}"]`);
      if (calEl) renderMiniCalendar(calEl, getEntriesForConfig(cfg));
    });

    document.getElementById('compare-modal').style.display = 'flex';
  }

  // ─── Conflict Detection ─────────────────────────────────────
  function detectConflicts() {
    // Delegación T02.4: la detección pura vive en ESM (metrics.js);
    // este IIFE solo conserva la asignación a su array de estado.
    conflicts = getDomain().findConflicts(getActiveSchedule());
  }

  function timesOverlap(s1, e1, s2, e2) {
    // Delegación T02.x: la única implementación vive en ESM (src/app/domain).
    return getDomain().timesOverlap(s1, e1, s2, e2);
  }

  function timeToMinutes(t) {
    // Delegación T02.x: la única implementación vive en ESM (src/app/domain).
    return getDomain().timeToMinutes(t);
  }

  // ─── Professor Preferences Helpers ──────────────────────────
  function getProfKey(codigo, letra) {
    return codigo + '-' + letra;
  }

  const docentesByKey = (typeof DOCENTES !== 'undefined' && Array.isArray(DOCENTES) ? DOCENTES : [])
    .reduce((acc, d) => {
      if (d && d.key) acc[d.key] = d;
      return acc;
    }, {});

  function getDocentInfo(key) {
    return docentesByKey[key] || null;
  }

  function getDifficultyScore(dificultad) {
    const api = typeof window !== 'undefined' && window.__ugrCatalog ? window.__ugrCatalog : null;
    if (api && typeof api.difficultyScore === 'function') return api.difficultyScore(dificultad);
    return 3;
  }

  function getProfName(codigo, letra) {
    const info = getDocentInfo(getProfKey(codigo, letra));
    return info ? info.name : '';
  }

  function getProfRazon(codigo, letra) {
    const info = getDocentInfo(getProfKey(codigo, letra));
    return info && info.profile ? info.profile.razon : '';
  }

  function getDificultad(codigo, letra) {
    const info = getDocentInfo(getProfKey(codigo, letra));
    return info && info.profile && info.profile.dificultad ? info.profile.dificultad : null;
  }

  function getOpinion(codigo, letra) {
    const info = getDocentInfo(getProfKey(codigo, letra));
    return info && info.profile && info.profile.opinion ? info.profile.opinion : '';
  }

  function getDificultadLabel(d) {
    const map = { cyan:'Muy fácil', verde:'Fácil', amarillo:'Normal',
                  naranja:'Difícil', rojo:'Muy difícil', negro:'Extremo', gris:'Desconocido' };
    return map[d] || 'Desconocido';
  }

  function getDificultadColor(d) {
    const map = { cyan:'#00e5ff', verde:'#28a745', amarillo:'#ffc107',
                  naranja:'#fd7e14', rojo:'#dc3545', negro:'#1a1a1a', gris:'#6c757d' };
    return map[d] || '#6c757d';
  }

  // ─── Render Group Config ────────────────────────────────────
  function renderGroupConfig() {
    const panel = document.getElementById('group-config');
    const content = document.getElementById('group-config-content');
    const toggleBtn = document.getElementById('toggle-group-config');
    const selectedCodes = Object.keys(state.selectedSubjects).filter(c => state.selectedSubjects[c]);

    if (selectedCodes.length === 0) {
      panel.style.display = 'none';
      toggleBtn.style.display = 'none';
      return;
    }

    toggleBtn.style.display = 'inline-flex';
    let html = '<div class="group-config-grid">';

    selectedCodes.forEach(codigo => {
      const subject = SUBJECTS.find(s => s.codigo === codigo);
      if (!subject) return;
      const choice = state.groupChoices[codigo];

      html += `<div class="group-config-item">`;
      html += `<h3>${subject.codigo}</h3>`;
      html += `<div class="group-config-columns">`;

      // Theory column
      html += `<div class="group-config-col">`;
      html += `<div class="group-config-col-label">Teoría</div>`;
      subject.grupos.forEach(group => {
        const isSelected = choice && choice.teoria === group.letra;
        const isPreferred = state.turnoPreferente !== 'indiferente' && group.turno === state.turnoPreferente;

        html += `<div class="group-option ${isSelected ? 'selected' : ''} ${isPreferred ? 'preferred' : ''}" `;
        html += `data-codigo="${codigo}" data-letra="${group.letra}" data-type="teoria">`;
        html += `<input type="radio" name="teoria-${codigo}" ${isSelected ? 'checked' : ''}>`;
        html += `<div class="group-info">`;
        const profName = getProfName(codigo, group.letra);
        const profRazon = getProfRazon(codigo, group.letra);

        html += `<div class="group-label">G${group.letra} <span style="font-weight:400;color:#888;font-size:0.65rem;">${group.turno}</span></div>`;
        html += `<div class="group-schedule">`;
        group.teoria.forEach(s => {
          html += `<span class="session">${DAY_LABELS[s.dia].substr(0, 3)} ${s.inicio}</span>`;
        });
        if (group.teoria.length === 0) {
          html += `<span class="session" style="color:#999;">-</span>`;
        }
        html += `</div>`;
        if (profName) {
          const diff = getDificultad(codigo, group.letra);
          const opinion = getOpinion(codigo, group.letra);
          html += `<div class="group-profesor">`;
          html += `<span class="prof-name">${profName}</span>`;
          if (diff) {
            html += `<span class="dificultad-badge" style="background:${getDificultadColor(diff)}">${getDificultadLabel(diff)}</span>`;
          }
          html += `<span class="prof-razon">${profRazon}</span>`;
          if (opinion) {
            html += `<span class="prof-opinion">${opinion}</span>`;
          }
          html += `</div>`;
        }
        html += `</div></div>`;
      });
      html += `</div>`;

      // Practice column
      if (choice) {
        const selectedGroup = subject.grupos.find(g => g.letra === choice.teoria);
        if (selectedGroup && selectedGroup.practicas && selectedGroup.practicas.subgrupos.length > 0) {
          html += `<div class="group-config-col">`;
          html += `<div class="group-config-col-label">Práctica</div>`;
          selectedGroup.practicas.subgrupos.forEach(sub => {
            const isCurrentPractica = choice.practica === sub;
            const sessions = selectedGroup.practicas[sub] || [];
            const subgrupoNum = parseInt(sub.replace(/[A-Z]/g, ''));
            const apellidoNum = getSubgrupoForApellido(state.apellido);
            const isAutoSelected = apellidoNum && subgrupoNum === apellidoNum;

            html += `<div class="group-option ${isCurrentPractica ? 'selected' : ''} ${isAutoSelected ? 'preferred-practica' : ''}" `;
            html += `data-codigo="${codigo}" data-sub="${sub}" data-type="practica">`;
            html += `<input type="radio" name="practica-${codigo}" ${isCurrentPractica ? 'checked' : ''}>`;
            html += `<div class="group-info">`;
            html += `<div class="group-label">${sub} ${isAutoSelected ? '<span style="color:#28a745;font-size:0.6rem;">auto</span>' : ''}</div>`;
            html += `<div class="group-schedule">`;
            sessions.forEach(s => {
              html += `<span class="session practice">${DAY_LABELS[s.dia].substr(0, 3)} ${s.inicio}</span>`;
            });
            if (sessions.length === 0) {
              html += `<span class="session practice" style="color:#999;">-</span>`;
            }
            html += `</div></div></div>`;
          });
          html += `</div>`;
        }
      }

      html += `</div></div>`;
    });

    html += '</div>';
    content.innerHTML = html;

    // Bind events
    content.querySelectorAll('.group-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        const codigo = opt.dataset.codigo;
        if (opt.dataset.type === 'teoria') {
          state.groupChoices[codigo].teoria = opt.dataset.letra;
          const subject = SUBJECTS.find(s => s.codigo === codigo);
          const group = subject.grupos.find(g => g.letra === opt.dataset.letra);
          if (group && group.practicas && group.practicas.subgrupos.length > 0) {
            state.groupChoices[codigo].practica = group.practicas.subgrupos[0];
          } else {
            state.groupChoices[codigo].practica = null;
          }
        } else {
          state.groupChoices[codigo].practica = opt.dataset.sub;
        }
        saveState();
        updateAll();
      });
    });
  }

  // ─── Render Calendar (B3-d) ─────────────────────────────────
  // El render de semana (`renderCalendar`), la vista lista, el tooltip y sus
  // helpers (etiqueta accesible, horas ocupadas, turno) viven en ESM
  // (src/app/features/calendar.js), montados por `ensureCalendarViewFeature`.
  // Aquí queda SOLO la delegación: si el import falló la llamada es un no-op
  // y el monolito arranca sin calendario en vez de romper.
  function renderCalendar() {
    const feature = getCalendarViewFeature();
    if (feature) feature.render();
  }

  // ─── Render Conflicts ──────────────────────────────────────
  function renderConflicts() {
    const panel = document.getElementById('conflicts-panel');
    const list = document.getElementById('conflicts-list');
    if (!panel || !list) return;

    panel.classList.toggle('has-conflicts', conflicts.length > 0);

    if (conflicts.length === 0) {
      list.innerHTML = '<p class="empty-state">Sin conflictos.</p>';
      return;
    }

    let html = '';
    conflicts.forEach(c => {
      html += `<div class="conflict-item">`;
      html += `<div class="conflict-icon">⚠</div>`;
      html += `<div class="conflict-details">`;
      html += `<strong>${c.nombre1}</strong> ${c.tipo1} `;
      html += `(<span>${DAY_LABELS[c.dia]} ${c.inicio}-${c.fin}</span>) `;
      html += `se solapa con `;
      html += `<strong>${c.nombre2}</strong> ${c.tipo2}`;
      html += `</div></div>`;
    });

    list.innerHTML = html;
  }

  // ─── Render Summary ────────────────────────────────────────
  function renderSummary() {
    const content = document.getElementById('summary-content');
    const selectedCodes = Object.keys(state.selectedSubjects).filter(c => state.selectedSubjects[c]);

    if (selectedCodes.length === 0) {
      content.innerHTML = '<p class="empty-state">Selecciona asignaturas para ver el resumen.</p>';
      return;
    }

    let totalCredits = 0;
    let totalHours = 0;
    let morningCount = 0;
    let afternoonCount = 0;
    const tags = [];

    selectedCodes.forEach(codigo => {
      const subject = SUBJECTS.find(s => s.codigo === codigo);
      if (!subject) return;
      totalCredits += subject.creditos;

      const choice = state.groupChoices[codigo];
      if (choice) {
        const group = subject.grupos.find(g => g.letra === choice.teoria);
        if (group) {
          if (group.turno === 'mañana') morningCount++;
          else afternoonCount++;

          // Count hours
          group.teoria.forEach(s => {
            totalHours += (timeToMinutes(s.fin) - timeToMinutes(s.inicio)) / 60;
          });
          if (choice.practica && group.practicas[choice.practica]) {
            group.practicas[choice.practica].forEach(s => {
              totalHours += (timeToMinutes(s.fin) - timeToMinutes(s.inicio)) / 60;
            });
          }
        }
      }

      const isSelected = state.selectedSubjects[codigo];
      tags.push(`<span class="summary-subject-tag" style="background:#e8f4fd;color:#003366;">${subject.codigo}</span>`);
    });

    let turnoBadge = '';
    if (morningCount > 0 && afternoonCount === 0) {
      turnoBadge = '<span class="turno-badge mañana">Turno: Mañana</span>';
    } else if (afternoonCount > 0 && morningCount === 0) {
      turnoBadge = '<span class="turno-badge tarde">Turno: Tarde</span>';
    } else if (morningCount > 0 && afternoonCount > 0) {
      turnoBadge = '<span class="turno-badge mixed">Turno: Mixto</span>';
    }

    let html = `<div class="summary-grid">`;
    html += `<div class="summary-stat"><div class="stat-value">${selectedCodes.length}</div><div class="stat-label">Asignaturas</div></div>`;
    html += `<div class="summary-stat"><div class="stat-value">${totalCredits}</div><div class="stat-label">Créditos ECTS</div></div>`;
    html += `<div class="summary-stat"><div class="stat-value">${totalHours.toFixed(1)}h</div><div class="stat-label">Horas/semana</div></div>`;
    html += `<div class="summary-stat"><div class="stat-value">${conflicts.length}</div><div class="stat-label">Conflictos</div></div>`;
    html += `</div>`;

    if (turnoBadge) {
      html += `<div style="text-align:center;margin-bottom:0.8rem;">${turnoBadge}</div>`;
    }

    html += `<div class="summary-subjects">${tags.join('')}</div>`;

    content.innerHTML = html;
  }

  // ─── Summary Bar ────────────────────────────────────────────
  function updateSummaryBar() {
    const selectedCodes = Object.keys(state.selectedSubjects).filter(c => state.selectedSubjects[c]);
    const totalCredits = selectedCodes.reduce((sum, codigo) => {
      const s = SUBJECTS.find(sub => sub.codigo === codigo);
      return sum + (s ? s.creditos : 0);
    }, 0);

    document.getElementById('selected-count').textContent = selectedCodes.length;
    document.getElementById('total-credits').textContent = totalCredits;

    const meta = document.getElementById('credit-meta');
    meta.textContent = totalCredits >= 30 ? `(meta: 30 ✓)` : `(meta: 30)`;
    meta.classList.toggle('over', totalCredits > 30);
  }

  // ─── Buttons ────────────────────────────────────────────────
  function updateButtons() {
    const selectedCodes = Object.keys(state.selectedSubjects).filter(c => state.selectedSubjects[c]);
    const hasSelection = selectedCodes.length > 0;
    const hasConflicts = conflicts.length > 0;

    document.getElementById('btn-export').disabled = !hasSelection;
    document.getElementById('btn-share').disabled = !hasSelection;
    updateControlPanel();
  }

  function hasSelectedInTerm() {
    return Object.keys(state.selectedSubjects).some(c => {
      if (!state.selectedSubjects[c]) return false;
      const s = SUBJECTS.find(x => x.codigo === c);
      return !!s && s.cuatrimestre === state.cuatrimestreActivo;
    });
  }

  function updateControlPanel() {
    const canGenerate = hasSelectedInTerm();
    const hint = document.getElementById('control-hint');
    if (hint) hint.hidden = canGenerate;
    const gen = document.getElementById('btn-solver-generate');
    if (gen) gen.disabled = solverBusy || !canGenerate;
  }

  function setupActions() {
    setupShareDialog();
    document.getElementById('btn-export').addEventListener('click', exportCalendar);
    document.getElementById('btn-share').addEventListener('click', shareLink);
    document.getElementById('btn-clear-selected').addEventListener('click', clearSelected);
    document.getElementById('btn-save-config').addEventListener('click', saveConfig);
    document.getElementById('config-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveConfig();
    });
    document.getElementById('btn-add-subject').addEventListener('click', openAddModal);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-save').addEventListener('click', saveSubject);
    document.getElementById('btn-add-group').addEventListener('click', addModalGroup);
    document.getElementById('subject-modal').addEventListener('click', (e) => {
      if (e.target.id === 'subject-modal') closeModal();
    });
    document.getElementById('btn-export-json').addEventListener('click', exportAllJSON);
    document.getElementById('btn-import-json').addEventListener('click', () => {
      document.getElementById('import-json-input').click();
    });
    document.getElementById('import-json-input').addEventListener('change', importAllJSON);
    document.getElementById('btn-reset-defaults').addEventListener('click', resetDefaults);
    document.getElementById('btn-export-all-configs').addEventListener('click', exportAllSavedConfigs);
    document.getElementById('btn-delete-all-configs').addEventListener('click', () => {
      if (savedConfigs.length === 0) {
        showToast('No hay configuraciones propias que borrar', 'info');
        return;
      }
      if (!confirm('¿Eliminar todas tus configuraciones guardadas?')) return;
      savedConfigs = [];
      saveAllConfigs(savedConfigs);
      renderSavedConfigs();
      showToast('Tus configuraciones eliminadas', 'success');
    });
    document.getElementById('btn-import-config').addEventListener('click', () => {
      document.getElementById('import-config-input').click();
    });
    document.getElementById('import-config-input').addEventListener('change', importSavedConfig);
    document.getElementById('compare-modal-close').addEventListener('click', () => {
      document.getElementById('compare-modal').style.display = 'none';
    });
    document.getElementById('compare-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.target.style.display = 'none';
    });
    document.getElementById('btn-compare-floating').addEventListener('click', () => {
      if (compareIds.length >= 2) {
        openCompare(compareIds);
        compareIds = [];
        pushCompareIdsToStore();
        updateCompareButton();
        renderSavedConfigs();
      }
    });
    setupGroupConfigToggle();
    // B3-c: los toggles semana/lista y compacto los gestiona el feature ESM
    // (listeners idempotentes: un `init()` repetido no los duplica).
    const calView = getCalendarViewFeature();
    if (calView) calView.mount();
    renderSavedConfigs();
  }

  function setupGroupConfigToggle() {
    const btn = document.getElementById('toggle-group-config');
    btn.addEventListener('click', () => {
      const panel = document.getElementById('group-config');
      const isOpen = panel.style.display !== 'none';
      panel.style.display = isOpen ? 'none' : 'block';
      btn.classList.toggle('open', !isOpen);
      btn.querySelector('.toggle-icon').innerHTML = isOpen ? '&#9660;' : '&#9650;';
    });
  }

  // ─── Export ─────────────────────────────────────────────────
  function exportCalendar() {
    const cal = document.getElementById('calendar');
    const canvas = document.createElement('canvas');
    const scale = 2;
    const rect = cal.getBoundingClientRect();
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;

    // Use html2canvas if available, otherwise simple fallback
    if (typeof html2canvas !== 'undefined') {
      html2canvas(cal, { scale: 2 }).then(c => {
        downloadCanvas(c, 'horario-ugr.png');
      });
    } else {
      // Simple SVG export fallback
      showToast('Exportación PNG requiere html2canvas. Usa la función de impresión del navegador (Ctrl+P).', 'info');
      window.print();
    }
  }

  function downloadCanvas(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // ─── Share (enlace cifrado en el hash) ──────────────────────
  const SHARE_HASH_PREFIX = '#data=';
  let shareMode = null;
  let shareReturnFocus = null;
  let shareFragment = null;
  let shareHashListenerReady = false;

  function shareCrypto() {
    if (window.__ugrShareCrypto) return Promise.resolve(window.__ugrShareCrypto);
    return import('/ugr/src/share/shareCrypto.js').then(() => window.__ugrShareCrypto);
  }

  function shareDialogEls() {
    return {
      modal: document.getElementById('share-modal'),
      title: document.getElementById('share-modal-title'),
      desc: document.getElementById('share-modal-desc'),
      form: document.getElementById('share-form'),
      passphrase: document.getElementById('share-passphrase'),
      error: document.getElementById('share-error'),
      result: document.getElementById('share-result'),
      link: document.getElementById('share-link'),
      submit: document.getElementById('share-submit'),
      cancel: document.getElementById('share-cancel'),
    };
  }

  function showShareError(message) {
    const els = shareDialogEls();
    els.error.textContent = message;
    els.error.hidden = false;
    els.passphrase.setAttribute('aria-invalid', 'true');
  }

  function hideShareError() {
    const els = shareDialogEls();
    els.error.textContent = '';
    els.error.hidden = true;
    els.passphrase.removeAttribute('aria-invalid');
  }

  function openShareDialog(mode) {
    const els = shareDialogEls();
    shareMode = mode;
    if (!shareReturnFocus) shareReturnFocus = document.activeElement;
    els.title.textContent = mode === 'share' ? 'Compartir enlace cifrado' : 'Restaurar enlace compartido';
    els.desc.textContent = mode === 'share'
      ? 'Tu selección, tus grupos y tus filtros se cifran con AES-GCM y viajan dentro del enlace (#data=...), sin estado en claro y sin servidor.'
      : 'Este enlace contiene estado cifrado. Escribe la frase de paso con la que se generó para restaurarlo.';
    els.submit.textContent = mode === 'share' ? 'Generar enlace' : 'Descifrar y restaurar';
    els.submit.disabled = false;
    els.passphrase.value = '';
    els.link.value = '';
    els.result.hidden = true;
    hideShareError();
    els.modal.hidden = false;
    els.passphrase.focus();
  }

  function closeShareDialog() {
    const els = shareDialogEls();
    if (els.modal.hidden) return;
    els.modal.hidden = true;
    if (shareMode === 'restore') clearShareHash();
    shareMode = null;
    shareFragment = null;
    const target = shareReturnFocus;
    shareReturnFocus = null;
    if (target && typeof target.focus === 'function' && document.contains(target)) target.focus();
  }

  function clearShareHash() {
    if (!location.hash.startsWith(SHARE_HASH_PREFIX)) return;
    history.replaceState(null, '', location.pathname + location.search);
  }

  function buildSharedState() {
    const selectedSubjects = {};
    Object.keys(state.selectedSubjects).forEach(codigo => {
      if (state.selectedSubjects[codigo]) selectedSubjects[codigo] = true;
    });
    const groupChoices = {};
    Object.keys(selectedSubjects).forEach(codigo => {
      const choice = state.groupChoices[codigo];
      if (choice && typeof choice === 'object') {
        groupChoices[codigo] = {
          teoria: typeof choice.teoria === 'string' ? choice.teoria : null,
          practica: typeof choice.practica === 'string' ? choice.practica : null,
        };
      }
    });
    return {
      v: 1,
      selectedSubjects,
      groupChoices,
      apellido: state.apellido || '',
      turnoPreferente: state.turnoPreferente || 'indiferente',
      cuatrimestreActivo: state.cuatrimestreActivo === 2 ? 2 : 1,
      solverFilters: solverFilters.map(f => ({ type: f.type, value: f.value, weight: f.weight })),
      solverStrategy,
    };
  }

  function parseSharedState(raw) {
    let data;
    try { data = JSON.parse(raw); } catch (e) { return null; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if (data.v !== 1) return null;

    const selectedSubjects = {};
    if (data.selectedSubjects && typeof data.selectedSubjects === 'object' && !Array.isArray(data.selectedSubjects)) {
      Object.keys(data.selectedSubjects).forEach(codigo => {
        if (data.selectedSubjects[codigo]) selectedSubjects[codigo] = true;
      });
    }
    if (Object.keys(selectedSubjects).length === 0) return null;

    const groupChoices = {};
    if (data.groupChoices && typeof data.groupChoices === 'object' && !Array.isArray(data.groupChoices)) {
      Object.keys(data.groupChoices).forEach(codigo => {
        const choice = data.groupChoices[codigo];
        if (!choice || typeof choice !== 'object' || Array.isArray(choice)) return;
        if (typeof choice.teoria !== 'string' || !choice.teoria) return;
        groupChoices[codigo] = {
          teoria: choice.teoria,
          practica: typeof choice.practica === 'string' ? choice.practica : null,
        };
      });
    }

    const solverFiltersShared = Array.isArray(data.solverFilters)
      ? data.solverFilters
          .filter(f => f && typeof f === 'object' && !Array.isArray(f) && SOLVER_FILTER_TYPES.includes(f.type))
          .map(f => ({ type: f.type, value: f.value, weight: typeof f.weight === 'number' ? f.weight : 1 }))
      : [];

    return {
      selectedSubjects,
      groupChoices,
      apellido: typeof data.apellido === 'string' ? data.apellido.trim().slice(0, 60) : '',
      turnoPreferente: ['indiferente', 'mañana', 'tarde'].includes(data.turnoPreferente)
        ? data.turnoPreferente
        : 'indiferente',
      cuatrimestreActivo: data.cuatrimestreActivo === 2 ? 2 : 1,
      solverFilters: solverFiltersShared,
      solverStrategy: SOLVER_STRATEGIES[data.solverStrategy] ? data.solverStrategy : 'balanced',
    };
  }

  function applySharedState(shared) {
    state.selectedSubjects = { ...shared.selectedSubjects };
    state.groupChoices = JSON.parse(JSON.stringify(shared.groupChoices));
    state.apellido = shared.apellido;
    state.turnoPreferente = shared.turnoPreferente;
    pushProfileToStore();
    state.cuatrimestreActivo = shared.cuatrimestreActivo;
    pruneSelectionsToActiveCatalog();

    solverFilters = shared.solverFilters;
    saveSolverFilters();
    solverStrategy = shared.solverStrategy;
    localStorage.setItem('ugr-solver-strategy', solverStrategy);

    const apellidoInput = document.getElementById('apellido');
    const turnoSelect = document.getElementById('turno-preferente');
    if (apellidoInput) apellidoInput.value = state.apellido;
    if (turnoSelect) turnoSelect.value = state.turnoPreferente;
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', parseInt(tab.dataset.cuatrimestre) === state.cuatrimestreActivo);
    });

    saveState();
    renderSolverFilters();
    updateAll();
  }

  function copyShareLink(url) {
    const done = () => showToast('Enlace cifrado copiado al portapapeles', 'success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopyShareLink(url));
    } else {
      fallbackCopyShareLink(url);
    }
  }

  function fallbackCopyShareLink(url) {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (e) { copied = false; }
    document.body.removeChild(input);
    if (copied) {
      showToast('Enlace cifrado copiado al portapapeles', 'success');
    } else {
      showToast('Copia el enlace manualmente desde el diálogo', 'info');
    }
    const linkInput = document.getElementById('share-link');
    if (linkInput && !document.getElementById('share-modal').hidden) {
      linkInput.focus();
      linkInput.select();
    }
  }

  function setupShareDialog() {
    const els = shareDialogEls();
    els.form.addEventListener('submit', onShareSubmit);
    els.cancel.addEventListener('click', closeShareDialog);
    document.getElementById('share-modal-close').addEventListener('click', closeShareDialog);
    els.modal.addEventListener('click', (e) => {
      if (e.target === els.modal) closeShareDialog();
    });
    els.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeShareDialog();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(els.modal.querySelectorAll('button, input, select, textarea, a[href]'))
        .filter(el => !el.disabled && el.getClientRects().length > 0);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  async function onShareSubmit(e) {
    e.preventDefault();
    const els = shareDialogEls();
    const passphrase = els.passphrase.value;
    if (!passphrase) {
      showShareError('Introduce una frase de paso.');
      return;
    }
    if (!window.crypto || !window.crypto.subtle) {
      showShareError('Este navegador no soporta WebCrypto, no se puede cifrar el enlace.');
      return;
    }
    hideShareError();
    els.submit.disabled = true;
    try {
      const api = await shareCrypto();
      if (!api) throw new Error('NO_CRYPTO');
      if (shareMode === 'share') {
        const payload = await api.encryptToFragment(JSON.stringify(buildSharedState()), passphrase);
        const hashFragment = '#data=' + payload;
        const url = location.origin + location.pathname + location.search + hashFragment;
        history.replaceState(null, '', hashFragment);
        els.link.value = url;
        els.result.hidden = false;
        els.link.focus();
        els.link.select();
        copyShareLink(url);
      } else {
        const plain = await api.decryptFromFragment(shareFragment, passphrase);
        const shared = parseSharedState(plain);
        if (!shared) {
          showShareError('El enlace no contiene un estado válido.');
          clearShareHash();
          return;
        }
        applySharedState(shared);
        clearShareHash();
        closeShareDialog();
        showToast('Enlace descifrado: estado restaurado', 'success');
      }
    } catch (err) {
      const code = err && err.message;
      if (code === 'BAD_PASSPHRASE') {
        showShareError('Frase de paso incorrecta: no se ha podido descifrar el enlace.');
      } else if (code === 'BAD_FORMAT') {
        showShareError('El enlace está corrupto o no es compatible.');
        clearShareHash();
      } else {
        showShareError('No se ha podido procesar el enlace. Inténtalo de nuevo.');
      }
    } finally {
      els.submit.disabled = false;
    }
  }

  function startRestoreFromHash() {
    const raw = location.hash;
    if (!raw.startsWith(SHARE_HASH_PREFIX)) return;
    shareFragment = raw;
    shareCrypto().then(api => {
      if (!api || !api.parseFragment(raw)) {
        clearShareHash();
        showToast('El enlace compartido no es válido o está corrupto', 'error');
        return;
      }
      if (shareMode === 'restore') return;
      openShareDialog('restore');
    }).catch(() => {
      clearShareHash();
      showToast('No se ha podido leer el enlace compartido', 'error');
    });
  }

  function shareLink() {
    openShareDialog('share');
  }

  function checkUrlShare() {
    if (!shareHashListenerReady) {
      shareHashListenerReady = true;
      window.addEventListener('hashchange', () => {
        if (!location.hash.startsWith(SHARE_HASH_PREFIX)) return;
        if (shareMode === 'restore') {
          shareFragment = location.hash;
          shareDialogEls().passphrase.value = '';
          hideShareError();
          return;
        }
        startRestoreFromHash();
      });
    }
    startRestoreFromHash();
  }

  // ─── Clear ──────────────────────────────────────────────────
  function clearSelected() {
    const selectedCodes = Object.keys(state.selectedSubjects).filter(c => state.selectedSubjects[c]);
    if (selectedCodes.length === 0) {
      showToast('No hay asignaturas seleccionadas', 'info');
      return;
    }
    if (!confirm(`¿Eliminar las ${selectedCodes.length} asignaturas seleccionadas?`)) return;
    selectedCodes.forEach(codigo => {
      delete state.selectedSubjects[codigo];
      delete state.groupChoices[codigo];
    });
    saveState();
    updateAll();
    showToast(`${selectedCodes.length} asignatura(s) eliminada(s)`, 'success');
  }

  // ─── Saved Configs ─────────────────────────────────────────
  function getDisplayConfigs() {
    return savedConfigs.concat(solverResults);
  }

  // ─── Solver UI (Fase 1) ─────────────────────────────────────
  function loadSolverFilters() {
    try {
      const parsed = JSON.parse(localStorage.getItem('ugr-solver-filters') || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(f => f && SOLVER_FILTER_TYPES.includes(f.type));
    } catch (e) { return []; }
  }

  function saveSolverFilters() {
    localStorage.setItem('ugr-solver-filters', JSON.stringify(solverFilters));
  }

  function findSolverFilter(type) {
    return solverFilters.find(f => f.type === type);
  }

  function setSolverFilter(type, value) {
    solverFilters = solverFilters.filter(f => f.type !== type);
    if (value !== null && value !== undefined && value !== '') {
      solverFilters.push({ type, value, weight: 1 });
    }
    saveSolverFilters();
  }

  function getSolverProfessorOptions() {
    const byName = new Map();
    SUBJECTS.forEach(s => {
      (s.grupos || []).forEach(g => {
        const key = `${s.codigo}-${g.letra}`;
        const info = getDocentInfo(key);
        if (!info || !info.name) return;
        if (!byName.has(info.name)) {
          byName.set(info.name, { name: info.name, dificultad: info.profile ? info.profile.dificultad : null, keys: [], subjects: new Set() });
        }
        const entry = byName.get(info.name);
        entry.keys.push(key);
        entry.subjects.add(s.codigo);
      });
    });
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  function toggleProfessorBlock(name, blocked, options) {
    const option = options.find(o => o.name === name);
    if (!option) return;
    const set = new Set(findSolverFilter('blockGroups')?.value || []);
    option.keys.forEach(k => { if (blocked) set.add(k); else set.delete(k); });
    setSolverFilter('blockGroups', set.size ? [...set] : null);
  }

  function renderSolverFilters() {
    const panel = document.getElementById('solver-filters-panel');
    if (!panel) return;

    const maxDays = findSolverFilter('maxDays')?.value;
    const maxMorning = findSolverFilter('maxMorningDays')?.value;
    const maxAfternoon = findSolverFilter('maxAfternoonDays')?.value;
    const turno = findSolverFilter('preferTurno')?.value || 'indiferente';
    const earliestStart = findSolverFilter('earliestStart')?.value || '';
    const latestEnd = findSolverFilter('latestEnd')?.value || '';
    const blocked = new Set(findSolverFilter('blockGroups')?.value || []);
    const profOptions = getSolverProfessorOptions();
    const blockedCount = profOptions.filter(o => o.keys.every(k => blocked.has(k))).length;

    let html = '';
    html += '<div class="solver-filter-row">';
    html += '<label>Preferencia <select id="solver-strategy">';
    Object.entries(SOLVER_STRATEGIES).forEach(([key, s]) => {
      html += `<option value="${key}" ${solverStrategy === key ? 'selected' : ''}>${s.label}</option>`;
    });
    html += '</select></label>';
    html += '</div>';
    html += '<div class="solver-filter-row">';
    html += '<span class="solver-filter-label">Días libres:</span>';
    DAYS.forEach(d => {
      const active = (findSolverFilter('freeDays')?.value || []).includes(d);
      html += `<label class="solver-day-check"><input type="checkbox" data-solver-day="${d}" ${active ? 'checked' : ''}> ${DAY_LABELS[d]}</label>`;
    });
    html += '</div>';

    html += '<div class="solver-filter-row">';
    html += `<label>Máx. días con clase <input type="number" id="solver-max-days" min="0" max="5" value="${maxDays ?? ''}"></label>`;
    html += `<label>Máx. días de mañana <input type="number" id="solver-max-morning" min="0" max="5" value="${maxMorning ?? ''}"></label>`;
    html += `<label>Máx. días de tarde <input type="number" id="solver-max-afternoon" min="0" max="5" value="${maxAfternoon ?? ''}"></label>`;
    html += '</div>';

    html += '<div class="solver-filter-row">';
    html += '<label>Turno preferente <select id="solver-prefer-turno">';
    ['indiferente', 'mañana', 'tarde'].forEach(v => {
      html += `<option value="${v}" ${turno === v ? 'selected' : ''}>${v}</option>`;
    });
    html += '</select></label>';
    html += `<label>No empezar antes de <input type="time" id="solver-earliest-start" value="${earliestStart}"></label>`;
    html += `<label>No acabar después de <input type="time" id="solver-latest-end" value="${latestEnd}"></label>`;
    html += '</div>';

    html += '<div class="solver-prof-block">';
    html += `<button type="button" class="btn btn-sm btn-secondary" id="btn-toggle-solver-profs">Bloquear profesores${blockedCount ? ` (${blockedCount})` : ''}</button>`;
    html += '<div class="solver-prof-body" style="display:none">';
    html += '<input type="search" id="solver-prof-search" placeholder="Buscar profesor o asignatura...">';
    html += '<div class="solver-prof-list" id="solver-prof-list">';
    if (profOptions.length === 0) {
      html += '<p class="empty-state">No hay datos de profesores.</p>';
    } else {
      profOptions.forEach(o => {
        const isBlocked = o.keys.every(k => blocked.has(k));
        const subjects = [...o.subjects].sort().join(', ');
        const diff = o.dificultad ? getDificultadColor(o.dificultad) : '';
        html += `<label class="solver-prof-item" data-search="${o.name.toLowerCase()} ${subjects.toLowerCase()}">`;
        html += `<input type="checkbox" data-prof-name="${o.name}" ${isBlocked ? 'checked' : ''}>`;
        html += `<span class="solver-prof-diff" style="background:${diff}"></span>`;
        html += `<span class="solver-prof-name">${o.name}</span>`;
        html += `<span class="solver-prof-meta">${subjects}</span>`;
        html += '</label>';
      });
    }
    html += '</div></div></div>';

    panel.innerHTML = html;

    const strategySelect = panel.querySelector('#solver-strategy');
    if (strategySelect) strategySelect.addEventListener('change', () => {
      solverStrategy = SOLVER_STRATEGIES[strategySelect.value] ? strategySelect.value : 'balanced';
      localStorage.setItem('ugr-solver-strategy', solverStrategy);
    });

    panel.querySelectorAll('[data-solver-day]').forEach(cb => {
      cb.addEventListener('change', () => {
        const days = new Set(findSolverFilter('freeDays')?.value || []);
        if (cb.checked) days.add(cb.dataset.solverDay);
        else days.delete(cb.dataset.solverDay);
        setSolverFilter('freeDays', days.size ? [...days] : null);
      });
    });

    const bindNumber = (id, type) => {
      const input = panel.querySelector(id);
      if (!input) return;
      input.addEventListener('change', () => {
        setSolverFilter(type, input.value === '' ? null : Number(input.value));
      });
    };
    bindNumber('#solver-max-days', 'maxDays');
    bindNumber('#solver-max-morning', 'maxMorningDays');
    bindNumber('#solver-max-afternoon', 'maxAfternoonDays');

    const turnoSelect = panel.querySelector('#solver-prefer-turno');
    if (turnoSelect) turnoSelect.addEventListener('change', () => {
      setSolverFilter('preferTurno', turnoSelect.value === 'indiferente' ? null : turnoSelect.value);
    });
    const earliestInput = panel.querySelector('#solver-earliest-start');
    if (earliestInput) earliestInput.addEventListener('change', () => {
      setSolverFilter('earliestStart', earliestInput.value || null);
    });
    const latestInput = panel.querySelector('#solver-latest-end');
    if (latestInput) latestInput.addEventListener('change', () => {
      setSolverFilter('latestEnd', latestInput.value || null);
    });

    const profToggle = panel.querySelector('#btn-toggle-solver-profs');
    const profBody = panel.querySelector('.solver-prof-body');
    if (profToggle && profBody) {
      profToggle.addEventListener('click', () => {
        profBody.style.display = profBody.style.display === 'none' ? 'block' : 'none';
      });
    }
    const profSearch = panel.querySelector('#solver-prof-search');
    if (profSearch) {
      profSearch.addEventListener('input', () => {
        const q = profSearch.value.trim().toLowerCase();
        panel.querySelectorAll('.solver-prof-item').forEach(item => {
          item.style.display = !q || item.dataset.search.includes(q) ? '' : 'none';
        });
      });
    }
    panel.querySelectorAll('[data-prof-name]').forEach(cb => {
      cb.addEventListener('change', () => {
        toggleProfessorBlock(cb.dataset.profName, cb.checked, profOptions);
        const size = (findSolverFilter('blockGroups')?.value || []).length;
        if (profToggle) profToggle.textContent = `Bloquear profesores${size ? ` (${profOptions.filter(o => o.keys.every(k => (findSolverFilter('blockGroups')?.value || []).includes(k))).length})` : ''}`;
      });
    });
  }

  function blockedEmptySubjects(problem) {
    const blocked = new Set(findSolverFilter('blockGroups')?.value || []);
    return problem.subjects.filter(code => {
      const s = SUBJECTS.find(x => x.codigo === code);
      if (!s) return false;
      return !(s.grupos || []).some(g => !blocked.has(`${code}-${g.letra}`));
    });
  }

  function buildSolverDocentScores(codes) {
    const scores = {};
    codes.forEach(code => {
      const subject = SUBJECTS.find(x => x.codigo === code);
      if (!subject) return;
      subject.grupos.forEach(g => {
        const d = getDificultad(code, g.letra);
        if (d) scores[`${code}-${g.letra}`] = getDifficultyScore(d);
      });
    });
    return scores;
  }

  function buildSolverProblem() {
    const codes = Object.keys(state.selectedSubjects).filter(c => state.selectedSubjects[c]);
    const inTerm = codes.filter(c => {
      const s = SUBJECTS.find(x => x.codigo === c);
      return s && s.cuatrimestre === state.cuatrimestreActivo;
    });
    // Las asignaturas ya superadas (sup/pass) quedan fuera del dominio: el
    // solver no debe planificar lo aprobado. Sin __ugrProgress (modo
    // degradado) no se excluye nada. excludedPassed se informa en runSolver.
    const passed = new Set(window.__ugrProgress?.getPassedCodes?.() || []);
    const subjects = [];
    const excludedPassed = [];
    for (const c of inTerm) {
      if (passed.has(c)) excludedPassed.push(c);
      else subjects.push(c);
    }
    return {
      subjects,
      excludedPassed,
      filters: solverFilters,
      catalogVersion: 'legacy',
      docentScores: buildSolverDocentScores(subjects),
    };
  }

  function setSolverStatus(text) {
    const el = document.getElementById('solver-status');
    if (el) el.textContent = text || '';
  }

  function setSolverBusy(busy) {
    solverBusy = busy;
    const gen = document.getElementById('btn-solver-generate');
    const cancel = document.getElementById('btn-solver-cancel');
    const prog = document.getElementById('solver-progress');
    if (gen) gen.disabled = busy || !hasSelectedInTerm();
    if (cancel) cancel.style.display = busy ? '' : 'none';
    if (prog) prog.style.display = busy ? '' : 'none';
  }

  function setSolverProgress(stats) {
    const fill = document.getElementById('solver-progress-fill');
    if (!fill || !stats) return;
    const pct = Math.min(95, ((stats.nodes || 0) / 20000) * 100);
    fill.style.width = pct + '%';
    setSolverStatus(`${stats.found || 0} soluciones · ${stats.nodes || 0} nodos`);
  }

  function toSolverConfig(item, index) {
    const strategy = SOLVER_STRATEGIES[solverStrategy] ? solverStrategy : 'balanced';
    return {
      id: solverIdSeq++,
      name: `Generado ${index + 1} · ${SOLVER_STRATEGIES[strategy].label}`,
      selectedSubjects: { ...item.selectedSubjects },
      groupChoices: JSON.parse(JSON.stringify(item.groupChoices)),
      apellido: state.apellido,
      turnoPreferente: state.turnoPreferente,
      solver: true,
      strategy,
      cost: item.cost,
      deadHours: item.costBreakdown ? item.costBreakdown.deadHours : null,
    };
  }

  async function runSolver() {
    if (solverBusy) return;
    const bridge = window.__ugrSolver;
    if (!bridge) { setSolverStatus('El motor no está disponible.'); return; }
    const problem = buildSolverProblem();
    if (problem.subjects.length === 0) {
      setSolverStatus(problem.excludedPassed.length
        ? 'Todas las asignaturas seleccionadas de este cuatrimestre están superadas.'
        : 'No hay asignaturas seleccionadas en este cuatrimestre.');
      return;
    }
    const empty = blockedEmptySubjects(problem);
    if (empty.length) {
      setSolverStatus(`El bloqueo de profesores deja sin grupos: ${empty.join(', ')}.`);
      return;
    }
    const kInput = document.getElementById('solver-topk');
    const k = Math.max(1, Math.min(500, parseInt(kInput?.value || '200', 10) || 200));
    const runId = ++solverRunSeq;
    solverResults = [];
    configPage = 1;
    setSolverBusy(true);
    setSolverStatus('Generando…');
    const weights = (SOLVER_STRATEGIES[solverStrategy] || SOLVER_STRATEGIES.balanced).weights;
    try {
      const result = await bridge.solveTopK(problem, {
        k,
        weights,
        apellido: state.apellido,
        onProgress: (stats) => { if (runId === solverRunSeq) setSolverProgress(stats); },
      });
      if (runId !== solverRunSeq) return;
      solverResults = result.items.map(toSolverConfig);
      renderSavedConfigs();
      const approx = result.stats.approximate ? ' (aprox.)' : '';
      const omitted = problem.excludedPassed.length ? ` · ${problem.excludedPassed.length} superadas omitidas` : '';
      setSolverStatus(`${solverResults.length} horarios generados${approx}${result.fromCache ? ' · caché' : ''}${omitted}`);
    } catch (err) {
      if (runId === solverRunSeq) setSolverStatus('Error: ' + (err?.message || err));
    } finally {
      if (runId === solverRunSeq) setSolverBusy(false);
    }
  }

  function cancelSolver() {
    solverRunSeq++;
    if (window.__ugrSolver) window.__ugrSolver.cancel();
    setSolverBusy(false);
    setSolverStatus('Generación cancelada.');
  }

  function saveSolverResult(id) {
    const cfg = solverResults.find(c => c.id === id);
    if (!cfg) return;
    savedConfigs.push({
      id: Date.now(),
      name: cfg.name,
      selectedSubjects: { ...cfg.selectedSubjects },
      groupChoices: JSON.parse(JSON.stringify(cfg.groupChoices)),
      apellido: cfg.apellido,
      turnoPreferente: cfg.turnoPreferente,
    });
    saveAllConfigs(savedConfigs);
    showToast('Horario guardado', 'success');
    renderSavedConfigs();
  }

  function setupSolver() {
    renderSolverFilters();
    const gen = document.getElementById('btn-solver-generate');
    const cancel = document.getElementById('btn-solver-cancel');
    if (gen) gen.addEventListener('click', runSolver);
    if (cancel) cancel.addEventListener('click', cancelSolver);
  }

  function isConfigFavorited(config) {
    // Delegación B4-a: la única implementación vive en ESM
    // (src/app/domain/configs.js).
    return getDomain().isConfigFavorited(config);
  }

  function findDuplicateConfig(newGroupChoices, newSelectedSubjects) {
    // Delegación B4-a (configs.js): la lista de candidatas se inyecta aquí
    // porque el IIFE es quien posee `savedConfigs`.
    return getDomain().findDuplicateConfig(savedConfigs, newGroupChoices, newSelectedSubjects);
  }

  function saveConfig() {
    const nameInput = document.getElementById('config-name');
    const name = nameInput.value.trim();
    if (!name) {
      showToast('Introduce un nombre para la configuración', 'error');
      return;
    }

    const selectedCodes = Object.keys(state.selectedSubjects).filter(c => state.selectedSubjects[c]);
    if (selectedCodes.length === 0) {
      showToast('Selecciona al menos una asignatura', 'error');
      return;
    }

    const config = getDomain().buildConfigFromState(state, Date.now(), name);

    const duplicate = findDuplicateConfig(state.groupChoices, state.selectedSubjects);
    savedConfigs.push(config);
    if (duplicate) {
      showToast(`Aviso: "${duplicate.name}" tiene los mismos grupos`, 'info');
    }
    saveAllConfigs(savedConfigs);
    nameInput.value = '';
    configPage = 1;
    renderSavedConfigs();
    showToast(`"${name}" guardada`, 'success');
  }

  function loadConfig(id) {
    const config = getDisplayConfigs().find(c => c.id === id);
    if (!config) return;

    // Delegación B4-b: las 4 asignaciones viven en `applyConfigToState` (copia
    // de materias + clon profundo de grupos); DOM, store y toast siguen aquí.
    getDomain().applyConfigToState(state, config);
    pushProfileToStore();

    document.getElementById('apellido').value = state.apellido;
    document.getElementById('turno-preferente').value = state.turnoPreferente;

    saveState();
    updateAll();
    showToast(`"${config.name}" cargada`, 'success');
  }

  function deleteConfig(id) {
    const config = savedConfigs.find(c => c.id === id);
    if (!config) return;
    if (!confirm(`¿Eliminar "${config.name}"?`)) return;

    // Delegación B4-b: el filtrado puro devuelve la nueva lista; el binding
    // local se reasigna aquí (confirm/persistencia/render no cambian).
    savedConfigs = getDomain().removeConfigById(savedConfigs, id);
    saveAllConfigs(savedConfigs);
    configPage = 1;
    renderSavedConfigs();
    showToast(`"${config.name}" eliminada`, 'info');
  }

  function renderSavedConfigs() {
    const container = document.getElementById('saved-configs-list');
    const displayConfigs = getDisplayConfigs();
    if (displayConfigs.length === 0) {
      container.innerHTML = '<p class="empty-state">No hay configuraciones guardadas.</p>';
      return;
    }

    // Delegación B4-d: orden + filtros (bloqueos, favoritos, techos de días)
    // viven en ESM (src/app/domain/configs.js `selectVisibleConfigs`); aquí
    // solo se inyecta el criterio del cierre y los datos legacy (store,
    // catálogo y lookups de dificultad).
    const filtered = getDomain().selectVisibleConfigs(displayConfigs, {
      sortField: configSortField,
      sortDir: configSortDir,
      showFavoritesOnly: configShowFavoritesOnly,
      maxManana: configMaxManana,
      maxTarde: configMaxTarde,
      blocks: getBlocks(),
      subjects: SUBJECTS,
      dificultad: getDificultad,
      difficultyScore: getDifficultyScore,
    });
    const toolbarHtml = '<div class="saved-configs-toolbar">' +
      `<button class="btn btn-sm ${configShowFavoritesOnly ? 'btn-primary' : 'btn-secondary'}" id="btn-toggle-favorites">\u2605 Favoritos${configShowFavoritesOnly ? ' (activado)' : ''}</button>` +
      '</div>';

    if (filtered.length === 0) {
      container.innerHTML = toolbarHtml + '<p class="empty-state">No hay resultados con los filtros actuales.</p>';
      bindSavedConfigsToolbar(container);
      return;
    }

    // Delegación B4-d: totales, recorte de página y slice viven en ESM
    // (`paginateConfigs`); el cierre solo reasigna su `configPage` con el
    // valor ya recortado al rango [1, totalPages].
    const { totalEntries, totalPages, page, entries: pageEntries } = getDomain().paginateConfigs(filtered, configPage, CONFIG_PAGE_SIZE);
    configPage = page;

    const arrow = (field) => configSortField === field ? (configSortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

    let html = toolbarHtml;

    html += '<table class="saved-configs-table">';
    html += '<thead><tr>';
    html += '<th class="col-fav-head">\u2605</th>';
    html += `<th data-sort="name" class="sortable${configSortField === 'name' ? ' sort-active' : ''}">Nombre${arrow('name')}</th>`;
    html += `<th data-sort="count" class="sortable${configSortField === 'count' ? ' sort-active' : ''}">N. Asig${arrow('count')}</th>`;
    html += `<th data-sort="turno" class="sortable${configSortField === 'turno' ? ' sort-active' : ''}">Turno${arrow('turno')}</th>`;
    html += `<th data-sort="manana" class="sortable${configSortField === 'manana' ? ' sort-active' : ''}">D\u00EDas M${arrow('manana')}</th>`;
    html += `<th data-sort="tarde" class="sortable${configSortField === 'tarde' ? ' sort-active' : ''}">D\u00EDas T${arrow('tarde')}</th>`;
    html += `<th data-sort="deadHours" class="sortable${configSortField === 'deadHours' ? ' sort-active' : ''}">Huecos${arrow('deadHours')}</th>`;
    html += `<th data-sort="profScore" class="sortable${configSortField === 'profScore' ? ' sort-active' : ''}">Prof${arrow('profScore')}</th>`;
    html += `<th data-sort="sameGroup" class="sortable${configSortField === 'sameGroup' ? ' sort-active' : ''}">Grupo${arrow('sameGroup')}</th>`;
    html += '<th class="col-actions-head">Acciones</th>';
    html += '</tr></thead><tbody>';

    pageEntries.forEach(config => {
      const count = Object.keys(config.selectedSubjects).filter(c => config.selectedSubjects[c]).length;
      const m = calculateConfigMetrics(config.selectedSubjects, config.groupChoices);
      const d = calculateConfigDays(config.selectedSubjects, config.groupChoices);
      html += '<tr>';
      html += `<td class="col-fav"><button class="btn-fav ${isConfigFavorited(config) ? 'active' : ''}" data-action="favorite" data-id="${config.id}">${isConfigFavorited(config) ? '\u2605' : '\u2606'}</button></td>`;
      html += `<td class="col-name">${config.name}</td>`;
      html += `<td class="col-count">${count}</td>`;
      html += `<td class="col-turno">${config.turnoPreferente}</td>`;
      html += `<td class="col-manana">${d.manana}</td>`;
      html += `<td class="col-tarde">${d.tarde}</td>`;
      const dead = config.deadHours != null ? config.deadHours : calculateConfigDeadHours(config.selectedSubjects, config.groupChoices);
      html += `<td class="col-deadhours">${dead}</td>`;
      html += `<td class="col-prof">${m.profScore}/${m.profCount * 6}</td>`;
      html += `<td class="col-group ${m.sameGroupPerYear ? 'group-ok' : 'group-warn'}">${m.sameGroupPerYear ? '\u2713 Uniforme' : '\u2717 Mixtos'}</td>`;
      html += '<td class="col-actions">';
      html += `<button class="btn btn-sm btn-secondary" data-action="load" data-id="${config.id}">Cargar</button>`;
      html += `<button class="btn btn-sm ${compareIds.includes(config.id) ? 'btn-danger' : 'btn-secondary'}" data-action="compare" data-id="${config.id}">${compareIds.includes(config.id) ? 'Quitar' : 'Comparar'}</button>`;
      html += `<button class="btn btn-sm btn-secondary" data-action="export-config" data-id="${config.id}">Exportar</button>`;
      if (config.solver) {
        html += `<button class="btn btn-sm btn-primary" data-action="save-solver" data-id="${config.id}">Guardar</button>`;
      } else {
        html += `<button class="btn btn-sm btn-danger" data-action="delete" data-id="${config.id}">Eliminar</button>`;
      }
      html += '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';

    if (totalPages > 1) {
      html += '<div class="pagination">';
      html += `<button class="btn btn-sm btn-secondary" id="cfg-page-prev" ${configPage <= 1 ? 'disabled' : ''}>\u2190 Anterior</button>`;
      html += `<span class="page-info">P\u00e1gina ${configPage} de ${totalPages} (${totalEntries} entradas)</span>`;
      html += `<button class="btn btn-sm btn-secondary" id="cfg-page-next" ${configPage >= totalPages ? 'disabled' : ''}>Siguiente \u2192</button>`;
      html += '</div>';
    }

    container.innerHTML = html;

    bindSavedConfigsToolbar(container);

    container.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (configSortField === field) {
          configSortDir = configSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          configSortField = field;
          configSortDir = (field === 'name' || field === 'turno') ? 'asc' : 'desc';
        }
        configPage = 1;
        renderSavedConfigs();
      });
    });

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        if (btn.dataset.action === 'load') loadConfig(id);
        else if (btn.dataset.action === 'delete') deleteConfig(id);
        else if (btn.dataset.action === 'save-solver') saveSolverResult(id);
        else if (btn.dataset.action === 'export-config') exportSingleConfig(id);
        else if (btn.dataset.action === 'compare') toggleCompareId(id);
        else if (btn.dataset.action === 'favorite') toggleFavorite(id);
      });
    });

    const prevBtn = container.querySelector('#cfg-page-prev');
    const nextBtn = container.querySelector('#cfg-page-next');
    if (prevBtn) prevBtn.addEventListener('click', () => { configPage--; renderSavedConfigs(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { configPage++; renderSavedConfigs(); });
  }

  function bindSavedConfigsToolbar(container) {
    const toggleFavBtn = container.querySelector('#btn-toggle-favorites');
    if (toggleFavBtn) {
      toggleFavBtn.addEventListener('click', () => {
        configShowFavoritesOnly = !configShowFavoritesOnly;
        configPage = 1;
        renderSavedConfigs();
      });
    }
  }

  // ─── Export/Import JSON ────────────────────────────────────
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportAllJSON() {
    const data = {
      version: 1,
      type: 'ugr-horario-full',
      exportedAt: new Date().toISOString(),
      subjects: SUBJECTS,
      state: { ...state },
      savedConfigs: savedConfigs,
      convalidaciones: convalidacionesEstados,
      propuestas: state.propuestas,
      propuestasGuardadas: savedPropuestasInternas,
    };
    downloadJSON(data, 'ugr-horario-completo.json');
    showToast('Configuración exportada', 'success');
  }

  function importAllJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);

        if (data.type !== 'ugr-horario-full') {
          showToast('Formato de archivo no válido', 'error');
          return;
        }

        if (!confirm('Esto reemplazará toda tu configuración actual. ¿Continuar?')) return;

        if (data.subjects && Array.isArray(data.subjects)) {
          SUBJECTS.length = 0;
          data.subjects.forEach(s => SUBJECTS.push(s));
          saveSubjectsToStorage();
        }

        if (data.state) {
          state = { ...state, ...data.state };
          saveState();
        }

        if (data.savedConfigs && Array.isArray(data.savedConfigs)) {
          savedConfigs = data.savedConfigs;
          saveAllConfigs(savedConfigs);
        }

        if (data.convalidaciones) {
          convalidacionesEstados = data.convalidaciones;
          localStorage.setItem('ugr-convalidaciones', JSON.stringify(convalidacionesEstados));
        }

        if (data.propuestas) {
          state.propuestas = data.propuestas;
          savePropuestas(); saveState();
        }

        if (data.propuestasGuardadas && Array.isArray(data.propuestasGuardadas)) {
          savedPropuestasInternas = data.propuestasGuardadas;
          localStorage.setItem('ugr-propuestas-guardadas', JSON.stringify(savedPropuestasInternas));
        }

        document.getElementById('apellido').value = state.apellido || '';
        document.getElementById('turno-preferente').value = state.turnoPreferente || 'indiferente';

        renderSavedConfigs();
        renderPropuestasGuardadas();
        updateAll();
        renderSubjects();
        if (typeof renderConvalidaciones === 'function') renderConvalidaciones();
        showToast('Configuración importada correctamente', 'success');
      } catch (err) {
        showToast('Error al leer el archivo', 'error');
      }
    };
    reader.readAsText(file);
  }

  function resetDefaults() {
    if (!confirm('Esto borrará todos tus datos y restaurará las asignaturas por defecto. ¿Continuar?')) return;

    localStorage.removeItem('ugr-horario-state');
    localStorage.removeItem('ugr-horario-subjects');
    for (let i = 0; i < CONFIG_STORAGE_SLOTS; i++) {
      localStorage.removeItem(getStorageKey(i));
    }
    localStorage.removeItem('ugr-convalidaciones');
    localStorage.removeItem('ugr-propuestas');
    localStorage.removeItem('ugr-propuestas-guardadas');

    state = {
      selectedSubjects: {},
      groupChoices: {},
      apellido: '',
      turnoPreferente: 'indiferente',
      cuatrimestreActivo: 1,
      propuestas: typeof PROPUESTAS_INICIALES !== 'undefined' ? JSON.parse(JSON.stringify(PROPUESTAS_INICIALES)) : [],
      propuestaActivaId: typeof PROPUESTAS_INICIALES !== 'undefined' && PROPUESTAS_INICIALES[0] ? PROPUESTAS_INICIALES[0].id : null,
      vistaConvalidaciones: 'oficial',
    };
    PROPUESTAS = JSON.parse(JSON.stringify(state.propuestas));
    localStorage.setItem('ugr-propuestas', JSON.stringify(PROPUESTAS));
    savedConfigs = [];
    savedPropuestasInternas = [];
    convalidacionesEstados = {};
    conflicts = [];

    SUBJECTS.length = 0;
    DEFAULT_SUBJECTS.forEach(s => SUBJECTS.push(JSON.parse(JSON.stringify(s))));
    saveSubjectsToStorage();

    document.getElementById('apellido').value = '';
    document.getElementById('turno-preferente').value = 'indiferente';
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', parseInt(tab.dataset.cuatrimestre) === 1);
    });
    state.cuatrimestreActivo = 1;

    // El store es la persistencia (C3): si el reset solo borra localStorage,
    // el próximo arranque hidrataría del store los datos que aquí se acaban de
    // restaurar y el reset quedaría anulado. `stateHydrated` ya está en true
    // (hubo un init previo), así que estos pushes sí se emiten.
    pushProfileToStore();
    pushSelectionToStore();
    pushPropuestasToStore();
    pushCompareIdsToStore();
    saveState();

    configPage = 1;
    renderSavedConfigs();
    renderPropuestasGuardadas();
    renderPropuestasBar();
    updateAll();
    renderSubjects();
    showToast('Configuración restaurada por defecto', 'info');
  }

  // ─── Export/Import Single Config ───────────────────────────
  function exportSingleConfig(id) {
    const allConfigs = getDisplayConfigs();
    const config = allConfigs.find(c => c.id === id);
    if (!config) return;

    // Delegación B4-b: envoltorio exacto `{version, type, exportedAt, config}`
    // (clon profundo) y nombre de fichero, ambos en el dominio puro; la fecha
    // ISO se pasa aquí para que el dominio no lea el reloj.
    const data = getDomain().buildSingleConfigExport(config, new Date().toISOString());
    downloadJSON(data, getDomain().configFilename(config.name));
    showToast(`"${config.name}" exportada`, 'success');
  }

  function exportAllSavedConfigs() {
    if (savedConfigs.length === 0) {
      showToast('No hay configuraciones propias que exportar', 'info');
      return;
    }

    // Delegación B4-b: mismo envoltorio batch (type '…-configs-batch') con la
    // lista clonada; el nombre de fichero legacy vive en `app.js`.
    const data = getDomain().buildBatchConfigExport(savedConfigs, new Date().toISOString());
    downloadJSON(data, 'ugr-horario-configs.json');
    showToast(`${savedConfigs.length} configuración(es) exportada(s)`, 'success');
  }

  function importSavedConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);

        // Delegación B4-b: la validación de formato (single/batch → lista) es
        // pura; `null` significa envoltorio no reconocido. Los `id` siguen
        // generándose aquí: son efecto secundario, no regla de dominio.
        const configsToAdd = getDomain().parseConfigImport(data);
        if (!configsToAdd) {
          showToast('Formato de archivo no válido', 'error');
          return;
        }

        configsToAdd.forEach(c => {
          c.id = Date.now() + Math.floor(Math.random() * 1000);
          savedConfigs.push(c);
        });

        saveAllConfigs(savedConfigs);
        configPage = 1;
        renderSavedConfigs();
        showToast(`${configsToAdd.length} configuración(es) importada(s)`, 'success');
      } catch (err) {
        showToast('Error al leer el archivo', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ─── Toast ──────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ─── Navigation ─────────────────────────────────────────────
  function setupNavigation() {
    console.log('Setting up navigation...');
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        console.log('Nav pulsado:', tab.dataset.view);
        const view = tab.dataset.view;
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.view').forEach(v => {
          v.style.display = 'none';
          v.classList.remove('active');
        });
        const target = document.getElementById('view-' + view);
        if (target) {
          target.style.display = '';
          target.classList.add('active');
        }
        if (view === 'asignaturas') {
          renderManageSubjects();
        }
        if (view === 'convalidaciones') {
          renderConvalidaciones();
        }
      });
    });

    // Filtros convalidaciones
    const filterContainer = document.querySelector('.convalidaciones-filters');
    if (filterContainer) {
      filterContainer.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          filterContainer.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderConvalidaciones();
        });
      });
      const estadoSel = document.getElementById('filter-estado');
      if (estadoSel) estadoSel.addEventListener('change', renderConvalidaciones);
    }
  }

  // ─── Manage Subjects ────────────────────────────────────────
  function renderManageSubjects() {
    const container = document.getElementById('manage-subjects-container');

    let html = '<div class="manage-table-wrapper"><table class="manage-table">';
    html += '<thead><tr>';
    html += '<th>Código</th><th>Nombre</th><th>Curso</th><th>Cuat.</th><th>ECTS</th><th>Estado</th><th>Grupos</th><th>Acciones</th>';
    html += '</tr></thead><tbody>';

    const sorted = [...SUBJECTS].sort((a, b) => a.curso - b.curso || a.cuatrimestre - b.cuatrimestre || a.codigo.localeCompare(b.codigo));

    sorted.forEach(s => {
      html += '<tr>';
      html += `<td class="td-codigo">${s.codigo}</td>`;
      html += `<td>${s.nombre}</td>`;
      html += `<td>${s.curso}º</td>`;
      html += `<td>${s.cuatrimestre}</td>`;
      html += `<td>${s.creditos}</td>`;
      if (s.aprobada) {
        html += `<td><span class="badge-aprobada">Aprobada</span>${s.corresponde ? `<br><small style="color:var(--text-light)">→ ${s.corresponde}</small>` : ''}</td>`;
      } else {
        html += `<td><span class="badge-pendiente">Pendiente</span></td>`;
      }
      html += `<td>${s.grupos.length}</td>`;
      html += `<td class="td-actions">`;
      html += `<button class="btn btn-sm btn-secondary" data-action="edit" data-codigo="${s.codigo}">Editar</button> `;
      html += `<button class="btn btn-sm btn-danger" data-action="delete" data-codigo="${s.codigo}">Eliminar</button>`;
      html += '</td></tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const codigo = btn.dataset.codigo;
        if (btn.dataset.action === 'edit') openEditModal(codigo);
        else if (btn.dataset.action === 'delete') deleteSubject(codigo);
      });
    });
  }

  function deleteSubject(codigo) {
    const subject = SUBJECTS.find(s => s.codigo === codigo);
    if (!subject) return;
    if (!confirm(`¿Eliminar "${subject.nombre}" (${subject.codigo})?`)) return;

    const idx = SUBJECTS.findIndex(s => s.codigo === codigo);
    if (idx !== -1) SUBJECTS.splice(idx, 1);

    delete state.selectedSubjects[codigo];
    delete state.groupChoices[codigo];
    saveSubjectsToStorage();
    saveState();
    renderManageSubjects();
    updateAll();
    showToast(`"${subject.codigo}" eliminada`, 'success');
  }

  function openAddModal() {
    document.getElementById('modal-title').textContent = 'Nueva Asignatura';
    document.getElementById('modal-edit-codigo').value = '';
    document.getElementById('modal-codigo').value = '';
    document.getElementById('modal-nombre').value = '';
    document.getElementById('modal-curso').value = '1';
    document.getElementById('modal-cuatrimestre').value = '1';
    document.getElementById('modal-creditos').value = '6';
    document.getElementById('modal-aprobada').checked = false;
    document.getElementById('modal-corresponde').value = '';
    document.getElementById('modal-codigo').disabled = false;

    window._modalGroups = [];
    renderModalGroups();

    document.getElementById('subject-modal').style.display = 'flex';
  }

  function openEditModal(codigo) {
    const subject = SUBJECTS.find(s => s.codigo === codigo);
    if (!subject) return;

    document.getElementById('modal-title').textContent = 'Editar Asignatura';
    document.getElementById('modal-edit-codigo').value = codigo;
    document.getElementById('modal-codigo').value = codigo;
    document.getElementById('modal-nombre').value = subject.nombre;
    document.getElementById('modal-curso').value = subject.curso;
    document.getElementById('modal-cuatrimestre').value = subject.cuatrimestre;
    document.getElementById('modal-creditos').value = subject.creditos;
    document.getElementById('modal-aprobada').checked = !!subject.aprobada;
    document.getElementById('modal-corresponde').value = subject.corresponde || '';
    document.getElementById('modal-codigo').disabled = true;

    window._modalGroups = JSON.parse(JSON.stringify(subject.grupos));
    renderModalGroups();

    document.getElementById('subject-modal').style.display = 'flex';
  }

  function closeModal() {
    document.getElementById('subject-modal').style.display = 'none';
  }

  function saveSubject() {
    const editCodigo = document.getElementById('modal-edit-codigo').value;
    const codigo = document.getElementById('modal-codigo').value.trim().toUpperCase();
    const nombre = document.getElementById('modal-nombre').value.trim();
    const curso = parseInt(document.getElementById('modal-curso').value);
    const cuatrimestre = parseInt(document.getElementById('modal-cuatrimestre').value);
    const creditos = parseInt(document.getElementById('modal-creditos').value);

    if (!codigo) { showToast('Introduce un código', 'error'); return; }
    if (!nombre) { showToast('Introduce un nombre', 'error'); return; }
    if (!creditos || creditos < 1) { showToast('Créditos no válidos', 'error'); return; }

    const isNew = !editCodigo;
    if (isNew) {
      if (SUBJECTS.find(s => s.codigo === codigo)) {
        showToast('Ya existe una asignatura con ese código', 'error');
        return;
      }
    }

    const grupos = (window._modalGroups || []).map(g => {
      const practicas = { subgrupos: [] };
      (g.practicas.subgrupos || []).forEach(sub => {
        practicas.subgrupos.push(sub);
        practicas[sub] = g.practicas[sub] || [];
      });
      return {
        letra: g.letra,
        turno: g.turno,
        teoria: g.teoria || [],
        practicas: practicas,
      };
    });

    const aprobada = document.getElementById('modal-aprobada').checked;
    const corresponde = document.getElementById('modal-corresponde').value.trim();

    const subjectData = { codigo, nombre, curso, cuatrimestre, creditos, grupos };
    if (aprobada) {
      subjectData.aprobada = true;
      if (corresponde) subjectData.corresponde = corresponde;
    }

    if (isNew) {
      SUBJECTS.push(subjectData);
    } else {
      const idx = SUBJECTS.findIndex(s => s.codigo === editCodigo);
      if (idx !== -1) {
        if (editCodigo !== codigo) {
          delete state.selectedSubjects[editCodigo];
          delete state.groupChoices[editCodigo];
        }
        SUBJECTS[idx] = subjectData;
      }
    }

    saveSubjectsToStorage();
    saveState();
    closeModal();
    renderManageSubjects();
    updateAll();
    showToast(isNew ? `"${codigo}" creada` : `"${codigo}" actualizada`, 'success');
  }

  function addModalGroup() {
    const groups = window._modalGroups || [];
    const usedLetters = groups.map(g => g.letra);
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let nextLetter = allLetters.split('').find(l => !usedLetters.includes(l));
    if (!nextLetter) { showToast('Máximo 26 grupos', 'error'); return; }

    groups.push({
      letra: nextLetter,
      turno: 'mañana',
      teoria: [],
      practicas: { subgrupos: [] },
    });
    window._modalGroups = groups;
    renderModalGroups();
  }

  function removeModalGroup(index) {
    window._modalGroups.splice(index, 1);
    renderModalGroups();
  }

  function renderModalGroups() {
    const container = document.getElementById('modal-groups-container');
    const groups = window._modalGroups || [];

    if (groups.length === 0) {
      container.innerHTML = '<p class="empty-state">Sin grupos. Añade uno para empezar.</p>';
      return;
    }

    let html = '';
    groups.forEach((g, gi) => {
      html += `<div class="modal-group-item">`;
      html += `<div class="modal-group-header">`;
      html += `<span class="modal-group-title">Grupo ${g.letra}</span>`;
      html += `<button class="btn btn-sm btn-danger" data-gi="${gi}">Eliminar</button>`;
      html += `</div>`;

      html += `<div class="form-row">`;
      html += `<div class="form-field">`;
      html += `<label>Turno</label>`;
      html += `<select data-gi="${gi}" data-field="turno">`;
      html += `<option value="mañana" ${g.turno === 'mañana' ? 'selected' : ''}>Mañana</option>`;
      html += `<option value="tarde" ${g.turno === 'tarde' ? 'selected' : ''}>Tarde</option>`;
      html += `</select></div>`;
      html += `</div>`;

      html += `<div class="form-field">`;
      html += `<label>Horarios Teoría</label>`;
      html += `<div class="modal-sessions" data-gi="${gi}" data-type="teoria">`;
      (g.teoria || []).forEach((s, si) => {
        html += `<div class="modal-session-row">`;
        html += `<select data-gi="${gi}" data-type="teoria" data-si="${si}" data-field="dia">`;
        DAYS.forEach(d => { html += `<option value="${d}" ${s.dia === d ? 'selected' : ''}>${DAY_LABELS[d]}</option>`; });
        html += `</select>`;
        html += `<input type="time" value="${s.inicio}" data-gi="${gi}" data-type="teoria" data-si="${si}" data-field="inicio">`;
        html += `<span>-</span>`;
        html += `<input type="time" value="${s.fin}" data-gi="${gi}" data-type="teoria" data-si="${si}" data-field="fin">`;
        html += `<button class="btn btn-sm btn-danger" data-gi="${gi}" data-type="teoria" data-si="${si}">X</button>`;
        html += `</div>`;
      });
      html += `<button class="btn btn-sm btn-secondary" data-gi="${gi}" data-add="teoria">+ Añadir</button>`;
      html += `</div>`;

      html += `<div class="form-field">`;
      html += `<label>Subgrupos de Práctica</label>`;
      const subs = g.practicas.subgrupos || [];
      if (subs.length > 0) {
        subs.forEach((sub, subi) => {
          html += `<div class="modal-subgroup">`;
          html += `<div class="modal-subgroup-header"><strong>${sub}</strong></div>`;
          html += `<div class="modal-sessions" data-gi="${gi}" data-sub="${sub}">`;
          (g.practicas[sub] || []).forEach((s, si) => {
            html += `<div class="modal-session-row">`;
            html += `<select data-gi="${gi}" data-sub="${sub}" data-si="${si}" data-field="dia">`;
            DAYS.forEach(d => { html += `<option value="${d}" ${s.dia === d ? 'selected' : ''}>${DAY_LABELS[d]}</option>`; });
            html += `</select>`;
            html += `<input type="time" value="${s.inicio}" data-gi="${gi}" data-sub="${sub}" data-si="${si}" data-field="inicio">`;
            html += `<span>-</span>`;
            html += `<input type="time" value="${s.fin}" data-gi="${gi}" data-sub="${sub}" data-si="${si}" data-field="fin">`;
            html += `<button class="btn btn-sm btn-danger" data-gi="${gi}" data-sub="${sub}" data-si="${si}">X</button>`;
            html += `</div>`;
          });
          html += `</div>`;
        });
      } else {
        html += '<p class="text-muted">Sin subgrupos definidos.</p>';
      }
      html += `<button class="btn btn-sm btn-secondary" data-gi="${gi}" data-add="subgrupo">+ Añadir Subgrupo</button>`;
      html += `</div>`;

      html += `</div>`;
    });

    container.innerHTML = html;

    // Event listeners for groups
    container.querySelectorAll('[data-gi][data-field="turno"]').forEach(sel => {
      sel.addEventListener('change', () => {
        window._modalGroups[parseInt(sel.dataset.gi)].turno = sel.value;
      });
    });

    container.querySelectorAll('button[data-gi]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const gi = parseInt(btn.dataset.gi);
        if (btn.dataset.add === 'teoria') {
          window._modalGroups[gi].teoria.push({ dia: 'lunes', inicio: '08:00', fin: '09:00' });
          renderModalGroups();
        } else if (btn.dataset.add === 'subgrupo') {
          const subs = window._modalGroups[gi].practicas.subgrupos;
          const num = subs.length + 1;
          const subName = window._modalGroups[gi].letra + num;
          subs.push(subName);
          window._modalGroups[gi].practicas[subName] = [];
          renderModalGroups();
        } else if (!btn.dataset.add && !btn.dataset.si && btn.dataset.si !== '0') {
          removeModalGroup(gi);
        }
      });
    });

    container.querySelectorAll('[data-field="dia"], [data-field="inicio"], [data-field="fin"]').forEach(input => {
      input.addEventListener('change', () => {
        const gi = parseInt(input.dataset.gi);
        const field = input.dataset.field;
        if (input.dataset.sub) {
          const sub = input.dataset.sub;
          const si = parseInt(input.dataset.si);
          window._modalGroups[gi].practicas[sub][si][field] = input.value;
        } else {
          const type = input.dataset.type;
          const si = parseInt(input.dataset.si);
          window._modalGroups[gi][type][si][field] = input.value;
        }
      });
    });

    container.querySelectorAll('button[data-si]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const gi = parseInt(btn.dataset.gi);
        const si = parseInt(btn.dataset.si);
        if (btn.dataset.sub) {
          window._modalGroups[gi].practicas[btn.dataset.sub].splice(si, 1);
        } else {
          window._modalGroups[gi][btn.dataset.type].splice(si, 1);
        }
        renderModalGroups();
      });
    });
  }

  // ─── Subjects Storage ───────────────────────────────────────
  // Fuente de verdad: store `catalogs` (IndexedDB) vía window.__ugrCatalog.
  // localStorage solo se usa como fallback en modo degradado (sin store).
  function saveSubjectsToStorage() {
    const api = getCatalogApi();
    const catalog = api && typeof api.getCatalog === 'function' ? api.getCatalog() : null;
    if (!api || !catalog || typeof api.saveCatalog !== 'function') {
      localStorage.setItem('ugr-horario-subjects', JSON.stringify(SUBJECTS));
      return;
    }
    api.saveCatalog({ ...catalog, subjects: cloneCatalogValue(SUBJECTS) }, { id: api.getActiveCatalogKey() })
      .then(res => {
        if (res.ok) return api.setActiveCatalogKey(res.id);
        localStorage.setItem('ugr-horario-subjects', JSON.stringify(SUBJECTS));
        if (res.error !== 'store_unavailable') showToast('No se pudo guardar en el catálogo', 'error');
        return null;
      })
      .catch(() => {
        localStorage.setItem('ugr-horario-subjects', JSON.stringify(SUBJECTS));
      });
  }

  function loadSubjectsFromStorage() {
    try {
      const saved = localStorage.getItem('ugr-horario-subjects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          SUBJECTS.length = 0;
          parsed.forEach(s => SUBJECTS.push(s));
        }
      }
    } catch (e) { /* ignore */ }
  }

  // ─── Catálogo activo (Fase 2.4b) ────────────────────────────
  const LEGACY_CATALOG_ID = 'UGR/GI/legacy-1';
  const LEGACY_SUBJECT_FIELDS = ['aprobada', 'corresponde', 'descripcion'];
  let catalogBridgeBound = false;

  function getCatalogApi() {
    return (typeof window !== 'undefined' && window.__ugrCatalog) ? window.__ugrCatalog : null;
  }

  function cloneCatalogValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function rebuildDocentesIndex(docents) {
    Object.keys(docentesByKey).forEach(key => { delete docentesByKey[key]; });
    (Array.isArray(docents) ? docents : []).forEach(d => {
      if (d && d.key) docentesByKey[d.key] = d;
    });
  }

  function syncFromActiveCatalog() {
    const api = getCatalogApi();
    if (!api || typeof api.getCatalog !== 'function') return null;
    const catalog = api.getCatalog();
    if (!catalog || !Array.isArray(catalog.subjects)) return null;

    const prevCodes = new Set(SUBJECTS.map(s => s.codigo));
    let carriedFields = false;
    const incoming = catalog.subjects.map(s => {
      const clone = cloneCatalogValue(s);
      const prev = SUBJECTS.find(p => p.codigo === clone.codigo);
      if (prev) {
        LEGACY_SUBJECT_FIELDS.forEach(field => {
          if (clone[field] === undefined && prev[field] !== undefined) {
            clone[field] = cloneCatalogValue(prev[field]);
            carriedFields = true;
          }
        });
      }
      return clone;
    });

    SUBJECTS.length = 0;
    incoming.forEach(s => SUBJECTS.push(s));
    rebuildDocentesIndex(typeof api.getDocents === 'function' ? api.getDocents() : []);

    DEFAULT_SUBJECTS.length = 0;
    incoming.forEach(s => DEFAULT_SUBJECTS.push(cloneCatalogValue(s)));

    const nextCodes = new Set(SUBJECTS.map(s => s.codigo));
    return {
      codesChanged: [...prevCodes].some(code => !nextCodes.has(code)),
      carriedFields,
    };
  }

  function pruneSelectionsToActiveCatalog() {
    const codes = new Set(SUBJECTS.map(s => s.codigo));
    let changed = false;
    Object.keys(state.selectedSubjects).forEach(c => {
      if (!codes.has(c)) {
        delete state.selectedSubjects[c];
        changed = true;
      }
    });
    Object.keys(state.groupChoices).forEach(c => {
      if (!codes.has(c)) {
        delete state.groupChoices[c];
        changed = true;
      }
    });
    return changed;
  }

  // Adopta una única vez el snapshot legacy `ugr-horario-subjects`: se fusiona
  // con el catálogo del store (nunca lo reemplaza) y después se elimina la clave
  // para que no vuelva a competir con el store.
  async function adoptLegacySubjects(api, storeList) {
    const activeId = api.getActiveCatalogKey();
    if (activeId !== LEGACY_CATALOG_ID || storeList.length !== 1) return;
    const catalog = api.getCatalog();
    if (!catalog) return;
    let raw = null;
    try { raw = localStorage.getItem('ugr-horario-subjects'); } catch (e) { return; }
    if (!raw) return;
    let snapshot = null;
    try { snapshot = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(snapshot) || snapshot.length === 0) return;

    const merged = new Map(catalog.subjects.map(s => [s.codigo, s]));
    snapshot.forEach(s => { if (s && s.codigo) merged.set(s.codigo, s); });
    try {
      const res = await api.saveCatalog(
        { ...catalog, subjects: Array.from(merged.values()) },
        { id: activeId },
      );
      if (!res.ok) return;
      // recarga el registro en memoria (saveCatalog solo escribe en IndexedDB)
      await api.setActiveCatalogKey(activeId);
      localStorage.removeItem('ugr-horario-subjects');
    } catch (e) { /* modo degradado */ }
  }

  // El normalizador del catálogo no guarda `aprobada`/`corresponde`/`descripcion`:
  // si el bridge los ha tenido que recuperar del subject legacy, se consolidan en
  // el store para que sobrevivan a cambios de catálogo dentro de la sesión.
  async function persistLegacySubjectFields(api) {
    const catalog = api.getCatalog();
    if (!catalog) return;
    try {
      await api.saveCatalog(
        { ...catalog, subjects: cloneCatalogValue(SUBJECTS) },
        { id: api.getActiveCatalogKey() },
      );
    } catch (e) { /* modo degradado */ }
  }

  async function bootstrapCatalogState() {
    const api = getCatalogApi();
    if (!api || typeof api.getCatalog !== 'function' || !api.getCatalog()) {
      loadSubjectsFromStorage();
      return false;
    }
    let storeList = [];
    try { storeList = await api.listCatalogs(); } catch (e) { storeList = []; }
    if (!storeList.length) {
      loadSubjectsFromStorage();
      return false;
    }
    await adoptLegacySubjects(api, storeList);
    const sync = syncFromActiveCatalog();
    if (sync && sync.carriedFields) await persistLegacySubjectFields(api);
    return sync ? sync.codesChanged : false;
  }

  function refreshAfterCatalogChange() {
    const api = getCatalogApi();
    const sync = syncFromActiveCatalog();
    if (sync) {
      if (sync.carriedFields && api) persistLegacySubjectFields(api);
      if (sync.codesChanged && pruneSelectionsToActiveCatalog()) saveState();
    }
    if (solverBusy) cancelSolver();
    solverResults = [];
    setSolverStatus('');
    updateAll();
    renderManageSubjects();
    renderSolverFilters();
    renderSavedConfigs();
    renderCatalogSelector();
  }

  function escapeCatalogText(text) {
    return String(text).replace(/[&<>"']/g, ch => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
  }

  async function renderCatalogSelector() {
    const select = document.getElementById('catalog-select');
    if (!select) return;
    const api = getCatalogApi();
    if (!api || typeof api.listCatalogs !== 'function') {
      select.disabled = true;
      return;
    }
    let list = [];
    try { list = await api.listCatalogs(); } catch (e) { list = []; }
    if (!list.length) {
      select.innerHTML = '<option value="">Catálogo local (sin tienda)</option>';
      select.disabled = true;
      return;
    }
    select.innerHTML = list.map(c => {
      const label = [c.university, c.degree, c.version, `${c.subjectCount} asignaturas`]
        .filter(Boolean)
        .join(' · ') || c.id;
      return `<option value="${escapeCatalogText(c.id)}">${escapeCatalogText(label)}</option>`;
    }).join('');
    select.disabled = false;
    select.value = api.getActiveCatalogKey();
  }

  async function exportActiveCatalog() {
    const api = getCatalogApi();
    if (!api || typeof api.exportCatalog !== 'function') {
      showToast('Exportación de catálogo no disponible', 'error');
      return;
    }
    const id = api.getActiveCatalogKey();
    try {
      const data = await api.exportCatalog(id);
      if (!data) {
        showToast('Catálogo no disponible', 'error');
        return;
      }
      downloadJSON(data, `catalogo-${String(id).replace(/\//g, '_')}.json`);
      showToast('Catálogo exportado', 'success');
    } catch (e) {
      showToast('Error al exportar el catálogo', 'error');
    }
  }

  function setupCatalogUI() {
    if (!catalogBridgeBound) {
      document.addEventListener('ugr:catalogUpdated', refreshAfterCatalogChange);
      catalogBridgeBound = true;
    }
    const select = document.getElementById('catalog-select');
    if (select && !select.dataset.catalogBound) {
      select.dataset.catalogBound = '1';
      select.addEventListener('change', async (e) => {
        const id = e.target.value;
        const api = getCatalogApi();
        if (!api || !id || typeof api.setActiveCatalogKey !== 'function') return;
        const res = await api.setActiveCatalogKey(id);
        if (!res || !res.ok) {
          showToast('No se pudo activar ese catálogo', 'error');
          renderCatalogSelector();
          return;
        }
        refreshAfterCatalogChange();
      });
    }
    const exportBtn = document.getElementById('btn-catalog-export');
    if (exportBtn && !exportBtn.dataset.catalogBound) {
      exportBtn.dataset.catalogBound = '1';
      exportBtn.addEventListener('click', exportActiveCatalog);
    }
    renderCatalogSelector();
  }

  // ─── Propuestas ─────────────────────────────────────────────
  function getPropuestaActiva() {
    if (!state.propuestas || !state.propuestas.length) return null;
    return state.propuestas.find(p => p.id === state.propuestaActivaId) || state.propuestas[0];
  }

  function setupPropuestas() {
    const sel = document.getElementById('propuesta-select');
    const btnNueva = document.getElementById('btn-nueva-propuesta');
    const btnVacia = document.getElementById('btn-nueva-vacia-propuesta');
    const btnDup = document.getElementById('btn-duplicar-propuesta');
    const btnRen = document.getElementById('btn-renombrar-propuesta');
    const btnDel = document.getElementById('btn-eliminar-propuesta');
    const btnShare = document.getElementById('btn-compartir-propuesta');
    const btnExp = document.getElementById('btn-export-propuesta');
    const btnImp = document.getElementById('btn-import-propuesta');
    const impInput = document.getElementById('import-propuesta-input');
    if (!sel) return;
    sel.addEventListener('change', () => {
      state.propuestaActivaId = sel.value;
      saveState(); savePropuestas();
      renderPropuestasBar(); renderConvalidaciones();
    });
    if (btnNueva) btnNueva.addEventListener('click', crearPropuesta);
    if (btnVacia) btnVacia.addEventListener('click', crearPropuestaVacia);
    if (btnDup) btnDup.addEventListener('click', duplicarPropuesta);
    if (btnRen) btnRen.addEventListener('click', renombrarPropuesta);
    if (btnDel) btnDel.addEventListener('click', eliminarPropuesta);
    if (btnShare) btnShare.addEventListener('click', compartirPropuestaLink);
    if (btnExp) btnExp.addEventListener('click', exportPropuestaActiva);
    if (btnImp) btnImp.addEventListener('click', () => impInput.click());
    if (impInput) impInput.addEventListener('change', importPropuesta);
    document.querySelectorAll('.convalidaciones-vista-toggle [data-vista]').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.convalidaciones-vista-toggle [data-vista]').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        state.vistaConvalidaciones = b.dataset.vista;
        saveState();
        renderConvalidaciones();
      });
    });
    // modal propuesta
    const modal = document.getElementById('propuesta-modal');
    const close = () => { if (modal) modal.style.display='none'; };
    const closeBtn = document.getElementById('propuesta-modal-close');
    const cancelBtn = document.getElementById('propuesta-modal-cancel');
    const saveBtn = document.getElementById('propuesta-modal-save');
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (cancelBtn) cancelBtn.addEventListener('click', close);
    if (saveBtn) saveBtn.addEventListener('click', guardarPropuestaModal);
    if (modal) modal.addEventListener('click', (e)=>{ if(e.target.id==='propuesta-modal') close(); });
    // modal mapeo
    const mModal = document.getElementById('propuesta-mapeo-modal');
    const mClose = ()=>{ if(mModal) mModal.style.display='none'; };
    const mCloseBtn = document.getElementById('propuesta-mapeo-close');
    const mCancel = document.getElementById('propuesta-mapeo-cancel');
    const mSave = document.getElementById('propuesta-mapeo-save');
    const tipoSel = document.getElementById('mapeo-tipo');
    if (mCloseBtn) mCloseBtn.addEventListener('click', mClose);
    if (mCancel) mCancel.addEventListener('click', mClose);
    if (mSave) mSave.addEventListener('click', guardarMapeo);
    if (mModal) mModal.addEventListener('click', (e)=>{ if(e.target.id==='propuesta-mapeo-modal') mClose(); });
    if (tipoSel) tipoSel.addEventListener('change', ()=>{
      const isBloque = tipoSel.value==='bloque';
      document.getElementById('mapeo-individual-fields').style.display = isBloque?'none':'';
      document.getElementById('mapeo-bloque-fields').style.display = isBloque?'':'none';
    });
    const addC = document.getElementById('btn-add-bloque-cursada');
    const addR = document.getElementById('btn-add-bloque-reconocida');
    if (addC) addC.addEventListener('click', ()=> addBloqueField('cursada',''));
    if (addR) addR.addEventListener('click', ()=> addBloqueField('reconocida',''));
    // selects individuales
    populateMapeoSelects();
    const unedSel = document.getElementById('mapeo-cursada-select');
    const ugrSel = document.getElementById('mapeo-reconocida-select');
    if (unedSel) unedSel.addEventListener('change', ()=>{
      const val = unedSel.value;
      if (!val) { document.getElementById('mapeo-cursada').value=''; document.getElementById('mapeo-cursada-codigo').value=''; return; }
      const [codigo,nombre]=val.split('|');
      document.getElementById('mapeo-cursada').value=nombre;
      document.getElementById('mapeo-cursada-codigo').value=codigo;
    });
    if (ugrSel) ugrSel.addEventListener('change', ()=>{
      const val = ugrSel.value;
      if (!val) { document.getElementById('mapeo-reconocida').value=''; document.getElementById('mapeo-reconocida-codigo').value=''; return; }
      const [codigo,nombre]=val.split('|');
      document.getElementById('mapeo-reconocida').value=nombre;
      document.getElementById('mapeo-reconocida-codigo').value=codigo;
    });
    // propuestas guardadas internas (igual que configuraciones horario)
    const btnGuardarInterna = document.getElementById('btn-guardar-propuesta-interna');
    const inputNombreGuardada = document.getElementById('propuesta-guardada-nombre');
    const btnExportAllGuardadas = document.getElementById('btn-export-all-propuestas');
    const btnImportGuardada = document.getElementById('btn-import-propuesta-guardada');
    const importGuardadaInput = document.getElementById('import-propuesta-guardada-input');
    if (btnGuardarInterna) btnGuardarInterna.addEventListener('click', guardarPropuestaInterna);
    if (inputNombreGuardada) inputNombreGuardada.addEventListener('keydown', (e)=>{ if(e.key==='Enter') guardarPropuestaInterna(); });
    if (btnExportAllGuardadas) btnExportAllGuardadas.addEventListener('click', exportTodasPropuestasGuardadas);
    if (btnImportGuardada) btnImportGuardada.addEventListener('click', ()=> importGuardadaInput.click());
    if (importGuardadaInput) importGuardadaInput.addEventListener('change', importPropuestaGuardada);
    renderPropuestasGuardadas();
    // activa vista guardada
    document.querySelectorAll('.convalidaciones-vista-toggle [data-vista]').forEach(b=>{
      b.classList.toggle('active', b.dataset.vista===state.vistaConvalidaciones);
    });
  }

  // ─── Mapeos CRUD ────────────────────────────────────────────
  let bloqueTemp = { cursadas: [], reconocidas: [] };
  function addBloqueField(tipo, val) {
    if (tipo==='cursada') bloqueTemp.cursadas.push(val || {codigo:'',nombre:''});
    else bloqueTemp.reconocidas.push(val || {codigo:'',nombre:''});
    renderBloqueFields();
  }
  function renderBloqueFields() {
    const cCont = document.getElementById('bloque-cursadas');
    const rCont = document.getElementById('bloque-reconocidas');
    if (!cCont || !rCont) return;
    const unedOpts = getUnedOptions();
    const ugrOpts = getUgrOptions();
    const unedOptionsHtml = '<option value="">-- UNED / DAW --</option>' + unedOpts.map(o=>`<option value="${o.codigo}|${o.nombre}">${o.codigo} - ${o.nombre}</option>`).join('');
    const ugrOptionsHtml = '<option value="">-- UGR --</option>' + ugrOpts.map(o=>{
      const meta=getUgrMeta(o.codigo);
      const extra = meta ? ` · ${formatCursoCuatri(meta)}` : '';
      return `<option value="${o.codigo}|${o.nombre}">${o.codigo} - ${o.nombre}${extra}</option>`;
    }).join('');
    cCont.innerHTML = bloqueTemp.cursadas.map((c,i)=>{
      const val = (c.codigo && c.nombre) ? `${c.codigo}|${c.nombre}` : '';
      return `<div class="form-row" style="gap:0.4rem;"><select data-bloque="cursada" data-i="${i}" style="flex:1;">${unedOptionsHtml}</select><button type="button" class="btn btn-sm btn-danger" data-del-bloque="cursada" data-i="${i}">X</button></div>`;
    }).join('');
    rCont.innerHTML = bloqueTemp.reconocidas.map((r,i)=>{
      const val = (r.codigo && r.nombre) ? `${r.codigo}|${r.nombre}` : '';
      return `<div class="form-row" style="gap:0.4rem;"><select data-bloque="reconocida" data-i="${i}" style="flex:1;">${ugrOptionsHtml}</select><button type="button" class="btn btn-sm btn-danger" data-del-bloque="reconocida" data-i="${i}">X</button></div>`;
    }).join('');
    cCont.querySelectorAll('select').forEach(sel=>{
      const i=parseInt(sel.dataset.i);
      const cur = bloqueTemp.cursadas[i];
      if (cur.codigo) sel.value = `${cur.codigo}|${cur.nombre}`;
      sel.addEventListener('change', ()=>{
        const v=sel.value;
        if (!v) { bloqueTemp.cursadas[i]={codigo:'',nombre:''}; return; }
        const [codigo,nombre]=v.split('|');
        bloqueTemp.cursadas[i]={codigo,nombre};
      });
    });
    rCont.querySelectorAll('select').forEach(sel=>{
      const i=parseInt(sel.dataset.i);
      const cur = bloqueTemp.reconocidas[i];
      if (cur.codigo) sel.value = `${cur.codigo}|${cur.nombre}`;
      sel.addEventListener('change', ()=>{
        const v=sel.value;
        if (!v) { bloqueTemp.reconocidas[i]={codigo:'',nombre:''}; return; }
        const [codigo,nombre]=v.split('|');
        bloqueTemp.reconocidas[i]={codigo,nombre};
      });
    });
    cCont.querySelectorAll('[data-del-bloque="cursada"]').forEach(b=> b.addEventListener('click', ()=>{ bloqueTemp.cursadas.splice(parseInt(b.dataset.i),1); renderBloqueFields(); }));
    rCont.querySelectorAll('[data-del-bloque="reconocida"]').forEach(b=> b.addEventListener('click', ()=>{ bloqueTemp.reconocidas.splice(parseInt(b.dataset.i),1); renderBloqueFields(); }));
  }
  function abrirMapeoModal(index) {
    const activa = getPropuestaActiva();
    if (!activa) { showToast('Crea primero una propuesta','error'); return; }
    const isEdit = typeof index==='number' && index>=0;
    const m = isEdit ? activa.mappings[index] : null;
    document.getElementById('mapeo-edit-index').value = isEdit? String(index) : '';
    const tipoSel = document.getElementById('mapeo-tipo');
    const isBloque = m && m.tipo==='bloque';
    tipoSel.value = isBloque ? 'bloque' : 'individual';
    document.getElementById('mapeo-individual-fields').style.display = isBloque?'none':'';
    document.getElementById('mapeo-bloque-fields').style.display = isBloque?'':'none';
    document.getElementById('propuesta-mapeo-title').textContent = isEdit? (isBloque?'Editar bloque':'Editar mapeo') : (tipoSel.value==='bloque'?'Nuevo bloque':'Nuevo mapeo');
    if (isBloque) {
      bloqueTemp = { cursadas: JSON.parse(JSON.stringify(m.cursadas||[])), reconocidas: JSON.parse(JSON.stringify(m.reconocidas||[])) };
      document.getElementById('bloque-calif').value = m.calificacion||7.5;
      document.getElementById('bloque-creditos').value = m.creditos||24;
      document.getElementById('bloque-nota').value = m.nota||'';
      if (!bloqueTemp.cursadas.length) bloqueTemp.cursadas=[{codigo:'',nombre:''}];
      if (!bloqueTemp.reconocidas.length) bloqueTemp.reconocidas=[{codigo:'',nombre:''}];
      renderBloqueFields();
    } else if (m) {
      populateMapeoSelects();
      const unedSel = document.getElementById('mapeo-cursada-select');
      const ugrSel = document.getElementById('mapeo-reconocida-select');
      const unedVal = m.cursadaCodigo && m.cursada ? `${m.cursadaCodigo}|${m.cursada}` : '';
      const ugrVal = m.reconocidaCodigo && m.reconocida ? `${m.reconocidaCodigo}|${m.reconocida}` : '';
      if (unedSel) { unedSel.value = unedVal; unedSel.dispatchEvent(new Event('change')); }
      // fallback si la opción no existe (custom) -> mantener hidden
      document.getElementById('mapeo-cursada').value = m.cursada||'';
      document.getElementById('mapeo-cursada-codigo').value = m.cursadaCodigo||'';
      document.getElementById('mapeo-reconocida').value = m.reconocida||'';
      document.getElementById('mapeo-reconocida-codigo').value = m.reconocidaCodigo||'';
      if (ugrSel) { ugrSel.value = ugrVal; ugrSel.dispatchEvent(new Event('change')); }
      document.getElementById('mapeo-calif').value = m.calificacion||7.5;
      document.getElementById('mapeo-creditos').value = m.creditos||6;
      bloqueTemp = { cursadas:[], reconocidas:[] };
    } else {
      populateMapeoSelects();
      document.getElementById('mapeo-cursada-select').value='';
      document.getElementById('mapeo-cursada').value='';
      document.getElementById('mapeo-cursada-codigo').value='';
      document.getElementById('mapeo-reconocida-select').value='';
      document.getElementById('mapeo-reconocida').value='';
      document.getElementById('mapeo-reconocida-codigo').value='';
      document.getElementById('mapeo-calif').value=7.5;
      document.getElementById('mapeo-creditos').value=6;
      bloqueTemp={ cursadas:[{codigo:'',nombre:''},{codigo:'',nombre:''},{codigo:'',nombre:''},{codigo:'',nombre:''}], reconocidas:[{codigo:'',nombre:''},{codigo:'',nombre:''},{codigo:'',nombre:''},{codigo:'',nombre:''}] };
      document.getElementById('bloque-calif').value=7.5;
      document.getElementById('bloque-creditos').value=24;
      document.getElementById('bloque-nota').value='Bloque 4↔4 — concesión conjunta';
      renderBloqueFields();
    }
    document.getElementById('propuesta-mapeo-modal').style.display='flex';
  }
  function guardarMapeo() {
    const activa = getPropuestaActiva();
    if (!activa) return;
    const idxVal = document.getElementById('mapeo-edit-index').value;
    const isEdit = idxVal!=='' && !isNaN(parseInt(idxVal));
    const tipo = document.getElementById('mapeo-tipo').value;
    let nuevo;
    if (tipo==='bloque') {
      const cursadas = bloqueTemp.cursadas.filter(c=>c.nombre.trim()||c.codigo.trim());
      const reconocidas = bloqueTemp.reconocidas.filter(r=>r.nombre.trim()||r.codigo.trim());
      if (cursadas.length===0 || reconocidas.length===0) { showToast('Completa al menos una cursada y una reconocida','error'); return; }
      nuevo = { tipo:'bloque', id: isEdit && activa.mappings[parseInt(idxVal)]?.id ? activa.mappings[parseInt(idxVal)].id : 'bloque-'+Date.now(), cursadas, reconocidas, calificacion: parseFloat(document.getElementById('bloque-calif').value)||7.5, creditos: parseInt(document.getElementById('bloque-creditos').value)||24, nota: document.getElementById('bloque-nota').value.trim() };
    } else {
      const cursada=document.getElementById('mapeo-cursada').value.trim();
      const cursadaCodigo=document.getElementById('mapeo-cursada-codigo').value.trim();
      const reconocida=document.getElementById('mapeo-reconocida').value.trim();
      const reconocidaCodigo=document.getElementById('mapeo-reconocida-codigo').value.trim();
      if (!cursada || !reconocidaCodigo) { showToast('Rellena cursada y código UGR','error'); return; }
      nuevo={ cursada, cursadaCodigo, reconocida, reconocidaCodigo, reconocidaNombre: reconocida+' ('+reconocidaCodigo+')', calificacion: parseFloat(document.getElementById('mapeo-calif').value)||7.5, creditos: parseInt(document.getElementById('mapeo-creditos').value)||6 };
    }
    if (isEdit) activa.mappings[parseInt(idxVal)] = nuevo;
    else activa.mappings.push(nuevo);
    activa.totalCreditos = calcPropuestaCreditos(activa);
    saveState(); savePropuestas();
    document.getElementById('propuesta-mapeo-modal').style.display='none';
    renderPropuestasBar(); renderConvalidaciones();
    showToast(isEdit?'Mapeo actualizado':'Mapeo añadido','success');
  }
  function eliminarMapeo(idx) {
    const activa=getPropuestaActiva();
    if (!activa || typeof idx!=='number') return;
    if (!confirm('¿Eliminar este mapeo?')) return;
    activa.mappings.splice(idx,1);
    activa.totalCreditos=calcPropuestaCreditos(activa);
    saveState(); savePropuestas();
    renderPropuestasBar(); renderConvalidaciones();
    showToast('Mapeo eliminado','info');
  }
  function crearPropuestaVacia() {
    const nombre = prompt('Nombre de la nueva propuesta:','Nueva propuesta');
    if (nombre===null) return;
    const clean = nombre.trim() || 'Propuesta '+ (state.propuestas.length+1);
    const nueva={ id:'prop-'+Date.now(), nombre:clean, enBloque:false, nota:'', totalCreditos:0, mappings:[] };
    state.propuestas.push(nueva);
    state.propuestaActivaId=nueva.id;
    saveState(); savePropuestas();
    renderPropuestasBar(); renderConvalidaciones();
    showToast('Propuesta vacía creada — añade mapeos','success');
    setTimeout(()=>abrirMapeoModal(), 200);
  }

  // ─── Propuestas guardadas (igual que configuraciones de horario) ──
  function guardarPropuestaInterna() {
    const input = document.getElementById('propuesta-guardada-nombre');
    const nombre = input ? input.value.trim() : '';
    if (!nombre) { showToast('Introduce un nombre para guardar','error'); return; }
    const activa = getPropuestaActiva();
    if (!activa) { showToast('No hay propuesta activa','error'); return; }
    if (activa.mappings.length===0) { showToast('La propuesta activa está vacía','error'); return; }
    const snap = JSON.parse(JSON.stringify(activa));
    const saved = { id: Date.now(), nombre, propuesta: snap, totalCreditos: calcPropuestaCreditos(snap), entradas: snap.mappings.length, fecha: new Date().toISOString() };
    savedPropuestasInternas.push(saved);
    localStorage.setItem('ugr-propuestas-guardadas', JSON.stringify(savedPropuestasInternas));
    if (input) input.value='';
    renderPropuestasGuardadas();
    showToast(`Propuesta "${nombre}" guardada`,'success');
  }
  function cargarPropuestaGuardada(id) {
    const saved = savedPropuestasInternas.find(s=>s.id===id);
    if (!saved) return;
    const copia = JSON.parse(JSON.stringify(saved.propuesta));
    copia.id = 'prop-'+Date.now();
    // nombre se mantiene de la guardada pero editable
    state.propuestas.push(copia);
    state.propuestaActivaId = copia.id;
    saveState(); savePropuestas();
    renderPropuestasBar(); renderConvalidaciones();
    showToast(`Propuesta "${saved.nombre}" cargada`,'success');
  }
  function eliminarPropuestaGuardada(id) {
    const saved = savedPropuestasInternas.find(s=>s.id===id);
    if (!saved) return;
    if (!confirm(`¿Eliminar propuesta guardada "${saved.nombre}"?`)) return;
    savedPropuestasInternas = savedPropuestasInternas.filter(s=>s.id!==id);
    localStorage.setItem('ugr-propuestas-guardadas', JSON.stringify(savedPropuestasInternas));
    renderPropuestasGuardadas();
    showToast('Propuesta guardada eliminada','info');
  }
  function exportPropuestaGuardada(id) {
    const saved = savedPropuestasInternas.find(s=>s.id===id);
    if (!saved) return;
    downloadJSON({ version:1, type:'ugr-propuesta-guardada', exportedAt:new Date().toISOString(), saved }, `propuesta-guardada-${saved.nombre.replace(/\s+/g,'-').toLowerCase()}.json`);
    showToast('Propuesta guardada exportada','success');
  }
  function exportTodasPropuestasGuardadas() {
    if (savedPropuestasInternas.length===0) { showToast('No hay propuestas guardadas','info'); return; }
    downloadJSON({ version:1, type:'ugr-propuestas-guardadas-batch', exportedAt:new Date().toISOString(), guardadas: savedPropuestasInternas }, 'propuestas-guardadas.json');
    showToast(`${savedPropuestasInternas.length} propuestas guardadas exportadas`,'success');
  }
  function importPropuestaGuardada(e) {
    const file=e.target.files[0];
    if (!file) return;
    e.target.value='';
    const reader=new FileReader();
    reader.onload=(evt)=>{
      try {
        const data=JSON.parse(evt.target.result);
        let toAdd=[];
        if (data.type==='ugr-propuesta-guardada' && data.saved) toAdd=[data.saved];
        else if (data.type==='ugr-propuestas-guardadas-batch' && Array.isArray(data.guardadas)) toAdd=data.guardadas;
        else if (data.type==='ugr-propuesta' && data.propuesta) toAdd=[{id:Date.now(), nombre:data.propuesta.nombre||'Importada', propuesta:data.propuesta, totalCreditos:calcPropuestaCreditos(data.propuesta), entradas:data.propuesta.mappings.length, fecha:new Date().toISOString()}];
        else if (data.mappings) toAdd=[{id:Date.now(), nombre:data.nombre||'Importada', propuesta:data, totalCreditos:calcPropuestaCreditos(data), entradas:data.mappings.length, fecha:new Date().toISOString()}];
        else { showToast('Formato no válido','error'); return; }
        toAdd.forEach(s=>{ s.id=Date.now()+Math.floor(Math.random()*1000); savedPropuestasInternas.push(s); });
        localStorage.setItem('ugr-propuestas-guardadas', JSON.stringify(savedPropuestasInternas));
        renderPropuestasGuardadas();
        showToast(`${toAdd.length} propuesta(s) guardada(s) importada(s)`,'success');
      } catch(err){ showToast('Error al leer archivo','error'); }
    };
    reader.readAsText(file);
  }
  function renderPropuestasGuardadas() {
    const cont=document.getElementById('propuestas-guardadas-list');
    if (!cont) return;
    if (savedPropuestasInternas.length===0) { cont.innerHTML='<p class="empty-state">No hay propuestas guardadas. Guarda la activa con un nombre.</p>'; return; }
    let html='<div class="saved-configs-grid">';
    savedPropuestasInternas.forEach(s=>{
      html+=`<div class="saved-config-item"><div class="saved-config-info"><div class="saved-config-name">${s.nombre}</div><div class="saved-config-meta">${s.entradas} entradas · ${s.totalCreditos} ECTS · ${new Date(s.fecha).toLocaleDateString()}</div></div><div class="saved-config-actions"><button class="btn btn-sm btn-secondary" data-pg-action="load" data-id="${s.id}">Cargar</button><button class="btn btn-sm btn-secondary" data-pg-action="export" data-id="${s.id}">Exportar</button><button class="btn btn-sm btn-danger" data-pg-action="delete" data-id="${s.id}">Eliminar</button></div></div>`;
    });
    html+='</div>';
    cont.innerHTML=html;
    cont.querySelectorAll('[data-pg-action]').forEach(b=>{
      const id=parseInt(b.dataset.id);
      if (b.dataset.pgAction==='load') b.addEventListener('click', ()=>cargarPropuestaGuardada(id));
      else if (b.dataset.pgAction==='delete') b.addEventListener('click', ()=>eliminarPropuestaGuardada(id));
      else if (b.dataset.pgAction==='export') b.addEventListener('click', ()=>exportPropuestaGuardada(id));
    });
  }

  function renderPropuestasBar() {
    const sel = document.getElementById('propuesta-select');
    const badge = document.getElementById('propuesta-badge');
    const summary = document.getElementById('propuestas-summary');
    const detalle = document.getElementById('propuesta-detalle');
    if (!sel || !state.propuestas) return;
    sel.innerHTML = state.propuestas.map(p=>`<option value="${p.id}" ${p.id===state.propuestaActivaId?'selected':''}>${p.nombre} (${p.totalCreditos||calcPropuestaCreditos(p)} ECTS)</option>`).join('');
    const activa = getPropuestaActiva();
    if (activa) {
      const total = calcPropuestaCreditos(activa);
      const entradas = activa.mappings.length;
      const bloqueTxt = activa.enBloque ? ' · En bloque' : '';
      const bloqueCount = activa.mappings.filter(m=>m.tipo==='bloque').length;
      if (badge) badge.textContent = `${entradas} entradas${bloqueCount?' ('+bloqueCount+' bloque)':''} · ${total} ECTS${bloqueTxt}`;
      if (summary) summary.textContent = `${state.propuestas.length} propuesta(s) · Activa: ${activa.nombre}`;
      if (detalle) {
        let html = `<div class="propuesta-meta"><small style="color:var(--text-light)">${activa.nota||''}${activa.enBloque?'<br><strong>En bloque:</strong> concesión conjunta — si una se deniega, se revisa el bloque completo.':''}</small></div>`;
        html += `<div class="propuesta-legend"><span class="legend-item"><span class="legend-dot" style="background:#1976d2"></span>1º</span><span class="legend-item"><span class="legend-dot" style="background:#388e3c"></span>2º</span><span class="legend-item"><span class="legend-dot" style="background:#f57c00"></span>3º</span><span class="legend-item"><span class="legend-dot" style="background:#7b1fa2"></span>4º</span><span class="legend-item"><span class="legend-dot" style="background:#757575"></span>Opt</span><span class="legend-item" style="margin-left:0.6rem;">Cuatri: <span class="cuatri-badge c1">1ºC</span> <span class="cuatri-badge c2">2ºC</span></span></div>`;
        const sortIcon = propuestasSortCurso==='asc' ? '↑' : propuestasSortCurso==='desc' ? '↓' : '↕';
        html += '<div class="manage-table-wrapper"><table class="manage-table"><thead><tr><th>Cursada</th><th id="th-orden-curso" style="cursor:pointer;user-select:none;" title="Ordenar por curso">Reconocida (UGR) '+sortIcon+'</th><th>Cód.</th><th>Calif.</th><th>Acciones</th></tr></thead><tbody>';
        const indexed = activa.mappings.map((m,idx)=>({m,idx}));
        const sorted = sortMappingsByCurso(activa.mappings).map(sm=>{
          const origIdx = activa.mappings.indexOf(sm);
          return {m:sm, idx: origIdx};
        });
        const toRender = propuestasSortCurso ? sorted : indexed;
        toRender.forEach(({m,idx})=>{
          const origI = idx;
          if (m.tipo==='bloque') {
            const cursadasTxt = m.cursadas.map(c=>`${c.nombre} (${c.codigo})`).join('<br>');
            const reconTxt = m.reconocidas.map(r=>{
              const meta=getUgrMeta(r.codigo);
              const cursoCls = meta ? (meta.curso==='Opt'?'copt':'c'+meta.curso) : '';
              const cursoBadge = meta ? `<span class="curso-badge ${cursoCls}">${meta.curso==='Opt'?'OPT':meta.curso+'º'}</span>` : '<span class="curso-badge copt">?</span>';
              const cuatriBadge = meta && meta.cuatrimestre!=='-' ? `<span class="cuatri-badge c${meta.cuatrimestre}">${meta.cuatrimestre}ºC</span>` : '';
              return `${cursoBadge}${cuatriBadge} ${r.nombre} (${r.codigo})`;
            }).join('<br>');
            const codigos = m.reconocidas.map(r=>{
              const meta=getUgrMeta(r.codigo);
              const cursoCls = meta ? (meta.curso==='Opt'?'copt':'c'+meta.curso) : 'copt';
              const cursoBadge = meta ? `<span class="curso-badge ${cursoCls}">${meta.curso==='Opt'?'OPT':meta.curso+'º'}</span>` : '';
              return `${cursoBadge} ${r.codigo}`;
            }).join('<br>');
            html += `<tr class="propuesta-bloque-row"><td><strong>Bloque 4↔4</strong><br><small style="color:var(--text-light)">${cursadasTxt}</small></td><td><small>${reconTxt}</small></td><td><small>${codigos}</small></td><td><span class="badge-bloque">${m.calificacion}</span><br><small>${m.creditos} ECTS</small></td><td><button class="btn btn-sm btn-secondary" data-edit-mapeo="${origI}">Editar</button> <button class="btn btn-sm btn-danger" data-del-mapeo="${origI}">X</button></td></tr>`;
          } else {
            const meta=getUgrMeta(m.reconocidaCodigo);
            const cursoCls = meta ? (meta.curso==='Opt'?'copt':'c'+meta.curso) : 'copt';
            const cursoBadge = meta ? `<span class="curso-badge ${cursoCls}">${meta.curso==='Opt'?'OPT':meta.curso+'º'}</span>` : '<span class="curso-badge copt">?</span>';
            const cuatriBadge = meta && meta.cuatrimestre!=='-' ? `<span class="cuatri-badge c${meta.cuatrimestre}">${meta.cuatrimestre}ºC</span>` : '';
            const rowCls = meta ? `propuesta-row curso-${String(meta.curso).toLowerCase()}` : 'propuesta-row curso-opt';
            html += `<tr class="${rowCls}"><td>${m.cursada} <small style="color:var(--text-light)">(${m.cursadaCodigo})</small></td><td>${cursoBadge}${cuatriBadge} ${m.reconocida}<br><small style="color:var(--text-light)">${m.reconocidaCodigo} · ${formatCursoCuatri(meta)||'sin curso'}</small></td><td>${cursoBadge} ${m.reconocidaCodigo}</td><td>${m.calificacion}</td><td><button class="btn btn-sm btn-secondary" data-edit-mapeo="${origI}">Editar</button> <button class="btn btn-sm btn-danger" data-del-mapeo="${origI}">X</button></td></tr>`;
          }
        });
        html += `<tr style="font-weight:700;"><td colspan="4">Total de créditos reconocidos</td><td>${total} (*)</td></tr>`;
        html += '</tbody></table></div>';
        html += `<div class="propuestas-actions" style="margin-top:0.6rem;"><button class="btn btn-sm btn-secondary" id="btn-add-mapeo-individual">+ Añadir asignatura</button><button class="btn btn-sm btn-secondary" id="btn-add-mapeo-bloque">+ Añadir bloque 4↔4</button></div>`;
        detalle.innerHTML = html;
        detalle.querySelectorAll('[data-edit-mapeo]').forEach(b=> b.addEventListener('click', ()=> abrirMapeoModal(parseInt(b.dataset.editMapeo))));
        detalle.querySelectorAll('[data-del-mapeo]').forEach(b=> b.addEventListener('click', ()=> eliminarMapeo(parseInt(b.dataset.delMapeo))));
        const addInd = detalle.querySelector('#btn-add-mapeo-individual');
        const addBlo = detalle.querySelector('#btn-add-mapeo-bloque');
        if (addInd) addInd.addEventListener('click', ()=> { document.getElementById('mapeo-tipo').value='individual'; abrirMapeoModal(); });
        if (addBlo) addBlo.addEventListener('click', ()=> { document.getElementById('mapeo-tipo').value='bloque'; abrirMapeoModal(); });
        const thSort = detalle.querySelector('#th-orden-curso');
        if (thSort) thSort.addEventListener('click', ()=>{ propuestasSortCurso = propuestasSortCurso==='asc' ? 'desc' : propuestasSortCurso==='desc' ? null : 'asc'; renderPropuestasBar(); renderConvalidaciones(); });
      }
    } else {
      if (badge) badge.textContent = '';
      if (summary) summary.textContent = 'Sin propuestas';
      if (detalle) detalle.innerHTML = '<p class="empty-state">Crea una propuesta para empezar.</p>';
    }
  }

  function crearPropuesta() {
    document.getElementById('propuesta-modal-title').textContent = 'Nueva Propuesta';
    document.getElementById('propuesta-edit-id').value = '';
    document.getElementById('propuesta-nombre').value = '';
    document.getElementById('propuesta-enbloque').checked = true;
    document.getElementById('propuesta-nota').value = '';
    document.getElementById('propuesta-modal').style.display='flex';
  }

  function duplicarPropuesta() {
    const activa = getPropuestaActiva();
    if (!activa) { showToast('No hay propuesta activa','error'); return; }
    const copia = JSON.parse(JSON.stringify(activa));
    copia.id = 'prop-' + Date.now();
    copia.nombre = activa.nombre + ' (copia)';
    state.propuestas.push(copia);
    state.propuestaActivaId = copia.id;
    saveState(); savePropuestas();
    renderPropuestasBar(); renderConvalidaciones();
    showToast('Propuesta duplicada','success');
  }

  function renombrarPropuesta() {
    const activa = getPropuestaActiva();
    if (!activa) return;
    document.getElementById('propuesta-modal-title').textContent = 'Renombrar Propuesta';
    document.getElementById('propuesta-edit-id').value = activa.id;
    document.getElementById('propuesta-nombre').value = activa.nombre;
    document.getElementById('propuesta-enbloque').checked = !!activa.enBloque;
    document.getElementById('propuesta-nota').value = activa.nota||'';
    document.getElementById('propuesta-modal').style.display='flex';
  }

  function guardarPropuestaModal() {
    const id = document.getElementById('propuesta-edit-id').value;
    const nombre = document.getElementById('propuesta-nombre').value.trim();
    const enBloque = document.getElementById('propuesta-enbloque').checked;
    const nota = document.getElementById('propuesta-nota').value.trim();
    if (!nombre) { showToast('Introduce un nombre','error'); return; }
    if (id) {
      const p = state.propuestas.find(x=>x.id===id);
      if (p) { p.nombre=nombre; p.enBloque=enBloque; p.nota=nota; }
    } else {
      const nueva = { id:'prop-'+Date.now(), nombre, enBloque, nota, totalCreditos:0, mappings:[] };
      const activa = getPropuestaActiva();
      if (activa) nueva.mappings = JSON.parse(JSON.stringify(activa.mappings));
      nueva.totalCreditos = calcPropuestaCreditos(nueva);
      state.propuestas.push(nueva);
      state.propuestaActivaId = nueva.id;
    }
    saveState(); savePropuestas();
    document.getElementById('propuesta-modal').style.display='none';
    renderPropuestasBar(); renderConvalidaciones();
    showToast('Propuesta guardada','success');
  }

  function eliminarPropuesta() {
    const activa = getPropuestaActiva();
    if (!activa) return;
    if (!confirm(`¿Eliminar "${activa.nombre}"?`)) return;
    state.propuestas = state.propuestas.filter(p=>p.id!==activa.id);
    state.propuestaActivaId = state.propuestas[0]?state.propuestas[0].id:null;
    saveState(); savePropuestas();
    renderPropuestasBar(); renderConvalidaciones();
    showToast('Propuesta eliminada','info');
  }

  function exportPropuestaActiva() {
    const activa = getPropuestaActiva();
    if (!activa) { showToast('No hay propuesta activa','error'); return; }
    downloadJSON({ version:1, type:'ugr-propuesta', exportedAt:new Date().toISOString(), propuesta:activa }, `propuesta-${activa.id}.json`);
    showToast('Propuesta exportada','success');
  }

  function importPropuesta(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value='';
    const reader = new FileReader();
    reader.onload = (evt)=>{
      try {
        const data = JSON.parse(evt.target.result);
        let prop = null;
        if (data.type==='ugr-propuesta' && data.propuesta) prop = data.propuesta;
        else if (data.mappings) prop = data;
        else { showToast('Formato no válido','error'); return; }
        prop.id = 'prop-'+Date.now();
        if (!prop.mappings) prop.mappings=[];
        prop.totalCreditos = calcPropuestaCreditos(prop);
        state.propuestas.push(prop);
        state.propuestaActivaId = prop.id;
        saveState(); savePropuestas();
        renderPropuestasBar(); renderConvalidaciones();
        showToast('Propuesta importada','success');
      } catch(err){ showToast('Error al leer archivo','error'); }
    };
    reader.readAsText(file);
  }

  function compartirPropuestaLink() {
    const activa = getPropuestaActiva();
    if (!activa) { showToast('No hay propuesta activa','error'); return; }
    const encoded = btoa(encodeURIComponent(JSON.stringify(activa)));
    const url = window.location.origin + window.location.pathname + '?propuesta=' + encoded;
    navigator.clipboard.writeText(url).then(()=>showToast('Enlace de propuesta copiado','success')).catch(()=>{
      const input=document.createElement('input'); input.value=url; document.body.appendChild(input); input.select(); document.execCommand('copy'); document.body.removeChild(input); showToast('Enlace copiado','success');
    });
  }

  function checkUrlPropuesta() {
    const params = new URLSearchParams(window.location.search);
    const prop = params.get('propuesta');
    if (!prop) return;
    try {
      const data = JSON.parse(decodeURIComponent(atob(prop)));
      if (data.mappings) {
        data.id = 'prop-'+Date.now();
        if (!data.totalCreditos) data.totalCreditos = calcPropuestaCreditos(data);
        const exists = state.propuestas.find(p=>JSON.stringify(p.mappings)===JSON.stringify(data.mappings));
        if (!exists) {
          state.propuestas.push(data);
          state.propuestaActivaId = data.id;
          state.vistaConvalidaciones='propuesta';
          saveState(); savePropuestas();
          showToast('Propuesta cargada desde enlace','success');
        } else {
          state.propuestaActivaId = exists.id;
          state.vistaConvalidaciones='propuesta';
          saveState();
        }
        document.querySelectorAll('.convalidaciones-vista-toggle [data-vista]').forEach(b=>b.classList.toggle('active', b.dataset.vista===state.vistaConvalidaciones));
        renderPropuestasBar(); renderConvalidaciones();
      }
    } catch(e){ /* ignore */ }
  }

  function getComparativa() {
    const activa = getPropuestaActiva();
    if (!activa) return [];
    const oficialMap = {};
    CONVALIDACIONES.filter(c=>!c.sinCorrespondencia).forEach(c=>{
      const key = c.ugr.codigo;
      oficialMap[key] = c;
    });
    return activa.mappings.map(m=>{
      if (m.tipo==='bloque') {
        // Bloque 4↔4 nunca coincide 1-a-1 con oficial; se marca como divergente explicando que es agrupación
        const todosExisten = m.reconocidas.every(r=> !!oficialMap[r.codigo]);
        // Si todas existen pero dispersas, es divergente por agrupación
        const estado = todosExisten ? 'divergente' : 'solo-propuesta';
        return { propuesta:m, oficial: null, estado };
      }
      const oficial = oficialMap[m.reconocidaCodigo] || CONVALIDACIONES.find(c=> c.ugr && c.ugr.codigo===m.reconocidaCodigo);
      const oficialByCursada = CONVALIDACIONES.find(c=> c.uned && c.uned.codigo===m.cursadaCodigo);
      let estado='solo-propuesta';
      if (oficial) {
        if (oficialByCursada && oficialByCursada.ugr.codigo===m.reconocidaCodigo) estado='coincide';
        else estado='divergente';
      }
      return { propuesta:m, oficial, estado };
    });
  }

  // ─── Convalidaciones ────────────────────────────────────────
  function saveConvalidaciones() {
    localStorage.setItem('ugr-convalidaciones', JSON.stringify(convalidacionesEstados));
  }

  function getConvalidacionEstado(id) {
    return (convalidacionesEstados[id] && convalidacionesEstados[id].estado) || 'pendiente';
  }

  function setConvalidacionEstado(id, estado) {
    if (!convalidacionesEstados[id]) convalidacionesEstados[id] = {};
    convalidacionesEstados[id].estado = estado;
    saveConvalidaciones();
    renderConvalidaciones();
    const conv = CONVALIDACIONES.find(c => c.id === id);
    showToast(conv ? `${conv.ugr.nombre}: ${estado}` : `Estado: ${estado}`, estado === 'concedida' ? 'success' : 'info');
  }

  function renderConvalidaciones() {
    renderPropuestasBar();
    const container = document.getElementById('convalidaciones-container');
    const summary = document.getElementById('convalidaciones-summary');
    const creditosEl = document.getElementById('convalidaciones-creditos');
    if (!container || typeof CONVALIDACIONES === 'undefined') return;

    // Vistas propuesta / comparativa
    const vista = state.vistaConvalidaciones || 'oficial';
    const activa = getPropuestaActiva();
    if (vista === 'propuesta' && activa) {
      const total = calcPropuestaCreditos(activa);
      if (summary) summary.textContent = `${activa.nombre} · ${activa.mappings.length} entradas · ${total} ECTS ${activa.enBloque?'(en bloque)':''}`;
      if (creditosEl) creditosEl.innerHTML = `<div class="creditos-card ugr"><span class="creditos-label">Propuesta activa</span><span class="creditos-value">${total} ECTS</span><small>${activa.nota||''}</small></div>`;
      const sortIcon2 = propuestasSortCurso==='asc' ? '↑' : propuestasSortCurso==='desc' ? '↓' : '↕';
      let html = '<div class="propuesta-legend"><span class="legend-item"><span class="legend-dot" style="background:#1976d2"></span>1º</span><span class="legend-item"><span class="legend-dot" style="background:#388e3c"></span>2º</span><span class="legend-item"><span class="legend-dot" style="background:#f57c00"></span>3º</span><span class="legend-item"><span class="legend-dot" style="background:#7b1fa2"></span>4º</span><span class="legend-item"><span class="legend-dot" style="background:#757575"></span>Opt</span><span class="legend-item" style="margin-left:0.6rem;">Cuatri: <span class="cuatri-badge c1">1ºC</span> <span class="cuatri-badge c2">2ºC</span></span></div>';
      html += '<div class="manage-table-wrapper"><table class="manage-table"><thead><tr><th>Cursada</th><th id="th-orden-curso2" style="cursor:pointer;user-select:none;" title="Ordenar por curso">Reconocida (UGR) '+sortIcon2+'</th><th>Cód.</th><th>Calif.</th><th>Créd.</th></tr></thead><tbody>';
      const toRender2 = propuestasSortCurso ? sortMappingsByCurso(activa.mappings) : activa.mappings;
      toRender2.forEach(m=>{
        if (m.tipo==='bloque') {
          const cursadasTxt = m.cursadas.map(c=>`${c.nombre} (${c.codigo})`).join('<br>');
          const reconTxt = m.reconocidas.map(r=>{
            const meta=getUgrMeta(r.codigo);
            const cursoCls = meta ? (meta.curso==='Opt'?'copt':'c'+meta.curso) : '';
            const cursoBadge = meta ? `<span class="curso-badge ${cursoCls}">${meta.curso==='Opt'?'OPT':meta.curso+'º'}</span>` : '<span class="curso-badge copt">?</span>';
            const cuatriBadge = meta && meta.cuatrimestre!=='-' ? `<span class="cuatri-badge c${meta.cuatrimestre}">${meta.cuatrimestre}ºC</span>` : '';
            return `${cursoBadge}${cuatriBadge} ${r.nombre} (${r.codigo})`;
          }).join('<br>');
          const codigos = m.reconocidas.map(r=>{
            const meta=getUgrMeta(r.codigo);
            const cursoCls = meta ? (meta.curso==='Opt'?'copt':'c'+meta.curso) : 'copt';
            const cursoBadge = meta ? `<span class="curso-badge ${cursoCls}">${meta.curso==='Opt'?'OPT':meta.curso+'º'}</span>` : '';
            return `${cursoBadge} ${r.codigo}`;
          }).join('<br>');
          html += `<tr class="propuesta-bloque-row"><td style="text-align:left;"><strong>Bloque 4↔4</strong><br><small style="color:var(--text-light)">${cursadasTxt}</small></td><td style="text-align:left;"><small>${reconTxt}</small></td><td><small>${codigos}</small></td><td><span class="badge-bloque">${m.calificacion}</span></td><td>${m.creditos}</td></tr>`;
        } else {
          const meta=getUgrMeta(m.reconocidaCodigo);
          const cursoCls = meta ? (meta.curso==='Opt'?'copt':'c'+meta.curso) : 'copt';
          const cursoBadge = meta ? `<span class="curso-badge ${cursoCls}">${meta.curso==='Opt'?'OPT':meta.curso+'º'}</span>` : '<span class="curso-badge copt">?</span>';
          const cuatriBadge = meta && meta.cuatrimestre!=='-' ? `<span class="cuatri-badge c${meta.cuatrimestre}">${meta.cuatrimestre}ºC</span>` : '';
          const rowCls = meta ? `propuesta-row curso-${String(meta.curso).toLowerCase()}` : 'propuesta-row curso-opt';
          html += `<tr class="${rowCls}"><td>${m.cursada} <small style="color:var(--text-light)">(${m.cursadaCodigo})</small></td><td>${cursoBadge}${cuatriBadge} ${m.reconocida}<br><small style="color:var(--text-light)">${m.reconocidaCodigo} · ${formatCursoCuatri(meta)||'sin curso'}</small></td><td>${cursoBadge} ${m.reconocidaCodigo}</td><td>${m.calificacion}</td><td>6</td></tr>`;
        }
      });
      html += `<tr style="font-weight:700;background:var(--bg);"><td colspan="4">Total de créditos reconocidos</td><td>${total} (*)</td></tr>`;
      html += '</tbody></table></div><p style="margin-top:0.6rem;"><small style="color:var(--text-light)">Bloque 4↔4 = 24 ECTS con 7.5 única — concesión conjunta no 1-a-1. Usa <em>Comparativa</em> para ver encaje vs oficial.</small></p>';
      container.innerHTML = html;
      const th2 = container.querySelector('#th-orden-curso2');
      if (th2) th2.addEventListener('click', ()=>{ propuestasSortCurso = propuestasSortCurso==='asc' ? 'desc' : propuestasSortCurso==='desc' ? null : 'asc'; renderPropuestasBar(); renderConvalidaciones(); });
      return;
    }
    if (vista === 'comparativa' && activa) {
      const comp = getComparativa();
      const divergentes = comp.filter(c=>c.estado==='divergente').length;
      const coinciden = comp.filter(c=>c.estado==='coincide').length;
      const total = calcPropuestaCreditos(activa);
      if (summary) summary.textContent = `Comparativa: ${coinciden} coinciden · ${divergentes} divergentes · ${comp.length} entradas en propuesta`;
      if (creditosEl) creditosEl.innerHTML = `<div class="creditos-card uned"><span class="creditos-label">Divergencias</span><span class="creditos-value" style="color:${divergentes?'#e74c3c':'#27ae60'}">${divergentes}</span><small>vs oficial ${CONVALIDACIONES.filter(c=>!c.sinCorrespondencia).length} convalidables</small></div><div class="creditos-card ugr"><span class="creditos-label">Propuesta</span><span class="creditos-value">${total} ECTS</span></div>`;
      let html = '<div class="manage-table-wrapper"><table class="manage-table"><thead><tr><th>Propuesta</th><th>Oficial</th><th>Estado</th></tr></thead><tbody>';
      comp.forEach(r=>{
        const badge = r.estado==='coincide'?'<span class="badge-estado concedida">Coincide</span>': r.estado==='divergente'?'<span class="badge-estado denegada">Divergente</span>':'<span class="badge-estado sin">Solo propuesta</span>';
        let propTxt = '';
        let oficialTxt = '';
        if (r.propuesta.tipo==='bloque') {
          propTxt = `<strong>Bloque 4↔4</strong> (${r.propuesta.creditos} ECTS · ${r.propuesta.calificacion})<br><small>${r.propuesta.cursadas.map(c=>c.codigo).join(', ')} → ${r.propuesta.reconocidas.map(c=>c.codigo).join(', ')}</small>`;
          // Para bloque, verifica si las 4 reconocidas existen en oficial como conjunto
          const bloqueReconCodigos = r.propuesta.reconocidas.map(c=>c.codigo);
          const oficialesBloque = bloqueReconCodigos.map(code=> CONVALIDACIONES.find(c=>c.ugr && c.ugr.codigo===code || c.corresponde===code));
          oficialTxt = oficialesBloque.map(o=> o? `${o.ugr.codigo} (${o.origen})` : '—').join('<br>');
          if (r.estado==='divergente') oficialTxt += '<br><small style="color:#e74c3c">Oficial no agrupa en bloque (mapeos 1-a-1 individuales)</small>';
        } else {
          propTxt = `${r.propuesta.cursada||r.propuesta.cursadas?.[0]?.nombre||''} → ${r.propuesta.reconocida} (${r.propuesta.reconocidaCodigo})`;
          oficialTxt = r.oficial ? `${r.oficial.ugr.codigo} - ${r.oficial.ugr.nombre}${r.oficial.uned?` <small>(${r.oficial.uned.codigo})</small>`:''}` : '<em>Sin oficial</em>';
        }
        html += `<tr class="diff-${r.estado}"><td>${propTxt}</td><td>${oficialTxt}</td><td>${badge}</td></tr>`;
      });
      html += '</tbody></table></div>';
      if (divergentes>0) {
        html += '<div style="margin-top:0.8rem;" class="conv-detail"><strong style="color:#e74c3c">Nota bloque:</strong> <small style="color:var(--text-light)">El bloque 4↔4 de la propuesta convalida conjuntamente FS(14)+FP(15)+TOC(17)+MP(18) con 7.5 única; la oficial los trata 1-a-1 (FSD→TOC, IC I→EC, etc.), de ahí la divergencia es esperada y no implica error.</small></div>';
      }
      container.innerHTML = html;
      return;
    }

    const activeFilter = document.querySelector('.convalidaciones-filters [data-filter].active');
    const origenFilter = activeFilter ? activeFilter.dataset.filter : 'all';
    const estadoFilter = document.getElementById('filter-estado') ? document.getElementById('filter-estado').value : 'all';

    let filtered = CONVALIDACIONES.slice();
    if (origenFilter !== 'all') {
      if (origenFilter === 'UNED') filtered = filtered.filter(c => c.origen === 'UNED' || c.origen === 'UNED+GS');
      else if (origenFilter === 'GRADO_SUPERIOR') filtered = filtered.filter(c => c.origen === 'GRADO_SUPERIOR' || c.origen === 'UNED+GS');
      else filtered = filtered.filter(c => c.origen === origenFilter);
    }
    if (estadoFilter !== 'all') {
      if (estadoFilter === 'sin') {
        filtered = filtered.filter(c => c.sinCorrespondencia);
      } else {
        filtered = filtered.filter(c => !c.sinCorrespondencia && getConvalidacionEstado(c.id) === estadoFilter);
      }
    }

    // Créditos contadores
    const totalUNED = CONVALIDACIONES.filter(c => c.origen === 'UNED' || c.origen === 'UNED+GS').reduce((s,c)=>s+(c.creditos||6),0);
    const concedidaUNED = CONVALIDACIONES.filter(c => (c.origen === 'UNED' || c.origen === 'UNED+GS') && getConvalidacionEstado(c.id)==='concedida').reduce((s,c)=>s+(c.creditos||6),0);
    const totalUNEDCount = CONVALIDACIONES.filter(c => c.origen === 'UNED' || c.origen === 'UNED+GS').length;
    const concedidaUNEDCount = CONVALIDACIONES.filter(c => (c.origen === 'UNED' || c.origen === 'UNED+GS') && getConvalidacionEstado(c.id)==='concedida').length;
    const convalidables = CONVALIDACIONES.filter(c => !c.sinCorrespondencia);
    const totalUGR = convalidables.reduce((s,c)=>s+(c.creditos||6),0);
    const concedidaUGR = convalidables.filter(c => getConvalidacionEstado(c.id)==='concedida').reduce((s,c)=>s+(c.creditos||6),0);

    const total = CONVALIDACIONES.length;
    const concedidas = CONVALIDACIONES.filter(c => !c.sinCorrespondencia && getConvalidacionEstado(c.id) === 'concedida').length;
    const sinCount = CONVALIDACIONES.filter(c=>c.sinCorrespondencia).length;
    const totalConvalidables = total - sinCount;
    if (summary) summary.textContent = `${concedidas}/${totalConvalidables} concedidas · ${filtered.length} mostradas · ${sinCount} sin correspondencia`;

    if (creditosEl) {
      creditosEl.innerHTML = `
        <div class="creditos-card uned"><span class="creditos-label">Créditos UNED</span><span class="creditos-value">${concedidaUNED} / ${totalUNED} ECTS</span><small>${concedidaUNEDCount}/${totalUNEDCount} concedidas</small></div>
        <div class="creditos-card ugr"><span class="creditos-label">Créditos UGR convalidables</span><span class="creditos-value">${concedidaUGR} / ${totalUGR} ECTS</span><small>${concedidas}/${totalConvalidables} concedidas</small></div>
      `;
    }

    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-state">No hay convalidaciones con ese filtro.</p>';
      return;
    }

    let html = '<div class="manage-table-wrapper"><table class="manage-table">';
    html += '<thead><tr><th></th><th>Origen</th><th>UNED</th><th>Guía UNED</th><th>UGR</th><th>Guía UGR</th><th>Convalida</th><th>Estado</th></tr></thead><tbody>';
    filtered.forEach(c => {
      const isSin = !!c.sinCorrespondencia;
      const estado = isSin ? 'sin' : getConvalidacionEstado(c.id);
      const unedPdf = c.uned ? c.uned.guiaPdf : null;
      const ugrPdf = c.ugr ? c.ugr.guiaPdf : null;
      let unedName = '-';
      if (c.uned) unedName = `${c.uned.codigo} - ${c.uned.nombre}`;
      else if (isSin && c.ugr) unedName = '-';
      else if (!isSin) unedName = '<em>Grado Superior DAW</em>';
      let ugrName = '-';
      if (c.ugr) ugrName = `<span class="td-codigo">${c.ugr.codigo}</span><br><small>${c.ugr.nombre}</small>`;
      let origenBadge = '';
      if (c.origen === 'UNED') origenBadge = '<span class="badge-origen uned">UNED</span>';
      else if (c.origen === 'GRADO_SUPERIOR') origenBadge = '<span class="badge-origen gs">GS</span>';
      else if (c.origen === 'UNED+GS') origenBadge = '<span class="badge-origen combinada">UNED+GS</span>';
      else origenBadge = '<span class="badge-origen sin">SIN</span>';
      html += `<tr class="conv-row ${estado} ${isSin?'sin':''}" data-id="${c.id}">`;
      html += `<td><button class="btn-toggle-detail" data-id="${c.id}" title="Ver detalle">▸</button></td>`;
      html += `<td>${origenBadge}</td>`;
      html += `<td>${unedName}</td>`;
      html += `<td>${unedPdf ? `<a href="${unedPdf}" target="_blank" class="guia-link">PDF</a>` : '-'}</td>`;
      html += `<td>${ugrName}</td>`;
      html += `<td>${ugrPdf ? `<a href="${ugrPdf}" target="_blank" class="guia-link">PDF</a>` : '-'}</td>`;
      if (isSin) {
        html += `<td><span class="badge-estado sin">Sin correspondencia directa</span></td>`;
        html += `<td><span class="badge-estado sin">—</span></td>`;
      } else {
        html += `<td>${c.corresponde}${c.nota?`<br><small style="color:var(--text-light)">${c.nota}</small>`:''}</td>`;
        html += `<td><select class="conv-estado-select" data-id="${c.id}">`;
        ['pendiente','solicitada','concedida','denegada'].forEach(opt => {
          html += `<option value="${opt}" ${estado===opt?'selected':''}>${opt.charAt(0).toUpperCase()+opt.slice(1)}</option>`;
        });
        html += `</select><br><span class="badge-estado ${estado}">${estado}</span></td>`;
      }
      html += `</tr>`;
      // Desplegable detalle
      html += `<tr class="conv-detail-row" id="detail-${c.id}" style="display:none;"><td colspan="8"><div class="conv-detail">`;
      html += `<div class="conv-detail-grid">`;
      html += `<div><strong>Origen:</strong> ${c.origen === 'UNED' ? 'UNED → UGR' : c.origen === 'GRADO_SUPERIOR' ? 'Grado Superior DAW → UGR' : c.origen === 'UNED+GS' ? 'UNED + Grado Superior → UGR' : 'Sin convalidación directa'}<br>`;
      html += `<strong>Créditos:</strong> ${c.creditos || 6} ECTS<br>`;
      if (c.uned) html += `<strong>UNED:</strong> ${c.uned.codigo} - ${c.uned.nombre} <a href="${c.uned.guiaPdf}" target="_blank" class="guia-link">Ver guía UNED</a><br>`;
      if (c.ugr) html += `<strong>UGR:</strong> ${c.ugr.codigo} - ${c.ugr.nombre} <a href="${c.ugr.guiaPdf}" target="_blank" class="guia-link">Ver guía UGR</a><br>`;
      html += `<strong>Correspondencia:</strong> ${c.corresponde || '-'}${c.nota?` <em>(${c.nota})</em>`:''}<br>`;
      if (c.calificacion) html += `<strong>Calificación UNED:</strong> <span class="cal ${c.calificacion.includes('SB')?'cal-sb':c.calificacion.includes('NT')?'cal-nt':c.calificacion.includes('AP')?'cal-ap':'cal-p'}">${c.calificacion}</span><br>`;
      if (c.justificacion) html += `<strong>Justificación:</strong> <span class="justificacion">${c.justificacion}</span><br>`;
      html += `<strong>Requisito UGR (RD 822/2021 art.10):</strong> <small style="color:var(--text-light)">≥75% créditos, contenidos y competencias simultáneos según guías docentes ETSIIT. Solicitud por Sede Electrónica.</small></div>`;
      html += `<div><strong>Estado actual:</strong> <span class="badge-estado ${estado}">${estado}</span><br>`;
      if (!isSin) {
        html += `<small style="color:var(--text-light)">Cambia el estado con el desplegable superior. Independiente del horario (no auto-marca como aprobada).</small>`;
      } else {
        html += `<small style="color:var(--text-light)">Esta guía no tiene correspondencia directa en la tabla oficial aportada. Si consideras que sí debería convalidar, aporta ambas guías en secretaría para estudio personalizado.</small>`;
      }
      html += `</div>`;
      html += `</div>`;
      html += `<div class="conv-detail-footer"><small style="color:var(--text-light)"><b>Trámite UGR:</b> Solicitud por Sede Electrónica UGR (ETSIIT) en plazos Nov/Feb/May, con certificado académico UNED y guías. Tasas y Sede: <a href="https://sede.ugr.es/portal/procedimientos/Gestion-Academica-Solicitud-de-reconocimiento-de-creditos-en-Grado/" target="_blank">sede.ugr.es</a>. Plazo reclamación 5 días.</small></div>`;
      html += `</div></td></tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll('.conv-estado-select').forEach(sel => {
      sel.addEventListener('change', () => setConvalidacionEstado(sel.dataset.id, sel.value));
    });
    container.querySelectorAll('.btn-toggle-detail').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const row = document.getElementById('detail-' + id);
        if (!row) return;
        const isOpen = row.style.display !== 'none';
        row.style.display = isOpen ? 'none' : 'table-row';
        btn.textContent = isOpen ? '▸' : '▾';
        btn.classList.toggle('open', !isOpen);
      });
    });
  }

  // ─── Composición ESM (Bloque 1) ─────────────────────────────
  // Único puente hacia `src/app/createUgrApp.js`. `import()` dinámico porque
  // este fichero sigue siendo un script clásico sin imports. Dos guardas de
  // idempotencia: la instancia se crea una sola vez y la promesa se cachea,
  // así `init()` repetido (devtools/consola) reutiliza la misma composición en
  // lugar de duplicarla; si el import falla se limpia la promesa para poder
  // reintentar. Los datos clásicos viajan SIEMPRE como thunks: `PROPUESTAS` es
  // `let` que `loadPropuestas` reasigna, y `SUBJECTS`/`CONVALIDACIONES`/
  // `DOCENTES` son `const` del global lexical (no propiedades de `window`), al
  // alcance de este cierre.
  let ugrAppInstance = null;
  let ugrAppInitPromise = null;

  /**
   * Acceso a las reglas puras de dominio servidas por la composición ESM.
   * Este IIFE es un script clásico: no puede `import()` síncrono, así que
   * delega en `deps.domain` en lugar de duplicar la implementación.
   * Falla ruidosamente si la composición aún no está lista (arranque
   * interrumpido o `import()` fallido) en vez de caer a una copia legacy.
   */
  function getDomain() {
    // Fuente normal: la composición ESM montada por `init` → `ensureUgrApp`.
    // Escape hatch `window.__ugrAppDomain`: los harnesses (tests/consola) que
    // evalúan este IIFE sin la composición inyectan aquí el MISMO módulo ESM
    // de `src/app/domain/`, nunca una copia propia. Sin ninguna fuente se falla
    // ruidosamente en vez de volver a una implementación legacy.
    const d = (ugrAppInstance && ugrAppInstance.deps && ugrAppInstance.deps.domain)
      || window.__ugrAppDomain;
    if (!d) throw new Error('[ugr] dominio no disponible');
    return d;
  }

  /**
   * Acceso al adaptador de persistencia de configuraciones servido por la
   * composición ESM (`deps.persistence`, instancia creada por `createUgrApp`
   * con `{ storage: window.localStorage }`). Mismo patrón y misma red de
   * seguridad que `getDomain()`: este IIFE no puede importar ESM de forma
   * síncrona, así que delega en el adaptador en vez de duplicar las ranuras
   * `ugr-horario-saved-configs-*`. `window.__ugrAppPersistence` es el escape
   * hatch para harnesses que evalúan el IIFE sin la composición y necesitan
   * inyectar el MISMO módulo `src/app/adapters/persistence.js`.
   */
  function getPersistence() {
    // Fuente normal: la composición ESM montada por `init` → `ensureUgrApp`.
    const p = (ugrAppInstance && ugrAppInstance.deps && ugrAppInstance.deps.persistence)
      || window.__ugrAppPersistence;
    if (!p) throw new Error('[ugr] persistencia no disponible');
    return p;
  }

  function ensureUgrApp() {
    if (ugrAppInstance) return Promise.resolve(ugrAppInstance);
    if (!ugrAppInitPromise) {
      ugrAppInitPromise = import('./src/app/createUgrApp.js')
        .then(({ createUgrApp }) => {
          ugrAppInstance = createUgrApp({
            store: window.__ugrStore,
            catalog: window.__ugrCatalog,
            solver: window.__ugrSolver,
            progress: window.__ugrProgress,
            legacyData: {
              subjects: () => SUBJECTS,
              defaultSubjects: () => (typeof DEFAULT_SUBJECTS !== 'undefined' ? DEFAULT_SUBJECTS : null),
              convalidaciones: () => CONVALIDACIONES,
              propuestas: () => PROPUESTAS,
              docentes: () => DOCENTES,
            },
            persistence: { storage: window.localStorage },
            root: document,
            degraded: !!window.__ugrDegraded,
          });
          ugrAppInstance.mount();
          return ugrAppInstance;
        })
        .catch((err) => {
          console.error('[ugr] createUgrApp no pudo iniciarse', err);
          ugrAppInitPromise = null;
          return null;
        });
    }
    return ugrAppInitPromise;
  }

  // ─── Features ESM (Bloque 3, rebanada B3-b) ─────────────────
  // Mismo patrón (y misma red de seguridad) que `ensureUgrApp`: import
  // dinámico del feature de materias, instancia cacheada y promesa cacheada
  // para que `init()` repetido no duplique la vista. Si el import falla se
  // limpia la promesa para poder reintentar y la vista se queda en `null`:
  // `renderSubjects()` degrada a no-op en vez de romper el arranque.
  // Los thunks leen el estado SIEMPRE corriente (`state`/`conflicts` se
  // reasignan en el IIFE y `SUBJECTS` se muta en sitio).
  let ugrSubjectsView = null;
  let ugrSubjectsInitPromise = null;

  function getSubjectsView() {
    return ugrSubjectsView;
  }

  function ensureSubjectsView() {
    if (ugrSubjectsView) return Promise.resolve(ugrSubjectsView);
    if (!ugrSubjectsInitPromise) {
      ugrSubjectsInitPromise = import('./src/app/features/subjects.js')
        .then(({ createSubjectsView }) => {
          ugrSubjectsView = createSubjectsView({
            document,
            getState: () => state,
            getSubjects: () => SUBJECTS,
            getConflicts: () => conflicts,
            saveState,
            updateAll,
          });
          return ugrSubjectsView;
        })
        .catch((err) => {
          console.error('[ugr] subjects view no pudo iniciarse', err);
          ugrSubjectsInitPromise = null;
          return null;
        });
    }
    return ugrSubjectsInitPromise;
  }

  // ─── Features ESM (Bloque 3, rebanadas B3-c/B3-d) ───────────
  // Mismo patrón (y misma red de seguridad) que `ensureSubjectsView`: import
  // dinámico del feature del calendario (controles de vista + renders de
  // semana/lista + tooltip), instancia cacheada y promesa cacheada. La
  // instancia es única para que `mount()` sea idempotente: `init()` repetido
  // re-monta SIN duplicar los listeners de los botones estáticos `#btn-view-*`.
  // Si el import falla se limpia la promesa para poder reintentar y el feature
  // se queda en `null` (delegaciones no-op). Los thunks leen el estado SIEMPRE
  // corriente (`state`/`conflicts` se reasignan en el IIFE, `SUBJECTS` se muta
  // en sitio) y las constantes de rejilla se inyectan tal cual porque otras
  // vistas del monolito siguen usando `DAYS`/`DAY_LABELS`/horas.
  let ugrCalendarView = null;
  let ugrCalendarInitPromise = null;

  function getCalendarViewFeature() {
    return ugrCalendarView;
  }

  function ensureCalendarViewFeature() {
    if (ugrCalendarView) return Promise.resolve(ugrCalendarView);
    if (!ugrCalendarInitPromise) {
      ugrCalendarInitPromise = import('./src/app/features/calendar.js')
        .then(({ createCalendarView }) => {
          ugrCalendarView = createCalendarView({
            document,
            window,
            storage: window.localStorage,
            getState: () => state,
            getSubjects: () => SUBJECTS,
            getConflicts: () => conflicts,
            getActiveSchedule: () => getActiveSchedule(),
            days: DAYS,
            dayLabels: DAY_LABELS,
            startHour: START_HOUR,
            endHour: END_HOUR,
            getDificultad,
            getDificultadLabel,
            getDificultadColor,
            getProfName,
          });
          return ugrCalendarView;
        })
        .catch((err) => {
          console.error('[ugr] calendar view no pudo iniciarse', err);
          ugrCalendarInitPromise = null;
          return null;
        });
    }
    return ugrCalendarInitPromise;
  }

  // ─── Start ──────────────────────────────────────────────────
  // Puente hacia bootstrap (init) y hacia la consola/tests: `loadState` y
  // `saveState` exponen el contrato de persistencia (store ↔ espejo legacy).
  window.__ugrLegacy = {
    init,
    getState: () => ({ ...state }),
    loadState,
    saveState,
  };

})();
