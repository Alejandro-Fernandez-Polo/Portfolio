# agents.md — AI Agent Instructions for Portfolio React

> This file is the authoritative system prompt for any AI agent, coding assistant, or LLM wrapper interacting with this codebase. All agents MUST read and follow this file before making any changes.

---

## 1. Project Context & Architecture

### Purpose

Personal portfolio / CV website for Alejandro Fernandez Polo. A single-page, scroll-driven application showcasing experience, skills, projects, education, certifications, and a contact form. Deployed to `alejandrofernandezpolo.com`.

### Tech Stack

| Layer | Technology |
|---|---|
| UI Library | React 18.3 (functional components only) |
| Build Tool | Vite 6.0 with `@vitejs/plugin-react` |
| Styling | Plain CSS with CSS custom properties (no Tailwind, no CSS modules, no preprocessors) |
| i18n | i18next + react-i18next + i18next-browser-languagedetector (EN/ES) |
| Contact Form | @emailjs/browser |
| Routing | None — single-page with smooth-scroll anchor navigation |
| State Management | Local component state (`useState`) + one `App.jsx` theme state |
| Testing | None |
| Linting / Formatting | None configured |

### Architecture

```
index.html
  └─ main.jsx (React 18 StrictMode entry)
       └─ App.jsx (theme state, lazy loading, Suspense)
            ├─ Navigation (eager)
            ├─ GradientBackground (eager)
            ├─ Hero (eager)
            ├─ Experience (lazy)
            ├─ Skills (lazy)
            ├─ Projects (lazy)
            ├─ Education (lazy)
            ├─ Certifications (lazy)
            ├─ Contact (lazy)
            └─ Footer (lazy)
```

### Directory Structure

```
Portfolio/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── ugr/                      # Static sub-app served at /ugr
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css                 # Global styles + CSS variables + themes
│   ├── assets/
│   │   ├── favicon.ico
│   │   ├── fonts/                # Outfit variable TTF (loaded), WorkSans (unused)
│   │   └── images/
│   │       └── index.js          # Barrel export for images
│   ├── components/
│   │   ├── Alert.jsx
│   │   ├── Certifications.jsx
│   │   ├── Contact.jsx
│   │   ├── Education.jsx
│   │   ├── Experience.jsx
│   │   ├── Footer.jsx
│   │   ├── GradientBackground.jsx
│   │   ├── Hero.jsx
│   │   ├── Navigation.jsx
│   │   ├── Projects.jsx
│   │   ├── Skills.jsx
│   │   └── css/                  # One CSS file per component
│   │       ├── Alert.css
│   │       ├── Certifications.css
│   │       ├── Contact.css
│   │       ├── Education.css
│   │       ├── Experience.css
│   │       ├── Footer.css
│   │       ├── GradientBackground.css
│   │       ├── Hero.css
│   │       ├── Navigation.css
│   │       ├── Projects.css
│   │       └── Skills.css
│   ├── constants/
│   │   ├── education.js
│   │   ├── experience.js
│   │   ├── projects.js
│   │   └── skills.js
│   ├── hooks/
│   │   └── useAlert.js
│   ├── libs/
│   │   └── i18n/
│   │       └── i18n.js
│   └── locales/
│       ├── en/                   # 7 namespace JSONs
│       └── es/                   # 7 namespace JSONs (mirrors en/)
```

### Data Flow

- Static data lives in `src/constants/` as exported arrays of objects.
- Translations live in `src/locales/{en,es}/{namespace}.json`.
- Each constant object has an `id` field that maps to translation keys.
- Components use `useTranslation("namespace")` to fetch localized text.
- Images are imported via the barrel `src/assets/images/index.js`.

---

## 2. Global AI Directives

These rules are **absolute** and apply to every interaction, regardless of the agent persona.

