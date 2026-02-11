# Análisis Detallado de Rendimiento - Portfolio Web
## Resumen General de Lighthouse Audit

**Fecha del análisis:** Basado en lighthouse.json  
**URL testeada:** http://localhost:5173/  
**Lighthouse versión:** 13.0.1

### Puntuaciones Globales

| Categoría | Puntuación | Estado |
|-----------|------------|--------|
| **Performance** | 79/100 | 🟠 Necesita mejora |
| **Accessibility** | 77/100 | 🟠 Necesita mejora |
| **Best Practices** | 96/100 | 🟢 Bueno |
| **SEO** | 83/100 | 🟠 Necesita mejora |

---

## 1. PERFORMANCE (79/100) 🟠

### Métricas Core Web Vitals

#### 1.1 First Contentful Paint (FCP) - 1.5s ⚠️
**Puntuación:** 0.53/1.00  
**Estado:** Necesita mejora (objetivo: <1.8s)

**Qué es:** Tiempo desde que el usuario navega hasta que se renderiza el primer contenido visible.

**Problema:** Tu FCP está en 1.5 segundos, lo cual es aceptable pero mejorable. Google recomienda mantenerlo bajo 1.8s.

**Cómo mejorarlo:**
1. **Optimizar fuentes web** (ver problema 1.4.7)
2. **Eliminar JavaScript bloqueante** (ver problema 1.4.4)
3. **Precarga recursos críticos**

```html
<!-- En index.html, dentro de <head> -->
<link rel="preload" href="/src/assets/fonts/Outfit-VariableFont_wght.ttf" as="font" type="font/ttf" crossorigin>
```

#### 1.2 Largest Contentful Paint (LCP) - 2.6s ⚠️
**Puntuación:** 0.44/1.00  
**Estado:** Necesita mejora urgente (objetivo: <2.5s)

**Qué es:** Tiempo hasta que el contenido principal más grande se renderiza completamente.

**Problema:** Tu LCP está en 2.6 segundos, excediendo el límite recomendado de 2.5s. Este es tu problema de rendimiento MÁS CRÍTICO.

**Elementos que causan el LCP lento:**
- Fuentes web sin optimizar (110 KB bloqueando render)
- JavaScript sin minificar (998 KB)
- JavaScript no utilizado (619 KB)
- Cadena de dependencias larga (components → constants → assets)

**Cómo mejorarlo:**

**A. Optimizar imágenes del Hero:**
```jsx
// En Hero.jsx, optimizar la imagen de perfil
<img 
  src={profileImage} 
  alt="Profile"
  loading="eager"  // Añadir eager para contenido above the fold
  fetchpriority="high"  // Priorizar esta imagen
/>
```

**B. Lazy load de componentes secundarios:**
```jsx
// En App.jsx
import { lazy, Suspense } from 'react';

// Componentes above the fold se cargan normalmente
import Navigation from "./components/Navigation";
import Hero from "./components/Hero";

// Componentes below the fold se cargan con lazy loading
const Experience = lazy(() => import("./components/Experience"));
const Skills = lazy(() => import("./components/Skills"));
const Projects = lazy(() => import("./components/Projects"));
const Education = lazy(() => import("./components/Education"));
const Certifications = lazy(() => import("./components/Certifications"));
const Contact = lazy(() => import("./components/Contact"));
const Footer = lazy(() => import("./components/Footer"));

function App() {
  // ... código existente ...
  
  return (
    <>
      <Navigation ... />
      <Hero ... />
      <GradientBackground />
      
      <Suspense fallback={<div>Loading...</div>}>
        <Experience />
        <Skills />
        <Projects />
        <Education />
        <Certifications />
        <Contact />
        <Footer />
      </Suspense>
    </>
  );
}
```

**C. Code splitting en constants:**
```javascript
// Separar src/constants/index.js en archivos individuales:
// src/constants/skills.js
// src/constants/projects.js
// src/constants/experience.js
// src/constants/education.js

// Ejemplo: src/constants/skills.js
import reactlogo from "../assets/icons/react.svg";
// ... otros imports necesarios solo para skills

export const skills = [
  { imageUrl: reactlogo, name: "React", type: "Frontend" },
  // ...
];

// Luego en cada componente importar solo lo necesario:
// En Skills.jsx
import { skills } from "../constants/skills";
```

#### 1.3 Speed Index - 1.7s ⚠️
**Puntuación:** 0.73/1.00

**Qué es:** Qué tan rápido se muestra visualmente el contenido de la página.

**Problema:** Aceptable pero hay margen de mejora.

**Cómo mejorarlo:** Las mismas optimizaciones que FCP y LCP lo mejorarán automáticamente.

---

### 1.4 Oportunidades de Optimización

#### 1.4.1 JavaScript sin Minificar - CRÍTICO 🔴
**Impacto:** 998 KB de ahorro potencial  
**Tiempo ahorrado:** ~960ms en LCP

**Problema:** Lighthouse detectó 2 archivos JavaScript grandes sin minificar:
- `chunk-OY5C42Z6.js` - 932 KB (343 KB de desperdicio - 37%)
- `@vite/client` - 183 KB (159 KB de desperdicio - 87%)

