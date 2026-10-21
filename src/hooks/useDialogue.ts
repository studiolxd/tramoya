import { useEffect, useEffectEvent, useState } from 'react'

interface DialogueOptions {
  /** Called once the last block is fully shown. */
  onFinished?: () => void
  /** When given, advancing past the last block calls this. */
  onDismiss?: () => void
}

export interface Dialogue {
  /** Block on screen. */
  index: number
  isLast: boolean
  /** The block is fully shown (typed or skipped). */
  shown: boolean
  /** The player asked to show the whole block at once. */
  skipRequested: boolean
  /** The last block is fully shown. */
  finished: boolean
  /** Skips the typing, goes to the next block, or dismisses after the last one. */
  advance: () => void
  /** Tells the dialogue that the current block finished typing. */
  markTyped: () => void
}

// Block-by-block speech: each block is typed out and the player advances to
// the next one. A skipped block counts as fully shown right away, so quick
// presses are not lost.
export function useDialogue(blockCount: number, { onFinished, onDismiss }: DialogueOptions = {}): Dialogue {
  const [index, setIndex] = useState(0)
  const [skipRequested, setSkipRequested] = useState(false)
  const [typed, setTyped] = useState(false)
  const shown = typed || skipRequested
  const isLast = index === blockCount - 1
  const finished = shown && isLast

  function advance() {
    if (!shown) {
      setSkipRequested(true)
    } else if (!isLast) {
      setIndex(index + 1)
      setSkipRequested(false)
      setTyped(false)
    } else {
      onDismiss?.()
    }
  }

  const notifyFinished = useEffectEvent(() => onFinished?.())
  useEffect(() => {
    if (finished) notifyFinished()
  }, [finished])

  return { index, isLast, shown, skipRequested, finished, advance, markTyped: () => setTyped(true) }
}
