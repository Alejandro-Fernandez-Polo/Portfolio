# Portfolio Project - AI Coding Agent Instructions

## Architecture Overview

This is a React 18 + Vite SPA portfolio with i18next internationalization (EN/ES), glassmorphic design, and light/dark theming. All components are in `src/components/`, static data in `src/constants/index.js`, and translations in `src/locales/{en,es}/`.

**Key architectural decisions:**
- i18next namespaces mirror components (e.g., `navbar.json`, `contact.json`, `skills.json`)
- Theme state lives in `App.jsx` and uses CSS variables (`--bg-primary`, `--accent`, etc.)
- Navigation uses smooth scroll with 80px offset for fixed nav
- EmailJS for contact form (credentials in `.env` as `VITE_APP_EMAILJS_*`)

## Development Workflow

```bash
npm run dev      # Development server (Vite)
npm run build    # Production build
npm run preview  # Preview production build
```

**No test suite exists.** Add tests only if explicitly requested.

## Critical Conventions

### Internationalization Pattern
**ALL user-facing text MUST use i18n**, even seemingly static content:

```jsx
import { useTranslation } from "react-i18next"

export default function MyComponent() {
  const { t } = useTranslation("namespace")  // namespace matches JSON filename
  return <h2>{t("title")}</h2>
}
```

- Namespace selection: use existing namespaces when possible (`navbar`, `contact`, `skills`, `about`, `projects`, `education`, `home`, `cta`)
- Add translations to BOTH `locales/en/*.json` AND `locales/es/*.json`
- Reference in `src/libs/i18n/i18n.js` if creating new namespace

### Theme System
Theme switching managed via:
1. `App.jsx` state + localStorage (`'light'` or `'dark'`)
2. `data-theme` attribute on `<html>` element
3. CSS variables in `index.css` (`:root` for light, `[data-theme="dark"]` for dark)

### Data Management
Static content (skills, projects, experience) lives in `src/constants/index.js`:
```javascript
export const skills = [
  { imageUrl: reactlogo, name: "React", type: "Frontend" },
  // ...
]
```

Icons imported from `src/assets/icons/index.js`, images from `src/assets/images/index.js`.

### Styling Approach
- Glassmorphic cards with `backdrop-filter: blur()` 
- CSS variables for all colors (never hardcode colors)
- Animations use keyframes defined in `index.css`
- No CSS modules or preprocessors—plain CSS only
- Responsive breakpoints: 768px (tablet), 480px (mobile)

### Navigation Pattern
Smooth scrolling implemented in `Navigation.jsx` with:
```javascript
const offset = 80  // Account for fixed nav height
const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset
window.scrollTo({ top: targetPosition, behavior: "smooth" })
```

Active section tracking via scroll listener comparing `scrollY` to section offsets.

### Component Structure
Each section component follows this pattern:
- Self-contained functional component (no props except theme-related)
- Uses appropriate i18n namespace
- Wrapped in `<section id="section-name">` for navigation
- Data pulled from constants or translation files

## Common Operations

**Adding a new skill:**
1. Import icon in `src/assets/icons/index.js`
2. Add to `skills` array in `src/constants/index.js`
3. No translation needed (name displayed as-is)

**Adding translatable content:**
1. Add key to `locales/en/[namespace].json`
2. Add Spanish equivalent to `locales/es/[namespace].json`
3. Use in component: `{t("your.key.path")}`

**EmailJS integration (Contact form):**
Requires environment variables in `.env`:
```
VITE_APP_EMAILJS_SERVICE_ID=your_service_id
VITE_APP_EMAILJS_TEMPLATE_ID=your_template_id
VITE_APP_EMAILJS_PUBLIC_KEY=your_public_key
```

## File Organization
```
src/
├── components/          # All React components (Navigation, Hero, Skills, etc.)
├── constants/index.js   # Static data (skills, projects, experience)
├── hooks/              # Custom hooks (useAlert)
├── libs/i18n/          # i18n configuration
├── locales/{en,es}/    # Translation JSON files by namespace
└── assets/             # Icons, images, flags, 3D models
```

## Known TODOs
- `src/constants/index.js` header: "TODO: poner mis datos" (update personal data)
- `src/hooks/useAlert.js`: "TODO: improve this alerts to look cool"
- Several placeholder social links set to `"#"` in Hero and Contact components