**Por qué ocurre:** Estás ejecutando el servidor de desarrollo de Vite (`npm run dev`), que NO minifica el código para facilitar el debugging.

**Cómo solucionarlo:**

**IMPORTANTE:** Esta auditoría solo aplica en DESARROLLO. En producción, Vite automáticamente minifica todo.

**Para testear rendimiento real, SIEMPRE usa la build de producción:**

```bash
# 1. Crear build de producción
npm run build

# 2. Previsualizar la build de producción
npm run preview

# 3. Ejecutar Lighthouse en el preview (puerto 4173 por defecto)
```

**Verificación en vite.config.js:**
```javascript
// vite.config.js - Asegurar que minify está activo para producción
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild', // o 'terser' para mejor compresión
    sourcemap: false,  // Desactivar sourcemaps en producción
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'i18n-vendor': ['react-i18next', 'i18next']
        }
      }
    }
  }
})
```

#### 1.4.2 JavaScript No Utilizado - ALTO 🔴
**Impacto:** 619 KB de ahorro potencial  
**Tiempo ahorrado:** ~480ms en LCP

**Problema:** Estás cargando código JavaScript que no se usa en la página inicial.

**Archivos afectados:**
- `chunk-OY5C42Z6.js` - React, i18next y otras dependencias completas
- Componentes que no son visibles en el viewport inicial

**Cómo solucionarlo:** Ya explicado en el punto 1.2.B (Lazy loading de componentes)

**Adicionalmente, optimizar i18next:**
```javascript
// En src/libs/i18n/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// NO importar todos los recursos de golpe
// ANTES (probablemente tu código actual):
// import enTranslations from "../../locales/en/...";
// import esTranslations from "../../locales/es/...";

// DESPUÉS (lazy loading):
import Backend from 'i18next-http-backend';

i18n
  .use(Backend) // Cargar traducciones bajo demanda
  .use(initReactI18next)
  .init({
    lng: "es",
    fallbackLng: "en",
    backend: {
      loadPath: '/src/locales/{{lng}}/{{ns}}.json',
    },
    ns: ['navbar', 'hero', 'contact'], // Solo namespaces iniciales
    defaultNS: 'navbar',
    react: {
      useSuspense: false // Evitar suspense si no usas Suspense
    }
  });

export default i18n;
```

**Instalar dependencia:**
```bash
npm install i18next-http-backend
```

#### 1.4.3 CSS No Utilizado - MEDIO 🟡
**Impacto:** 108 KB de ahorro potencial  
**Tiempo ahorrado:** ~80ms en LCP

**Problema:** La fuente `Outfit-VariableFont_wght.ttf` completa (110 KB) se está cargando, pero no se están usando todos los pesos de fuente.

**Cómo solucionarlo:**

**Opción A: Subsetting de fuentes (RECOMENDADO)**
```bash
# Instalar herramienta para subset de fuentes
npm install --save-dev glyphhanger
```

```javascript
// Crear script en package.json
{
  "scripts": {
    "optimize-fonts": "glyphhanger --subset=src/assets/fonts/Outfit-VariableFont_wght.ttf --formats=woff2"
  }
}
```

**Opción B: Google Fonts con subsetting automático**
```css
/* En index.css, REEMPLAZAR @font-face actual por: */

/* Eliminar esto:
@font-face {
  font-family: "Outfit";
  src: url("./assets/fonts/Outfit-VariableFont_wght.ttf") format("truetype");
}
*/

/* Añadir en index.html dentro de <head>: */
```

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

```css
/* Actualizar CSS variable */
:root {
  --font-family: 'Outfit', sans-serif; /* Mismo nombre */
}
```

**Opción C: Solo cargar pesos específicos (si mantienes hosting local)**
```css
/* Descargar solo los pesos que usas de https://fonts.google.com/specimen/Outfit */
@font-face {
  font-family: "Outfit";
  src: url("./assets/fonts/Outfit-Regular.woff2") format("woff2");
  font-weight: 400;
  font-display: swap; /* Importante para performance */
}

@font-face {
  font-family: "Outfit";
  src: url("./assets/fonts/Outfit-Bold.woff2") format("woff2");
  font-weight: 700;
  font-display: swap;
}
```

#### 1.4.4 Recursos Bloqueando el Renderizado - ALTO 🔴
**Impacto:** 80ms de ahorro potencial en FCP y LCP

**Problema:** La fuente Outfit está bloqueando el primer renderizado de la página.

**Archivo bloqueante:**
- `/src/assets/fonts/Outfit-VariableFont_wght.ttf` (110 KB, 202ms de delay)

**Cómo solucionarlo:**

**A. Font-display swap:**
```css
/* En index.css */
@font-face {
  font-family: "Outfit";
  src: url("./assets/fonts/Outfit-VariableFont_wght.ttf") format("truetype");
  font-display: swap; /* ← AÑADIR ESTA LÍNEA */
}
```

