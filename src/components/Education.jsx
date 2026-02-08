export default function Education() {
  const educationItems = [
    {
      title: 'Bachelor of Technology in Computer Science',
      date: 'Felds 2022 - Sep 22, 2023'
    },
    {
      title: 'University technolo/ Bachelor of Technology in Software Science',
      date: 'Bate 2024 - Sep 14, 2023'
    }
  ]

  return (
    <section id="education">
      <div className="section-header">
        <h2>Education</h2>
      </div>
      <div className="education-grid">
        {educationItems.map((item, index) => (
          <div key={index} className="education-card">
            <h3>{item.title}</h3>
            <p>{item.date}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
