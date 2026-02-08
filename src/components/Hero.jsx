export default function Hero() {
  const socialLinks = [
    {
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
      href: 'mailto:contact@example.com'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
          <rect x="2" y="9" width="4" height="12"/>
          <circle cx="4" cy="4" r="2"/>
        </svg>
      ),
      href: '#'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
        </svg>
      ),
      href: '#'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      href: '#'
    }
  ]

  return (
    <section className="hero" id="home">
      <div className="hero-content">
        <h1>ALEJANDRO<br/>FERNÁNDEZ</h1>
        <h2>FULL STACK DEVELOPER</h2>
        <p>Building scalable, high-performance applications and intelligent AI workflows. Passionate about solving complex challenges in fast-paced environments.</p>
        <div className="social-links">
          {socialLinks.map((link, index) => (
            <a key={index} href={link.href} className="social-link" target="_blank" rel="noopener noreferrer">
              {link.icon}
            </a>
          ))}
        </div>
      </div>
      {/* <div className="hero-image">
        <div className="hero-illustration">
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <circle cx="350" cy="80" r="30" fill="var(--accent)" opacity="0.2">
              <animate attributeName="cy" values="80;60;80" dur="4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="320" cy="150" r="20" fill="var(--accent-light)" opacity="0.3">
              <animate attributeName="cx" values="320;340;320" dur="5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="370" cy="200" r="15" fill="var(--accent)" opacity="0.25">
              <animate attributeName="r" values="15;20;15" dur="3s" repeatCount="indefinite"/>
            </circle>
            <rect x="140" y="200" width="120" height="80" rx="8" fill="var(--text-secondary)" opacity="0.3"/>
            <rect x="145" y="205" width="110" height="70" rx="4" fill="var(--card-bg)"/>
            <rect x="145" y="205" width="110" height="70" rx="4" fill="url(#screenGlow)" opacity="0.6"/>
            <circle cx="200" cy="140" r="30" fill="var(--text-secondary)"/>
            <path d="M 180 165 Q 200 155 220 165 L 220 200 L 180 200 Z" fill="var(--text-secondary)"/>
            <path d="M 180 180 L 150 210" stroke="var(--text-secondary)" strokeWidth="8" strokeLinecap="round"/>
            <path d="M 220 180 L 250 210" stroke="var(--text-secondary)" strokeWidth="8" strokeLinecap="round"/>
            <circle cx="80" cy="250" r="35" fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.4">
              <animate attributeName="r" values="35;40;35" dur="4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="50" cy="100" r="25" fill="none" stroke="var(--accent-light)" strokeWidth="2" opacity="0.3">
              <animate attributeName="r" values="25;30;25" dur="5s" repeatCount="indefinite"/>
            </circle>
            <defs>
              <radialGradient id="screenGlow">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="var(--accent-light)" stopOpacity="0.2"/>
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div> */}
    </section>
  )
}
