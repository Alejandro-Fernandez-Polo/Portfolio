# AGENTS.md — Portfolio React

Personal SPA portfolio (Alejandro Fernández Polo) → `alejandrofernandezpolo.com`. React 18 + Vite 6, plain CSS, i18next EN/ES, EmailJS contact form. No router, no TypeScript, no tests, no linter, no CI workflows.

## Commands

```bash
npm run dev      # Vite dev server (HMR)
npm run build    # Production build → dist/ — ONLY verification gate; run after every change
npm run preview  # Serves dist/ (also runs the /ugr middleware)
```

No lint/typecheck/test commands exist. Do not add tooling (ESLint, Prettier, TS, test frameworks) or new npm dependencies without asking.

## Architecture gotchas

- Entry: `index.html` → `src/main.jsx` (StrictMode) → `src/App.jsx`.
- Eager: `Navigation`, `Hero`. Lazy via `Suspense`: Experience, Skills, Projects, Education, Contact, Footer.
- Theme lives in `App.jsx` (`data-theme` on `<html>`, localStorage key `theme`). `useState("dark")` but the localStorage fallback is `'light'` → first-visit flicker. Light vars on `:root`, dark on `[data-theme="dark"]` in `src/index.css`.
- `vite.config.js` has a custom `ugrStatic` middleware that serves `public/ugr/` (a separate static sub-app) at `/ugr` in dev **and** preview. **Do not edit `vite.config.js` or `public/ugr/` without explicit approval.**
- No `src/constants/index.js` — data is split: `education.js`, `experience.js`, `projects.js`, `skills.js`, `social.jsx` (`LINKEDIN_URL`, `GITHUB_URL`, `socialLinks` with JSX icons). Image barrel: `src/assets/images/index.js`. `src/assets/icons/` and `src/assets/3d/` are empty.
- `.github/copilot-instructions.md` exists but is **partially stale** (wrong constant/icon paths, wrong namespace list). Trust this file and the code over it.
- `.env` (gitignored) needs `VITE_APP_EMAILJS_SERVICE_ID`, `VITE_APP_EMAILJS_TEMPLATE_ID`, `VITE_APP_EMAILJS_PUBLIC_KEY` for the contact form; template is `.env.example`. Access only via `import.meta.env.VITE_*`.

## i18n (easy to get wrong)

- Exactly 7 namespaces: `hero`, `experience`, `contact`, `projects`, `navbar`, `education`, `skills` — **no `certifications` namespace**.
- New namespace requires **three edits** in `src/libs/i18n/i18n.js` (import both langs, add to `resources`, add to `ns` array) **plus** JSON files in **both** `src/locales/en/` and `src/locales/es/`.
- Pattern: constants hold non-translatable data + an `id`; components fetch text with `t("namespace.id", { returnObjects: true })` (see `Experience.jsx`, `Skills.jsx`, `Projects.jsx`, `Education.jsx`).
- Date ranges are **inline** in constants as `date: { en: "...", es: "..." }`, rendered via `exp.date[lang]`. Keep that pattern for existing entries; new dates may go in locale JSON.
- All user-facing UI text must go through `t()` in both languages.
- Use `useLang()` (`src/hooks/useLang.js`) for the base language code (`en`/`es`, normalized with `split("-")[0]`). It wraps `i18n.on("languageChanged", …)` + cleanup; `App.jsx` uses it for `<html lang>`. Mirror that pattern if you need live language updates.
- Detection order: navigator → htmlTag → cookie → localStorage; preference cached. Fallback `en`, `defaultNS: "hero"`.

## Styling

- One CSS file per component: `src/components/css/ComponentName.css`, imported as `import "./css/ComponentName.css"`.
- **Never remove/rename existing CSS custom properties** in `index.css` — themes break silently. New vars go in both `:root` and `[data-theme="dark"]`.
- Glassmorphism: `backdrop-filter: blur(20px) saturate(180%)` (+ `-webkit-` prefix), `var(--glass-border)`, `var(--glass-shadow)`, `var(--card-bg)`.
- Breakpoints in use: `768px` and `480px` (some older `750/960/970` remain).
- Only font is `Outfit` (preloaded in `index.html`).
- Avoid new `!important` and layout inline styles (existing violations are known debt — see below).

## Repo rules

- Functional components only; `export default function Name()`; destructured props; 2-space indent; no class components.
- No `console.log` / `debugger` left behind.
- No comments in code unless asked.
- No state libraries (Redux/Zustand) — local `useState` only.
- Navigation smooth-scroll uses a fixed **80px** offset for the fixed header; active section tracked via scroll listener in `Navigation.jsx`.
- Image imports go through `src/assets/images/index.js`, not deep relative paths.

## Known debt (do not "fix" unprompted)

| Issue | Where |
|---|---|
| Theme default mismatch → flicker | `App.jsx` (`useState("dark")` vs fallback `'light'`) |
| Inline `style={{ color }}` for active nav/lang | `Navigation.jsx` (~L114–157) |
| `!important` rules | `Experience.css`, `Contact.css`, `Navigation.css`, `Hero.css` |
| Env vars missing locally → contact form fails (guard alerts) | no `.env`; keys live in Vercel dashboard |

## Style note

Formatting is inconsistent (semicolons and quote style vary by file). Match the file you are editing rather than imposing a global style.
