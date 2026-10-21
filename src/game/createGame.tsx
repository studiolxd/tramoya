import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { resolveText, type Gender, type GenderedText } from '../text/gendered.ts'
import { createProgressStore, type Progress } from '../tracking/progress.ts'
import type { Tracking } from '../tracking/tracking.ts'

export interface GameDefinition<S extends string> {
  /**
   * Every scene id, with how many script scenes it covers. Progress (the
   * SCORM score) is the share of these that the learner has completed;
   * scenes outside the script count 0.
   */
  progressWeight: Record<S, number>
  /** Scene where a first session starts; `lmsName` is the learner's name inside an LMS. */
  initialScene: (context: { lmsName: string | null }) => S
  /**
   * Optional title screen shown on every load. It is not saved as the current
   * scene: from it, `start()` resumes the saved scene or begins the game.
   */
  titleScene?: S
  /** Duration of each half of a scene change (fade out, then fade in), in ms. */
  transitionMs: number
  tracking: Tracking
}

export interface GameContextValue<S extends string> {
  sceneId: S
  /** The player's name: from the LMS, or typed by the player. */
  playerName: string | null
  setPlayerName: (name: string) => void
  gender: Gender
  setGender: (gender: Gender) => void
  /** Fades out the current scene and fades in the next one. */
  goTo: (sceneId: S) => void
  /** Whether the fade-in of the current scene has finished. */
  sceneReady: boolean
  /** Whether the curtain covering the stage is closed (black). */
  curtainClosed: boolean
  /** True while the game is paused, e.g. behind a rotate-device screen. */
  paused: boolean
  /** Resolves a text for the chosen form of address. */
  text: (text: GenderedText) => string
  /** Whether the LMS has progress from a previous session to resume. */
  hasProgress: boolean
  /** Goes to the scene to resume, or to the first scene without progress (e.g. from the title scene). */
  start: () => void
}

export interface GameProviderProps<S extends string> {
  /** Overrides where the game starts (development); otherwise it resumes from the LMS. */
  startScene?: S
  paused?: boolean
  children: ReactNode
}

export interface CurrentSceneProps<S extends string> {
  scenes: Record<S, ComponentType>
}

export interface Game<S extends string> {
  GameProvider: (props: GameProviderProps<S>) => ReactNode
  useGame: () => GameContextValue<S>
  /** Renders the current scene; each scene mounts fresh. */
  CurrentScene: (props: CurrentSceneProps<S>) => ReactNode
  isSceneId: (value: unknown) => value is S
}

// Scene flow, player profile and progress saved in the LMS. The game draws
// everything: CurrentScene goes inside its own stage, and `curtainClosed`
// drives its own curtain, which must animate for `transitionMs`.
export function createGame<S extends string>({
  progressWeight,
  initialScene,
  titleScene,
  transitionMs,
  tracking,
}: GameDefinition<S>): Game<S> {
  const isSceneId = (value: unknown): value is S =>
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(progressWeight, value)
  const store = createProgressStore({ scorm: tracking.scorm, weights: progressWeight, isSceneId, dev: tracking.dev })
  const GameContext = createContext<GameContextValue<S> | null>(null)

  function GameProvider({ startScene, paused = false, children }: GameProviderProps<S>) {
    // Progress saved in the LMS from a previous session, read once.
    const [saved] = useState(store.load)
    // Inside an LMS the learner's name comes from it.
    const [lmsName] = useState(tracking.learnerName)
    const [playerName, setPlayerNameState] = useState<string | null>(lmsName ?? saved?.name ?? null)
    // Where the game goes on: the saved scene, or the first one.
    const [entryScene] = useState<S>(() => startScene ?? saved?.at ?? initialScene({ lmsName }))
    const [hasProgress] = useState(
      () => saved !== null && (saved.done.length > 0 || saved.at !== initialScene({ lmsName })),
    )
    const [sceneId, setSceneId] = useState<S>(() => (startScene === undefined && titleScene) || entryScene)
    const [gender, setGenderState] = useState<Gender>(saved?.gender ?? 'neutral')
    const [curtainClosed, setCurtainClosed] = useState(true)
    const [sceneReady, setSceneReady] = useState(false)
    const transitioning = useRef(false)
    const progress = useRef<Progress<S>>({
      name: lmsName ? null : (saved?.name ?? null),
      gender: saved?.gender ?? null,
      done: saved?.done ?? [],
      // The title scene is never saved: progress stays on the scene to resume.
      at: entryScene,
    })
    const onTitle = useRef(sceneId === titleScene)
    const reportedScene = useRef<S | null>(null)

    // A first session starts as "incomplete" with 0% progress.
    useEffect(() => {
      if (!saved) store.save(progress.current)
    }, [saved])

    useEffect(() => {
      // Guard against the double effect of React's development mode.
      if (reportedScene.current === sceneId) return
      reportedScene.current = sceneId
      tracking.xapi.sceneExperienced(sceneId)
    }, [sceneId])

    // Every new scene starts behind the closed curtain and fades in.
    useEffect(() => {
      let timer: ReturnType<typeof setTimeout> | undefined
      let frame = requestAnimationFrame(() => {
        // Second frame so the closed curtain is painted before it starts to open.
        frame = requestAnimationFrame(() => {
          setCurtainClosed(false)
          timer = setTimeout(() => {
            transitioning.current = false
            setSceneReady(true)
          }, transitionMs)
        })
      })
      return () => {
        cancelAnimationFrame(frame)
        clearTimeout(timer)
      }
    }, [sceneId])

    const setPlayerName = useCallback((value: string) => {
      progress.current.name = value
      setPlayerNameState(value)
    }, [])

    const setGender = useCallback((value: Gender) => {
      progress.current.gender = value
      setGenderState(value)
    }, [])

    const goTo = useCallback((next: S) => {
      if (transitioning.current) return
      transitioning.current = true
      // Leaving a scene completes it; leaving the title scene does not.
      const current = progress.current
      const done = !onTitle.current && progressWeight[current.at] > 0 && !current.done.includes(current.at)
      onTitle.current = next === titleScene
      progress.current = {
        ...current,
        done: done ? [...current.done, current.at] : current.done,
        at: onTitle.current ? current.at : next,
      }
      store.save(progress.current)
      setCurtainClosed(true)
      setTimeout(() => {
        setSceneReady(false)
        setSceneId(next)
      }, transitionMs)
    }, [])

    const text = useCallback((value: GenderedText) => resolveText(value, gender), [gender])

    const start = useCallback(() => goTo(entryScene), [goTo, entryScene])

    const value = useMemo<GameContextValue<S>>(
      () => ({
        sceneId,
        playerName,
        setPlayerName,
        gender,
        setGender,
        goTo,
        sceneReady,
        curtainClosed,
        paused,
        text,
        hasProgress,
        start,
      }),
      [sceneId, playerName, setPlayerName, gender, setGender, goTo, sceneReady, curtainClosed, paused, text, hasProgress, start],
    )

    return <GameContext value={value}>{children}</GameContext>
  }

  function useGame(): GameContextValue<S> {
    const game = useContext(GameContext)
    if (!game) throw new Error('useGame must be used inside <GameProvider>')
    return game
  }

  function CurrentScene({ scenes }: CurrentSceneProps<S>) {
    const { sceneId } = useGame()
    const Scene: ComponentType = scenes[sceneId]
    return <Scene key={sceneId} />
  }

  return { GameProvider, useGame, CurrentScene, isSceneId }
}
