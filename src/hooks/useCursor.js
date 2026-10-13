import { useEffect } from "react"

// Solo controles: los chips de Skills (.chips li) y las etiquetas del formulario
// se quedan fuera a propósito, son texto, y no deben agrandar el círculo.
// (La etiqueta sigue abriendo su campo al pulsarla: eso es del navegador.)
const interactiveSelector = "a, button, input, textarea, .lang"

/**
 * Conecta el cursor personalizado y conserva el nativo para pantallas táctiles
 * y personas que prefieren reducir el movimiento.
 * @param {import("react").RefObject<HTMLElement|null>} cursorRef Elemento controlado por la app.
 */
export function useCursor(cursorRef) {
  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return

    // El círculo personalizado tiene dos mitades: el CSS oculta el cursor nativo
    // y este hook pinta el div. Si cada mitad evaluase la media query por su
    // cuenta se desincronizan (apagar "Reducir movimiento" con la página abierta
    // cambiaba el CSS al instante pero dejaba al hook sin registrar el mousemove,
    // y la página se quedaba sin ningún cursor). La condición vive solo aquí: el
    // CSS cuelga de html.custom-cursor y su fallback es el cursor nativo.
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const root = document.documentElement
    const isEnabled = () => finePointer.matches && !reducedMotion.matches

    const moveCursor = (event) => {
      if (!isEnabled()) return
      // La clase entra en el primer movimiento, no al montar: hasta que el
      // círculo se pueda pintar, el usuario conserva el cursor nativo y nunca
      // hay un frame sin ninguno de los dos.
      if (!root.classList.contains("custom-cursor")) {
        root.classList.add("custom-cursor")
      }
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`
      cursor.classList.add("visible")
    }

    const setInteractiveState = (event) => {
      const target = event.target
      cursor.classList.toggle(
        "on",
        isEnabled() &&
          target instanceof Element &&
          Boolean(target.closest(interactiveSelector)),
      )
    }

    const hideCursorWhenLeavingPage = (event) => {
      if (!event.relatedTarget) cursor.classList.remove("visible")
    }

    // Con la página abierta el sistema puede cambiar de opinión, y la mitad CSS
    // reacciona sola: aquí se suelta el estado para no dejarla oculta sin
    // sustituto. Volver a activarlo no requiere nada más que mover el ratón.
    const releaseCursor = () => {
      if (isEnabled()) return
      root.classList.remove("custom-cursor")
      cursor.classList.remove("visible", "on")
    }

    finePointer.addEventListener("change", releaseCursor)
    reducedMotion.addEventListener("change", releaseCursor)

    document.addEventListener("mousemove", moveCursor, { passive: true })
    document.addEventListener("mouseover", setInteractiveState)
    document.addEventListener("mouseout", hideCursorWhenLeavingPage)

    return () => {
      finePointer.removeEventListener("change", releaseCursor)
      reducedMotion.removeEventListener("change", releaseCursor)
      document.removeEventListener("mousemove", moveCursor)
      document.removeEventListener("mouseover", setInteractiveState)
      document.removeEventListener("mouseout", hideCursorWhenLeavingPage)
      root.classList.remove("custom-cursor")
      cursor.classList.remove("visible", "on")
    }
  }, [cursorRef])
}
