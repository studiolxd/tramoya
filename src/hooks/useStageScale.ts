import { useLayoutEffect, useState, type RefObject } from 'react'

// Scale that fits a fixed-size stage (e.g. 1920×1080) inside the element,
// letterboxed when the aspect ratio differs. Updates on every resize.
export function useStageScale(viewportRef: RefObject<Element | null>, width: number, height: number): number {
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(([entry]) => {
      const { width: available, height: availableHeight } = entry.contentRect
      setScale(Math.min(available / width, availableHeight / height))
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [viewportRef, width, height])

  return scale
}
