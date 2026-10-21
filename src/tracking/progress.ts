import type { Result, ScormSession } from '@studiolxd/scorm'
import type { Gender } from '../text/gendered.ts'

// Course progress stored in the LMS (SCORM 1.2):
//   cmi.suspend_data          name (outside an LMS), form of address, completed scenes and current scene (to resume)
//   cmi.core.lesson_location  current scene
//   cmi.core.score.raw        % of script scenes completed (0–100), used as progress
//   cmi.core.lesson_status    "incomplete" until every scene is done, then "completed"
// SCORM 1.2 limits suspend_data to 4096 characters; scene ids keep it small.

export interface Progress<S extends string> {
  /** Name typed by the player; inside an LMS the name comes from the LMS instead. */
  name: string | null
  gender: Gender | null
  done: S[]
  at: S
}

export interface ProgressStore<S extends string> {
  load: () => Progress<S> | null
  save: (progress: Progress<S>) => void
  percent: (done: readonly S[]) => number
}

interface ProgressStoreOptions<S extends string> {
  scorm: ScormSession
  /** How many script scenes each game scene covers; scenes outside the script count 0. */
  weights: Record<S, number>
  isSceneId: (value: unknown) => value is S
  dev: boolean
}

const FORMAT_VERSION = 1
const genderCode: Record<Gender, string> = { male: 'm', female: 'f', neutral: 'n' }
const genderFromCode: Record<string, Gender> = { m: 'male', f: 'female', n: 'neutral' }

export function createProgressStore<S extends string>({
  scorm,
  weights,
  isSceneId,
  dev,
}: ProgressStoreOptions<S>): ProgressStore<S> {
  const totalWeight = Object.values<number>(weights).reduce((sum, weight) => sum + weight, 0)

  function check<T>(result: Result<T, unknown> | undefined, operation: string): void {
    if (dev && result && !result.ok) console.warn(`[progress] ${operation} failed`, result.error)
  }

  function load(): Progress<S> | null {
    const result = scorm.api?.getSuspendData()
    if (!result?.ok || !result.value) return null
    try {
      const data = JSON.parse(result.value)
      if (data.v !== FORMAT_VERSION || !isSceneId(data.at)) return null
      return {
        name: typeof data.n === 'string' && data.n ? data.n : null,
        gender: genderFromCode[data.g] ?? null,
        done: Array.isArray(data.d) ? data.d.filter(isSceneId) : [],
        at: data.at,
      }
    } catch {
      return null
    }
  }

  function percent(done: readonly S[]): number {
    const completed = [...new Set(done)].reduce((sum, id) => sum + weights[id], 0)
    return totalWeight === 0 ? 0 : Math.round((completed / totalWeight) * 100)
  }

  function save(progress: Progress<S>): void {
    const api = scorm.api
    if (!api) return
    const data = {
      v: FORMAT_VERSION,
      n: progress.name,
      g: progress.gender ? genderCode[progress.gender] : null,
      d: progress.done,
      at: progress.at,
    }
    const value = percent(progress.done)
    check(api.setSuspendData(JSON.stringify(data)), 'setSuspendData')
    check(api.setLocation(progress.at), 'setLocation')
    check(api.setScore({ raw: value, min: 0, max: 100 }), 'setScore')
    check(value === 100 ? api.setComplete() : api.setIncomplete(), 'setStatus')
    check(scorm.commit(), 'commit')
  }

  return { load, save, percent }
}