**Qué hace `font-display: swap`:**
- Muestra texto inmediatamente con fuente del sistema (swap)
- Carga Outfit en segundo plano
- Cambia a Outfit cuando esté lista
- Elimina el FOIT (Flash Of Invisible Text)

**B. Preload de fuente crítica:**
```html
<!-- En index.html, dentro de <head> ANTES del CSS -->
<link 
  rel="preload" 
  href="/src/assets/fonts/Outfit-VariableFont_wght.ttf" 
  as="font" 
  type="font/ttf" 
  crossorigin
>
```

**C. Si usas Google Fonts (mejor opción):**
```html
<!-- Ya tiene font-display=swap automático -->
<link 
  rel="preload" 
  href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" 
  as="style"
>
<link 
  href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" 
  rel="stylesheet"
>
```

#### 1.4.5 Reflows Forzados - MEDIO 🟡
**Impacto:** ~60ms de tiempo de reflow

**Problema:** React (específicamente en `chunk-OY5C42Z6.js` línea 377) está causando reflows forzados cuando lee propiedades geométricas como `offsetWidth` después de cambios al DOM.

**Qué es un forced reflow:** Ocurre cuando JavaScript:
1. Modifica el DOM (ejemplo: cambia un className)
2. Inmediatamente lee propiedades geométricas (offsetWidth, scrollTop, etc.)
3. Fuerza al navegador a recalcular layouts antes de tiempo

**Cómo solucionarlo:**

**A. Evitar lecturas de geometría en ciclos:**
```javascript
// ❌ MAL - Forced reflow en cada iteración
elements.forEach(el => {
  el.style.width = el.offsetWidth + 10 + 'px'; // Lee offsetWidth después de modificar
});

// ✅ BIEN - Batch reading y writing
const widths = elements.map(el => el.offsetWidth); // Leer primero
elements.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px'; // Escribir después
});
```

**B. Usar requestAnimationFrame para cambios visuales:**
```javascript
// Si tienes código que modifica estilos dinámicamente
function updateStyles() {
  requestAnimationFrame(() => {
    // Cambios de estilo aquí
    element.style.transform = `translateX(${x}px)`;
  });
}
```

**C. Revisar Navigation.jsx (scroll handler):**
```jsx
// En Navigation.jsx, optimiza el scroll handler
useEffect(() => {
  const handleScroll = () => {
    // Usar requestAnimationFrame para throttling
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollY = window.scrollY; // Una sola lectura
        
        // Batch todas las lecturas de geometría
        const sections = document.querySelectorAll('section');
        const offsets = Array.from(sections).map(section => ({
          id: section.id,
          offsetTop: section.offsetTop,
          offsetHeight: section.offsetHeight
        }));
        
        // Ahora hacer los cálculos
        offsets.forEach(({ id, offsetTop, offsetHeight }) => {
          if (scrollY >= offsetTop - 100 && scrollY < offsetTop + offsetHeight - 100) {
            setActiveSection(id);
          }
        });
        
        ticking = false;
      });
      ticking = true;
    }
  };
  
  let ticking = false;
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

#### 1.4.6 Cadena de Dependencias de Red - MEDIO 🟡

**Problema:** Hay una cadena de carga secuencial con 5 niveles de profundidad:
```
index.html (81ms)
  → main.jsx (95ms)
    → App.jsx (130ms)
      → Experience.jsx (158ms)
        → constants/index.js (205ms) ← 166 KB, archivo pesado
          → assets/icons/... (imágenes)
```

**Por qué es malo:** Cada nivel espera al anterior. Total: 205ms solo en JavaScript antes de empezar a cargar assets.

**Cómo solucionarlo:**

**A. Code splitting ya explicado en 1.2.C**

**B. Preload de módulos críticos:**
```html
<!-- En index.html, dentro de <head> -->
<link rel="modulepreload" href="/src/main.jsx">
<link rel="modulepreload" href="/src/App.jsx">
```

**C. Optimizar constants/index.js (archivo de 166 KB):**
```javascript
// El problema: constants/index.js importa TODAS las imágenes/iconos de golpe
// Ver punto 1.2.C para la solución de splitting

// Además, considerar lazy loading de imágenes de projects:
// src/constants/projects.js
export const projects = [
  {
    name: "Project 1",
    // En vez de importar la imagen directamente:
    // image: projectImage1,
    // Usar la ruta como string:
    imagePath: "/src/assets/images/project1.png",
    // ...
  }
];

// Luego en Projects.jsx usar lazy loading:
<img 
  src={project.imagePath} 
  alt={project.name}
  loading="lazy" // Lazy load automático del navegador
