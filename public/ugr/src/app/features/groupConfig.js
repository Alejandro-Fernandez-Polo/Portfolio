/**
 * Vista del **panel de grupos** de `/ugr`: la elección de grupo de teoría y de
 * subgrupo de prácticas de cada materia seleccionada, con el profesor que la da.
 *
 * Extraída del monolito. La vista pinta y encola la elección; quién decide lo que
 * se guarda es el llamante (`onGroupChosen` = persistir y repintar todo), y el
 * subgrupo que «toca» por apellido lo resuelve el dominio (se le pasa ya
 * resuelto). El panel nace **colapsado** en el HTML: esta vista solo lo despliega
 * con su interruptor.
 *
 * `document` es inyectable (el del IIFE; simulado en tests).
 */

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {() => Object} deps.getState estado corriente (selección y perfil).
 * @param {() => Array} deps.getSubjects catálogo activo.
 * @param {Object} deps.dayLabels nombre de cada día.
 * @param {(codigo: string, letra: string) => string} deps.getProfName nombre del profesor ('' si no hay).
 * @param {(codigo: string, letra: string) => ?} deps.getDificultad dificultad del grupo (o `null`).
 * @param {(d: ?) => string} deps.dificultadBadgeHtml insignia de dificultad.
 * @param {(nombre: string) => boolean} deps.hasFicha ¿el nombre tiene ficha que abrir?
 * @param {() => boolean} deps.isIgnoringDocents lee el modo «ignorar profesores».
 * @param {(texto: string) => string} deps.escape escapador de HTML.
 * @param {(apellido: string) => (number|null)} deps.getSubgrupoForApellido subgrupo que toca por apellido.
 * @param {() => void} deps.onGroupChosen lo que hace el monolito al elegir grupo (persistir y repintar).
 * @returns {{render: () => void, setup: () => void}} la vista.
 */
