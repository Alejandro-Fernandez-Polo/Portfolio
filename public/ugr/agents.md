# agents.md — UGR Horario

## 1. Project Context & Architecture

**UGR Horario** is a client-side schedule planner for students of the Computer Science degree at Universidad de Granada (UGR). Students select subjects, configure theory/practice groups, and view a weekly calendar with automatic conflict detection.

### Architecture

```
├── index.html      # Single-page HTML structure (semantic, no frameworks)
├── styles.css      # All styles with CSS custom properties, responsive design
├── data.js         # Subject data array (SUBJECTS) — static JSON-like structure
└── app.js          # All application logic — IIFE with 'use strict', vanilla DOM
```

- **No build step, no bundler, no npm.** Pure browser execution.
- **No frameworks or libraries.** Vanilla JS only.
- **State management:** Single `state` object in `app.js`, persisted to `localStorage` under key `ugr-horario-state`.
- **Data model:** `SUBJECTS` global array in `data.js` holds all subjects with groups, schedules, and credits.
- **UI language:** Spanish (`lang="es"`).

### Key Features

| Feature | Description |
|---|---|
| Subject selection | Toggle subjects by course and semester |
| Group configuration | Select theory group + practice subgroup per subject |
| Apellido rule | Auto-assign practice subgroup based on surname initial |
| Turno preferente | Filter groups by morning/afternoon preference |
| Calendar | Weekly grid (8:00–21:00, Mon–Fri) with positioned events |
| Conflict detection | Time-overlap detection between different subjects |
| Share link | Base64-encoded URL config via `?config=` query param |
| Export | PNG export via html2canvas or print fallback |

---

## 2. Global AI Directives

These rules apply to ALL agents in ALL scenarios. No exceptions.

### Mandatory

1. **NEVER introduce external dependencies.** No npm packages, no CDN imports, no frameworks. This is a zero-dependency vanilla project.
2. **NEVER modify `data.js` subject data structure.** Subject codes, group letters, and schedule formats are domain-specific to UGR. Only modify if explicitly asked to update curriculum data.
3. **ALWAYS maintain Spanish UI.** All user-facing text, labels, tooltips, error messages, and toast notifications must be in Spanish.
4. **ALWAYS use `'use strict';`** in any new JS code blocks.
5. **NEVER leave `console.log`, `console.debug`, or debug statements** in committed code.
6. **NEVER use `var`.** Use `const` for immutable bindings, `let` for mutable ones.
7. **ALWAYS preserve the IIFE pattern** in `app.js`. All new logic goes inside the existing IIFE or a new IIFE if creating additional files.
8. **ALWAYS maintain localStorage compatibility.** If changing `state` shape, add migration logic in `loadState()`.
9. **NEVER hardcode time strings.** Use the existing `timeToMinutes()` helper for time comparisons.
10. **ALWAYS preserve the `DAYS` and `DAY_LABELS` constants** for any day-related logic.

### Forbidden

- Modifying the `index.html` `<script>` load order without justification
- Using `innerHTML` for user-supplied data (XSS risk) — existing code uses trusted data only
- Removing the `detectConflicts()` call from `updateAll()`
- Changing CSS custom property names in `:root` without updating all references

---

## 3. Agent Personas (Roles)

### Frontend UI Agent

**Trigger:** Visual changes, layout, responsive design, CSS modifications.

**Instructions:**
- Work primarily in `styles.css` and HTML structure in `index.html`
- Preserve all CSS custom properties (`--primary`, `--accent`, etc.)
- Maintain responsive breakpoints: `768px` and `480px`
- Calendar grid must remain `grid-template-columns: 60px repeat(5, 1fr)`
- Subject card colors are defined per `data-subject` attribute — use the existing pattern
- Test all changes at both desktop (1600px) and mobile (320px) widths
- Preserve print styles and the `@media` queries

### Backend Logic Agent

**Trigger:** State management, data flow, scheduling logic, conflict detection.

**Instructions:**
- Work primarily in `app.js`
- All state mutations must go through `saveState()` after changes
- Call `updateAll()` after any state change that affects the UI
- The `getActiveSchedule()` function is the source of truth for rendered events
- Conflict detection runs on all selected subjects — never filter before detection
- Time comparison uses `timeToMinutes()` — never parse time strings directly
- The `applyApellidoRule()` maps surnames A-F→1, G-M→2, N-S→3, T-Z→4

### Data / Curriculum Agent

**Trigger:** Adding/modifying subjects, groups, or schedules.

**Instructions:**
- Work only in `data.js`
- Subject object structure is fixed:
  ```js
  { codigo, nombre, curso, cuatrimestre, creditos, grupos: [...] }
  ```
