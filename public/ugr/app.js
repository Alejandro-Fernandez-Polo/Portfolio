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

  let savedConfigs = JSON.parse(localStorage.getItem('ugr-horario-saved-configs') || '[]');
  let savedPropuestasInternas = JSON.parse(localStorage.getItem('ugr-propuestas-guardadas') || '[]');

  const DEFAULT_SUBJECTS = JSON.parse(JSON.stringify(SUBJECTS));

  let convalidacionesEstados = JSON.parse(localStorage.getItem('ugr-convalidaciones') || '{}');

  let PROPUESTAS = JSON.parse(localStorage.getItem('ugr-propuestas') || 'null');

  let conflicts = [];

  // ─── Init ───────────────────────────────────────────────────
  function init() {
    loadSubjectsFromStorage();
    loadPropuestas();
    loadState();
    renderSubjects();
    setupTabs();
    setupConfig();
    setupActions();
    setupNavigation();
    setupPropuestas();
    updateAll();
    checkUrlShare();
    checkUrlPropuesta();
  }

  // ─── LocalStorage ───────────────────────────────────────────
  function saveState() {
    localStorage.setItem('ugr-horario-state', JSON.stringify(state));
  }

  function calcPropuestaCreditos(p) {
    if (!p || !p.mappings) return 0;
    return p.mappings.reduce((s,m)=> s + (m.creditos || (m.tipo==='bloque'?24:6)), 0);
  }

  function loadState() {
    try {
      const saved = localStorage.getItem('ugr-horario-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      }
    } catch (e) { /* ignore */ }
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
  }

  const NUMERIC_TO_CODIGO = { '12':'CA','14':'FS','15':'FP','16':'LMD','17':'TOC','18':'MP','19':'IES','1A':'ES','21':'PDOO','1':'ES','A':'ES' };
  function resolveUgrCodigo(codigo) {
    if (!codigo) return codigo;
    const up = String(codigo).toUpperCase().trim();
    if (NUMERIC_TO_CODIGO[up]) return NUMERIC_TO_CODIGO[up];
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
      applyApellidoRule();
      saveState();
      updateAll();
    });

    document.getElementById('turno-preferente').addEventListener('change', (e) => {
      state.turnoPreferente = e.target.value;
      saveState();
      updateAll();
    });
  }

  // ─── Apellido Rule ──────────────────────────────────────────
  function getSubgrupoForApellido(apellido) {
    if (!apellido) return null;
    const first = apellido.toUpperCase().charAt(0);
    if (first >= 'A' && first <= 'F') return 1;
    if (first >= 'G' && first <= 'M') return 2;
    if (first >= 'N' && first <= 'S') return 3;
    if (first >= 'T' && first <= 'Z') return 4;
    return null;
  }

  function applyApellidoRule() {
    const subgrupoNum = getSubgrupoForApellido(state.apellido);
    if (!subgrupoNum) return;

    Object.keys(state.selectedSubjects).forEach(codigo => {
      if (!state.selectedSubjects[codigo]) return;
      const subject = SUBJECTS.find(s => s.codigo === codigo);
      if (!subject) return;
      const choice = state.groupChoices[codigo];
      if (!choice) return;
      const group = subject.grupos.find(g => g.letra === choice.teoria);
      if (!group || !group.practicas || !group.practicas.subgrupos.length) return;

      const targetSub = group.letra + subgrupoNum;
      if (group.practicas.subgrupos.includes(targetSub)) {
        state.groupChoices[codigo].practica = targetSub;
      }
    });
    saveState();
  }

  // ─── Render Subjects ────────────────────────────────────────
  function renderSubjects() {
    const container = document.getElementById('subjects-container');
    const cuat = state.cuatrimestreActivo;
    const subjects = SUBJECTS.filter(s => s.cuatrimestre === cuat);

    // Group by course
    const byCourse = {};
    subjects.forEach(s => {
      if (!byCourse[s.curso]) byCourse[s.curso] = [];
      byCourse[s.curso].push(s);
    });

    const totalSubjects = SUBJECTS.length;
    document.getElementById('total-subjects').textContent = totalSubjects;

    let html = '';
    [1, 2, 3, 4].forEach(curso => {
      const courseSubjects = byCourse[curso];
      if (!courseSubjects || !courseSubjects.length) return;

      html += `<div class="course-group">`;
      html += `<div class="course-group-header">`;
      html += `<h3>${curso}º Curso</h3>`;
      html += `<button class="btn-select-all" data-curso="${curso}" data-cuatrimestre="${cuat}">Seleccionar todo</button>`;
      html += `</div>`;
      html += `<div class="subjects-grid">`;

      courseSubjects.forEach(s => {
        const isSelected = state.selectedSubjects[s.codigo];
        const hasConflict = conflicts.some(c => c.codigo1 === s.codigo || c.codigo2 === s.codigo);
        const isAprobada = !!s.aprobada;
        const cls = [
          'subject-card',
          isSelected ? 'selected' : '',
          hasConflict ? 'has-conflict' : '',
          isAprobada ? 'aprobada' : ''
        ].filter(Boolean).join(' ');

        html += `<div class="${cls}" data-codigo="${s.codigo}">`;
        if (isAprobada) {
          html += `<span class="badge-aprobada">Aprobada</span>`;
        }
        html += `<div class="check-indicator ${isSelected ? 'checked' : 'unchecked'}">${isSelected ? '✓' : ''}</div>`;
        html += `<div class="subject-code">${s.codigo}</div>`;
        html += `<div class="subject-name">${s.nombre}</div>`;
        if (isAprobada && s.corresponde) {
          html += `<div class="subject-corresponde">Convalida ${s.corresponde}</div>`;
        }
        html += `<div class="subject-credits">${s.creditos} ECTS</div>`;
        html += `</div>`;
      });

      html += `</div></div>`;
    });

    container.innerHTML = html;

    // Bind click events
    container.querySelectorAll('.subject-card').forEach(card => {
      card.addEventListener('click', () => {
        const codigo = card.dataset.codigo;
        toggleSubject(codigo);
      });
    });

    // Bind select all buttons
    container.querySelectorAll('.btn-select-all').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const curso = parseInt(btn.dataset.curso);
        const cuatrimestre = parseInt(btn.dataset.cuatrimestre);
        const courseSubjects = SUBJECTS.filter(s => s.curso === curso && s.cuatrimestre === cuatrimestre);
        const allSelected = courseSubjects.every(s => state.selectedSubjects[s.codigo]);
        courseSubjects.forEach(s => {
          state.selectedSubjects[s.codigo] = !allSelected;
          if (!allSelected && !state.groupChoices[s.codigo]) {
            initGroupChoice(s);
          }
        });
        if (!allSelected) {
          courseSubjects.forEach(s => applyGroupPreference(s));
        }
        saveState();
        updateAll();
      });
    });
  }

  // ─── Toggle Subject ─────────────────────────────────────────
  function toggleSubject(codigo) {
    const subject = SUBJECTS.find(s => s.codigo === codigo);
    const wasSelected = state.selectedSubjects[codigo];
    state.selectedSubjects[codigo] = !wasSelected;

    if (!wasSelected) {
      // Selecting: init group choice
      if (subject) {
        initGroupChoice(subject);
        applyGroupPreference(subject);
      }
    }

    saveState();
    updateAll();
  }

  function initGroupChoice(subject) {
    if (state.groupChoices[subject.codigo]) return;
    // Default to first group
    const defaultGroup = subject.grupos[0];
    if (!defaultGroup) return;
    state.groupChoices[subject.codigo] = {
      teoria: defaultGroup.letra,
      practica: defaultGroup.practicas && defaultGroup.practicas.subgrupos.length > 0
        ? defaultGroup.practicas.subgrupos[0]
        : null
    };
  }

  function applyGroupPreference(subject) {
    const turno = state.turnoPreferente;
    if (turno === 'indiferente') return;

    const choice = state.groupChoices[subject.codigo];
    if (!choice) return;

    // Find best group matching turn preference
    const matchingGroups = subject.grupos.filter(g => g.turno === turno);
    if (matchingGroups.length > 0) {
      const bestGroup = matchingGroups[0];
      choice.teoria = bestGroup.letra;
      if (bestGroup.practicas && bestGroup.practicas.subgrupos.length > 0) {
        // Try to keep current practice subgroup if available
        const currentSub = choice.practica;
        const subgrupoNum = currentSub ? currentSub.replace(/[A-Z]/g, '') : null;
        if (subgrupoNum) {
          const targetSub = bestGroup.letra + subgrupoNum;
          if (bestGroup.practicas.subgrupos.includes(targetSub)) {
            choice.practica = targetSub;
          } else {
            choice.practica = bestGroup.practicas.subgrupos[0];
          }
        } else {
          choice.practica = bestGroup.practicas.subgrupos[0];
        }
      } else {
        choice.practica = null;
      }
    }
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
    const entries = [];
    Object.keys(state.selectedSubjects).forEach(codigo => {
      if (!state.selectedSubjects[codigo]) return;
      const subject = SUBJECTS.find(s => s.codigo === codigo);
      if (!subject) return;
      const choice = state.groupChoices[codigo];
      if (!choice) return;

      const group = subject.grupos.find(g => g.letra === choice.teoria);
      if (!group) return;

      // Theory sessions
      group.teoria.forEach(session => {
        entries.push({
          codigo: subject.codigo,
          nombre: subject.nombre,
          tipo: 'Teoría',
          grupo: `Grupo ${group.letra}`,
          dia: session.dia,
          inicio: session.inicio,
          fin: session.fin,
          color: subject.codigo
        });
      });

      // Practice sessions
      if (choice.practica && group.practicas[choice.practica]) {
        group.practicas[choice.practica].forEach(session => {
          entries.push({
            codigo: subject.codigo,
            nombre: subject.nombre,
            tipo: 'Práctica',
            grupo: `Subgrupo ${choice.practica}`,
            dia: session.dia,
            inicio: session.inicio,
            fin: session.fin,
            color: subject.codigo
          });
        });
      }
    });
    return entries;
  }

  // ─── Conflict Detection ─────────────────────────────────────
  function detectConflicts() {
    conflicts = [];
    const entries = getActiveSchedule();

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        if (a.codigo === b.codigo) continue; // Same subject
        if (a.dia !== b.dia) continue;

        if (timesOverlap(a.inicio, a.fin, b.inicio, b.fin)) {
          conflicts.push({
            codigo1: a.codigo,
            nombre1: a.nombre,
            tipo1: `${a.tipo} ${a.grupo}`,
            dia: a.dia,
            inicio: a.inicio,
            fin: a.fin,
            codigo2: b.codigo,
            nombre2: b.nombre,
            tipo2: `${b.tipo} ${b.grupo}`,
          });
        }
      }
    }
  }

  function timesOverlap(s1, e1, s2, e2) {
    return timeToMinutes(s1) < timeToMinutes(e2) && timeToMinutes(s2) < timeToMinutes(e1);
  }

  function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
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
        html += `<div class="group-label">G${group.letra} <span style="font-weight:400;color:#888;font-size:0.65rem;">${group.turno}</span></div>`;
        html += `<div class="group-schedule">`;
        group.teoria.forEach(s => {
          html += `<span class="session">${DAY_LABELS[s.dia].substr(0, 3)} ${s.inicio}</span>`;
        });
        if (group.teoria.length === 0) {
          html += `<span class="session" style="color:#999;">-</span>`;
        }
        html += `</div></div></div>`;
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
      opt.addEventListener('click', () => {
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

  // ─── Render Calendar ────────────────────────────────────────
  function renderCalendar() {
    const cal = document.getElementById('calendar');
    const entries = getActiveSchedule();
    const conflictSet = new Set();
    conflicts.forEach(c => {
      conflictSet.add(`${c.codigo1}-${c.dia}-${c.inicio}`);
      conflictSet.add(`${c.codigo2}-${c.dia}-${c.inicio}`);
    });

    let html = '';

    // Header row
    html += `<div class="cal-header"></div>`;
    DAYS.forEach(d => {
      html += `<div class="cal-header">${DAY_LABELS[d]}</div>`;
    });

    // Time rows
    for (let h = START_HOUR; h < END_HOUR; h++) {
      html += `<div class="cal-time">${h}:00</div>`;
      DAYS.forEach(dia => {
        html += `<div class="cal-cell" data-dia="${dia}" data-hour="${h}"></div>`;
      });
    }

    cal.innerHTML = html;

    // Place events
    entries.forEach(entry => {
      const startMin = timeToMinutes(entry.inicio);
      const endMin = timeToMinutes(entry.fin);
      const dayIndex = DAYS.indexOf(entry.dia);
      if (dayIndex === -1) return;

      const startRow = Math.floor((startMin - START_HOUR * 60) / 60);
      const topOffset = ((startMin - START_HOUR * 60) % 60) / 60 * 100;
      const height = ((endMin - startMin) / 60) * 100;

      const cellSelector = `.cal-cell[data-dia="${entry.dia}"][data-hour="${START_HOUR + startRow}"]`;
      const cell = cal.querySelector(cellSelector);
      if (!cell) return;

      const isConflict = conflictSet.has(`${entry.codigo}-${entry.dia}-${entry.inicio}`);

      const eventDiv = document.createElement('div');
      eventDiv.className = `cal-event ${isConflict ? 'conflict' : ''}`;
      eventDiv.dataset.subject = entry.codigo;
      eventDiv.style.top = topOffset + '%';
      eventDiv.style.height = height + '%';
      eventDiv.innerHTML = `
        <div class="event-label">${entry.codigo}</div>
        <div class="event-type">${entry.tipo} ${entry.grupo}</div>
      `;

      // Tooltip
      eventDiv.addEventListener('mouseenter', (e) => showTooltip(e, entry));
      eventDiv.addEventListener('mouseleave', hideTooltip);

      cell.style.position = 'relative';
      cell.appendChild(eventDiv);
    });
  }

  // ─── Tooltip ────────────────────────────────────────────────
  function showTooltip(e, entry) {
    const tt = document.getElementById('tooltip');
    tt.innerHTML = `
      <div class="tt-title">${entry.nombre}</div>
      <div>${entry.tipo} - ${entry.grupo}</div>
      <div>${DAY_LABELS[entry.dia]} ${entry.inicio} - ${entry.fin}</div>
    `;
    tt.style.display = 'block';
    const rect = e.target.getBoundingClientRect();
    tt.style.left = (rect.right + 8) + 'px';
    tt.style.top = rect.top + 'px';

    // Keep within viewport
    const ttRect = tt.getBoundingClientRect();
    if (ttRect.right > window.innerWidth) {
      tt.style.left = (rect.left - ttRect.width - 8) + 'px';
    }
    if (ttRect.bottom > window.innerHeight) {
      tt.style.top = (window.innerHeight - ttRect.height - 8) + 'px';
    }
  }

  function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
  }

  // ─── Render Conflicts ──────────────────────────────────────
  function renderConflicts() {
    const panel = document.getElementById('conflicts-panel');
    const list = document.getElementById('conflicts-list');

    if (conflicts.length === 0) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
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
  }

  function setupActions() {
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
    document.getElementById('btn-import-config').addEventListener('click', () => {
      document.getElementById('import-config-input').click();
    });
    document.getElementById('import-config-input').addEventListener('change', importSavedConfig);
    setupGroupConfigToggle();
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

  // ─── Share ──────────────────────────────────────────────────
  function shareLink() {
    const data = {
      s: Object.keys(state.selectedSubjects).filter(c => state.selectedSubjects[c]),
      g: {},
      a: state.apellido,
      t: state.turnoPreferente
    };
    Object.keys(state.groupChoices).forEach(c => {
      if (state.selectedSubjects[c]) {
        data.g[c] = state.groupChoices[c];
      }
    });

    const encoded = btoa(JSON.stringify(data));
    const url = window.location.origin + window.location.pathname + '?config=' + encoded;

    navigator.clipboard.writeText(url).then(() => {
      showToast('Enlace copiado al portapapeles', 'success');
    }).catch(() => {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('Enlace copiado al portapapeles', 'success');
    });
  }

  function checkUrlShare() {
    const params = new URLSearchParams(window.location.search);
    const config = params.get('config');
    if (!config) return;

    try {
      const data = JSON.parse(atob(config));
      if (data.s) {
        data.s.forEach(c => { state.selectedSubjects[c] = true; });
      }
      if (data.g) {
        Object.keys(data.g).forEach(c => { state.groupChoices[c] = data.g[c]; });
      }
      if (data.a) {
        state.apellido = data.a;
        document.getElementById('apellido').value = data.a;
      }
      if (data.t) {
        state.turnoPreferente = data.t;
        document.getElementById('turno-preferente').value = data.t;
      }
      saveState();
      updateAll();
      showToast('Configuración cargada desde enlace compartido', 'success');
    } catch (e) {
      console.error('Error loading shared config:', e);
    }
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

    const config = {
      id: Date.now(),
      name: name,
      selectedSubjects: { ...state.selectedSubjects },
      groupChoices: JSON.parse(JSON.stringify(state.groupChoices)),
      apellido: state.apellido,
      turnoPreferente: state.turnoPreferente,
    };

    savedConfigs.push(config);
    localStorage.setItem('ugr-horario-saved-configs', JSON.stringify(savedConfigs));
    nameInput.value = '';
    renderSavedConfigs();
    showToast(`"${name}" guardada`, 'success');
  }

  function loadConfig(id) {
    const config = savedConfigs.find(c => c.id === id);
    if (!config) return;

    state.selectedSubjects = { ...config.selectedSubjects };
    state.groupChoices = JSON.parse(JSON.stringify(config.groupChoices));
    state.apellido = config.apellido;
    state.turnoPreferente = config.turnoPreferente;

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

    savedConfigs = savedConfigs.filter(c => c.id !== id);
    localStorage.setItem('ugr-horario-saved-configs', JSON.stringify(savedConfigs));
    renderSavedConfigs();
    showToast(`"${config.name}" eliminada`, 'info');
  }

  function renderSavedConfigs() {
    const container = document.getElementById('saved-configs-list');
    if (savedConfigs.length === 0) {
      container.innerHTML = '<p class="empty-state">No hay configuraciones guardadas.</p>';
      return;
    }

    let html = '<div class="saved-configs-grid">';
    savedConfigs.forEach(config => {
      const count = Object.keys(config.selectedSubjects).filter(c => config.selectedSubjects[c]).length;
      html += `<div class="saved-config-item">`;
      html += `<div class="saved-config-info">`;
      html += `<div class="saved-config-name">${config.name}</div>`;
      html += `<div class="saved-config-meta">${count} asignatura(s) &middot; ${config.turnoPreferente}</div>`;
      html += `</div>`;
      html += `<div class="saved-config-actions">`;
      html += `<button class="btn btn-sm btn-secondary" data-action="load" data-id="${config.id}">Cargar</button>`;
      html += `<button class="btn btn-sm btn-secondary" data-action="export-config" data-id="${config.id}">Exportar</button>`;
      html += `<button class="btn btn-sm btn-danger" data-action="delete" data-id="${config.id}">Eliminar</button>`;
      html += `</div>`;
      html += `</div>`;
    });
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        if (btn.dataset.action === 'load') loadConfig(id);
        else if (btn.dataset.action === 'delete') deleteConfig(id);
        else if (btn.dataset.action === 'export-config') exportSingleConfig(id);
      });
    });
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
          localStorage.setItem('ugr-horario-saved-configs', JSON.stringify(savedConfigs));
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
    localStorage.removeItem('ugr-horario-saved-configs');
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

    document.getElementById('apellido').value = '';
    document.getElementById('turno-preferente').value = 'indiferente';
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', parseInt(tab.dataset.cuatrimestre) === 1);
    });
    state.cuatrimestreActivo = 1;

    renderSavedConfigs();
    renderPropuestasGuardadas();
    renderPropuestasBar();
    updateAll();
    renderSubjects();
    showToast('Configuración restaurada por defecto', 'info');
  }

  // ─── Export/Import Single Config ───────────────────────────
  function exportSingleConfig(id) {
    const config = savedConfigs.find(c => c.id === id);
    if (!config) return;

    const data = {
      version: 1,
      type: 'ugr-horario-config',
      exportedAt: new Date().toISOString(),
      config: JSON.parse(JSON.stringify(config)),
    };
    downloadJSON(data, `config-${config.name.replace(/\s+/g, '-').toLowerCase()}.json`);
    showToast(`"${config.name}" exportada`, 'success');
  }

  function exportAllSavedConfigs() {
    if (savedConfigs.length === 0) {
      showToast('No hay configuraciones guardadas', 'info');
      return;
    }

    const data = {
      version: 1,
      type: 'ugr-horario-configs-batch',
      exportedAt: new Date().toISOString(),
      configs: JSON.parse(JSON.stringify(savedConfigs)),
    };
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

        let configsToAdd = [];

        if (data.type === 'ugr-horario-config' && data.config) {
          configsToAdd = [data.config];
        } else if (data.type === 'ugr-horario-configs-batch' && Array.isArray(data.configs)) {
          configsToAdd = data.configs;
        } else {
          showToast('Formato de archivo no válido', 'error');
          return;
        }

        configsToAdd.forEach(c => {
          c.id = Date.now() + Math.floor(Math.random() * 1000);
          savedConfigs.push(c);
        });

        localStorage.setItem('ugr-horario-saved-configs', JSON.stringify(savedConfigs));
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
  function saveSubjectsToStorage() {
    localStorage.setItem('ugr-horario-subjects', JSON.stringify(SUBJECTS));
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

  // ─── Start ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

})();
