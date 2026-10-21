import { useEffect, type RefObject } from 'react'

interface AutoFocusOptions {
  /** Focuses when this becomes true; defaults to on mount. */
  when?: boolean
  /** Only when nothing else has the focus (e.g. the previous control is gone). */
  onlyIfNothingFocused?: boolean
}

// Moves the focus to the element, so screen readers announce it and the
// keyboard continues from there.
export function useAutoFocus(ref: RefObject<HTMLElement | null>, { when = true, onlyIfNothingFocused = false }: AutoFocusOptions = {}): void {
  useEffect(() => {
    if (!when) return
    if (onlyIfNothingFocused && document.activeElement && document.activeElement !== document.body) return
    ref.current?.focus()
  }, [ref, when, onlyIfNothingFocused])
}