- Group structure:
  ```js
  { letra, turno: "mañana"|"tarde", teoria: [...], practicas: { subgrupos: [...], "X1": [...] } }
  ```
- Session structure: `{ dia: "lunes"|"martes"|"miercoles"|"jueves"|"viernes", inicio: "H:MM", fin: "H:MM" }`
- New subjects must have unique `codigo` values
- When adding subjects, also add a corresponding `.cal-event[data-subject="CODE"]` rule in `styles.css`

### Responsive / Accessibility Agent

**Trigger:** Mobile layout, keyboard navigation, screen reader support.

**Instructions:**
- All interactive elements must be reachable via keyboard
- Form inputs must have associated `<label>` elements (already present)
- Calendar events need descriptive `aria-label` attributes if adding ARIA
- Tab order must follow visual layout (top → bottom, left → right)
- Color is never the sole indicator of state — always pair with text/symbols

---

## 4. Coding Standards & Conventions

### JavaScript

| Rule | Convention |
|---|---|
| Variable declarations | `const` default, `let` when rebinding required |
| Naming | `camelCase` for variables/functions, `PascalCase` for constants (`SUBJECTS`, `DAYS`) |
| Functions | Named function declarations for top-level, arrow functions for callbacks |
| String formatting | Template literals for HTML strings, single quotes for property access |
| Error handling | Silent catch in `loadState()`, `try/catch` for URL parsing |
| DOM queries | `document.getElementById()` for single elements, `querySelectorAll()` for collections |
| Event delegation | Bind events after DOM render, prefer direct binding over delegation |
| HTML generation | Template literals with `innerHTML` assignment (trusted data only) |

### HTML

- Semantic elements: `<header>`, `<main>`, `<section>`, `<footer>`
- IDs follow kebab-case: `subjects-container`, `group-config`, `conflicts-panel`
- Data attributes: `data-codigo`, `data-cuatrimestre`, `data-curso`, `data-dia`, `data-hour`
- Script load order: `data.js` before `app.js`

### CSS

| Rule | Convention |
|---|---|
| Naming | BEM-inspired: `.cal-event`, `.cal-event.conflict`, `.subject-card.selected` |
| Custom properties | Define in `:root`, use `var(--name)` everywhere |
| Units | `rem` for spacing/sizing, `%` for calendar positioning, `px` only for borders/min-sizes |
| Layout | CSS Grid for calendar and subject cards, Flexbox for rows and nav |
| Transitions | Use `var(--transition)` (0.2s ease) for all interactive state changes |
| Responsive | Mobile-first is NOT used — desktop-first with `max-width` breakpoints |

---

## 5. Tooling & Commands

This project has **no build tools, no linters, no test framework.**

### Development

```bash
# Open directly in browser (no server required)
start index.html

# Or serve locally (any static server works)
npx serve .
python -m http.server 8000
```

### Verification

Since there are no automated tests, verify manually:

1. Open `index.html` in browser
2. Select 2+ subjects with overlapping schedules → verify conflict panel appears
3. Change turno preferente → verify group auto-selection updates
4. Enter apellido → verify practice subgroup auto-assignment
5. Click "Compartir Enlace" → paste in new tab → verify state restores
6. Click "Limpiar Todo" → verify all state resets
7. Resize to mobile width → verify responsive layout

### Code Quality

- No `console.log` in final code
- No `var` declarations
- No unused variables
- All DOM IDs referenced in JS exist in HTML

---

## 6. Execution Workflow

When given a task, follow this protocol:

### Step 1: Analyze

- Read the relevant files to understand current implementation
- Identify all functions and DOM elements affected
- Check for dependencies between `data.js`, `app.js`, `styles.css`, and `index.html`

### Step 2: Propose Plan

- Describe the exact changes needed per file
- List any state shape changes and required `loadState()` migration
- Identify UI elements that need HTML changes
- Flag any CSS class additions/removals needed

### Step 3: Execute

- Make changes in this order: `data.js` → `app.js` → `styles.css` → `index.html`
- Keep changes minimal and focused
- Preserve existing code style and patterns
- Follow the IIFE boundary in `app.js`

### Step 4: Verify

- Confirm all DOM IDs referenced in new JS exist in HTML
- Confirm all new CSS classes are used in HTML or JS
- Confirm `updateAll()` is called after state changes
- Confirm `saveState()` is called after state mutations
- Verify no `console.log` or debug code remains
- Test in browser: select subjects, check calendar, verify no regressions

### Step 5: Report

- Summarize what changed and why
- Note any breaking changes or migration steps
- List any manual testing the user should perform
