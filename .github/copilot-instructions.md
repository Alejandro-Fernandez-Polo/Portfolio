# Copilot instructions — Portfolio

React 18 + Vite 6 SPA: personal portfolio (neo-brutalist CSS, i18next EN/ES, EmailJS contact form, light/dark theme). No router, no TypeScript, no CI.

**Source of truth: [`AGENTS.md`](../AGENTS.md).** This file deliberately does not repeat the volatile details (file inventories, breakpoints, namespace lists, debt table). When the two disagree, `AGENTS.md` wins — update this file.

## Commands

```bash
npm run dev        # dev server (HMR)
npm run build      # production build → dist/
npm run preview    # serves dist/ (runs the /ugr middleware too)
npm test           # vitest run, suite in test/
npm run test:watch
```

Verification before calling something done: `npm run build` **and** `npm test`. There is no lint/typecheck command. Do not add dependencies or tooling (ESLint, Prettier, TS, another test runner) without asking.

## Patterns to respect

### i18n

- 8 namespaces: `hero`, `experience`, `contact`, `projects`, `navbar`, `education`, `skills`, `footer`.
- Every user-facing string goes through `t()` and exists in **both** `src/locales/en/*.json` and `src/locales/es/*.json`.
- New namespace = three edits in `src/libs/i18n/i18n.js` (both imports, `resources`, `ns`) plus the two JSON files.
- Data lives in `src/constants/*.js` with an `id`; components fetch the text with `t("ns.id", { returnObjects: true })`.

### Theme

- `data-theme` on `<html>` plus localStorage key `theme`; variables in `src/index.css` (`:root` light, `[data-theme="dark"]` dark).
- Never remove or rename existing custom properties — the themes break silently. New ones go in both blocks.

### Data and assets

- `src/constants/{education,experience,projects,skills}.js` plus `social.jsx`. There is no `src/constants/index.js` and no `src/assets/icons/`.
- Import images through the barrel `src/assets/images/index.js`, never deep relative paths.

### Styling

- Neo-brutalism: thick borders, hard offset shadows, `--band-*` section bands. No glassmorphism is left in the codebase.
- One CSS file per component in `src/components/css/`, imported as `import "./css/ComponentName.css"`.
- Breakpoints are 900px and 560px (there is no 480px).

### Components

- Functional components, `export default function Name()`, destructured props, 2-space indent, no class components.
- Sections carry an `id` for navigation; smooth scroll uses an 80px offset.
- Comments explain the *why*, not the *what*; no `console.log` left behind.

## `/ugr` sub-app

Vanilla JS in `public/ugr/` (no build step, globals, `app.js` is a megafile) served at `/ugr` in dev and preview. Different stack — read `AGENTS.md` before touching it.

## Deployment

Vercel with no `vercel.json`: the build command and the `VITE_APP_EMAILJS_*` variables live in the dashboard. Preview deployments sit behind Vercel Deployment Protection, so they cannot be reached anonymously.