/>
```

#### 1.4.7 Back/Forward Cache Deshabilitado - BAJO 🟡
**Problema:** WebSocket está previniendo el uso del back/forward cache (bfcache).

**Qué es bfcache:** Permite navegación instantánea hacia atrás/adelante manteniendo la página en memoria.

**Causa:** El servidor de desarrollo de Vite usa WebSocket para Hot Module Replacement (HMR).

**Solución:** 
- **En desarrollo:** No hay problema, el HMR es necesario.
- **En producción:** Esto NO ocurrirá porque el build de producción no tiene HMR.

**Verificación:** Después de `npm run build && npm run preview`, este error desaparecerá.

---

## 2. ACCESSIBILITY (77/100) 🟠

### 2.1 Contraste de Color Insuficiente - CRÍTICO 🔴
**Puntuación:** 0/1

**Problema:** El texto de navegación activo (color: var(--accent)) no tiene suficiente contraste con el fondo.

**Elemento que falla:**
```html
<a href="#home" style="color: var(--accent);">Home</a>
```

**Ubicación:** Navigation.jsx, links activos

**Por qué es importante:** Usuarios con baja visión o daltonismo no pueden leer el texto.

**Ratio de contraste requerido:**
- Texto normal (>14px): mínimo 4.5:1
- Texto grande (>18px o >14px bold): mínimo 3:1

**Cómo solucionarlo:**

**A. Verificar tus colores actuales:**
```css
/* index.css - Verifica estos valores */
:root {
  --accent: #your-color;  /* Necesitas buscar este valor en tu código */
}
```

**B. Herramienta para verificar contraste:**
- Usa https://webaim.org/resources/contrastchecker/
- Ingresa tu color de --accent y el color de fondo del nav
- Ajusta hasta lograr mínimo 4.5:1

**C. Soluciones según tu esquema actual:**

**Si usas color claro en fondo claro:**
```css
:root {
  /* Opción 1: Oscurecer el accent */
  --accent: #0066CC; /* Azul más oscuro */
  
  /* Opción 2: Añadir text-shadow para mejorar legibilidad */
  --accent: #4A90E2;
}

/* En Navigation.css */
.nav-pill a.active,
.nav-pill a[style*="color: var(--accent)"] {
  color: var(--accent);
  text-shadow: 0 0 8px rgba(0, 0, 0, 0.3); /* Sombra sutil */
  font-weight: 600; /* Aumentar peso */
}
```

**Si usas tema oscuro:**
```css
[data-theme="dark"] {
  /* Color más claro para fondo oscuro */
  --accent: #60A5FA; /* Azul claro con buen contraste */
}
```

**D. Solución completa recomendada:**
```css
/* index.css */
:root {
  /* Tema claro: colores con contraste AAA */
  --accent: #0056B3; /* Azul oscuro - contraste 7.5:1 en blanco */
  --accent-hover: #003D82; /* Más oscuro al hover */
  --nav-text: #1A1A1A; /* Texto principal negro */
}

[data-theme="dark"] {
  --accent: #66B2FF; /* Azul claro - contraste 7:1 en negro */
  --accent-hover: #99CCFF;
  --nav-text: #F5F5F5; /* Texto principal blanco */
}
```

```css
/* Navigation.css */
.nav-pill a {
  color: var(--nav-text); /* Links normales con máximo contraste */
  font-weight: 500;
}

.nav-pill a.active,
.nav-pill a[style*="color: var(--accent)"] {
  color: var(--accent);
  font-weight: 600; /* Más grueso = mejor legibilidad */
}

.nav-pill a:hover {
  color: var(--accent-hover);
}
```

### 2.2 Falta Landmark `<main>` - ALTO 🔴
**Puntuación:** 0/1

**Problema:** El documento no tiene un elemento `<main>` landmark que identifique el contenido principal.

**Por qué es importante:** 
- Lectores de pantalla usan landmarks para navegación rápida
- Usuarios de tecnologías asistivas pueden "saltar al contenido principal"
- Mejora la accesibilidad semántica

**Elemento que falla:**
```html
<html lang="es" data-theme="light">
  <!-- Lighthouse dice: "Document does not have a main landmark" -->
</html>
```

**Cómo solucionarlo:**

**A. Modificar App.jsx para añadir <main>:**
```jsx
// App.jsx
function App() {
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  // ... resto del código ...

  return (
    <>
      <Navigation 
        theme={theme} 
        toggleTheme={toggleTheme} 
        activeSection={activeSection}
      />
      
      {/* ✅ ENVOLVER CONTENIDO PRINCIPAL EN <main> */}
      <main>
        <Hero theme={theme} />
        <GradientBackground />
        <Experience />
        <Skills />
        <Projects />
        <Education />
        <Certifications />
        <Contact />
      </main>
      
      {/* Footer fuera de main */}
      <Footer />
    </>
  );
}
```

**B. Asegurar que solo haya UN <main> por página:**
```jsx
// ✅ CORRECTO - Un solo <main>
<body>
  <nav>...</nav>
  <main>
    <section id="hero">...</section>
    <section id="experience">...</section>
    {/* ... más secciones ... */}
  </main>
  <footer>...</footer>
</body>

// ❌ INCORRECTO - Múltiples <main>
<body>
  <main><section id="hero">...</section></main>
  <main><section id="experience">...</section></main>
