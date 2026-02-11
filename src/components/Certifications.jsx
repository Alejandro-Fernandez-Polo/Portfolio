import "./css/Certifications.css"

export default function Certifications() {
  const certifications = [
    {
      icon: '🎓',
      title: 'AWS Certified Developer',
      link: '#'
    },
    {
      icon: '☁️',
      title: 'AWS Certified Cloud Practitioner',
      link: '#'
    },
    {
      icon: '🐙',
      title: 'GitHub Foundations',
      link: '#'
    }
  ]

  return (
    <section id="certifications">
      <div className="section-header">
        <h2>Certifications</h2>
      </div>
      <div className="certifications-grid">
        {certifications.map((cert, index) => (
          <div key={index} className="cert-card">
            <div className="cert-icon">{cert.icon}</div>
            <h3>{cert.title}</h3>
            <a href={cert.link} className="cert-link">View Certificate →</a>
          </div>
        ))}
      </div>
    </section>
  )
}
