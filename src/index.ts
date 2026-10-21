// Public API of Tramoya, the Studio LXD graphic adventure engine. It holds the
// machinery only: scene flow, progress, tracking and interaction behaviour.
// It renders no markup and ships no styles; each game dresses it with its own
// design system.

// Game
export {
  createGame,
  type CurrentSceneProps,
  type Game,
  type GameContextValue,
  type GameDefinition,
  type GameProviderProps,
} from './game/createGame.tsx'

// Texts adapted to the form of address
export { resolveText, type Gender, type GenderedText, type GenderPick } from './text/gendered.ts'

// Tracking
export { createTracking, type Tracking, type TrackingOptions } from './tracking/tracking.ts'
export type { TrueFalseAnswer, XapiTracker } from './tracking/xapi.ts'
export type { Progress } from './tracking/progress.ts'

// Interaction hooks (behaviour and accessibility, no markup)
export { useAutoFocus } from './hooks/useAutoFocus.ts'
export { useDialogue, type Dialogue } from './hooks/useDialogue.ts'
export { useCoarsePointer, useMediaQuery, usePortrait, useReducedMotion } from './hooks/useMediaQuery.ts'
export { useStageScale } from './hooks/useStageScale.ts'
export { useSwipe, type Swipe, type SwipeDirection } from './hooks/useSwipe.ts'
export { useTypewriter, type Typewriter } from './hooks/useTypewriter.ts'

// Utilities
export { shuffle } from './utils/shuffle.ts'
export { withViewTransition } from './utils/viewTransition.ts'