</body>
```

**C. Adicional: Mejorar estructura semántica completa:**
```jsx
// App.jsx con estructura semántica óptima
return (
  <>
    {/* Navegación en <nav> ya está bien */}
    <Navigation ... />
    
    {/* Contenido principal */}
    <main id="main-content">
      {/* Hero puede ser <header> de main o primera <section> */}
      <section id="home" aria-labelledby="hero-heading">
        <Hero theme={theme} />
      </section>
      
      <GradientBackground aria-hidden="true" /> {/* Puramente decorativo */}
      
      <section id="experience" aria-labelledby="experience-heading">
        <Experience />
      </section>
      
      <section id="skills" aria-labelledby="skills-heading">
        <Skills />
      </section>
      
      {/* ... más secciones ... */}
    </main>
    
    {/* Footer en <footer> */}
    <footer>
      <Footer />
    </footer>
  </>
);
```

**D. Actualizar index.css si es necesario:**
```css
/* index.css - Estilos para main */
main {
  /* Si ya tienes estilos en 'section', podrían aplicarse aquí */
  min-height: 100vh;
  position: relative;
}

/* Asegurar que main no rompa el layout existente */
main > section {
  /* Mantener estilos actuales de section */
}
```

### 2.3 Links Sin Nombre Discernible - ALTO 🔴
**Puntuación:** 0/1

**Problema:** Algunos enlaces no tienen texto o aria-label que los lectores de pantalla puedan anunciar.

**Por qué es importante:** Usuarios con lectores de pantalla escuchan "link" sin contexto sobre a dónde lleva.

**Elementos que probablemente fallan:**
- Links de iconos de redes sociales
- Links del language switcher (ENG/ESP)
- Botones con solo iconos

**Cómo solucionarlo:**

**A. Language Switcher en Navigation.jsx:**
```jsx
{/* ANTES - Sin aria-label */}
<a 
  onClick={() => changeLanguage('en')}
  style={{ color: i18n.language === 'en' ? 'var(--accent)' : 'inherit' }}
>
  ENG
</a>

{/* DESPUÉS - Con aria-label */}
<a 
  onClick={() => changeLanguage('en')}
  style={{ color: i18n.language === 'en' ? 'var(--accent)' : 'inherit' }}
  aria-label="Change language to English"
  role="button"
  tabIndex="0"
  onKeyPress={(e) => e.key === 'Enter' && changeLanguage('en')}
>
  ENG
</a>
<span aria-hidden="true"> / </span>
<a 
  onClick={() => changeLanguage('es')}
  style={{ color: i18n.language === 'es' ? 'var(--accent)' : 'inherit' }}
  aria-label="Cambiar idioma a Español"
  role="button"
  tabIndex="0"
  onKeyPress={(e) => e.key === 'Enter' && changeLanguage('es')}
>
  ESP
</a>
```

**B. Links de redes sociales en Hero.jsx o Contact.jsx:**
```jsx
{/* ANTES - Solo icono sin texto */}
<a href="https://github.com/tu-usuario">
  <img src={githubIcon} alt="" />
</a>

{/* DESPUÉS - Con aria-label y alt apropiado */}
<a 
  href="https://github.com/tu-usuario"
  aria-label="Visit my GitHub profile"
  target="_blank"
  rel="noopener noreferrer"
>
  <img src={githubIcon} alt="GitHub icon" />
</a>
```

**C. Links con "#" (placeholder) - VER TAMBIÉN SEO 4.1:**
```jsx
{/* ANTES - Link placeholder sin función */}
<a href="#">View Project</a>

{/* OPCIÓN 1: Si no tiene destino aún, usar button */}
<button 
  type="button"
  onClick={() => alert('Coming soon')}
  aria-label="View Project Details (coming soon)"
>
  View Project
</button>

{/* OPCIÓN 2: Si tiene destino, usar URL real */}
<a 
  href="https://github.com/tu-usuario/proyecto"
  aria-label="View Project on GitHub"
  target="_blank"
  rel="noopener noreferrer"
>
  View Project
</a>
```

**D. Hamburger menu button en Navigation.jsx:**
```jsx
{/* Asegurar que el botón hamburger tenga aria-label */}
<button
  className={`hamburger ${isMenuOpen ? 'active' : ''}`}
  onClick={() => setIsMenuOpen(!isMenuOpen)}
  aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
  aria-expanded={isMenuOpen}
  aria-controls="nav-menu"
>
  <span></span>
  <span></span>
  <span></span>
</button>

{/* Y el contenedor del menu: */}
<div 
  className={`nav-pill ${isMenuOpen ? 'mobile-open' : ''}`}
  id="nav-menu"
  role="navigation"
  aria-label="Main navigation"
>
  {/* ... links ... */}
