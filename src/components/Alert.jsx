export function Alert({ type, text }) {
  return (
    <div className="alert-container">
      <div
        className={`alert-box ${
          type === "danger" ? "alert-box-danger" : "alert-box-success"
        }`}
        role="alert"
      >
        <p
          className={`alert-badge ${
            type === "danger" ? "alert-badge-danger" : "alert-badge-success"
          }`}
        >
          {type === "danger" ? "Failed" : "Success"}
        </p>
        <p className="alert-text">{text}</p>
      </div>
    </div>
  )
}