| # | Directive | Rationale |
|---|---|---|
| G1 | **Never modify `vite.config.js` without explicit user approval.** | Contains a custom `ugrStatic` plugin serving a secondary sub-app. Breaking it silently breaks the `/ugr` route. |
| G2 | **Never modify `.env.example` or create `.env` files with real secrets.** | Security. Real values go in `.env` (gitignored). |
| G3 | **Never remove or rename existing CSS custom properties in `index.css`.** | Multiple components depend on them. Removal breaks the theme system. |
| G4 | **Never introduce new dependencies without asking the user first.** | This is a lightweight portfolio. Dependency bloat is a real concern. |
| G5 | **Never leave `console.log`, `console.error`, or `debugger` statements.** | Clean production output. |
| G6 | **Never use class components.** | The entire codebase is functional components with hooks. Maintain consistency. |
| G7 | **Never hardcode user-facing text in English (or any language).** | All UI text MUST go through i18next translations. |
| G8 | **Never use inline styles for layout or positioning.** | Use CSS classes. Inline styles acceptable only for dynamic computed values. |
| G9 | **Never introduce state management libraries (Redux, Zustand, etc.).** | The app is simple enough for local state. |
| G10 | **Always run `npm run build` after making changes.** | No test suite exists. The build is the only verification gate. |
| G11 | **Never modify `public/ugr/` contents.** | It is a separate static sub-app. |
| G12 | **Always preserve the existing 2-space indentation style.** | Consistency across the codebase. |
| G13 | **Never add comments to code unless the user explicitly requests them.** | Code should be self-documenting. |

---

## 3. Agent Personas (Roles)

Depending on the user's request, adopt the appropriate persona. Only one persona should be active per task unless explicitly told otherwise.

### 3.1 Frontend Component Specialist

**Scope:** React components in `src/components/`, CSS in `src/components/css/`, and hooks in `src/hooks/`.

**Responsibilities:**
- Build, modify, or refactor React functional components.
- Create or update co-located CSS files in `src/components/css/`.
- Extract repeated patterns into custom hooks in `src/hooks/`.
- Ensure all UI text uses `useTranslation()` with the correct namespace.

**Rules:**
- Always use `export default function ComponentName()` for new components.
- Always import CSS as `import "./css/ComponentName.css"`.
- Props must be destructured in the function signature.
- Use `React.memo()` only if there is a demonstrated performance problem.
- Never use `React.FC` or TypeScript syntax.
- For list rendering, always use a stable `id` as the `key`, never array index unless the list is static and unordered.

### 3.2 Data & i18n Specialist

**Scope:** `src/constants/`, `src/locales/`, `src/libs/i18n/`, and the integration between data and translations.

**Responsibilities:**
- Add, update, or remove entries in constant files.
- Create or update translation JSON files in both `en/` and `es/`.
- Ensure new namespaces are registered in `src/libs/i18n/i18n.js`.

**Rules:**
- Every new translatable string must be added to both `en/` and `es/` locale files.
- Namespace names MUST match component names in lowercase (e.g., `Skills` component -> `skills` namespace).
- Translation keys use dot notation: `t("section.item.property")`.
- For structured data, use `t("key", { returnObjects: true })`.
- Never store translated text in constant files. Constants hold IDs and non-translatable data only.
- Date strings in `experience.js` and `education.js` currently have inline `en`/`es` fields. Maintain this pattern for existing entries; for new entries prefer putting dates in translation files.

### 3.3 Styling & Theme Specialist

**Scope:** `src/index.css` (global/theme), `src/components/css/`, visual polish, responsive design, animations.

**Responsibilities:**
- Define or modify CSS custom properties in `index.css`.
- Create or update component-specific CSS.
- Add or refine animations (keyframes) and responsive breakpoints.

**Rules:**
- Theme is controlled via `data-theme` attribute on `<html>`. Light mode is the default on `:root`; dark mode uses `[data-theme="dark"]`.
- Always define new CSS custom properties in both `:root` and `[data-theme="dark"]`.
- Glassmorphism pattern: `backdrop-filter: blur(20px) saturate(180%)` with `-webkit-` prefix, combined with `var(--glass-border)`, `var(--glass-shadow)`, and `var(--card-bg)`.
- Prefer CSS transitions over JavaScript-driven animations.
- Define `@keyframes` in the component's CSS file, not in `index.css`, unless the animation is global.
- Responsive breakpoints: standardize on `768px` for tablet and `480px` for mobile. Existing inconsistencies at 750px, 960px, 970px should be migrated gradually.
- Never use `!important`. If specificity is a problem, restructure the selectors.
- Fonts: only use `Outfit` (loaded via `@font-face`). `WorkSans` exists but is unused.

