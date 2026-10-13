# Portfolio React — Alejandro Fernández Polo

Portfolio personal (SPA) de **Alejandro Fernández Polo**, desarrollador Full Stack → [alejandrofernandezpolo.com](https://alejandrofernandezpolo.com)

React 18 + Vite 6, CSS puro, rediseño **neo-brutalista**, i18n EN/ES, modo claro/oscuro y formulario de contacto con EmailJS. Incluye además un sub-app de horarios de la UGR servido en `/ugr`.

## 🚀 Características

- 🟨 Diseño neo-brutalista: bordes gruesos, sombras duras y bandas de color
- 🌓 Modo claro/oscuro que se recuerda y no parpadea al cargar
- 🌍 Español e inglés, cambio en caliente sin recargar
- 📱 Responsive (breakpoints de 900 px y 560 px)
- ✨ Ticker, carrusel de proyectos, animaciones de entrada y cursor propio (todo respeta "reducir movimiento")
- 🔔 Avisos del formulario con toasts (Sonner)
- 🖼️ Imágenes en WebP y metadatos Open Graph para que el enlace se comparta bien
- 🗓️ Sub-app `/ugr` para generar horarios (vanilla JS, sin build, IndexedDB)

## 📦 Instalación

```bash
npm install
npm run dev        # servidor de desarrollo con HMR
npm run build      # build de producción → dist/
npm run preview    # sirve dist/ en local
```

Si quieres que el formulario de contacto funcione en local, copia `.env.example` a `.env` y rellena las claves de EmailJS (`VITE_APP_EMAILJS_*`). Para habilitar Sentry en el portfolio, configura `VITE_SENTRY_DSN` (y opcionalmente `VITE_SENTRY_ENVIRONMENT`). En producción, esas variables viven en el dashboard de Vercel.

`/ugr` usa el mismo proyecto Sentry y carga el SDK desde un bundle local para no depender de un CDN; copia la DSN pública en `public/ugr/src/monitoring/config.js`. El módulo permanece desactivado si no hay DSN o si se ejecuta en localhost. Session Replay y la captura de datos personales no están habilitados.

Vercel Web Analytics y Speed Insights cubren tanto la SPA como `/ugr` (esta última con sus scripts HTML propios). Solo recogen datos en el dominio canónico de producción y eliminan parámetros y fragmentos de las URLs enviadas.

## 🛠️ Tecnologías

- **React 18** + **Vite 6**
- **CSS puro** con variables (sin preprocesador ni CSS modules)
- **i18next** + react-i18next
- **Sonner** (toasts) y **EmailJS** (formulario)
- **Vitest** (tests) y Playwright CLI (comprobaciones puntuales de navegador)

## 📁 Estructura

```
├── index.html              # <head>: metadatos, Open Graph, canonical y JSON-LD
├── public/                 # og-image.jpg, robots.txt, apple-touch-icon.png y el sub-app /ugr
├── src/
│   ├── App.jsx             # tema, idioma y carga diferida de las secciones
│   ├── main.jsx
│   ├── index.css           # tokens de tema, tipografías y reglas compartidas
│   ├── components/         # Navigation, Hero, Projects, Skills, Experience, Education, Contact, Footer
│   │   └── css/            # un CSS por componente
│   ├── constants/          # datos: education, experience, projects, skills y social
│   ├── hooks/              # useLang, useReveal, useCursor
│   ├── libs/i18n/          # configuración de i18next
│   ├── locales/{en,es}/    # 8 ficheros JSON (uno por namespace) en cada idioma
│   └── assets/             # fuentes, imágenes y favicon
└── test/                   # tests con vitest (incluye el oráculo del solver de /ugr)
```

## ⚙️ Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción → `dist/` |
| `npm run preview` | Sirve `dist/` en local (también el middleware de `/ugr`) |
| `npm test` | Ejecuta los tests con vitest |
| `npm run test:watch` | Tests en modo watch |

## ✏️ Personalización

1. **Contenido**: los datos en `src/constants/*.js` y los textos en `src/locales/{en,es}/*.json` — los textos van **siempre en los dos idiomas**.
2. **Colores y tipografías**: variables CSS en `src/index.css` (`:root` para claro, `[data-theme="dark"]` para oscuro; las bandas de sección usan los tokens `--band-*`).
3. **Estilos de un componente**: su `src/components/css/ComponentName.css`.

## 🌐 Deploy

Vercel, **sin `vercel.json`**: el comando de build y las variables de entorno (`VITE_APP_EMAILJS_*`) se configuran en el dashboard del proyecto.

```bash
npm run build   # genera dist/, que es lo que se publica
```

## 📄 Licencia

Proyecto personal: no hay fichero de licencia.

---

Hecho por **Alejandro Fernández Polo** · [LinkedIn](https://www.linkedin.com/in/alejandro-fernandez-polo) · [GitHub](https://github.com/Alejandro-Fernandez-Polo)
