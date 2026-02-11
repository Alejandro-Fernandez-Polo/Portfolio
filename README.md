# Portfolio React - Alejandro Fernández Polo

Portfolio personal moderno desarrollado en React con Vite, diseño glassmorphic y animaciones suaves.

## 🚀 Características

- ✨ Diseño moderno con efecto glassmorphic
- 🌓 Modo oscuro/claro
- 📱 Totalmente responsive
- ⚡ Construido con Vite para desarrollo rápido
- 🎨 Animaciones suaves y transiciones
- 🧩 Componentizado y modular

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Preview de build de producción
npm run preview
```

## 🛠️ Tecnologías

- **React 18** - Biblioteca de interfaz de usuario
- **Vite** - Build tool y servidor de desarrollo
- **CSS3** - Estilos modernos con variables CSS y glassmorphism

## 📁 Estructura del Proyecto

```
react-portfolio/
├── public/              # Archivos estáticos
├── src/
│   ├── components/      # Componentes de React
│   │   ├── Navigation.jsx
│   │   ├── GradientBackground.jsx
│   │   ├── Hero.jsx
│   │   ├── Experience.jsx
│   │   ├── Skills.jsx
│   │   ├── Projects.jsx
│   │   ├── Education.jsx
│   │   ├── Certifications.jsx
│   │   ├── Contact.jsx
│   │   └── Footer.jsx
│   ├── App.jsx         # Componente principal
│   ├── main.jsx        # Punto de entrada
│   └── index.css       # Estilos globales
├── index.html          # HTML base
├── package.json        # Dependencias
└── vite.config.js      # Configuración de Vite
```

## 🎨 Componentes

- **Navigation** - Barra de navegación con cambio de tema
- **GradientBackground** - Fondo animado con partículas
- **Hero** - Sección principal con presentación
- **Experience** - Timeline de experiencia laboral
- **Skills** - Grid de habilidades técnicas
- **Projects** - Galería de proyectos
- **Education** - Formación académica
- **Certifications** - Certificaciones profesionales
- **Contact** - Formulario de contacto
- **Footer** - Pie de página

## ⚙️ Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Crea build de producción
- `npm run preview` - Preview del build de producción

## 📝 Personalización

Puedes personalizar el portfolio editando:

1. **Contenido**: Edita los componentes en `src/components/`
2. **Estilos**: Modifica las variables CSS en `src/index.css`
3. **Tema**: Ajusta los colores en las variables CSS `:root` y `[data-theme="dark"]`

## 🌐 Deploy

Para desplegar en producción:

```bash
npm run build
```

Los archivos optimizados estarán en la carpeta `dist/` listos para ser desplegados en cualquier servicio de hosting estático (Vercel, Netlify, GitHub Pages, etc.).

## 📄 Licencia

MIT

---

Desarrollado con ❤️ por Alejandro Fernández Polo
