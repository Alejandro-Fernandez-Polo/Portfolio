import { useEffect } from "react"

const interactiveSelector = "a, button, input, textarea, label, .chips li, .lang"

export function useCursor(cursorRef) {
  useEffect(() => {
    const cursor = cursorRef.current
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    if (!cursor || !finePointer.matches || reducedMotion.matches) return

    const moveCursor = (event) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`
      cursor.classList.add("visible")
    }

    const setInteractiveState = (event) => {
      const target = event.target
      cursor.classList.toggle(
        "on",
        target instanceof Element && Boolean(target.closest(interactiveSelector)),
      )
    }

    const hideCursorWhenLeavingPage = (event) => {
      if (!event.relatedTarget) cursor.classList.remove("visible")
    }

    document.addEventListener("mousemove", moveCursor, { passive: true })
    document.addEventListener("mouseover", setInteractiveState)
    document.addEventListener("mouseout", hideCursorWhenLeavingPage)

    // Pointer-only motion keeps touch and reduced-motion users on the native cursor.
    return () => {
      document.removeEventListener("mousemove", moveCursor)
      document.removeEventListener("mouseover", setInteractiveState)
      document.removeEventListener("mouseout", hideCursorWhenLeavingPage)
    }
  }, [cursorRef])
}
