import { useEffect, useEffectEvent, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { useReducedMotion } from './useMediaQuery.ts'
import { useAutoFocus } from './useAutoFocus.ts'

export type SwipeDirection = 'left' | 'right'

interface SwipeOptions {
  /** Distance a card must travel to count as an answer, in stage pixels. */
  commitDistance: number
  /** Where the card ends up after an answer. */
  exitDistance: number
  /** Duration of the exit animation; with reduced motion it is skipped. */
  exitMs: number
  /** Screen pixels per stage pixel at the element, e.g. read from a CSS variable. Defaults to 1. */
  scale?: (element: HTMLElement) => number
  onSwipe: (direction: SwipeDirection) => void
}

export interface Swipe {
  ref: RefObject<HTMLDivElement | null>
  /** Horizontal translation in stage pixels. */
  x: number
  /** -1 (fully left) to 1 (fully right): how close the card is to an answer. */
  progress: number
  dragging: boolean
  leaving: SwipeDirection | null
  reducedMotion: boolean
  /** Answers with the same exit as a drag (e.g. from YES / NO buttons). */
  swipe: (direction: SwipeDirection) => void
  handlers: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void
    onPointerMove: (event: PointerEvent<HTMLElement>) => void
    onPointerUp: (event: PointerEvent<HTMLElement>) => void
    onPointerCancel: () => void
  }
}

// Card answered by dragging it left or right with any pointer (mouse, touch,
// pen) or with the arrow keys. The arrows work wherever the focus is while
// the card is on screen and usable (not inert, no dialog in use). A new card
// takes the focus when the previous one (which had it) is gone.
export function useSwipe({ commitDistance, exitDistance, exitMs, scale = () => 1, onSwipe }: SwipeOptions): Swipe {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; startX: number; scale: number } | null>(null)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState<SwipeDirection | null>(null)
  const reducedMotion = useReducedMotion()

  useAutoFocus(ref, { onlyIfNothingFocused: true })

  const notifySwipe = useEffectEvent((direction: SwipeDirection) => onSwipe(direction))
  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => notifySwipe(leaving), reducedMotion ? 0 : exitMs)
    return () => clearTimeout(timer)
  }, [leaving, reducedMotion, exitMs])

  function swipe(direction: SwipeDirection) {
    if (!leaving) setLeaving(direction)
  }

  const handleKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    // Leave the arrows alone where they have their own job, and while the card cannot be used.
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('input, textarea, select, [contenteditable="true"], dialog, [role="dialog"]')) return
    if (ref.current?.closest('[inert]')) return
    event.preventDefault()
    swipe(event.key === 'ArrowRight' ? 'right' : 'left')
  })
  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function endDrag() {
    drag.current = null
    setDragging(false)
  }

  const progress = leaving ? (leaving === 'right' ? 1 : -1) : Math.max(-1, Math.min(1, offset / commitDistance))
  const x = leaving ? (leaving === 'right' ? exitDistance : -exitDistance) : offset

  return {
    ref,
    x,
    progress,
    dragging,
    leaving,
    reducedMotion,
    swipe,
    handlers: {
      onPointerDown(event) {
        if (leaving || drag.current) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { pointerId: event.pointerId, startX: event.clientX, scale: scale(event.currentTarget) }
        setDragging(true)
      },
      onPointerMove(event) {
        const current = drag.current
        if (current?.pointerId !== event.pointerId) return
        setOffset((event.clientX - current.startX) / current.scale)
      },
      onPointerUp(event) {
        const current = drag.current
        if (current?.pointerId !== event.pointerId) return
        // Measured from the event: a quick flick ends before `offset` re-renders.
        const distance = (event.clientX - current.startX) / current.scale
        endDrag()
        if (Math.abs(distance) >= commitDistance) swipe(distance > 0 ? 'right' : 'left')
        else setOffset(0)
      },
      onPointerCancel() {
        endDrag()
        setOffset(0)
      },
    },
  }
}
