import type { ScormSession } from '@studiolxd/scorm'

// The learner's first name when the game runs inside an LMS, or null
// (no LMS, or the LMS gives no name). SCORM 1.2 usually sends
// cmi.core.student_name as "Last, First": the part after the comma is kept.
export function lmsLearnerName(scorm: ScormSession): string | null {
  if (!scorm.status.apiFound) return null
  const result = scorm.api?.getLearnerName()
  if (!result?.ok) return null
  const full = result.value.trim()
  if (!full) return null
  const first = full.includes(',') ? full.slice(full.indexOf(',') + 1).trim() : full
  return first || full
}
