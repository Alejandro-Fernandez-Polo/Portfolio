import { useEffect } from 'react'
import "./css/GradientBackground.css"

export default function GradientBackground() {
  useEffect(() => {
    const gradientBg = document.querySelector('.gradient-bg')
    const particleCount = 30
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div')
      particle.className = 'particle'
      
      const size = Math.random() * 4 + 2
      particle.style.width = `${size}px`
      particle.style.height = `${size}px`
      particle.style.left = `${Math.random() * 100}%`
      
      const colors = [
        'var(--accent)',
        'var(--accent-light)',
        'rgba(168, 85, 247, 0.6)',
        'rgba(236, 72, 153, 0.6)',
        'rgba(139, 92, 246, 0.6)'
      ]
      particle.style.background = colors[Math.floor(Math.random() * colors.length)]
      
      const duration = Math.random() * 10 + 15
      const delay = Math.random() * 5
      particle.style.animationDuration = `${duration}s`
      particle.style.animationDelay = `${delay}s`
      particle.style.setProperty('--tx', `${(Math.random() - 0.5) * 200}px`)
      
      gradientBg.appendChild(particle)
    }
  }, [])

  return (
    <div className="gradient-bg">
      <div className="mesh-gradient"></div>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
    </div>
  )
}