</div>
```

**E. Template completo para links con iconos:**
```jsx
// Componente reutilizable para social links
const SocialLink = ({ href, icon, platform }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Visit my ${platform} profile`}
    className="social-link"
  >
    <img src={icon} alt={`${platform} logo`} />
    <span className="sr-only">{platform}</span>
  </a>
);

// Usar en Hero o Contact:
<SocialLink href="https://github.com/user" icon={githubIcon} platform="GitHub" />
<SocialLink href="https://linkedin.com/in/user" icon={linkedinIcon} platform="LinkedIn" />
```

```css
/* index.css o utility classes */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## 3. BEST PRACTICES (96/100) 🟢

### 3.1 Declaración de Charset Faltante o Tardía - MEDIO 🟡
**Puntuación:** 0/1

**Problema:** El `<meta charset="utf-8">` está faltante o aparece después de los primeros 1024 bytes del HTML.

**Por qué es importante:** 
- Previene problemas de encoding (caracteres raros: �)
- Especialmente importante para contenido en español (á, é, í, ó, ú, ñ, ¿, ¡)
- Debe estar en los primeros 1024 bytes para que el navegador lo detecte

**Cómo solucionarlo:**

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="es">
  <head>
    <!-- ✅ CHARSET DEBE SER LA PRIMERA META TAG -->
    <meta charset="UTF-8" />
    
    <!-- Después pueden ir las demás -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Portfolio de [Tu Nombre] - Developer Full Stack" />
    
    <title>Portfolio - [Tu Nombre]</title>
    
    <!-- ... resto de tags ... -->
  </head>
  <body>
    <!-- ... -->
  </body>
</html>
```

**Verificación:**
```html
<!-- ❌ MAL - Charset muy abajo -->
<!DOCTYPE html>
<html lang="es">
  <head>
    <title>Portfolio</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- ... 50 líneas después ... -->
    <meta charset="UTF-8" />  <!-- MUY TARDE -->
  </head>
</html>

<!-- ✅ BIEN - Charset como primera meta -->
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />  <!-- PRIMERA LÍNEA -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portfolio</title>
  </head>
</html>
```

---

## 4. SEO (83/100) 🟠

### 4.1 Links No Rastreables - ALTO 🔴
**Puntuación:** 0/1

**Problema:** Tienes links con `href="#"` que los motores de búsqueda no pueden rastrear.

**Elementos específicos que fallan:**
```html
<!-- Lighthouse identificó este elemento en Navigation.jsx: -->
<a href="#">ENG</a>  <!-- Language switcher -->
<a href="#">ESP</a>
```

**Por qué es importante:**
- Google no puede descubrir nuevas páginas
- Links con `#` no aportan al SEO
- Mala práctica para accesibilidad (ya tratado en 2.3)

**Cómo solucionarlo:**

**A. Language switcher - Cambiar a <button>:**
```jsx
{/* Navigation.jsx - ANTES */}
<div className="language-switcher">
  <a 
    href="#"  {/* ← PROBLEMA: href="#" */}
    onClick={() => changeLanguage('en')}
    style={{ color: i18n.language === 'en' ? 'var(--accent)' : 'inherit' }}
  >
    ENG
  </a>
  <span> / </span>
  <a 
    href="#"  {/* ← PROBLEMA: href="#" */}
    onClick={() => changeLanguage('es')}
    style={{ color: i18n.language === 'es' ? 'var(--accent)' : 'inherit' }}
  >
    ESP
  </a>
</div>

{/* Navigation.jsx - DESPUÉS ✅ */}
<div className="language-switcher" role="group" aria-label="Language selection">
  <button
    type="button"
    onClick={() => changeLanguage('en')}
    style={{ color: i18n.language === 'en' ? 'var(--accent)' : 'inherit' }}
    aria-label="Change language to English"
    aria-pressed={i18n.language === 'en'}
    className="lang-button"
  >
    ENG
  </button>
  <span aria-hidden="true"> / </span>
  <button
    type="button"
    onClick={() => changeLanguage('es')}
    style={{ color: i18n.language === 'es' ? 'var(--accent)' : 'inherit' }}
    aria-label="Cambiar idioma a Español"
    aria-pressed={i18n.language === 'es'}
    className="lang-button"
  >
    ESP
  </button>
</div>
```

```css
/* Navigation.css - Estilar buttons como links */
.lang-button {
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: inherit;
  padding: 0;
  transition: color 0.2s ease-in-out;
}

.lang-button:hover {
  color: var(--accent);
}

.lang-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 2px;
}
```

**B. Links de proyectos placeholder:**
```jsx
{/* Projects.jsx - Si tienes links con "#" */}

{/* ANTES ❌ */}
<a href="#" className="project-link">
  View Project
</a>

{/* OPCIÓN 1: Usar URLs reales */}
<a 
  href={project.githubUrl || project.liveUrl}
  target="_blank"
  rel="noopener noreferrer"
  className="project-link"
  aria-label={`View ${project.name} on GitHub`}
>
  View Project
</a>

{/* OPCIÓN 2: Si no hay URL, usar button con disabled */}
<button 
  type="button"
  disabled
  className="project-link project-link--disabled"
  aria-label={`${project.name} - Coming soon`}
>
  Coming Soon
</button>

{/* OPCIÓN 3: Condicional */}
{project.githubUrl ? (
  <a 
    href={project.githubUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="project-link"
  >
    View on GitHub
  </a>
) : (
  <span className="project-link project-link--inactive">
    In Development
  </span>
)}
```

**C. Links de redes sociales en Hero/Contact:**
```jsx
{/* Verificar que todos los social links tengan URLs reales */}

{/* ❌ MAL */}
<a href="#">
  <img src={githubIcon} alt="GitHub" />
</a>

{/* ✅ BIEN */}
<a 
  href="https://github.com/tu-usuario"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Visit my GitHub profile"
>
  <img src={githubIcon} alt="GitHub icon" />
</a>
```

**D. Auditar todos los links en el proyecto:**
```bash
# Buscar todos los href="#" en el proyecto
# Ejecutar en terminal desde la raíz:
grep -r 'href="#"' src/
```

### 4.2 robots.txt Inválido - MEDIO 🟡
**Puntuación:** 0/1  
**Errores:** 27 errores encontrados

**Problema:** Lighthouse está interpretando tu `index.html` como `robots.txt`.

**Qué encontró Lighthouse:**
```
Line 1: <!DOCTYPE html>  → Syntax not understood
Line 2: <html lang="es"> → Syntax not understood
...
```

**Por qué ocurre:** No tienes un archivo `robots.txt`, entonces Vite/servidor responde con el `index.html` para esa ruta.

**Cómo solucionarlo:**

**A. Crear archivo robots.txt en `/public/robots.txt`:**
```bash
# Crear directorio public si no existe
mkdir -p public
```

```txt
# public/robots.txt
User-agent: *
Allow: /

# Sitemap (crear después)
Sitemap: https://tu-dominio.com/sitemap.xml
```

**B. Si quieres bloquear secciones específicas:**
```txt
# public/robots.txt
User-agent: *
Allow: /

# Bloquear archivos privados (ejemplo)
Disallow: /admin/
Disallow: /*.json$

# Permitir explícitamente páginas importantes
Allow: /projects
Allow: /contact

Sitemap: https://tu-dominio.com/sitemap.xml
```

**C. Para ambiente de desarrollo vs producción:**
```txt
# public/robots.txt - PRODUCCIÓN
User-agent: *
Allow: /
Sitemap: https://tu-portfolio.com/sitemap.xml

# Para STAGING/DEV, crear public/robots.dev.txt:
User-agent: *
Disallow: /  # Bloquear todo en desarrollo
```

**D. Verificación en Vite:**
Los archivos en `/public/` son servidos en la raíz automáticamente:
- `/public/robots.txt` → disponible en `https://tu-sitio.com/robots.txt`
- `/public/favicon.ico` → disponible en `https://tu-sitio.com/favicon.ico`

**E. (Opcional) Generar sitemap.xml:**
```bash
# Instalar plugin para generar sitemap
npm install --save-dev vite-plugin-sitemap
```

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    sitemap({
      hostname: 'https://tu-portfolio.com',
      routes: [
        { path: '/', priority: 1.0 },
        { path: '/#experience', priority: 0.8 },
        { path: '/#skills', priority: 0.8 },
        { path: '/#projects', priority: 0.9 },
        { path: '/#education', priority: 0.7 },
        { path: '/#contact', priority: 0.8 }
      ]
    })
  ]
})
```

**Nota importante:** Como es una SPA (Single Page Application), técnicamente solo tienes una "página" (`/`). Las secciones con `#` no son URLs separadas para Google.

