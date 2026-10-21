import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react'
import { useReducedMotion } from './useMediaQuery.ts'

interface TypewriterOptions {
  text: string
  /** Shows the whole text at once (e.g. the player asked to skip). */
  complete?: boolean
  /** Stops typing while true, e.g. behind a rotate-device screen. */
  paused?: boolean
  charDelayMs: number
  /** Pause after the end of a sentence. */
  sentencePauseMs: number
  /**
   * Follows an external clock instead (e.g. a voice-over), measured against
   * `elapsedMs()` so timer delays never add up: each character appears at its
   * time in `charTimesMs`, or, without them, at an even pace that lasts
   * `durationMs`. Without a pace, charDelayMs and sentencePauseMs apply.
   */
  pace?: TypewriterPace
  onDone?: () => void
}

export interface TypewriterPace {
  elapsedMs: () => number
  durationMs: number
  /** When each character is due, in ms on the same clock (e.g. from word timings of the voice). */
  charTimesMs?: readonly number[]
}

function paceDelay(pace: TypewriterPace, text: string, index: number): number {
  const due = pace.charTimesMs?.[index] ?? ((index + 1) * pace.durationMs) / Math.max(text.length, 1)
  return Math.max(0, due - pace.elapsedMs())
}

export interface Typewriter<T extends Element> {
  /** Goes on the element that shows the text; the skip key is ignored while it is inside [inert]. */
  ref: RefObject<T | null>
  /** How many characters of the text to show. */
  visible: number
  done: boolean
}

// Controls that already react to Enter / Space: the key is left to them.
const KEY_OWNERS = 'button, a[href], input, select, textarea, [contenteditable="true"], [role="button"], [role="application"], dialog'

function delayBefore(text: string, index: number, charDelayMs: number, sentencePauseMs: number): number {
  const previous = text[index - 1]
  const endsSentence = previous !== undefined && /[.!?:…]/.test(previous) && /\s/.test(text[index] ?? '')
  return endsSentence ? sentencePauseMs : charDelayMs
}

// Reveals a text character by character, pausing between sentences. Enter or
// Space anywhere shows it all at once. With reduced motion it is complete
// from the start. Screen readers should get the full text separately.
export function useTypewriter<T extends Element = HTMLElement>({
  text,
  complete = false,
  paused = false,
  charDelayMs,
  sentencePauseMs,
  pace,
  onDone,
}: TypewriterOptions): Typewriter<T> {
  const reducedMotion = useReducedMotion()
  const [shown, setShown] = useState(0)
  const [skipped, setSkipped] = useState(false)
  const ref = useRef<T>(null)
  const done = complete || skipped || reducedMotion || shown >= text.length

  const handleKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(KEY_OWNERS)) return
    // Not while hidden behind something (e.g. the rotate screen).
    if (ref.current?.closest('[inert]')) return
    event.preventDefault()
    setSkipped(true)
  })
  useEffect(() => {
    if (done) return
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [done])

  useEffect(() => {
    if (done || paused) return
    // With a pace, the next character is due when the clock reaches its share
    // of the duration: behind, it catches up at once; ahead, it waits.
    const delay = pace ? paceDelay(pace, text, shown) : delayBefore(text, shown, charDelayMs, sentencePauseMs)
    const timer = setTimeout(() => setShown((count) => count + 1), delay)
    return () => clearTimeout(timer)
  }, [done, paused, shown, text, charDelayMs, sentencePauseMs, pace])

  const notifyDone = useEffectEvent(() => onDone?.())
  useEffect(() => {
    if (done) notifyDone()
  }, [done])

  return { ref, visible: done ? text.length : shown, done }
}
