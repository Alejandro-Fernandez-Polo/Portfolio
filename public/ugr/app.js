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
  };

  let conflicts = [];

  // ─── Init ───────────────────────────────────────────────────
  function init() {
    loadState();
    renderSubjects();
    setupTabs();
    setupConfig();
    setupActions();
    updateAll();
    checkUrlShare();
  }

  // ─── LocalStorage ───────────────────────────────────────────
  function saveState() {
    localStorage.setItem('ugr-horario-state', JSON.stringify(state));
  }

  function loadState() {
    try {
      const saved = localStorage.getItem('ugr-horario-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      }
    } catch (e) { /* ignore */ }
    // Restore UI from state
    const apellidoInput = document.getElementById('apellido');
    const turnoSelect = document.getElementById('turno-preferente');
    if (apellidoInput) apellidoInput.value = state.apellido || '';
    if (turnoSelect) turnoSelect.value = state.turnoPreferente || 'indiferente';
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
        const cls = [
          'subject-card',
          isSelected ? 'selected' : '',
          hasConflict ? 'has-conflict' : ''
        ].filter(Boolean).join(' ');

        html += `<div class="${cls}" data-codigo="${s.codigo}">`;
        html += `<div class="check-indicator ${isSelected ? 'checked' : 'unchecked'}">${isSelected ? '✓' : ''}</div>`;
        html += `<div class="subject-code">${s.codigo}</div>`;
        html += `<div class="subject-name">${s.nombre}</div>`;
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
    const wasSelected = state.selectedSubjects[codigo];
    state.selectedSubjects[codigo] = !wasSelected;

    if (!wasSelected) {
      // Selecting: init group choice
      const subject = SUBJECTS.find(s => s.codigo === codigo);
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
    document.getElementById('btn-clear').addEventListener('click', clearAll);
    setupGroupConfigToggle();
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
  function clearAll() {
    if (!confirm('¿Estás seguro de que quieres borrar toda la configuración?')) return;
    state.selectedSubjects = {};
    state.groupChoices = {};
    state.apellido = '';
    state.turnoPreferente = 'indiferente';
    document.getElementById('apellido').value = '';
    document.getElementById('turno-preferente').value = 'indiferente';
    saveState();
    updateAll();
    renderSubjects();
    showToast('Configuración borrada', 'info');
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

  // ─── Start ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

})();