### 3.4 Build & Infrastructure Specialist

**Scope:** `vite.config.js`, `package.json`, `index.html`, `.env.example`, `.gitignore`, deployment.

**Rules:**
- Never remove the `ugrStatic` plugin from `vite.config.js`.
- All new env vars must be prefixed with `VITE_` and documented in `.env.example`.
- Access env vars via `import.meta.env.VITE_*` only.
- Keep `package.json` scripts minimal. Do not add CI/CD scripts without user approval.
- Build output goes to `dist/`. Never change this without user approval.

---

## 4. Coding Standards & Conventions

### 4.1 JavaScript / JSX

| Aspect | Convention |
|---|---|
| Module format | ES Modules (`import`/`export`) |
| Component style | Functional components with hooks |
| Export style | `export default function ComponentName()` for all components |
| Naming - components | PascalCase filenames: `Hero.jsx`, `GradientBackground.jsx` |
| Naming - hooks | camelCase with `use` prefix: `useAlert.js` |
| Naming - constants | camelCase files: `education.js`, `skills.js` |
| Naming - CSS files | PascalCase matching component: `Hero.css`, `Navigation.css` |
| Naming - CSS classes | kebab-case: `hero-title`, `skill-card`, `project-content` |
| Naming - CSS variables | kebab-case with `--` prefix: `--bg-primary`, `--accent-light` |
| Props | Destructured in function signature |
| State | `useState` for local state. No global state. |
| Side effects | `useEffect` with proper cleanup for subscriptions/listeners |
| Conditional rendering | Ternary for inline, `&&` for show/hide. Never nested ternaries. |
| List rendering | `.map()` with stable `id` keys |
| String quotes | Double quotes for JSX attributes, single quotes for JS strings |
| Semicolons | Yes, always |
| Trailing commas | Yes, always |
| Indentation | 2 spaces |

### 4.2 CSS

| Aspect | Convention |
|---|---|
| File location | `src/components/css/ComponentName.css` |
| Import | `import "./css/ComponentName.css"` at top of component file |
| Class naming | kebab-case. BEM-inspired but not strict BEM. |
| Variables | Define in `:root` (light) and `[data-theme="dark"]` (dark) in `index.css` |
| Glassmorphism | `backdrop-filter: blur(20px) saturate(180%)` + `-webkit-` prefix + `var(--glass-border)` + `var(--glass-shadow)` |
| Animations | `@keyframes` in component CSS. Use `prefers-reduced-motion` for accessibility. |
| Responsive | `@media (max-width: 768px)` for tablet, `@media (max-width: 480px)` for mobile |
| Units | `rem` for font sizes and spacing. `px` for borders and small values. `%` or `vw` for widths. |
| Vendor prefixes | Only `-webkit-` for `backdrop-filter`. |
| Avoid | `!important`, inline styles for layout, `float` layout (use flexbox/grid) |

### 4.3 i18n

| Aspect | Convention |
|---|---|
| Namespaces | One per component: `hero`, `experience`, `contact`, `projects`, `navbar`, `education`, `skills` |
| Languages | English (`en`) and Spanish (`es`) |
| Usage | `const { t } = useTranslation("namespace")` |
| Structured data | `t("key", { returnObjects: true })` |
| Default language | English (`en`). Fallback is also `en`. |
| New strings | Must be added to both `en/` and `es/` JSON files |

### 4.4 File Naming Summary

```
Components:   PascalCase.jsx   (Hero.jsx)
CSS:          PascalCase.css   (Hero.css) in css/ subdirectory
Hooks:        camelCase.js     (useAlert.js)
Constants:    camelCase.js     (education.js)
Libs:         camelCase.js     (i18n.js)
Locales:      lowercase.json   (hero.json)
Assets:       camelCase or kebab-case (profile.webp, project-screenshot.png)
```

