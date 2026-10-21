import type { ScormSession } from '@studiolxd/scorm'
import { lmsLearnerName } from './learner.ts'
import { startScorm } from './scorm.ts'
import { createXapiTracker, type XapiOptions, type XapiTracker } from './xapi.ts'

export interface TrackingOptions extends Omit<XapiOptions, 'scorm'> {
  /** Development mode (import.meta.env.DEV): debug logs, ?lms=local|reset and ?xapi=mock. */
  dev: boolean
}

export interface Tracking {
  scorm: ScormSession
  xapi: XapiTracker
  /** The learner's first name inside an LMS, or null. */
  learnerName: () => string | null
  dev: boolean
}

// Call it once, at module level: it starts the SCORM session for the page.
export function createTracking(options: TrackingOptions): Tracking {
  const scorm = startScorm(options.dev)
  return {
    scorm,
    xapi: createXapiTracker({ ...options, scorm }),
    learnerName: () => lmsLearnerName(scorm),
    dev: options.dev,
  }
}
