import { flushSync } from 'react-dom'

// Runs a state update inside a View Transition, so elements that share a
// view-transition-name morph from one place to the other. Without browser
// support, or with reduced motion, the update simply happens at once.
// `afterUpdate` runs once the DOM reflects the update (e.g. to move the focus).
export function withViewTransition(update: () => void, afterUpdate?: () => void): void {
  const apply = () => {
    flushSync(update)
    afterUpdate?.()
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!('startViewTransition' in document) || reducedMotion) apply()
  else document.startViewTransition(apply)
}
