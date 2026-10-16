/* ═══════════════════════════════════════════════════════════════
   UGR Horario - App Logic
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────
  const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
  const DAY_LABELS = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes' };
  // Iniciales para las columnas compactas (la de «Días libres» de las
  // configuraciones guardadas).
  const DAY_SHORT = { lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J', viernes: 'V' };
  const START_HOUR = 8;
  const END_HOUR = 21;
  let compareIds = [];
  // «Ignorar profesores»: la preferencia vive en el store
  // (`ui.ignoreDocents`) y esta variable es la caché que lee el render, igual
  // que `compareIds`. Con el modo activo los docentes no entran ni en la
  // generación ni en la pantalla.
  let ignoreDocents = false;

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

  // La carga real se hace en `init()` (vía `getPersistence().loadSavedConfigs()`),
  // cuando la composición ESM ya está montada. Este IIFE es un script clásico:
  // no puede resolver el `import()` del adaptador durante la evaluación del
  // cierre, así que aquí solo se siembra el binding vacío. Mientras `init()`
  // no haya terminado, cualquier lector ve `[]` en lugar de una copia legacy.
  // Las configuraciones guardadas las vive su vista ESM (ver más abajo); aquí
  // solo se leen por `getSavedConfigs()`.
  // El orden, la página y «solo favoritos» de la tabla de configuraciones viven
  // en su vista (`src/app/features/savedConfigs.js`); este bloque solo guarda lo
  // que el adaptador de persistencia y las mutaciones necesitan.
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

  // ─── Perfil en el store ────────────────────────────────────
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
  // Ojo con el orden: `propuestas/setAll` deja `activeId` en el primer item y
  // **cada dispatch notifica al suscriptor**, que rehidrata la caché desde el
  // store. Por eso los tres valores se leen **antes** de despachar: leerlos
  // entre dispatch y dispatch hacía que el push se pisara a sí mismo y la
  // propuesta elegida nunca llegara al store.
  function pushPropuestasToStore() {
    if (!stateHydrated) return;
    const store = __getStore ? __getStore() : null;
    if (!store) return;
    const items = state.propuestas || [];
    const activeId = state.propuestaActivaId || null;
    const vista = state.vistaConvalidaciones || 'oficial';
    dispatchStore({ type: 'propuestas/setAll', payload: { items } });
    dispatchStore({ type: 'propuestas/setActive', payload: { id: activeId } });
    dispatchStore({ type: 'propuestas/setVista', payload: { vista } });
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

  // Igual que `compareIds`, pero **fuera** de `hydrateAllFromStore`: la
  // preferencia puede ser lo único que haya en el store (un usuario que solo
  // encendió «Ignorar profesores»), y en ese caso `storeHasUserData` diría que
  // el store está virgen y la preferencia se perdería al recargar.
  function pushIgnoreDocentsToStore() {
    if (!stateHydrated) return;
    const store = __getStore();
    if (!store) return;
    dispatchStore({ type: 'ui/setIgnoreDocents', payload: { ignoreDocents: !!ignoreDocents } });
  }

  function hydrateIgnoreDocentsFromStore() {
    const store = __getStore();
    if (!store) return;
    const ui = store.getState() && store.getState().ui;
    if (ui && typeof ui.ignoreDocents === 'boolean') ignoreDocents = ui.ignoreDocents;
  }

  /**
   * El interruptor «Ignorar profesores» está en los dos sitios donde importa:
   * el panel del generador (donde se usa) y la sección de profesores (donde
   * vive el dato). Los dos escriben la misma preferencia, así que al mover uno
   * hay que dejar el otro igual.
   */
  function syncIgnoreDocentsInputs() {
    ['solver-ignore-docents', 'profesores-ignore-docents'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.checked = ignoreDocents;
    });
  }

  /**
   * Enciende/apaga el modo profesores. Si al encenderlo estaba elegido el
   * preset «Mejores profesores» se vuelve a «Equilibrado»: un preset cuyo peso
   * depende de datos que ya no existen generaría horarios distintos bajo la
   * misma etiqueta. El bloqueo (`blockGroups`) no se toca: se guarda igual y el
   * solver lo ignora mientras el modo esté activo.
   */
  function setIgnoreDocents(on) {
    ignoreDocents = !!on;
    // La estrategia de profesores depende de unos datos que el modo apagado
    // retira: quien la conoce es la vista del generador.
    const solverView = getSolverView();
    if (solverView) solverView.onIgnoreDocentsChanged();
    pushIgnoreDocentsToStore();
    syncIgnoreDocentsInputs();
    renderSolverFilters();
    renderGroupConfig();
    renderCalendar();
    renderSavedConfigs();
    renderProfesores();
  }

  // Corte único entre "el store existe" y "el store tiene datos de usuario".
  // Un userState recién creado (o solo con valores por defecto) no debe ganarle
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

  // Hidratación única de las cuatro partes que app.js cachea. Devuelve true
  // si el store aportó datos; false = store virgen → el llamante cae al
  // fallback legacy. Se llama solo desde `loadState()`; la reactividad en vivo
  // la hacen las suscripciones de cada parte.
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

  // ─── Solver ────────────────────────────────────────────────
  // Los tipos de filtro los conoce el adaptador de persistencia y el panel: la
  // lista vive aquí y se le inyecta a la vista (que la usa para validar lo
  // guardado). El resto del estado del generador —filtros, estrategia,
  // resultados y viabilidad— lo posee la vista ESM.
  const SOLVER_FILTER_TYPES = [
    'freeDays', 'maxDays', 'maxMorningDays', 'maxAfternoonDays',
    'earliestStart', 'latestEnd', 'blockGroups', 'preferTurno', 'maxGaps',
    'sameTheoryPerCourse', 'samePracticePerCourse',
  ];

  const DEFAULT_SUBJECTS = JSON.parse(JSON.stringify(SUBJECTS));

  let convalidacionesEstados = JSON.parse(localStorage.getItem('ugr-convalidaciones') || '{}');

  let PROPUESTAS = JSON.parse(localStorage.getItem('ugr-propuestas') || 'null');

  let conflicts = [];

  // ─── Init ───────────────────────────────────────────────────
  async function init() {
    // Composición ESM al PRINCIPIO: cualquier render/persistencia
    // posterior (y las funciones de dominio delegadas) necesitan `ugrAppInstance`
    // ya montado. No fatal si el import falla — el monolito sigue siendo la
    // fachada operativa y `getDomain()` avisará solo si alguien lo consulta.
    await ensureUgrApp();
    // La vista de configuraciones se monta aquí, cuando la composición ESM (y su
    // adaptador de persistencia) ya está montada, y es ella la que carga la lista
    // guardada. Si el import o el adaptador fallan, arranca sin configuraciones
    // en vez de romper.
    await ensureSavedConfigsView();
    // La vista del catálogo (desplegable + contraseña) antes de montar acciones.
    await ensureCatalogView();
    // Y la de asignaturas: la lista se pinta desde ella y el modal es suyo.
    await ensureManageSubjectsView();
    // La del generador: su panel y su estado. Antes de compartir, que valida la
    // estrategia de un enlace con la tabla de estrategias de esta vista.
    await ensureSolverView();
    // La de compartir: monta el diálogo y mira si la URL trae un enlace.
    await ensureShareView();
    // Y la de propuestas: barra, detalle, mapeos e instantáneas.
    await ensurePropuestasView();
    const savedConfigsView = getSavedConfigsView();
    if (savedConfigsView) savedConfigsView.loadFromStorage();
    // La vista de materias vive en ESM (features/subjects.js). Se monta
    // antes del primer `renderSubjects()` para que ese render ya delegue; no
    // fatal si el import falla — la delegación queda en no-op.
    await ensureSubjectsView();
    // Los controles de vista del calendario (semana/lista + compacto)
    // viven en ESM. Se cargan antes de `setupActions()` para que ese montaje
    // ya encuentre el feature; no fatal si el import falla — la delegación y
    // el montaje quedan en no-op.
    await ensureCalendarViewFeature();
    // Antes de tocar el catálogo: las valoraciones propias se superponen a los
    // perfiles, así que tienen que estar cargadas cuando `rebuildDocentIndexes`
    // construya el índice.
    await loadOwnReviews();
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
    setupCatalogView();
    updateAll();
    checkUrlShare();
    checkUrlPropuesta();
    renderBlockFilters();
    ensureBlockStoreSubscription();
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
    // Delegación: la única implementación vive en ESM (src/app/domain).
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
    hydrateIgnoreDocentsFromStore();
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

  // La ficha de un código UGR, el orden por curso y las opciones de los
  // desplegables de mapeo viven en el dominio (`src/app/domain/proposals.js`).

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
    // Delegación: la única implementación vive en ESM
    // (src/app/domain/selection.js).
    return getDomain().getSubgrupoForApellido(apellido);
  }

  function applyApellidoRule() {
    // Guard legacy: sin tramo aplicable no se toca nada (ni se persiste).
    const subgrupoNum = getSubgrupoForApellido(state.apellido);
    if (!subgrupoNum) return;

    // Delegación: solo la mutación de `groupChoices` vive en ESM; la
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
    // Delegación: el render y sus handlers viven en ESM
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
    // Delegación: la única construcción de entradas vive en ESM
    // (src/app/domain/calendar.js); este monolito solo inyecta el estado.
    return getDomain().buildActiveSchedule(state.selectedSubjects, state.groupChoices, SUBJECTS);
  }

  // ─── Config Metrics ─────────────────────────────────────────
  function calculateConfigMetrics(selectedSubjects, groupChoices) {
    // Delegación: la única implementación vive en ESM
    // (src/app/domain/metrics.js); aquí solo se inyectan los datos legacy.
    // Con «Ignorar profesores» se inyecta un lookup vacío: la columna «Prof»
    // desaparece del cálculo (queda a hueco) sin tocar la implementación pura.
    return getDomain().calculateConfigMetrics(selectedSubjects, groupChoices, {
      subjects: SUBJECTS,
      dificultad: ignoreDocents ? () => null : getDificultad,
      difficultyScore: getDifficultyScore,
    });
  }

  function calculateConfigDeadHours(selectedSubjects, groupChoices) {
    // Delegación: la única implementación vive en ESM (metrics.js).
    return getDomain().calculateConfigDeadHours(selectedSubjects, groupChoices, {
      subjects: SUBJECTS,
    });
  }

  function calculateConfigDays(selectedSubjects, groupChoices) {
    // Delegación: la única implementación vive en ESM (metrics.js).
    return getDomain().calculateConfigDays(selectedSubjects, groupChoices, {
      subjects: SUBJECTS,
    });
  }

  function calculateConfigFreeDays(selectedSubjects, groupChoices) {
    // Delegación: la única implementación vive en ESM (metrics.js). Se le pasan
    // los días de la rejilla para que el orden de la columna coincida con el
    // del calendario.
    return getDomain().calculateConfigFreeDays(selectedSubjects, groupChoices, {
      subjects: SUBJECTS,
      days: DAYS,
    });
  }

  function addBlockFilter(type) {
    // Delegación: validar y construir el payload es regla pura
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
    resetConfigsPage();
    renderBlockFilters();
    renderSavedConfigs();
  }

  function removeBlockFilter(index) {
    dispatchBlock({ type: 'blocks/remove', payload: { index } });
    resetConfigsPage();
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
        resetConfigsPage();
        renderBlockFilters();
        renderSavedConfigs();
      });
    }

    const clearDayBtn = panel.querySelector('#btn-clear-day-filter');
    if (clearDayBtn) {
      clearDayBtn.addEventListener('click', () => {
        configMaxManana = 0;
        configMaxTarde = 0;
        resetConfigsPage();
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
      // La etiqueta accesible vive en el feature ESM; sin feature el
      // aria-label queda vacío (mismo no-op que el resto de delegaciones).
      const calView = getCalendarViewFeature();
      eventDiv.setAttribute('aria-label', calView ? calView.buildEventLabel(entry, false) : '');
      eventDiv.style.top = topOffset + '%';
      eventDiv.style.height = height + '%';
      eventDiv.innerHTML = `<div class="event-label">${entry.codigo}</div><div class="event-type">${entry.tipo}</div>`;
      if (entry.letra) {
        // Con «Ignorar profesores» tampoco se pinta el punto de dificultad en
        // las miniaturas: el modo es «no influye» **y** «no se muestra».
        const diff = ignoreDocents ? null : getDificultad(entry.codigo, entry.letra);
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
    // Delegación: la lista de configuraciones la vive su vista ESM.
    const view = getSavedConfigsView();
    if (view) view.toggleFavorite(id);
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
    // Delegación: la detección pura vive en ESM (metrics.js);
    // este IIFE solo conserva la asignación a su array de estado.
    conflicts = getDomain().findConflicts(getActiveSchedule());
  }

  function timesOverlap(s1, e1, s2, e2) {
    // Delegación: la única implementación vive en ESM (src/app/domain).
    return getDomain().timesOverlap(s1, e1, s2, e2);
  }

  function timeToMinutes(t) {
    // Delegación: la única implementación vive en ESM (src/app/domain).
    return getDomain().timeToMinutes(t);
  }

  // ─── Professor Preferences Helpers ──────────────────────────
  // Dos capas: `DOCENTES` son las **asignaciones** (qué profesor da
  // la teoría de una letra de grupo o las prácticas de un subgrupo) y
  // `PROFESORES` son los **perfiles** del volcado, uno por (asignatura,
  // modalidad, nombre). El perfil no cuelga de la asignación: se busca por la
  // terna, con la misma clave que construye `profesorKey` en
  // `src/solver/catalog.js`. Así la asignación es del usuario y el perfil de la
  // hoja, y ninguno de los dos duplica al otro.
  function getProfKey(codigo, letra) {
    return codigo + '-' + letra;
  }

  function getProfesorKey(asignacion) {
    return asignacion.subjectCode + '|' + (asignacion.modalidad || 'Teoría') + '|' + asignacion.name;
  }

  function indexByKey(list, keyOf) {
    return (Array.isArray(list) ? list : []).reduce((acc, entry) => {
      const key = keyOf(entry);
      if (key) acc[key] = entry;
      return acc;
    }, {});
  }

  const docentesByKey = indexByKey(typeof DOCENTES !== 'undefined' ? DOCENTES : [], d => d && d.key);
  const profesoresByKey = indexByKey(typeof PROFESORES !== 'undefined' ? PROFESORES : [], p => p && p.key);
  /**
   * La base del catálogo activo, sin las valoraciones propias. `profesoresByKey`
   * es la **fusión** que lee el render, así que para rehacerla —al cambiar de
   * catálogo o al guardar/borrar una valoración— hace falta poder volver a la
   * base en vez de ir acumulando superposiciones.
   */
  const catalogoProfesoresByKey = {};
  /**
   * Valoraciones propias: las que añade el usuario en la pestaña de datos.
   * Viven en la tabla `reviews` del store y esta es la caché que lee el render;
   * se recargan al arrancar y tras cada alta, edición, borrado o importación.
   */
  let ownReviews = [];
  let ownReviewKeys = new Set();
  /** Clave de la valoración que se está editando en el formulario ('' = alta). */
  let editingReviewKey = '';
  /** Nombres con alguna valoración: los que pueden abrir ficha. */
  const nombresConFicha = new Set(
    Object.keys(profesoresByKey).map(key => profesoresByKey[key]).filter(p => p && p.name).map(p => p.name),
  );

  function getDocentInfo(key) {
    return docentesByKey[key] || null;
  }

  /**
   * Perfil del profesor asignado a un grupo (teoría) o subgrupo (prácticas).
   * `null` cuando no hay asignación o cuando el volcado no trae perfil para esa
   * terna —los 10 nombres del maestro antiguo que no están en la hoja—, que es
   * «sin dificultad», no «difícil».
   */
  function getProfesorInfo(codigo, letra) {
    const asignacion = getDocentInfo(getProfKey(codigo, letra));
    if (!asignacion) return null;
    return profesoresByKey[getProfesorKey(asignacion)] || null;
  }

  function getDifficultyScore(dificultad) {
    const api = typeof window !== 'undefined' && window.__ugrCatalog ? window.__ugrCatalog : null;
    // Sin catálogo no se inventa un peso: «sin puntuación» (`null`) es un valor
    // legítimo que el motor y las métricas entienden.
    if (api && typeof api.difficultyScore === 'function') return api.difficultyScore(dificultad);
    return null;
  }

  /** Perfiles del catálogo activo como lista: el índice es por clave. */
  function profesoresList() {
    return Object.keys(profesoresByKey).map(key => profesoresByKey[key]);
  }

  function getProfName(codigo, letra) {
    const asignacion = getDocentInfo(getProfKey(codigo, letra));
    return asignacion && asignacion.name ? asignacion.name : '';
  }

  function getDificultad(codigo, letra) {
    const info = getProfesorInfo(codigo, letra);
    return info && info.dificultad ? info.dificultad : null;
  }

  // La escala (etiquetas y color) la decide el dominio: aquí solo se pregunta.
  // El color viaja como **token CSS** (`var(--diff-cyan)`), no como valor: la
  // hoja de estilos es su dueña y así no puede desviarse entre los dos.
  function getDificultadLabel(d) {
    return getDomain().difficultyLabel(d);
  }

  function getDificultadColor(d) {
    return getDomain().difficultyToken(d);
  }

  /** Clase CSS del color de la escala, para las insignias (fondo). */
  function dificultadClase(d) {
    return getDomain().DIFFICULTY_UI_LABELS[d] ? `diff-${d}` : 'diff-gris';
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
    // ¿Hay algún nombre de la guía sin valoración? Entonces se explica arriba
    // de dónde salen los nombres, porque si no parecen «inventados».
    let haySinValoracion = false;

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

        html += `<div class="group-label">G${group.letra} <span style="font-weight:400;color:#888;font-size:0.65rem;">${group.turno}</span></div>`;
        html += `<div class="group-schedule">`;
        group.teoria.forEach(s => {
          html += `<span class="session">${DAY_LABELS[s.dia].substr(0, 3)} ${s.inicio}</span>`;
        });
        if (group.teoria.length === 0) {
          html += `<span class="session" style="color:#999;">-</span>`;
        }
        html += `</div>`;
        // Con «Ignorar profesores» el bloque del profesor no se pinta: el modo
        // apaga también la parte informativa, no solo el peso en el coste.
        //
        // El bloque se queda corto a propósito: el nombre, que abre la ficha, y
        // la insignia de dificultad. La razón, las opiniones y los comentarios
        // viven en la ficha. El nombre solo es un botón cuando hay ficha que
        // abrir, es decir, cuando el catálogo activo trae perfil para esa terna.
        if (profName && !ignoreDocents) {
          const diff = getDificultad(codigo, group.letra);
          const nombre = escapeCatalogText(profName);
          const conFicha = nombresConFicha.has(profName);
          if (!conFicha) haySinValoracion = true;
          html += `<div class="group-profesor">`;
          if (conFicha) {
            html += `<button type="button" class="prof-name-btn" data-prof-name="${nombre}"`
              + ` data-prof-codigo="${codigo}" data-prof-modalidad="Teoría">${nombre}</button>`;
          } else {
            html += `<span class="prof-name">${nombre}</span>`;
          }
          if (diff) {
            html += `<span class="dificultad-badge ${dificultadClase(diff)}">${getDificultadLabel(diff)}</span>`;
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
            html += `</div>`;
            // La columna de prácticas dice también quién la da: la dificultad es
            // por modalidad, así que la de prácticas no tiene por qué coincidir
            // con la de teoría del mismo grupo.
            const profPracticas = getProfName(codigo, sub);
            if (profPracticas && !ignoreDocents) {
              const diffPracticas = getDificultad(codigo, sub);
              const nombrePracticas = escapeCatalogText(profPracticas);
              const conFichaPracticas = nombresConFicha.has(profPracticas);
              if (!conFichaPracticas) haySinValoracion = true;
              html += `<div class="group-profesor">`;
              if (conFichaPracticas) {
                html += `<button type="button" class="prof-name-btn" data-prof-name="${nombrePracticas}"`
                  + ` data-prof-codigo="${codigo}" data-prof-modalidad="Prácticas">${nombrePracticas}</button>`;
              } else {
                html += `<span class="prof-name">${nombrePracticas}</span>`;
              }
              if (diffPracticas) {
                html += `<span class="dificultad-badge ${dificultadClase(diffPracticas)}">${getDificultadLabel(diffPracticas)}</span>`;
              }
              html += `</div>`;
            }
            html += `</div></div>`;
          });
          html += `</div>`;
        }
      }

      html += `</div></div>`;
    });

    html += '</div>';
    content.innerHTML = (haySinValoracion
      ? '<p class="group-config-hint">Los nombres de los profesores son los de las <strong>guías oficiales</strong> de la ETSIIT. Los que aparecen <strong>sin insignia</strong> todavía no tienen valoración: no están inventados.</p>'
      : '') + html;

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

  // ─── Ficha del profesor y listado del claustro ──────────────
  // El bloque del profesor enseña el nombre y la insignia; todo lo demás se
  // consulta aquí. La ficha la compone el dominio (`buildProfesorFicha`), que
  // agrupa los perfiles por nombre: cada perfil es de (asignatura, modalidad),
  // así que la ficha enseña al profesor en todas sus asignaturas, con la que se
  // ha pulsado primero y resaltada.
  let fichaOpener = null;

  // Ficha de asignatura: dificultad y descripción del plan, por modalidad.
  let asignaturaFichaOpener = null;
  let asignaturaFichaBound = false;

  /**
   * Vuelve a encontrar el botón que abrió la ficha: mismo nombre y, si se abrió
   * desde un grupo, misma asignatura y modalidad. El listado de profesores no
   * lleva asignatura, así que ahí basta el nombre.
   */
  function findProfesorButton(name, subjectCode, modalidad) {
    for (const btn of document.querySelectorAll('.prof-name-btn')) {
      if (btn.dataset.profName !== name) continue;
      if (subjectCode && btn.dataset.profCodigo !== subjectCode) continue;
      if (modalidad && btn.dataset.profModalidad !== modalidad) continue;
      return btn;
    }
    return null;
  }

  function profesorModalEls() {
    return {
      modal: document.getElementById('profesor-modal'),
      title: document.getElementById('profesor-modal-title'),
      body: document.getElementById('profesor-modal-body'),
      close: document.getElementById('profesor-modal-close'),
    };
  }

  function dificultadBadgeHtml(dificultad) {
    if (!dificultad) return '';
    return `<span class="dificultad-badge ${dificultadClase(dificultad)}">${getDificultadLabel(dificultad)}</span>`;
  }

  /** Una entrada de la ficha: el profesor en una asignatura y una modalidad. */
  function fichaEntryHtml(entry) {
    const dec = entry.highlighted ? ' is-focus' : '';
    let html = `<article class="profesor-ficha-entry${dec}">`;
    html += '<div class="profesor-ficha-head">';
    // Una valoración sin asignatura no tiene código ni modalidad que enseñar.
    if (entry.subjectCode) {
      html += `<span class="profesor-ficha-code">${escapeCatalogText(entry.subjectCode)}</span>`;
    }
    if (entry.nombreAsignatura) {
      html += `<span class="profesor-ficha-subject">${escapeCatalogText(entry.nombreAsignatura)}</span>`;
    }
    if (entry.modalidad) {
      html += `<span class="profesor-ficha-modalidad">${escapeCatalogText(entry.modalidad)}</span>`;
    }
    html += dificultadBadgeHtml(entry.dificultad);
    if (entry.propio) {
      html += '<span class="prof-own-badge">tuya</span>';
    }
    if (entry.cruzada) {
      html += `<span class="profesor-ficha-flag" title="Acumula más de una opinión en la hoja">cruzada</span>`;
    }
    html += '</div>';
    const plan = [entry.caracter, entry.mencion ? `Mención ${entry.mencion}` : ''].filter(Boolean).join(' · ');
    if (plan) html += `<div class="profesor-ficha-plan">${escapeCatalogText(plan)}</div>`;
    if (entry.razon) html += `<p class="profesor-ficha-razon">${escapeCatalogText(entry.razon)}</p>`;
    entry.opinions.forEach(text => {
      html += `<p class="profesor-ficha-opinion">${escapeCatalogText(text)}</p>`;
    });
    if (entry.comentarios.length) {
      html += '<ul class="profesor-ficha-comentarios">';
      entry.comentarios.forEach(comentario => {
        const meta = [comentario.fecha, comentario.campo].filter(Boolean).join(' · ');
        html += '<li>';
        if (meta) html += `<span class="profesor-ficha-comentario-meta">${escapeCatalogText(meta)}</span>`;
        html += `<span class="profesor-ficha-comentario-texto">${escapeCatalogText(comentario.texto)}</span>`;
        html += '</li>';
      });
      html += '</ul>';
    }
    if (!entry.razon && entry.opinions.length === 0 && entry.comentarios.length === 0) {
      html += '<p class="profesor-ficha-vacio">Sin opiniones ni comentarios.</p>';
    }
    html += '</article>';
    return html;
  }

  /**
   * Abre la ficha de un profesor. `focus` es la entrada pulsada (asignatura y
   * modalidad) y `opener` el botón, para devolverle el foco al cerrar. Desde el
   * listado de profesores no hay foco: no se resalta ninguna asignatura.
   */
  function openProfesorFicha(name, focus, opener) {
    const els = profesorModalEls();
    if (!els.modal || !els.title || !els.body || !name) return;
    const ficha = getDomain().buildProfesorFicha(profesoresList(), SUBJECTS, name, focus || null);
    if (!ficha.entries.length) return;
    els.title.textContent = ficha.name;
    els.body.innerHTML = `<div class="profesor-ficha">${ficha.entries.map(fichaEntryHtml).join('')}</div>`;
    fichaOpener = {
      name,
      subjectCode: (focus && focus.subjectCode) || '',
      modalidad: (focus && focus.modalidad) || '',
      element: opener || null,
    };
    els.modal.hidden = false;
    if (els.close) els.close.focus();
  }

  function closeProfesorFicha() {
    const els = profesorModalEls();
    if (!els.modal || els.modal.hidden) return;
    els.modal.hidden = true;
    // El foco vuelve a quien abrió la ficha, siempre que siga en el documento:
    // los paneles se repintan enteros, así que el botón puede haber muerto.
    const opener = fichaOpener;
    fichaOpener = null;
    if (!opener) return;
    // El panel se repinta entero ante cualquier cambio del estado, así que el
    // nodo que abrió la ficha puede estar muerto: si lo está, se busca por sus
    // datos en la pantalla (mismo nombre y misma entrada) en vez de rendirse.
    const vivo = opener.element && document.contains(opener.element)
      ? opener.element
      : findProfesorButton(opener.name, opener.subjectCode, opener.modalidad);
    if (vivo && typeof vivo.focus === 'function') vivo.focus();
  }

  /** Aviso bajo la barra de acciones de la pestaña de profesores. */
  function setProfesoresStatus(message, isError) {
    const status = document.getElementById('profesores-status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error', !!isError);
  }

  /**
   * Acciones de una fila del claustro. Solo las valoraciones **propias** se
   * pueden editar o borrar, y cada una lleva su destino delante (asignatura y
   * modalidad, o «Sin asignatura») porque un mismo nombre puede tener varias.
   */
  function ownRowActionsHtml(row) {
    if (!row.ownKeys.length) return '—';
    return row.ownKeys.map(key => {
      const parts = key.includes('|') ? key.split('|') : [];
      const destino = parts[0]
        ? `${parts[0]}${parts[1] === 'Prácticas' ? ' (P)' : ''}`
        : 'Sin asignatura';
      return '<span class="prof-row-actions">'
        + `<span class="prof-own-badge">${escapeCatalogText(destino)}</span>`
        + `<button type="button" class="btn btn-sm btn-secondary" data-edit-prof="${escapeCatalogText(key)}">Editar</button>`
        + `<button type="button" class="btn btn-sm btn-danger" data-delete-prof="${escapeCatalogText(key)}">Borrar</button>`
        + '</span>';
    }).join(' ');
  }

  /** Listado del claustro de la pestaña de datos, con su buscador. */
  function renderProfesores() {
    syncIgnoreDocentsInputs();
    const container = document.getElementById('profesores-container');
    if (!container) return;
    const search = document.getElementById('profesores-search');
    const rows = getDomain().listProfesores(profesoresList(), { query: search ? search.value : '' });

    if (rows.length === 0) {
      container.innerHTML = '<p class="profesores-vacio">Ningún profesor coincide con la búsqueda.</p>';
      return;
    }

    let html = '<p class="profesores-hint">Un profesor tiene una valoración <strong>por asignatura y modalidad</strong>. Los nombres del horario salen de las <strong>guías oficiales</strong> de la ETSIIT; si alguno no está en esta lista es que todavía no tiene valoración. Las marcadas como <strong>tuya</strong> las has añadido tú y <strong>mandan sobre el catálogo</strong>: cambian la insignia del horario y el peso del generador.</p>';
    html += '<div class="manage-table-wrapper"><table class="manage-table profesores-table">';
    html += '<thead><tr><th>Profesor</th><th>Asignaturas</th><th>Dificultad</th><th>Acciones</th></tr></thead><tbody>';
    rows.forEach(row => {
      const asignaturas = row.asignaturas
        .map(a => (a.modalidad === 'Prácticas' ? `${a.code} (P)` : a.code))
        .join(', ') || '—';
      const insignias = row.dificultades.map(dificultadBadgeHtml).join(' ') || '—';
      html += '<tr>';
      html += `<td><button type="button" class="prof-name-btn" data-prof-name="${escapeCatalogText(row.name)}">${escapeCatalogText(row.name)}</button></td>`;
      html += `<td class="profesores-asignaturas">${escapeCatalogText(asignaturas)}</td>`;
      html += `<td>${insignias}</td>`;
      html += `<td class="td-actions">${ownRowActionsHtml(row)}</td>`;
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  function setupProfesorFicha() {
    const els = profesorModalEls();
    if (!els.modal) return;
    if (els.close) els.close.addEventListener('click', closeProfesorFicha);
    els.modal.addEventListener('click', (e) => {
      if (e.target === els.modal) closeProfesorFicha();
    });
    els.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeProfesorFicha();
      }
    });
    // Delegado: el panel de grupos y el listado se repintan enteros, así que un
    // listener por botón se perdería en cada repintado.
    const groupConfig = document.getElementById('group-config-content');
    if (groupConfig) {
      groupConfig.addEventListener('click', (e) => {
        const btn = e.target.closest('.prof-name-btn');
        if (!btn) return;
        openProfesorFicha(
          btn.dataset.profName,
          { subjectCode: btn.dataset.profCodigo, modalidad: btn.dataset.profModalidad },
          btn,
        );
      });
    }
    const lista = document.getElementById('profesores-container');
    if (lista) {
      lista.addEventListener('click', (e) => {
        const btn = e.target.closest('.prof-name-btn');
        if (!btn) return;
        openProfesorFicha(btn.dataset.profName, null, btn);
      });
    }
    const search = document.getElementById('profesores-search');
    if (search) search.addEventListener('input', renderProfesores);
  }

  // ─── Profesores propios ─────────────────────────────────────
  // Alta, edición y borrado de las valoraciones propias, importación y
  // exportación en JSON y el prompt que se copia para pedírselas a una IA. Las
  // reglas son del dominio (`profesores-propios.js`) y el guardado va a la
  // tabla `reviews` del store; aquí solo se leen los campos y se repinta.

  function profesorFormEls() {
    return {
      modal: document.getElementById('profesor-form-modal'),
      title: document.getElementById('profesor-form-title'),
      name: document.getElementById('profesor-form-name'),
      subject: document.getElementById('profesor-form-subject'),
      modalidad: document.getElementById('profesor-form-modalidad'),
      dificultad: document.getElementById('profesor-form-dificultad'),
      opinions: document.getElementById('profesor-form-opinions'),
      error: document.getElementById('profesor-form-error'),
      del: document.getElementById('profesor-form-delete'),
      save: document.getElementById('profesor-form-save'),
      cancel: document.getElementById('profesor-form-cancel'),
      close: document.getElementById('profesor-form-close'),
    };
  }

  function showProfesorFormError(message) {
    const el = document.getElementById('profesor-form-error');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  function hideProfesorFormError() {
    const el = document.getElementById('profesor-form-error');
    if (!el) return;
    el.textContent = '';
    el.hidden = true;
  }

  /**
   * Rellena los dos desplegables del formulario con el catálogo **activo**: la
   * escala de dificultad del dominio y las asignaturas de esta sesión (que
   * cambian al importar otro catálogo).
   */
  function fillProfesorFormOptions() {
    const els = profesorFormEls();
    if (els.dificultad) {
      els.dificultad.innerHTML = '<option value="">Sin valoración</option>'
        + getDomain().DIFICULTAD_OPCIONES
          .map(o => `<option value="${o.key}">${escapeCatalogText(o.label)}</option>`)
          .join('');
    }
    if (els.subject) {
      els.subject.innerHTML = '<option value="">Sin asignatura</option>'
        + SUBJECTS
          .map(s => `<option value="${escapeCatalogText(s.codigo)}">${escapeCatalogText(s.codigo)} — ${escapeCatalogText(s.nombre)}</option>`)
          .join('');
    }
  }

  /** Abre el formulario. Sin clave es un alta; con clave, la edición de esa. */
  function openProfesorForm(docentKey) {
    const els = profesorFormEls();
    if (!els.modal) return;
    fillProfesorFormOptions();
    const review = docentKey ? ownReviews.find(r => r.docentKey === docentKey) : null;
    editingReviewKey = review ? review.docentKey : '';
    els.title.textContent = review ? 'Editar profesor' : 'Añadir profesor';
    els.name.value = review ? review.name : '';
    els.subject.value = review ? review.subjectCode || '' : '';
    els.modalidad.value = review && review.modalidad ? review.modalidad : 'Teoría';
    els.dificultad.value = review && review.dificultad ? review.dificultad : '';
    els.opinions.value = review && Array.isArray(review.opinions) ? review.opinions.join('\n') : '';
    // La modalidad solo tiene sentido con asignatura: sin ella no hay terna que
    // sustituir y la valoración queda suelta.
    els.modalidad.disabled = !els.subject.value;
    if (els.del) els.del.hidden = !review;
    hideProfesorFormError();
    els.modal.hidden = false;
    if (els.name) els.name.focus();
  }

  function closeProfesorForm() {
    const els = profesorFormEls();
    if (!els.modal || els.modal.hidden) return;
    els.modal.hidden = true;
    editingReviewKey = '';
  }

  /** Guarda lo que hay en el formulario (alta o edición). */
  async function saveProfesorForm() {
    const els = profesorFormEls();
    if (!els.modal) return;
    const subjectCode = els.subject ? els.subject.value : '';
    const review = getDomain().normalizeOwnReview({
      name: els.name ? els.name.value : '',
      subjectCode,
      modalidad: subjectCode ? (els.modalidad ? els.modalidad.value : '') : '',
      dificultad: els.dificultad ? els.dificultad.value : '',
      opinions: (els.opinions ? els.opinions.value : '').split('\n'),
      updatedAt: new Date().toISOString(),
    });
    if (!review) {
      showProfesorFormError('Pon un nombre y, si eliges dificultad, una de la lista.');
      return;
    }
    const store = __getStore();
    if (!store || typeof store.saveReviews !== 'function') {
      showProfesorFormError('No se puede guardar: el almacén no está disponible (modo degradado).');
      return;
    }
    const previousKey = editingReviewKey;
    const result = await store.saveReviews([review]);
    if (!result || !result.ok) {
      showProfesorFormError('No se pudo guardar la valoración.');
      return;
    }
    // Al editar, cambiar de asignatura, modalidad o nombre cambia la clave: la
    // fila vieja se queda huérfana y hay que borrarla explícitamente.
    if (previousKey && previousKey !== review.docentKey && typeof store.deleteReview === 'function') {
      await store.deleteReview(previousKey);
    }
    await loadOwnReviews();
    closeProfesorForm();
    renderProfesores();
    updateAll();
    setProfesoresStatus(`Guardado: ${review.name}.`);
  }

  /** Borra una valoración propia, con confirmación. */
  async function deleteOwnReview(docentKey) {
    const review = ownReviews.find(r => r.docentKey === docentKey);
    if (!review) return;
    if (!confirm(`¿Borrar tu valoración de ${review.name}?`)) return;
    const store = __getStore();
    if (!store || typeof store.deleteReview !== 'function') {
      setProfesoresStatus('No se puede borrar: el almacén no está disponible.', true);
      return;
    }
    const result = await store.deleteReview(docentKey);
    if (!result || !result.ok) {
      setProfesoresStatus('No se pudo borrar la valoración.', true);
      return;
    }
    await loadOwnReviews();
    closeProfesorForm();
    renderProfesores();
    updateAll();
    setProfesoresStatus(`Borrada la valoración de ${review.name}.`);
  }

  /** Importa un JSON de valoraciones. Es un upsert: no borra lo que ya haya. */
  async function importOwnProfesores(file) {
    if (!file) return;
    let text = '';
    try { text = await file.text(); } catch (e) { text = ''; }
    const { reviews, errors } = getDomain().parseOwnReviewsJSON(text);
    if (reviews.length === 0) {
      setProfesoresStatus(errors[0] || 'El fichero no traía ninguna valoración válida.', true);
      return;
    }
    const store = __getStore();
    if (!store || typeof store.saveReviews !== 'function') {
      setProfesoresStatus('No se puede importar: el almacén no está disponible.', true);
      return;
    }
    const result = await store.saveReviews(reviews);
    if (!result || !result.ok) {
      setProfesoresStatus('No se pudo importar el fichero.', true);
      return;
    }
    await loadOwnReviews();
    renderProfesores();
    updateAll();
    const descartadas = errors.length ? ` (${errors.length} entrada(s) descartada(s))` : '';
    setProfesoresStatus(`Importadas ${result.count} valoraciones${descartadas}.`, errors.length > 0);
  }

  /** Descarga tus valoraciones en el mismo JSON que acepta la importación. */
  function exportOwnProfesores() {
    if (ownReviews.length === 0) {
      setProfesoresStatus('Todavía no has añadido ninguna valoración.', true);
      return;
    }
    downloadJSON(JSON.parse(getDomain().ownReviewsToJSON(ownReviews)), 'profesores-propios.json');
    setProfesoresStatus(`Exportadas ${ownReviews.length} valoraciones.`);
  }

  function openProfesorPrompt() {
    const modal = document.getElementById('profesor-prompt-modal');
    const text = document.getElementById('profesor-prompt-text');
    if (!modal || !text) return;
    text.value = getDomain().buildProfesorPrompt(SUBJECTS);
    modal.hidden = false;
    text.focus();
  }

  function closeProfesorPrompt() {
    const modal = document.getElementById('profesor-prompt-modal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
  }

  async function copyProfesorPrompt() {
    const text = document.getElementById('profesor-prompt-text');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text.value);
      setProfesoresStatus('Prompt copiado al portapapeles.');
    } catch (e) {
      // Sin permiso de portapapeles (o sin API) el texto ya está a la vista y
      // seleccionado: se copia a mano en vez de fallar en silencio.
      text.select();
      setProfesoresStatus('No se pudo copiar solo: el texto queda seleccionado, cópialo a mano.', true);
    }
  }

  function setupProfesoresSection() {
    const add = document.getElementById('btn-add-profesor');
    if (add) add.addEventListener('click', () => openProfesorForm(''));

    const importBtn = document.getElementById('btn-import-profesores');
    const importInput = document.getElementById('import-profesores-input');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        importOwnProfesores(file);
      });
    }

    const exportBtn = document.getElementById('btn-export-profesores');
    if (exportBtn) exportBtn.addEventListener('click', exportOwnProfesores);
    const promptBtn = document.getElementById('btn-copy-profesor-prompt');
    if (promptBtn) promptBtn.addEventListener('click', openProfesorPrompt);
    const promptCopy = document.getElementById('profesor-prompt-copy');
    if (promptCopy) promptCopy.addEventListener('click', copyProfesorPrompt);

    // El interruptor de esta sección es el mismo que el del generador.
    const ignore = document.getElementById('profesores-ignore-docents');
    if (ignore) ignore.addEventListener('change', () => setIgnoreDocents(ignore.checked));

    const form = profesorFormEls();
    if (form.modal) {
      if (form.close) form.close.addEventListener('click', closeProfesorForm);
      if (form.cancel) form.cancel.addEventListener('click', closeProfesorForm);
      if (form.save) form.save.addEventListener('click', saveProfesorForm);
      if (form.del) form.del.addEventListener('click', () => deleteOwnReview(editingReviewKey));
      if (form.subject) {
        form.subject.addEventListener('change', () => {
          if (form.modalidad) form.modalidad.disabled = !form.subject.value;
        });
      }
      form.modal.addEventListener('click', (e) => {
        if (e.target === form.modal) closeProfesorForm();
      });
      form.modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeProfesorForm();
        }
      });
    }

    const prompt = document.getElementById('profesor-prompt-modal');
    if (prompt) {
      const closeBtn = document.getElementById('profesor-prompt-close');
      if (closeBtn) closeBtn.addEventListener('click', closeProfesorPrompt);
      prompt.addEventListener('click', (e) => {
        if (e.target === prompt) closeProfesorPrompt();
      });
      prompt.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeProfesorPrompt();
        }
      });
    }

    // Delegado: la tabla se repinta entera en cada cambio de estado.
    const lista = document.getElementById('profesores-container');
    if (lista) {
      lista.addEventListener('click', (e) => {
        const edit = e.target.closest('[data-edit-prof]');
        if (edit) {
          openProfesorForm(edit.dataset.editProf);
          return;
        }
        const remove = e.target.closest('[data-delete-prof]');
        if (remove) deleteOwnReview(remove.dataset.deleteProf);
      });
    }
  }

  // ─── Ficha de asignatura ───────────────────────────────────
  // Dificultad y descripción del **plan** (por modalidad), que no son del
  // profesor y no se pintaban en ningún sitio. Solo las trae el catálogo
  // completo (el archivo con contraseña); la muestra devuelve la ficha vacía.
  function asignaturaModalEls() {
    return {
      modal: document.getElementById('asignatura-modal'),
      title: document.getElementById('asignatura-modal-title'),
      body: document.getElementById('asignatura-modal-body'),
      close: document.getElementById('asignatura-modal-close'),
    };
  }

  function asignaturaFichaHtml(ficha) {
    let html = '<div class="asignatura-ficha">';
    const meta = [
      ficha.codigo,
      ficha.curso ? `${ficha.curso}º curso` : '',
      ficha.cuatrimestre ? `${ficha.cuatrimestre}º cuatrimestre` : '',
      ficha.creditos ? `${ficha.creditos} ECTS` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    if (meta) html += `<p class="asignatura-ficha-meta">${escapeCatalogText(meta)}</p>`;

    const plan = [ficha.caracter, ficha.mencion ? `Mención ${ficha.mencion}` : '']
      .filter(Boolean)
      .join(' · ');
    if (plan) html += `<p class="asignatura-ficha-plan">${escapeCatalogText(plan)}</p>`;

    if (ficha.dificultades.length) {
      html += '<h3 class="asignatura-ficha-sub">Dificultad de la asignatura</h3>';
      ficha.dificultades.forEach((d) => {
        html += '<div class="asignatura-ficha-row">'
          + `<span class="asignatura-ficha-modalidad">${escapeCatalogText(d.modalidad)}</span>`
          + `${dificultadBadgeHtml(d.clave)}</div>`;
      });
    }

    if (ficha.descripciones.length) {
      html += '<h3 class="asignatura-ficha-sub">Descripción</h3>';
      ficha.descripciones.forEach((d) => {
        html += '<div class="asignatura-ficha-row is-block">'
          + `<span class="asignatura-ficha-modalidad">${escapeCatalogText(d.modalidad)}</span>`
          + `<p class="asignatura-ficha-texto">${escapeCatalogText(d.texto)}</p></div>`;
      });
    }

    if (!ficha.dificultades.length && !ficha.descripciones.length) {
      html += '<p class="asignatura-ficha-vacio">Esta asignatura no trae dificultad ni descripción. '
        + 'Solo vienen con el catálogo completo (el archivo con contraseña).</p>';
    }

    html += '</div>';
    return html;
  }

  function openAsignaturaFicha(codigo, opener) {
    const els = asignaturaModalEls();
    if (!els.modal || !els.title || !els.body || !codigo) return;
    const subject = SUBJECTS.find(s => s.codigo === codigo);
    if (!subject) return;
    const ficha = getDomain().buildAsignaturaFicha(subject);
    els.title.textContent = ficha.nombre || ficha.codigo;
    els.body.innerHTML = asignaturaFichaHtml(ficha);
    asignaturaFichaOpener = opener || null;
    els.modal.hidden = false;
    if (els.close) els.close.focus();
  }

  function closeAsignaturaFicha() {
    const els = asignaturaModalEls();
    if (!els.modal || els.modal.hidden) return;
    els.modal.hidden = true;
    const opener = asignaturaFichaOpener;
    asignaturaFichaOpener = null;
    // El foco vuelve a quien abrió la ficha si el nodo sigue vivo (los paneles
    // se repintan enteros; el botón puede haber muerto).
    if (opener && document.contains(opener) && typeof opener.focus === 'function') opener.focus();
  }

  function setupAsignaturaFicha() {
    const els = asignaturaModalEls();
    if (!els.modal) return;
    if (els.close) els.close.addEventListener('click', closeAsignaturaFicha);
    els.modal.addEventListener('click', (e) => {
      if (e.target === els.modal) closeAsignaturaFicha();
    });
    els.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAsignaturaFicha();
      }
    });
    // La tarjeta de materia vive en la vista ESM (features/subjects.js), que no
    // puede llamar a este cierre: pide la ficha con un evento.
    if (!asignaturaFichaBound) {
      document.addEventListener('ugr:openAsignatura', (e) => {
        const codigo = e.detail && e.detail.codigo;
        if (codigo) openAsignaturaFicha(codigo, null);
      });
      asignaturaFichaBound = true;
    }
  }

  // ─── Render Calendar ───────────────────────────────────────
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
    // La regla (créditos, horas y turno de la selección) vive en el dominio; aquí
    // solo se pinta.
    const summary = getDomain().buildSelectionSummary(state.selectedSubjects, state.groupChoices, SUBJECTS);

    if (summary.count === 0) {
      content.innerHTML = '<p class="empty-state">Selecciona asignaturas para ver el resumen.</p>';
      return;
    }

    const tags = summary.codes
      .filter(codigo => SUBJECTS.some(s => s.codigo === codigo))
      .map(codigo => `<span class="summary-subject-tag">${codigo}</span>`);

    // Clase y texto del turno: el dominio dice **cuál** es; cómo se ve es de aquí.
    const TURNO_BADGE = {
      'mañana': ['mañana', 'Turno: Mañana'],
      'tarde': ['tarde', 'Turno: Tarde'],
      'mixto': ['mixed', 'Turno: Mixto'],
    };
    const turno = TURNO_BADGE[summary.turno];

    let html = `<div class="summary-grid">`;
    html += `<div class="summary-stat"><div class="stat-value">${summary.count}</div><div class="stat-label">Asignaturas</div></div>`;
    html += `<div class="summary-stat"><div class="stat-value">${summary.credits}</div><div class="stat-label">Créditos ECTS</div></div>`;
    html += `<div class="summary-stat"><div class="stat-value">${summary.hours.toFixed(1)}h</div><div class="stat-label">Horas/semana</div></div>`;
    html += `<div class="summary-stat"><div class="stat-value">${conflicts.length}</div><div class="stat-label">Conflictos</div></div>`;
    html += `</div>`;

    if (turno) {
      html += `<div style="text-align:center;margin-bottom:0.8rem;"><span class="turno-badge ${turno[0]}">${turno[1]}</span></div>`;
    }

    html += `<div class="summary-subjects">${tags.join('')}</div>`;

    content.innerHTML = html;
  }

  // ─── Summary Bar ────────────────────────────────────────────
  function updateSummaryBar() {
    const summary = getDomain().buildSelectionSummary(state.selectedSubjects, state.groupChoices, SUBJECTS);
    document.getElementById('selected-count').textContent = summary.count;
    document.getElementById('total-credits').textContent = summary.credits;

    const meta = document.getElementById('credit-meta');
    meta.textContent = summary.credits >= 30 ? `(meta: 30 ✓)` : `(meta: 30)`;
    meta.classList.toggle('over', summary.credits > 30);
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
    return getDomain().hasSelectedInTerm(state.selectedSubjects, SUBJECTS, state.cuatrimestreActivo);
  }

  function updateControlPanel() {
    const canGenerate = hasSelectedInTerm();
    const hint = document.getElementById('control-hint');
    if (hint) hint.hidden = canGenerate;
    // La selección o el cuatrimestre pueden haber cambiado, y con ellos la
    // viabilidad: se revisa (con debounce) antes de decidir el botón.
    scheduleFeasibilityCheck();
    updateGenerateButton();
  }

  function setupActions() {
    setupProfesorFicha();
    setupProfesoresSection();
    setupAsignaturaFicha();
    document.getElementById('btn-export').addEventListener('click', exportCalendar);
    document.getElementById('btn-share').addEventListener('click', shareLink);
    document.getElementById('btn-clear-selected').addEventListener('click', clearSelected);
    document.getElementById('btn-save-config').addEventListener('click', saveConfig);
    document.getElementById('config-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveConfig();
    });
    setupManageSubjectsView();
    const mencionSelect = document.getElementById('manage-subjects-mencion');
    if (mencionSelect) mencionSelect.addEventListener('change', renderManageSubjects);
    document.getElementById('btn-export-json').addEventListener('click', exportAllJSON);
    document.getElementById('btn-import-json').addEventListener('click', () => {
      document.getElementById('import-json-input').click();
    });
    document.getElementById('import-json-input').addEventListener('change', importAllJSON);
    document.getElementById('btn-reset-defaults').addEventListener('click', resetDefaults);
    document.getElementById('btn-export-all-configs').addEventListener('click', exportAllSavedConfigs);
    document.getElementById('btn-delete-all-configs').addEventListener('click', () => {
      if (getSavedConfigs().length === 0) {
        showToast('No hay configuraciones propias que borrar', 'info');
        return;
      }
      if (!confirm('¿Eliminar todas tus configuraciones guardadas?')) return;
      const view = getSavedConfigsView();
      if (view) view.replaceAll([]);
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
    // Los toggles semana/lista y compacto los gestiona el feature ESM
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
  // ─── Compartir enlace cifrado ───────────────────────────────
  // El diálogo, la generación del enlace y su restauración viven en la vista
  // ESM; aquí quedan los dos disparadores (el botón y el hash de la URL).
  function shareLink() {
    const view = getShareView();
    if (view) view.open('share');
  }

  function checkUrlShare() {
    const view = getShareView();
    if (view) view.checkUrl();
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
  // La **vista** (tabla, orden, paginación, acciones) vive en ESM
  // (`src/app/features/savedConfigs.js`). Aquí quedan los datos que la vista
  // recibe y las **mutaciones** (guardar/cargar/borrar/exportar), que el
  // monolito sigue poseyendo y le pasa como intents.
  function getDisplayConfigs() {
    return getSavedConfigs().concat(getSolverView() ? getSolverView().getResults() : []);
  }

  /** Vuelve la tabla a la primera página (la pide quien cambia la lista). */
  function resetConfigsPage() {
    const view = getSavedConfigsView();
    if (view) view.resetPage();
  }

  /** Configuraciones guardadas: las vive la vista; aquí solo se leen. */
  function getSavedConfigs() {
    const view = getSavedConfigsView();
    return view ? view.getAll() : [];
  }

  // ─── Solver UI ─────────────────────────────────────────────
  // El panel del generador —filtros y su persistencia, estrategia, bloqueo de
  // profesores, viabilidad, progreso, cancelación y resultados— vive en la vista
  // ESM. Aquí quedan los disparadores que usa el resto del monolito (la selección,
  // el cambio de catálogo y la restauración de un enlace) y la lectura de su
  // estado.
  function renderSolverFilters() {
    const view = getSolverView();
    if (view) view.renderPanel();
  }

  function scheduleFeasibilityCheck() {
    const view = getSolverView();
    if (view) view.scheduleFeasibility();
  }

  function updateGenerateButton() {
    const view = getSolverView();
    if (view) view.refreshGenerateButton();
  }

  function cancelSolver() {
    const view = getSolverView();
    if (view) view.cancel();
  }

  function saveSolverResult(id) {
    const view = getSolverView();
    if (view) view.saveResult(id);
  }

  function isConfigFavorited(config) {
    // Delegación: la única implementación vive en ESM
    // (src/app/domain/configs.js).
    return getDomain().isConfigFavorited(config);
  }

  function findDuplicateConfig(newGroupChoices, newSelectedSubjects) {
    // Delegación (configs.js): la lista de candidatas se inyecta aquí, leída de
    // la vista que las posee.
    return getDomain().findDuplicateConfig(getSavedConfigs(), newGroupChoices, newSelectedSubjects);
  }

  // Guardar, editar y borrar una configuración los vive la vista ESM: aquí solo
  // queda el disparador (botón y Enter del campo de nombre).
  function saveConfig() {
    const view = getSavedConfigsView();
    if (view) view.saveCurrent();
  }

  function loadConfig(id) {
    // Delegación: aplicarla al estado y sincronizar el perfil es de la vista;
    // persistir y repintar el resto sigue aquí.
    const view = getSavedConfigsView();
    if (view) view.load(id);
  }

  function deleteConfig(id) {
    const view = getSavedConfigsView();
    if (view) view.remove(id);
  }

  /**
   * Pinta la tabla de configuraciones delegando en su vista ESM. Sin vista
   * montada (import fallido) es un no-op, como el resto de vistas.
   */
  function renderSavedConfigs() {
    const view = getSavedConfigsView();
    if (view) view.render();
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
      savedConfigs: getSavedConfigs(),
      convalidaciones: convalidacionesEstados,
      propuestas: state.propuestas,
      propuestasGuardadas: getPropuestasView() ? getPropuestasView().getSaved() : [],
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
          const view = getSavedConfigsView();
          if (view) view.replaceAll(data.savedConfigs);
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
          const propuestasView = getPropuestasView();
          if (propuestasView) propuestasView.replaceSaved(data.propuestasGuardadas);
        }

        document.getElementById('apellido').value = state.apellido || '';
        document.getElementById('turno-preferente').value = state.turnoPreferente || 'indiferente';

        renderSavedConfigs();
        renderPropuestasGuardadas();
        updateAll();
        renderSubjects();
        renderPropuestasBar();
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
    // Las ranuras del formato antiguo las conoce y las vacía el adaptador.
    getPersistence().clearSavedConfigs();
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
    const savedConfigsView = getSavedConfigsView();
    if (savedConfigsView) savedConfigsView.replaceAll([]);
    const propuestasView = getPropuestasView();
    if (propuestasView) propuestasView.clearSaved();

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

    resetConfigsPage();
    renderSavedConfigs();
    renderPropuestasGuardadas();
    renderPropuestasBar();
    updateAll();
    renderSubjects();
    showToast('Configuración restaurada por defecto', 'info');
  }

  // ─── Export/Import Single Config ───────────────────────────
  function exportSingleConfig(id) {
    const view = getSavedConfigsView();
    if (view) view.exportOne(id);
  }

  function exportAllSavedConfigs() {
    const view = getSavedConfigsView();
    if (view) view.exportAll();
  }

  function importSavedConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);

        // Delegación: la validación de formato (single/batch → lista) es
        // pura; `null` significa envoltorio no reconocido. Los `id` siguen
        // generándose aquí: son efecto secundario, no regla de dominio.
        const configsToAdd = getDomain().parseConfigImport(data);
        if (!configsToAdd) {
          showToast('Formato de archivo no válido', 'error');
          return;
        }

        configsToAdd.forEach(c => {
          c.id = Date.now() + Math.floor(Math.random() * 1000);
        });

        const view = getSavedConfigsView();
        if (view) view.append(configsToAdd);
        resetConfigsPage();
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
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
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
        if (view === 'datos') {
          renderManageSubjects();
          renderProfesores();
        }
        if (view === 'convalidaciones') {
          renderPropuestasBar();
        }
      });
    });

  }

  // ─── Manage Subjects ────────────────────────────────────────
  // ─── Gestionar asignaturas ──────────────────────────────────
  // La lista, el modal (alta, edición y grupos) y el borrado viven en la vista
  // ESM; aquí queda el disparador y el catálogo, que es **compartido** (el
  // resto de la app lee el mismo array).
  function renderManageSubjects() {
    const view = getManageSubjectsView();
    if (view) view.render();
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

  // ─── Catálogo activo ───────────────────────────────────────
  const LEGACY_CATALOG_ID = 'UGR/GI/legacy-1';
  const LEGACY_SUBJECT_FIELDS = ['aprobada', 'corresponde', 'descripcion'];

  /** Menciones del catálogo activo (con su nombre largo), si las trae. */
  function catalogMenciones() {
    const api = getCatalogApi();
    const catalog = api && typeof api.getCatalog === 'function' ? api.getCatalog() : null;
    return catalog && Array.isArray(catalog.menciones) ? catalog.menciones : [];
  }

  /** Asignaturas del plan que la app no planifica (sin horario), si las trae. */
  function catalogExtraSubjects() {
    const api = getCatalogApi();
    const catalog = api && typeof api.getCatalog === 'function' ? api.getCatalog() : null;
    return catalog && Array.isArray(catalog.extraSubjects) ? catalog.extraSubjects : [];
  }

  function getCatalogApi() {
    return (typeof window !== 'undefined' && window.__ugrCatalog) ? window.__ugrCatalog : null;
  }

  function cloneCatalogValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /**
   * Rehace los dos índices del profesor con lo que sirva el catálogo activo:
   * las asignaciones y los perfiles. Se vacían en sitio porque son `const` que
   * comparten los ayudantes del profesor (no se reasigna la referencia).
   *
   * @param {Array} docents asignaciones.
   * @param {Array} profesores perfiles.
   */
  function rebuildDocentIndexes(docents, profesores) {
    Object.keys(docentesByKey).forEach(key => { delete docentesByKey[key]; });
    (Array.isArray(docents) ? docents : []).forEach(d => {
      if (d && d.key) docentesByKey[d.key] = d;
    });
    Object.keys(catalogoProfesoresByKey).forEach(key => { delete catalogoProfesoresByKey[key]; });
    (Array.isArray(profesores) ? profesores : []).forEach(p => {
      if (p && p.key) catalogoProfesoresByKey[p.key] = p;
    });
    rebuildProfesoresIndex();
  }

  /**
   * Rehace el índice de perfiles que lee el render: el catálogo activo con las
   * valoraciones propias por encima —para la misma (asignatura, modalidad,
   * nombre) manda la tuya—. Es idempotente y se puede llamar tantas veces como
   * haga falta: parte siempre de la base y de la lista de propias.
   */
  function rebuildProfesoresIndex() {
    Object.keys(profesoresByKey).forEach(key => { delete profesoresByKey[key]; });
    nombresConFicha.clear();
    const add = p => {
      if (!p || !p.key) return;
      profesoresByKey[p.key] = p;
      // La ficha agrupa todo lo que se sabe de un profesor, así que se abre
      // aunque no haya valoración de *esta* asignatura: si tiene alguna en otra,
      // el nombre es un botón y la ficha la enseña.
      if (p.name) nombresConFicha.add(p.name);
    };
    Object.keys(catalogoProfesoresByKey).forEach(key => add(catalogoProfesoresByKey[key]));
    ownReviews.forEach(review => add(getDomain().ownReviewToProfesor(review)));
    ownReviewKeys = new Set(ownReviews.map(r => r.docentKey).filter(Boolean));
  }

  /**
   * Lee las valoraciones propias del store y rehace el índice con ellas. Sin
   * IndexedDB no hay nada que leer y la app se queda con el catálogo a secas.
   */
  async function loadOwnReviews() {
    const store = __getStore();
    if (store && typeof store.listReviews === 'function') {
      try { ownReviews = await store.listReviews(); } catch (e) { ownReviews = []; }
    }
    rebuildProfesoresIndex();
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
    rebuildDocentIndexes(
      typeof api.getDocents === 'function' ? api.getDocents() : [],
      typeof api.getProfesores === 'function' ? api.getProfesores() : [],
    );

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
    const solverView = getSolverView();
    if (solverView) solverView.clear();
    updateAll();
    renderManageSubjects();
    renderSolverFilters();
    renderSavedConfigs();
    renderProfesores();
    renderCatalogSelector();
  }

  // El escapado es **un solo conocimiento** y vive en el dominio
  // (src/app/domain/text.js): aquí solo se pregunta. Tenía tres copias.
  function escapeCatalogText(text) {
    return getDomain().escapeHtml(text);
  }

  /** Pinta el desplegable del catálogo activo (vive en la vista ESM). */
  function renderCatalogSelector() {
    const view = getCatalogView();
    if (view) view.renderSelector();
  }

  // ─── Paquete cifrado del autor ──────────────────────────────
  // El flujo (aviso de lo que trae, copia previa, confirmación e importación)
  // vive en la vista del catálogo; aquí queda solo **resolver el módulo**: el
  // `import()` que un script clásico no puede hacer síncrono y el atajo
  // `window.__ugrPackage` que usan las pruebas.
  function loadPackageModule() {
    if (typeof window !== 'undefined' && window.__ugrPackage) {
      return Promise.resolve(window.__ugrPackage);
    }
    return import('/ugr/src/package/unlockPackage.js').then(() => window.__ugrPackage);
  }

  // ─── Propuestas ─────────────────────────────────────────────
  // La barra con sus acciones, el detalle de mapeos, las instantáneas guardadas
  // y el enlace de compartir viven en la vista ESM. Aquí quedan los tres
  // disparadores que el monolito sigue necesitando: pintar el panel al entrar
  // en la vista, repintar la lista de guardadas al importar un respaldo, y leer
  // un enlace ?propuesta= de la URL al arrancar.
  function renderPropuestasBar() {
    const view = getPropuestasView();
    if (view) view.renderBar();
  }

  function renderPropuestasGuardadas() {
    const view = getPropuestasView();
    if (view) view.renderSaved();
  }

  function checkUrlPropuesta() {
    const view = getPropuestasView();
    if (view) view.checkUrl();
  }

  // ─── Composición ESM ───────────────────────────────────────
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

  // ─── Features ESM ──────────────────────────────────────────
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
            getMenciones: () => catalogMenciones(),
            getDificultadLabel,
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

  // ─── Features ESM ──────────────────────────────────────────
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
            // «Ignorar profesores»: el modo también apaga lo que se ve,
            // así que el calendario recibe lookups vacíos mientras esté activo
            // (el punto de dificultad y la línea del profesor del tooltip
            // desaparecen sin tocar el feature).
            getDificultad: (codigo, letra) => (ignoreDocents ? null : getDificultad(codigo, letra)),
            getDificultadLabel,
            getDificultadColor,
            getProfName: (codigo, letra) => (ignoreDocents ? '' : getProfName(codigo, letra)),
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

  // ─── Features ESM: vista de configuraciones guardadas ──────
  // Mismo patrón que `ensureSubjectsView`/`ensureCalendarViewFeature`: import
  // dinámico con instancia y promesa cacheadas, para que `init()` repetido no
  // duplique los listeners de la tabla. Recibe del monolito los datos y las
  // mutaciones (como intents); si el import falla, la vista queda en `null` y
  // `renderSavedConfigs()` degrada a no-op.
  let ugrSavedConfigsView = null;
  let ugrSavedConfigsInitPromise = null;

  function getSavedConfigsView() {
    return ugrSavedConfigsView;
  }

  function ensureSavedConfigsView() {
    if (ugrSavedConfigsView) return Promise.resolve(ugrSavedConfigsView);
    if (!ugrSavedConfigsInitPromise) {
      ugrSavedConfigsInitPromise = import('./src/app/features/savedConfigs.js')
        .then(({ createSavedConfigsView }) => {
          ugrSavedConfigsView = createSavedConfigsView({
            document,
            getState: () => state,
            persistence: getPersistence(),
            notify: showToast,
            confirmFn: (mensaje) => confirm(mensaje),
            onConfigLoaded: () => {
              pushProfileToStore();
              saveState();
              updateAll();
            },
            download: downloadJSON,
            escape: escapeCatalogText,
            getSubjects: () => SUBJECTS,
            getExtraConfigs: () => (getSolverView() ? getSolverView().getResults() : []),
            weekdays: DAYS,
            getBlocks,
            getCeilings: () => ({ maxManana: configMaxManana, maxTarde: configMaxTarde }),
            getCompareIds: () => compareIds,
            // Con «Ignorar profesores» se inyecta un lookup vacío, igual que en
            // el resto de la app: la columna «Prof» queda a hueco.
            getDificultad: (codigo, letra) => (ignoreDocents ? null : getDificultad(codigo, letra)),
            difficultyScore: getDifficultyScore,
            dayShort: DAY_SHORT,
            onLoad: loadConfig,
            onSaveSolver: saveSolverResult,
            onExport: exportSingleConfig,
            onCompare: toggleCompareId,
          });
          return ugrSavedConfigsView;
        })
        .catch((err) => {
          console.error('[ugr] saved configs view no pudo iniciarse', err);
          ugrSavedConfigsInitPromise = null;
          return null;
        });
    }
    return ugrSavedConfigsInitPromise;
  }

  // ─── Features ESM: gestionar asignaturas ───────────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas. El catálogo
  // es la referencia **compartida** del monolito (se muta en sitio), así que se
  // le pasa el getter; persistir el catálogo y repintar siguen siendo suyos.
  let ugrManageSubjectsView = null;
  let ugrManageSubjectsInitPromise = null;

  function getManageSubjectsView() {
    return ugrManageSubjectsView;
  }

  function ensureManageSubjectsView() {
    if (ugrManageSubjectsView) return Promise.resolve(ugrManageSubjectsView);
    if (!ugrManageSubjectsInitPromise) {
      ugrManageSubjectsInitPromise = import('./src/app/features/manageSubjects.js')
        .then(({ createManageSubjectsView }) => {
          ugrManageSubjectsView = createManageSubjectsView({
            document,
            getSubjects: () => SUBJECTS,
            getState: () => state,
            getDomain,
            getExtraSubjects: catalogExtraSubjects,
            getMenciones: catalogMenciones,
            escape: escapeCatalogText,
            notify: showToast,
            confirmFn: (mensaje) => confirm(mensaje),
            persist: saveSubjectsToStorage,
            onBoard: saveState,
            onChanged: updateAll,
            onOpenAsignatura: openAsignaturaFicha,
            days: DAYS,
            dayLabels: DAY_LABELS,
          });
          return ugrManageSubjectsView;
        })
        .catch((err) => {
          console.error('[ugr] manage subjects view no pudo iniciarse', err);
          ugrManageSubjectsInitPromise = null;
          return null;
        });
    }
    return ugrManageSubjectsInitPromise;
  }

  function setupManageSubjectsView() {
    const view = getManageSubjectsView();
    if (view) view.setup();
  }

  // ─── Features ESM: el panel del generador ──────────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas. La vista
  // posee el estado del panel (filtros, estrategia, resultados y viabilidad) y el
  // monolito se lo lee por getters; el catálogo, la preferencia de profesores y
  // los datos de docentes entran por getter porque cambian en caliente.
  let ugrSolverView = null;
  let ugrSolverInitPromise = null;

  function getSolverView() {
    return ugrSolverView;
  }

  function ensureSolverView() {
    if (ugrSolverView) return Promise.resolve(ugrSolverView);
    if (!ugrSolverInitPromise) {
      ugrSolverInitPromise = import('./src/app/features/solver.js')
        .then(({ createSolverView }) => {
          ugrSolverView = createSolverView({
            document,
            window,
            getState: () => state,
            getSubjects: () => SUBJECTS,
            getPassedCodes: () => (window.__ugrProgress && window.__ugrProgress.getPassedCodes ? window.__ugrProgress.getPassedCodes() : []),
            filterTypes: SOLVER_FILTER_TYPES,
            isIgnoringDocents: () => ignoreDocents,
            onToggleIgnoreDocents: setIgnoreDocents,
            weekdays: DAYS,
            dayLabels: DAY_LABELS,
            getDocentInfo,
            getProfesorInfo,
            getDificultad,
            difficultyToken: getDificultadColor,
            difficultyScore: getDifficultyScore,
            hasSelectedInTerm,
            onResultsCleared: resetConfigsPage,
            onResultsReady: renderSavedConfigs,
            onSaveResult: (cfg) => {
              const view = getSavedConfigsView();
              if (view) {
                view.append([{
                  id: Date.now(),
                  name: cfg.name,
                  selectedSubjects: { ...cfg.selectedSubjects },
                  groupChoices: JSON.parse(JSON.stringify(cfg.groupChoices)),
                  apellido: cfg.apellido,
                  turnoPreferente: cfg.turnoPreferente,
                }]);
              }
            },
            notify: showToast,
          });
          ugrSolverView.setup();
          return ugrSolverView;
        })
        .catch((err) => {
          console.error('[ugr] solver view no pudo iniciarse', err);
          ugrSolverInitPromise = null;
          return null;
        });
    }
    return ugrSolverInitPromise;
  }

  // ─── Features ESM: propuestas de convalidación ─────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas. El estado
  // (la lista, cuál está activa y la vista) es del monolito y se le cede por
  // getter para que lo mute en sitio; el catálogo, la tabla oficial y las
  // equivalencias entran por getter porque cambian en caliente.
  let ugrPropuestasView = null;
  let ugrPropuestasInitPromise = null;

  function getPropuestasView() {
    return ugrPropuestasView;
  }

  function ensurePropuestasView() {
    if (ugrPropuestasView) return Promise.resolve(ugrPropuestasView);
    if (!ugrPropuestasInitPromise) {
      ugrPropuestasInitPromise = import('./src/app/features/propuestas.js')
        .then(({ createPropuestasView }) => {
          ugrPropuestasView = createPropuestasView({
            document,
            window,
            storage: localStorage,
            getState: () => state,
            getSubjects: () => SUBJECTS,
            getConvalidaciones: () => (typeof CONVALIDACIONES !== 'undefined' ? CONVALIDACIONES : []),
            getPropuestasIniciales: () => (typeof PROPUESTAS_INICIALES !== 'undefined' ? PROPUESTAS_INICIALES : []),
            getEquivalencias: () => (typeof EQUIVALENCIA_CODIGOS !== 'undefined' ? EQUIVALENCIA_CODIGOS : {}),
            saveState,
            savePropuestas,
            download: downloadJSON,
            notify: showToast,
            confirmFn: (mensaje) => confirm(mensaje),
            promptFn: (mensaje, inicial) => prompt(mensaje, inicial),
          });
          ugrPropuestasView.setup();
          return ugrPropuestasView;
        })
        .catch((err) => {
          console.error('[ugr] propuestas view no pudo iniciarse', err);
          ugrPropuestasInitPromise = null;
          return null;
        });
    }
    return ugrPropuestasInitPromise;
  }

  // ─── Features ESM: compartir por enlace ────────────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas. El estado y
  // los filtros son del monolito: se ceden por getters y se aplican por intents.
  let ugrShareView = null;
  let ugrShareInitPromise = null;

  function getShareView() {
    return ugrShareView;
  }

  function ensureShareView() {
    if (ugrShareView) return Promise.resolve(ugrShareView);
    if (!ugrShareInitPromise) {
      ugrShareInitPromise = import('./src/app/features/share.js')
        .then(({ createShareView }) => {
          ugrShareView = createShareView({
            document,
            window,
            getState: () => state,
            getFilters: () => (getSolverView() ? getSolverView().getFilters() : []),
            getStrategy: () => (getSolverView() ? getSolverView().getStrategy() : 'balanced'),
            onApplyFilters: (filtros, estrategia) => {
              const view = getSolverView();
              if (view) view.applyFilters(filtros, estrategia);
            },
            onProfileChanged: pushProfileToStore,
            onPruneSelections: pruneSelectionsToActiveCatalog,
            onStateApplied: () => {
              saveState();
              renderSolverFilters();
              updateAll();
            },
            notify: showToast,
            filterTypes: SOLVER_FILTER_TYPES,
            strategies: getSolverView() ? getSolverView().getStrategies() : {},
          });
          ugrShareView.setup();
          return ugrShareView;
        })
        .catch((err) => {
          console.error('[ugr] share view no pudo iniciarse', err);
          ugrShareInitPromise = null;
          return null;
        });
    }
    return ugrShareInitPromise;
  }

  // ─── Features ESM: vista del catálogo y del paquete ────────
  // Mismo patrón que las demás: import dinámico con instancia y promesa
  // cacheadas. La vista pide la frontera del catálogo, los avisos y las
  // confirmaciones; el módulo del paquete sí lo resuelve el monolito (arriba),
  // porque es él quien puede hacer el `import()`.
  let ugrCatalogView = null;
  let ugrCatalogInitPromise = null;

  function getCatalogView() {
    return ugrCatalogView;
  }

  function ensureCatalogView() {
    if (ugrCatalogView) return Promise.resolve(ugrCatalogView);
    if (!ugrCatalogInitPromise) {
      ugrCatalogInitPromise = import('./src/app/features/catalog.js')
        .then(({ createCatalogView }) => {
          ugrCatalogView = createCatalogView({
            document,
            getCatalogApi,
            escape: escapeCatalogText,
            notify: showToast,
            confirmFn: (mensaje) => confirm(mensaje),
            download: downloadJSON,
            onCatalogChanged: refreshAfterCatalogChange,
            exportAll: exportAllJSON,
            getPackageModule: loadPackageModule,
          });
          return ugrCatalogView;
        })
        .catch((err) => {
          console.error('[ugr] catalog view no pudo iniciarse', err);
          ugrCatalogInitPromise = null;
          return null;
        });
    }
    return ugrCatalogInitPromise;
  }

  function setupCatalogView() {
    const view = getCatalogView();
    if (view) view.setup();
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
