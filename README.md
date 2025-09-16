# Portfolio

A modern, interactive portfolio built with React, Vite, and Tailwind CSS. Showcases 3D models, projects, and contact features, designed for developers and creatives.

## Features
- ⚡ Fast and responsive UI with Vite and React
- 🎨 Styled with Tailwind CSS
- 🖼️ 3D models using Three.js and @react-three/fiber
- 🗂️ Project showcase and timeline
- 📧 Contact form with EmailJS integration
- 🛠️ Custom hooks and reusable components
- 🌙 Dark mode support (if implemented)

## Tech Stack
- **React**
- **Vite**
- **Tailwind CSS**
- **Three.js** & **@react-three/fiber**
- **EmailJS**
- **react-vertical-timeline-component**

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9

### Installation
```bash
# Clone the repo
git clone https://github.com/Alejandro-Fernandez-Polo/Portfolio.git
cd Portfolio

# Install dependencies
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Environment Variables
Create a `.env.local` file for EmailJS:
```
VITE_APP_EMAILJS_SERVICE_ID=your_service_id
VITE_APP_EMAILJS_TEMPLATE_ID=your_template_id
VITE_APP_EMAILJS_PUBLIC_KEY=your_public_key
```

## Folder Structure
```
src/
  assets/         # Images, icons, 3D models
  components/     # Reusable React components
  constants/      # Static data and config
  hooks/          # Custom React hooks
  libs/           # Third-party libraries
  models/         # 3D model components
  pages/          # Main pages (Home, About, Contact, Projects)
  App.jsx         # Main app component
  main.jsx        # Entry point
```

## Credits
- [react-vertical-timeline-component](https://github.com/stephane-monnot/react-vertical-timeline)
- [EmailJS](https://www.emailjs.com/)
- [Three.js](https://threejs.org/)
- [@react-three/fiber](https://github.com/pmndrs/react-three-fiber)
- [Tailwind CSS](https://tailwindcss.com/)

## License
This project is licensed under the MIT License.