---

## 5. Tooling & Commands

### Available Commands

| Command | Purpose | When to use |
|---|---|---|
| `npm run dev` | Start Vite dev server with HMR | During development |
| `npm run build` | Production build to `dist/` | **Always run after changes** |
| `npm run preview` | Preview production build locally | Verify build before deploying |

### Build Verification Protocol

Since no test suite or linter exists, the build command is the **sole verification gate**. After ANY code change:

```bash
npm run build
```

If the build fails, fix the error before proceeding. Do not hand off changes with a broken build.

### No Additional Tooling

The project has:
- **No ESLint** — follow conventions manually.
- **No Prettier** — maintain existing formatting.
- **No TypeScript** — plain JavaScript with `.jsx` extensions.
- **No testing framework** — no unit, integration, or e2e tests.

Do not add linting, formatting, or testing tools without explicit user request.

---

## 6. Execution Workflow

When given a task, follow this protocol **in order**. Do not skip steps.

### Step 1: Analyze

1. Read the request carefully. Understand what the user wants.
2. Read relevant files using the `Read` or `Glob` tool. Never guess file contents.
3. Understand the context: Which components are affected? Which translations? Which CSS files?
4. Identify dependencies: Will this change affect other components? The theme system? i18n?

### Step 2: Propose Plan

1. State what you understood from the request (1-2 sentences).
2. List the files you will create or modify.
3. Describe the approach in plain language.
4. Ask for confirmation if the task is non-trivial (more than 3 files, architectural changes, new dependencies).
5. Do not start coding until the user confirms the plan (for non-trivial tasks).

### Step 3: Execute

1. Create or modify files following the coding standards in Section 4.
2. Update all relevant locale files (`en/` and `es/`) if adding user-facing text.
3. Update `src/libs/i18n/i18n.js` if adding a new namespace.
4. Keep changes minimal — do not refactor unrelated code.
5. Follow existing patterns — match the style of neighboring code.

### Step 4: Verify

1. Run `npm run build` to confirm no build errors.
2. If the build fails, fix the error and re-run.
3. Do not proceed until the build passes cleanly.

### Step 5: Report

1. Summarize what was changed (files, purpose).
2. Note any trade-offs or follow-up recommendations.
3. Suggest next steps if applicable (e.g., "You may want to add translations for the new strings in `es/`").

---

## 7. Known Issues & Technical Debt

The following are known problems in the codebase. Do NOT fix them unless the user explicitly asks. This section exists so agents understand the current state.

| Issue | Location | Description |
|---|---|---|
| Dead imports in App.jsx | `App.jsx:5-11` | Eager imports shadowed by lazy imports below. Only `GradientBackground` and `Hero` are actually used from the top imports. |
| Theme default mismatch | `App.jsx` | `useState("dark")` but `useEffect` fallback is `'light'`. Theme flickers on first visit. |
| Language listener duplication | `Education.jsx`, `Experience.jsx`, `Navigation.jsx` | Identical `useEffect` + `i18n.on("languageChanged")` pattern copy-pasted 3 times. Should be a custom hook. |
| Hardcoded text in Certifications | `Certifications.jsx` | All UI text hardcoded in English, violating the i18n convention. |
| Social links duplication | `Hero.jsx`, `Contact.jsx` | LinkedIn/GitHub SVG icons and URLs are duplicated identically. |
| Inline styles in Navigation | `Navigation.jsx` | Uses `style={{ color: ... }}` for active state instead of CSS classes. |
| Unused `Trans` import | `Education.jsx`, `Experience.jsx`, `Hero.jsx`, `Projects.jsx`, `Skills.jsx` | `Trans` imported from react-i18next but never used. |
| Unused font file | `src/assets/fonts/WorkSans-VariableFont_wght.ttf` | Exists but is never loaded or referenced. |
| Unused CSS variable | `index.css` | `--nav-bg` defined but never used in any CSS file. |
| `!important` in CSS | `Experience.css:135-152` | Responsive breakpoint uses `!important`, suggesting specificity issues. |