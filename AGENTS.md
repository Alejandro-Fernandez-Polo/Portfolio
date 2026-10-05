# AGENTS.md — Portfolio React

Personal SPA portfolio (Alejandro Fernández Polo) → `alejandrofernandezpolo.com`. React 18 + Vite 6, plain CSS, i18next EN/ES, EmailJS contact form. No router, no TypeScript, no tests, no linter, no CI workflows. A separate vanilla-JS sub-app lives in `public/ugr/` (served at `/ugr`) — different stack, see below.

## Commands

```bash
npm run dev      # Vite dev server (HMR)
npm run build    # Production build → dist/ — ONLY verification gate; run after every change
npm run preview  # Serves dist/ (also runs the /ugr middleware)
```

No lint/typecheck/test commands exist. Do not add tooling (ESLint, Prettier, TS, test frameworks) or new npm dependencies without asking.

## Repo quirks

- Root `.gitignore` ignores **`*.md`** → new markdown files never show in `git status`. Untracked planning docs that matter: `PLAN_REESTRUCTURACION_UGR.md`, `FASE_0_CIMIENTOS.md`, `PLAN_ERRORES.md`. This file is tracked only because it was force-added.
- Deploy is Vercel with **no `vercel.json`** — build command and env vars live in the dashboard. "Broken locally, fine in prod" usually means missing `.env`, not a code bug; `PLAN_ERRORES.md` splits issues into `[CÓDIGO]` vs `[SOLO LOCAL]`.
- `.env` (gitignored; template `.env.example`) needs `VITE_APP_EMAILJS_SERVICE_ID`, `VITE_APP_EMAILJS_TEMPLATE_ID`, `VITE_APP_EMAILJS_PUBLIC_KEY` for the contact form. Access only via `import.meta.env.VITE_*`; real keys live in the Vercel dashboard.
- `.github/copilot-instructions.md` and `README.md` are partially stale (they reference `src/constants/index.js`, `src/assets/icons/index.js`, `Certifications.jsx`, `GradientBackground.jsx`, namespaces `about`/`home`/`cta` — none exist). Trust this file and the code over them.

## Architecture (React app)

- Entry: `index.html` → `src/main.jsx` (StrictMode) → `src/App.jsx`.
- `index.html` has an inline script setting `data-theme` from localStorage before React boots — keep it, it prevents theme FOUC.
- Eager: `Navigation`, `Hero`. Lazy via `Suspense`: Experience, Skills, Projects, Education, Contact, Footer.
- Theme: `data-theme` on `<html>`, localStorage key `theme`, default `'light'`. Light vars on `:root`, dark on `[data-theme="dark"]` in `src/index.css`.
- Data lives in `src/constants/{education,experience,projects,skills}.js` plus `social.jsx` (`LINKEDIN_URL`, `GITHUB_URL`, `socialLinks` with JSX icons). There is **no** `src/constants/index.js` and **no** `src/assets/icons/`. Image barrel: `src/assets/images/index.js` — always import images through it, never deep relative paths.
- `vite.config.js` has a custom `ugrStatic` middleware that serves `public/ugr/` at `/ugr` in dev **and** preview. **Do not edit `vite.config.js` without explicit approval.**

## `/ugr` sub-app (separate stack)

- Vanilla JS, no build step, no framework. `public/ugr/index.html` loads plain `<script>` tags in fixed order (`data.js` → `convalidaciones.js` → `propuestas.js` → `predefined.js` → `app.js`) that communicate through globals — order matters, and `app.js` is a ~3.3k-line IIFE monolith.
- `predefined.js` + `predefined/*.js` are generated offline by the scripts now parked in `tools/ugr/predefined-legacy/` (gitignored). Treat them as build output; don't hand-edit.
- Reestructuración: Fases 0–5 completadas (Fase 3 parcial, pendiente de aprobación). Estructura `public/ugr/src/` ya existe. Repo restrictions: no TS, no new deps/scripts sin aprobación, `npm run build` como única verificación gate.

## i18n (easy to get wrong)

- Exactly 7 namespaces: `hero`, `experience`, `contact`, `projects`, `navbar`, `education`, `skills` — **no `certifications` namespace**.
- New namespace requires **three edits** in `src/libs/i18n/i18n.js` (import both langs, add to `resources`, add to `ns` array) **plus** JSON files in **both** `src/locales/en/` and `src/locales/es/`.
- Pattern: constants hold non-translatable data + an `id`; components fetch text with `t("namespace.id", { returnObjects: true })` (see `Experience.jsx`, `Skills.jsx`, `Projects.jsx`, `Education.jsx`).
- Date ranges are **inline** in constants as `date: { en: "...", es: "..." }`, rendered via `exp.date[lang]`. Locale JSONs contain no dates — keep them inline.
- All user-facing UI text must go through `t()` in both languages.
- `useLang()` (`src/hooks/useLang.js`) returns the base code (`en`/`es`, normalized with `split("-")[0]`) and re-renders on `languageChanged` (with cleanup). `App.jsx` uses it for `<html lang>`; mirror that pattern for live language updates.
- Detection order: navigator → htmlTag → cookie → localStorage; preference cached. Fallback `en`, `defaultNS: "hero"`.

## Styling

- One CSS file per component: `src/components/css/ComponentName.css`, imported as `import "./css/ComponentName.css"`.
- **Never remove/rename existing CSS custom properties** in `src/index.css` — themes break silently. New vars go in both `:root` and `[data-theme="dark"]`.
- Glassmorphism: `backdrop-filter: blur(20px) saturate(180%)` (+ `-webkit-` prefix), `var(--glass-border)`, `var(--glass-shadow)`, `var(--card-bg)`.
- Breakpoints: `768px` is the only active one (`Experience.css`, `src/index.css`); legacy `750px` (Navigation), `960px` (Contact), `970px` (Hero) remain. **There is no 480px breakpoint** despite what copilot-instructions says.
- Only font is `Outfit` (preloaded in `index.html`).
- Avoid new `!important` and layout inline styles (existing violations are known debt — see below).

## Repo rules

- Functional components only; `export default function Name()`; destructured props; 2-space indent; no class components.
- No `console.log` / `debugger` left behind.
- All new code must be commented following the `documentation-and-adrs` skill (see "Code comments" below).
- No state libraries (Redux/Zustand) — local `useState` only.
- Navigation smooth-scroll uses a fixed **80px** offset for the fixed header; active section tracked via scroll listener in `Navigation.jsx`.

## Code comments

Follow the `documentation-and-adrs` skill for all inline comments:

- Comment the *why* (intent, constraints, trade-offs), never the *what*.
- Don't comment self-explanatory code.
- No TODO comments for things that should be done now — just do them.
- No commented-out code — delete it, git has history.
- Document known gotchas inline where they matter (see the skill's gotcha example).

## Known debt (do not "fix" unprompted)

| Issue | Where |
|---|---|
| Inline `style={{ color }}` for active nav/lang | `Navigation.jsx` (~L106–149) |
| `!important` rules | `Experience.css`, `Contact.css`, `Navigation.css`, `Hero.css` |
| Invalid `<li>` wrapper + no-op Tailwind classes (open, `PLAN_ERRORES.md` #1) | `Experience.jsx` (~L24–28) |
| `og:image` commented out → no social preview (open, `PLAN_ERRORES.md` #2) | `index.html` (~L11) |
| No `.env` locally → contact form fails | `PLAN_ERRORES.md` L1; prod keys in Vercel dashboard |

## Style note

Formatting is inconsistent (semicolons and quote style vary by file). Match the file you are editing rather than imposing a global style.