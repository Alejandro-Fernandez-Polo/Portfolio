import { useState } from "react"
//TODO: improve this alerts to look cool
export function useAlert() {
    const [alert, setAlert] = useState({
      show: false,
      text: "",
      type: "danger",
    })

    const showAlert = ({ text, type = "danger" }) =>
      setAlert({ show: true, text, type })
    const hideAlert = () => setAlert({ show: false, text: "", type: "danger" })

    return { alert, showAlert, hideAlert }
}
