import { autoTerminate, createScormSession, type ScormSession } from '@studiolxd/scorm'
import { installDevLms } from './devLms.ts'

// One SCORM 1.2 session per page load, created outside React: a terminated
// session cannot be initialized again, and React mounts components twice in
// development. Without an LMS (plain web preview) an in-memory mock is used.
export function startScorm(dev: boolean): ScormSession {
  if (dev) installDevLms()
  const scorm = createScormSession('1.2', { noLmsBehavior: 'mock', debug: dev })
  // Initializes now; records session time, commits and terminates on unload.
  autoTerminate(scorm)
  return scorm
}
