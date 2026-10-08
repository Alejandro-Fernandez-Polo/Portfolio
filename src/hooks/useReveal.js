import { useEffect } from "react"

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
            // Revealed sections stay visible, so the observer can stop tracking them.
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
