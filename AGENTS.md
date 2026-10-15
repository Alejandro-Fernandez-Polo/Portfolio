# AGENTS.md — Portfolio React

Personal SPA portfolio (Alejandro Fernández Polo) → `alejandrofernandezpolo.com`. React 18 + Vite 6, plain CSS, i18next EN/ES, EmailJS contact form. No router, no TypeScript, no linter, no CI workflows. Tests **do** exist (vitest, in `test/`). A separate vanilla-JS sub-app lives in `public/ugr/` (served at `/ugr`) — different stack, see below.

## Commands

```bash
npm run dev        # Vite dev server (HMR)
npm run build      # Production build → dist/
npm run preview    # Serves dist/ (also runs the /ugr middleware)
npm test           # vitest run — 35 files, ~500 tests, in test/
npm run test:watch # vitest in watch mode
```

**Verification gate = `npm run build` + `npm test`**; run both after every change. There is **no** lint/typecheck command. Do not add tooling (ESLint, Prettier, TS, another test runner) or new npm dependencies without asking. `@playwright/cli` is in devDependencies for one-off browser checks — there is **no** e2e suite.

## Repo quirks

- Root `.gitignore` ignores **`*.md`** and **`planes/`** → markdown and planning never show in `git status`. The only tracked `.md` are this file, `README.md` and `.github/copilot-instructions.md` (force-added). Planning lives in `planes/` — index in `planes/README.md`, portfolio subplan in `planes/subplanes/03-portfolio-neobrutalista-react.md`, live `/ugr` status in `planes/todo.md`; the learning log is `.vibe-wise/` (ignored by the same `*.md` rule).
- Deploy is Vercel with **no `vercel.json`** — build command and env vars live in the dashboard. "Broken locally, fine in prod" usually means missing `.env`, not a code bug; `planes/PLAN_ERRORES.md` splits issues into `[CÓDIGO]` vs `[SOLO LOCAL]`.
- **Preview deployments sit behind Vercel Deployment Protection**: an anonymous request (crawler included) is redirected to `vercel.com/login`, so a preview URL **cannot** be used to validate metadata, `robots.txt` or the social unfurl. Production is public.
- `.env` (gitignored; template `.env.example`) uses `VITE_APP_EMAILJS_*` for the contact form and `VITE_SENTRY_DSN` / optional `VITE_SENTRY_ENVIRONMENT` for React error monitoring. Access build-time values only via `import.meta.env.VITE_*`; configure production values in Vercel. `/ugr` is static and reads its public DSN from `public/ugr/src/monitoring/config.js` instead.
- `README.md` and `.github/copilot-instructions.md` were resynced with the code on 2026-10-13. If they ever disagree with this file, **this file wins**.

## Architecture (React app)

- Entry: `index.html` → `src/main.jsx` (StrictMode) → `src/App.jsx`.
- `index.html` has an inline script setting `data-theme` from localStorage before React boots — keep it, it prevents theme FOUC.
- Eager: `Navigation`, `Hero`. Lazy via `Suspense`, in `lazy()` order: `Experience`, `Skills`, `Projects`, `Contact`, `Footer` (page order is Hero → Projects → Skills → Experience → Contact → Footer). Education is not a section — `Experience` renders it as a nested `<aside id="education">`.
- Theme: `data-theme` on `<html>`, localStorage key `theme`, default `'light'`. Light vars on `:root`, dark on `[data-theme="dark"]` in `src/index.css`.
- Toasts: **Sonner** (`sonner` dep). `<Toaster>` is mounted in `App.jsx` with `theme` bound to the app state; the neo-brutalist overrides live in `src/index.css` and need the `html` prefix to beat the variables Sonner defines on `[data-sonner-toaster][data-sonner-theme=…]` and injects at runtime.
- Data lives in `src/constants/{education,experience,projects,skills}.js` plus `social.jsx` (`LINKEDIN_URL`, `GITHUB_URL`, `socialLinks` with JSX icons). There is **no** `src/constants/index.js` and **no** `src/assets/icons/`. Image barrel: `src/assets/images/index.js` — always import images through it, never deep relative paths.
- Metadata lives in the static `<head>` of `index.html` (title, description, Open Graph, canonical, `Person` JSON-LD, favicon, font preloads). **Crawlers do not run JS**, so anything social/SEO must stay there, and the head is deliberately written in **English** (decided; Google will show English titles to Spanish searchers). Note that asset URLs in JSON-LD must point at `public/` (stable), never at `src/assets/` (hashed per build).
- `vite.config.js` has a custom `ugrStatic` middleware that serves `public/ugr/` at `/ugr` in dev **and** preview. **Do not edit `vite.config.js` without explicit approval.**

## `/ugr` sub-app (separate stack)