export function createGroupConfigView({
  document,
  getState,
  getSubjects,
  dayLabels,
  getProfName,
  getDificultad,
  dificultadBadgeHtml,
  hasFicha,
  isIgnoringDocents,
  escape,
  getSubgrupoForApellido,
  onGroupChosen,
}) {
  const el = (id) => document.getElementById(id);

  /** El bloque de profesor de un grupo: nombre (o botón de ficha) e insignia. */
  function profesorHtml(nombre, codigo, modalidad, diff) {
    let html = '<div class="group-profesor">';
    if (hasFicha(nombre)) {
      html += `<button type="button" class="prof-name-btn" data-prof-name="${escape(nombre)}"`
        + ` data-prof-codigo="${codigo}" data-prof-modalidad="${modalidad}">${escape(nombre)}</button>`;
    } else {
      html += `<span class="prof-name">${escape(nombre)}</span>`;
    }
    if (diff) html += dificultadBadgeHtml(diff);
    html += "</div>";
    return html;
  }

  function render() {
    const state = getState();
    const panel = el("group-config");
    const content = el("group-config-content");
    const toggleBtn = el("toggle-group-config");
    const selectedCodes = Object.keys(state.selectedSubjects).filter((c) => state.selectedSubjects[c]);

    if (selectedCodes.length === 0) {
      panel.style.display = "none";
      toggleBtn.style.display = "none";
      return;
    }

    toggleBtn.style.display = "inline-flex";
    let html = '<div class="group-config-grid">';
    // ¿Hay algún nombre de la guía sin valoración? Entonces se explica arriba
    // de dónde salen los nombres, porque si no parecen «inventados».
    let haySinValoracion = false;
    const ignoring = isIgnoringDocents();

    selectedCodes.forEach((codigo) => {
      const subject = getSubjects().find((s) => s.codigo === codigo);
      if (!subject) return;
      const choice = state.groupChoices[codigo];

      html += `<div class="group-config-item">`;
      html += `<h3>${subject.codigo}</h3>`;
      html += `<div class="group-config-columns">`;

      // Columna de teoría: un grupo por letra, con su profesor y su dificultad.
      html += `<div class="group-config-col">`;
      html += `<div class="group-config-col-label">Teoría</div>`;
      subject.grupos.forEach((group) => {
        const isSelected = choice && choice.teoria === group.letra;
        const isPreferred = state.turnoPreferente !== "indiferente" && group.turno === state.turnoPreferente;

        html += `<div class="group-option ${isSelected ? "selected" : ""} ${isPreferred ? "preferred" : ""}" `;
        html += `data-codigo="${codigo}" data-letra="${group.letra}" data-type="teoria">`;
        html += `<input type="radio" name="teoria-${codigo}" ${isSelected ? "checked" : ""}>`;
        html += `<div class="group-info">`;
        const profName = getProfName(codigo, group.letra);

        html += `<div class="group-label">G${group.letra} <span style="font-weight:400;color:#888;font-size:0.65rem;">${group.turno}</span></div>`;
        html += `<div class="group-schedule">`;
        group.teoria.forEach((s) => {
          html += `<span class="session">${dayLabels[s.dia].substr(0, 3)} ${s.inicio}</span>`;
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
        if (profName && !ignoring) {
          if (!hasFicha(profName)) haySinValoracion = true;
          html += profesorHtml(profName, codigo, "Teoría", getDificultad(codigo, group.letra));
        }
        html += `</div></div>`;
      });
      html += `</div>`;

      // Columna de prácticas del grupo de teoría elegido.
      if (choice) {
        const selectedGroup = subject.grupos.find((g) => g.letra === choice.teoria);
        if (selectedGroup && selectedGroup.practicas && selectedGroup.practicas.subgrupos.length > 0) {
          html += `<div class="group-config-col">`;
          html += `<div class="group-config-col-label">Práctica</div>`;
          selectedGroup.practicas.subgrupos.forEach((sub) => {
            const isCurrentPractica = choice.practica === sub;
            const sessions = selectedGroup.practicas[sub] || [];
            const subgrupoNum = parseInt(sub.replace(/[A-Z]/g, ""));
            const apellidoNum = getSubgrupoForApellido(state.apellido);
            const isAutoSelected = apellidoNum && subgrupoNum === apellidoNum;

            html += `<div class="group-option ${isCurrentPractica ? "selected" : ""} ${isAutoSelected ? "preferred-practica" : ""}" `;
            html += `data-codigo="${codigo}" data-sub="${sub}" data-type="practica">`;
            html += `<input type="radio" name="practica-${codigo}" ${isCurrentPractica ? "checked" : ""}>`;
            html += `<div class="group-info">`;
            html += `<div class="group-label">${sub} ${isAutoSelected ? '<span style="color:#28a745;font-size:0.6rem;">auto</span>' : ""}</div>`;
            html += `<div class="group-schedule">`;
            sessions.forEach((s) => {
              html += `<span class="session practice">${dayLabels[s.dia].substr(0, 3)} ${s.inicio}</span>`;
            });
            if (sessions.length === 0) {
              html += `<span class="session practice" style="color:#999;">-</span>`;
            }
            html += `</div>`;
            // La columna de prácticas dice también quién la da: la dificultad es
            // por modalidad, así que la de prácticas no tiene por qué coincidir
            // con la de teoría del mismo grupo.
            const profPracticas = getProfName(codigo, sub);
            if (profPracticas && !ignoring) {
              if (!hasFicha(profPracticas)) haySinValoracion = true;
              html += profesorHtml(profPracticas, codigo, "Prácticas", getDificultad(codigo, sub));
            }
            html += `</div></div>`;
          });
          html += `</div>`;
        }
      }

      html += `</div></div>`;
    });

    html += "</div>";
    content.innerHTML = (haySinValoracion
      ? '<p class="group-config-hint">Los nombres de los profesores son los de las <strong>guías oficiales</strong> de la ETSIIT. Los que aparecen <strong>sin insignia</strong> todavía no tienen valoración: no están inventados.</p>'
      : "") + html;

    // La elección se encola aquí; persistir y repintar es del llamante. Elegir
    // teoría reinicia el subgrupo de prácticas al primero de ese grupo.
    content.querySelectorAll(".group-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        const codigo = opt.dataset.codigo;
        if (opt.dataset.type === "teoria") {
          state.groupChoices[codigo].teoria = opt.dataset.letra;
          const subject = getSubjects().find((s) => s.codigo === codigo);
          const group = subject.grupos.find((g) => g.letra === opt.dataset.letra);
          if (group && group.practicas && group.practicas.subgrupos.length > 0) {
            state.groupChoices[codigo].practica = group.practicas.subgrupos[0];
          } else {
            state.groupChoices[codigo].practica = null;
          }
        } else {
          state.groupChoices[codigo].practica = opt.dataset.sub;
        }
        onGroupChosen();
      });
    });
  }

  /** El interruptor: el panel nace colapsado y se abre y cierra desde aquí. */
  function setup() {
    const btn = el("toggle-group-config");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const panel = el("group-config");
      const isOpen = panel.style.display !== "none";
      panel.style.display = isOpen ? "none" : "block";
      btn.classList.toggle("open", !isOpen);
      btn.querySelector(".toggle-icon").innerHTML = isOpen ? "&#9660;" : "&#9650;";
    });
  }

  return { render, setup };
}
