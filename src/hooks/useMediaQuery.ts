import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

export const usePortrait = () => useMediaQuery('(orientation: portrait)')
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
export const useCoarsePointer = () => useMediaQuery('(pointer: coarse)')