- Vanilla JS, no build step, no framework. `public/ugr/index.html` loads plain `<script>` tags in fixed order (`data.js` → `convalidaciones.js` → `propuestas.js` → `docentes.js` → `app.js`, then `src/bootstrap.js` as a module) that communicate through globals — order matters, and `app.js` is a ~4.2k-line IIFE monolith.
- **Docentes: los del repo son de EJEMPLO.** `public/ugr/docentes.js` y el `docents` del dataset son inventados (`meta.sampleDocents: true`) y los siembra `tools/ugr-pipeline/emit-seed.mjs` desde `tools/ugr-pipeline/sample-docents.json` — no los edites a mano. Los reales viven en `privado/` (ignorado por git) y viajan cifrados en `public/ugr/datasets/ugr/gi/package.enc.json`, que genera `tools/ugr-pipeline/build-package.mjs` (el autor lo ejecuta con su contraseña; nadie más la conoce). El historial de git y los dos `docentes_excel.*` locales conservan el texto plano antiguo por decisión expresa: no se reescribe la historia. `test/ugr-tools/no-leak.test.js` vigila que no vuelva a los ficheros versionados.
- Sentry's browser SDK is locally bundled at `public/ugr/vendor/sentry.bundle.js` and initialized before the legacy scripts; the DSN is public config, not a secret. Keep `sendDefaultPii` disabled and avoid adding replay or recording form contents.
- Vercel Analytics/Speed Insights mount in the React app and use first-party HTML clients in `/ugr`; the latter is separate because the static sub-app never mounts React. Both are restricted to the canonical production host and strip query/hash from reported URLs.
- The historical EC corpus is kept as a test fixture in `test/ugr-solver/oracle-ec.json`.
- Reestructuración: Fases 0–5 completadas (Fase 3 parcial, pendiente de aprobación). Estructura `public/ugr/src/` ya existe. Repo restrictions: no TS, no new deps/scripts sin aprobación, `npm run build` + `npm test` como verificación.
- Mini tutoriales/walkthroughs (planificado, S05): **Driver.js** (MIT, JS puro, sin build → funciona en `/ugr`). Descartados Intro.js/Shepherd.js (AGPL) y React Joyride (React-only). Los toasts del portfolio NO son tours.

## i18n (easy to get wrong)

- Exactly 8 namespaces: `hero`, `experience`, `contact`, `projects`, `navbar`, `education`, `skills`, `footer` — **no `certifications` namespace**.
- New namespace requires **three edits** in `src/libs/i18n/i18n.js` (import both langs, add to `resources`, add to `ns` array) **plus** JSON files in **both** `src/locales/en/` and `src/locales/es/`.
- Pattern: constants hold non-translatable data + an `id`; components fetch text with `t("namespace.id", { returnObjects: true })` (see `Experience.jsx`, `Skills.jsx`, `Projects.jsx`, `Education.jsx`).
- Date ranges are **inline** in constants as `date: { en: "...", es: "..." }`, rendered via `exp.date[lang]`. Locale JSONs contain no dates — keep them inline.
- All user-facing UI text must go through `t()` in both languages.
- `useLang()` (`src/hooks/useLang.js`) returns the base code (`en`/`es`, normalized with `split("-")[0]`) and re-renders on `languageChanged` (with cleanup). `App.jsx` uses it for `<html lang>`; mirror that pattern for live language updates.
- Detection order: navigator → htmlTag → cookie → localStorage; preference cached. Fallback `en`, `defaultNS: "hero"`.

## Styling

- One CSS file per component: `src/components/css/ComponentName.css`, imported as `import "./css/ComponentName.css"`.
- **Never remove/rename existing CSS custom properties** in `src/index.css` — themes break silently. New vars go in both `:root` and `[data-theme="dark"]`.
- Visual language is **neo-brutalist**: thick borders (`3px solid var(--ink)`), hard offset shadows (`box-shadow: 8px 8px 0 var(--shadow)`), display type, and coloured section bands via the `--band-*` tokens (in both themes). The old glassmorphism is gone — `--card-bg`, `--glass-border` and `--glass-shadow` no longer exist.
- Breakpoints: `900px` and `560px` are the main ones (every component sheet + `src/index.css`); there are also `1200px` in `src/index.css` and `995px` in `Hero.css`/`Navigation.css`. **There is no 480px breakpoint** (the old copilot-instructions claimed one).
- Fonts: `Anton` (display), `Archivo` (body) and `Space Mono` (mono) — declared with `@font-face` in `src/index.css`, files in `src/assets/fonts/`, preloaded in `index.html`. The legacy `Outfit` font and the `*-old` design tokens were removed with the redesign.
- Avoid new `!important` and layout inline styles. The `style={{ "--d": … }}` delays in `Hero.jsx` are animation timing, not layout — those stay.

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
| `!important` rules (3) | `src/index.css` — the component sheets are clean |
| Lighthouse `color-contrast` flags 6 nodes at 3.27:1 — **conscious deviation, do not retry** | `nav.nav-desk a sup`, `.proj-kicker`, `.sec-num` |
| Lighthouse `llms-txt` / `ard-schema` fail — **decision: not adding them** | LH 13.5 AI audits; the SPA fallback answers every path with `index.html` |
| ~168 KiB of image savings left on the table — `srcset` per carousel card | `Projects.jsx` / `Projects.css` (only the link/stack card layout was fixed) |
| No `.env` locally → contact form fails (with an error toast) | `planes/PLAN_ERRORES.md` L1; prod keys in Vercel dashboard |
| `planes/todo.md` (live `/ugr` status) is still dated 2026-10-05 | its test counts are per-phase snapshots; needs a state pass, not a rewrite |

## Style note

Formatting is inconsistent (semicolons and quote style vary by file). Match the file you are editing rather than imposing a global style.