---

## 5. PLAN DE ACCIÓN PRIORITIZADO

### 🔴 **PRIORIDAD CRÍTICA** (Hacer YA - Máximo impacto)

1. **Build de Producción para Tests** ⏱️ 5 minutos
   ```bash
   npm run build
   npm run preview
   # Re-ejecutar Lighthouse en puerto 4173
   ```
   **Impacto:** Eliminará 998 KB de JS sin minificar + HMR issues

2. **Añadir Charset en index.html** ⏱️ 2 minutos
   ```html
   <head>
     <meta charset="UTF-8" />  <!-- Primera línea -->
   ```
   **Impacto:** Previene encoding issues

3. **Envolver en `<main>` en App.jsx** ⏱️ 5 minutos
   ```jsx
   <main>
     <Hero ... />
     {/* resto de secciones */}
   </main>
   ```
   **Impacto:** +puntos accesibilidad, mejor SEO

4. **Crear public/robots.txt** ⏱️ 3 minutos
   ```txt
   User-agent: *
   Allow: /
   ```
   **Impacto:** +puntos SEO

5. **Optimizar Fuente con font-display** ⏱️ 5 minutos
   ```css
   @font-face {
     font-family: "Outfit";
     src: url("./assets/fonts/Outfit-VariableFont_wght.ttf") format("truetype");
     font-display: swap; /* ← AÑADIR */
   }
   ```
   **Impacto:** -80ms en FCP/LCP, elimina FOIT

### 🟠 **PRIORIDAD ALTA** (Hacer esta semana)

6. **Fix Contraste de Color** ⏱️ 15 minutos
   - Verificar color de --accent en index.css
   - Usar https://webaim.org/resources/contrastchecker/
   - Ajustar a mínimo 4.5:1
   **Impacto:** Accesibilidad crítica

7. **Cambiar Language Switcher a Buttons** ⏱️ 10 minutos
   - Reemplazar `<a href="#">` por `<button>`
   - Añadir aria-labels
   **Impacto:** +SEO, +Accesibilidad

8. **Añadir aria-labels a Links de Iconos** ⏱️ 15 minutos
   - Social media links
   - Navigation icons si existen
   **Impacto:** +Accesibilidad

