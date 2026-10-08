import "./css/Footer.css"

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer data-legacy>
      <div className="container">
        <p>© {year} Alejandro Fernández Polo</p>
      </div>
    </footer>
  )
}
