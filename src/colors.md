# Color Reference for Portfolio

This file lists all colors used in the project and where they are applied.

---

## Tailwind Utility Colors (JSX & CSS)

- `text-black-500`, `text-black`, `text-white`, `text-blue-600`, `text-slate-500`, `border-slate-200`, `focus:ring-blue-300`
  - Used in: `About.jsx`, `Contact.jsx`, `Projects.jsx`, `Home.jsx`, etc.

- `bg-gradient-to-r from-[#00c6ff] to-[#0072ff]`
  - Used in: Buttons, headings, and gradient backgrounds (e.g., `Contact.jsx`, `Projects.jsx`, `About.jsx`)

- `skyColor="#b1e1ff"`, `groundColor="#000000"`
  - Used in: 3D scene props in `Home.jsx`

---

## Custom CSS Variables (index.css)

- `--blue-rgb: 237 245 255;`
  - Used for: Blue hover backgrounds
- `--green-rgb: 125 161 35;`
  - Used for: Green hover backgrounds

---

## Vertical Timeline (libs/verticaltimeline)

- `--line-color` (default: `#FFF`)
  - Used for: Timeline line color in `VerticalTimeline.jsx` and `VerticalTimeline.css`
- `background: white;`, `color: #303e49;`, `box-shadow: 0 3px 0 #ddd;`, `border-right: 7px solid white;`
  - Used in: Timeline element styles (`VerticalTimelineElement.css`)

---

## Other Hardcoded Colors

- `#00c6ff`, `#0072ff` (gradient)
  - Used in: Gradients for text and buttons
- `#b1e1ff` (sky)
  - Used in: 3D scene
- `#000000` (ground)
  - Used in: 3D scene
- `#303e49` (timeline text)
  - Used in: Timeline element content
- `#FFF` (white)
  - Used in: Timeline line, backgrounds
- `#ddd` (shadow)
  - Used in: Timeline element shadow

---

## How to Use
- For Tailwind classes, use them directly in your JSX (e.g., `<div className="text-blue-600 bg-gradient-to-r from-[#00c6ff] to-[#0072ff]">`)
- For custom CSS variables, reference them in your CSS (e.g., `background-color: rgb(var(--blue-rgb) / 25%)`)
- For timeline colors, set the `lineColor` prop or override CSS variables in `VerticalTimeline.jsx`

---

## Tip
To add or change colors globally, update your Tailwind config or CSS variables in `index.css`.

<!-- TODO: Hacer reglas globales -->
<!-- TODO: Cambiar paleta de colores -->