9. **Lazy Loading de Componentes** ⏱️ 30 minutos
   ```jsx
   const Experience = lazy(() => import("./components/Experience"));
   // ... resto
   ```
   **Impacto:** -480ms en LCP, mejora carga inicial

### 🟡 **PRIORIDAD MEDIA** (Hacer en 2 semanas)

10. **Code Splitting de Constants** ⏱️ 1 hora
    - Separar constants/index.js en archivos individuales
    - Actualizar imports en componentes
    **Impacto:** Reduce cadena de dependencias, -100ms LCP

11. **Optimizar Fuente (Subsetting)** ⏱️ 30 minutos
    - Migrar a Google Fonts o usar glyphhanger
    **Impacto:** -108 KB, -80ms LCP

12. **Optimizar Scroll Handler** ⏱️ 45 minutos
    - Añadir requestAnimationFrame throttling
    - Batch lecturas de geometría
    **Impacto:** -60ms reflows, mejor performance en scroll

13. **Lazy Loading de Imágenes en Projects** ⏱️ 20 minutos
    ```jsx
    <img src={img} alt={alt} loading="lazy" />
    ```
    **Impacto:** Reduce carga de red inicial

### 🔵 **PRIORIDAD BAJA** (Nice to have)

14. **Preload de Recursos Críticos** ⏱️ 15 minutos
    ```html
    <link rel="modulepreload" href="/src/main.jsx">
    <link rel="preload" href="/fonts/Outfit.woff2" as="font">
    ```

15. **Generar Sitemap.xml** ⏱️ 30 minutos
    - Instalar vite-plugin-sitemap
    - Configurar rutas

16. **i18next Lazy Loading** ⏱️ 1 hora
    - Implementar i18next-http-backend
    - Cargar traducciones bajo demanda

---

## 6. RESUMEN DE IMPACTOS ESPERADOS

### Después de Prioridad Crítica (1-5):
- **Performance:** 79 → ~85 (+6 puntos)
- **Accessibility:** 77 → ~82 (+5 puntos)
- **Best Practices:** 96 → 100 (+4 puntos)
- **SEO:** 83 → ~90 (+7 puntos)
- **LCP:** 2.6s → ~2.0s (-600ms)
- **FCP:** 1.5s → ~1.2s (-300ms)

### Después de Prioridad Alta (6-9):
- **Performance:** ~85 → ~90 (+5 puntos)
- **Accessibility:** ~82 → ~95 (+13 puntos)
- **SEO:** ~90 → 100 (+10 puntos)
- **LCP:** ~2.0s → ~1.5s (-500ms)

### Después de Prioridad Media (10-13):
- **Performance:** ~90 → 95+ (+5+ puntos)
- **LCP:** ~1.5s → <1.2s (-300ms)
- **Tiempo de carga total:** -40%

### Meta Final (Todo implementado):
- ✅ **Performance:** 95-98/100 (verde)
- ✅ **Accessibility:** 95-100/100 (verde)
- ✅ **Best Practices:** 100/100 (verde)
- ✅ **SEO:** 100/100 (verde)
- ✅ **Core Web Vitals:** Todos en verde
  - LCP: <1.2s (Excelente, antes 2.6s)
  - FCP: <1.0s (Excelente, antes 1.5s)
  - CLS: <0.1 (Ya está bien)
  - FID/INP: <100ms (Ya está bien)

---

## 7. COMANDOS ÚTILES

```bash
# Limpiar y reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Build de producción
npm run build

# Preview de producción (para testing real)
npm run preview

# Ejecutar Lighthouse desde CLI
npx lighthouse http://localhost:4173 --view

# Analizar bundle size
npm run build -- --mode production --report
npx vite-bundle-visualizer

# Servir build con análisis
npx serve -s dist -l 3000
```

---

## 8. HERRAMIENTAS RECOMENDADAS

1. **Contraste de Color:** https://webaim.org/resources/contrastchecker/
2. **PageSpeed Insights:** https://pagespeed.web.dev/
3. **Chrome DevTools Lighthouse:** F12 → Lighthouse tab
4. **Web Vitals Extension:** https://chrome.google.com/webstore (buscar "Web Vitals")
5. **Bundle Analyzer:** `npm install --save-dev vite-bundle-visualizer`
6. **Font Subsetting:** https://everythingfonts.com/subsetter
7. **Image Optimization:** https://squoosh.app/

---

## 9. NOTAS FINALES

- **SIEMPRE testea en build de producción:** `npm run build && npm run preview`
- **No te obsesiones con 100/100:** 90+ es excelente para un portfolio
- **Prioriza UX sobre scores:** Una animación linda que reduce 5 puntos puede valer la pena
- **Mobile first:** Testea en mobile (Chrome DevTools → Toggle device toolbar)
- **Validación continua:** Re-ejecuta Lighthouse después de cada grupo de cambios

---

**¿Dudas sobre algún punto específico?** Todos estos cambios son incrementales y reversibles. Empieza por las prioridades críticas y mide el impacto antes de continuar.
