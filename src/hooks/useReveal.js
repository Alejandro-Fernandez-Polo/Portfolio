import { useEffect } from "react"

/**
 * Revela los descendientes al entrar en pantalla y desconecta el observer al desmontar.
 * @param {import("react").RefObject<HTMLElement|null>} containerRef Sección que contiene los elementos `.reveal`.
 */
export function useReveal(containerRef) {
  useEffect(() => {
    const targets = containerRef.current?.querySelectorAll(".reveal")
    if (!targets?.length) return

    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("in"))
      return
    }

    const observer = new IntersectionObserver(
      (entries, activeObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in")
            // La sección revelada permanece visible y ya no necesita seguir observándose.
            activeObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )

    targets.forEach((target) => observer.observe(target))

    return () => observer.disconnect()
  }, [containerRef])
}
