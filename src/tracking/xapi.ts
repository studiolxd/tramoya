import { createMemoryLrs, createXapiClient, VERBS, type XapiClient } from '@studiolxd/xapi'
import type { ScormSession } from '@studiolxd/scorm'

// Optional xAPI tracking. It is configured per client in xapi.config.json,
// next to index.html in the SCORM package, and stays off unless that file
// says "enabled": true. During development, ?xapi=mock sends the statements
// to an in-memory LRS and logs them.

interface XapiConfig {
  enabled: boolean
  /** In-memory LRS, for tests and demos. */
  mock?: boolean
  endpoint?: string
  auth?: { username: string; password: string } | { token: string }
  /** LMS address; together with the SCORM learner id it identifies the learner. */
  lmsHomePage?: string
  /** Base IRI of the course activities. */
  activityIriBase?: string
}

export interface XapiOptions {
  scorm: ScormSession
  dev: boolean
  /** Where xapi.config.json is served from, e.g. import.meta.env.BASE_URL. */
  baseUrl: string
  /** Language of names in the statements, e.g. 'es-ES'. */
  language: string
  /** Activity IRI base used with ?xapi=mock during development. */
  mockActivityIriBase: string
}

/** A true/false question, e.g. "is this person a food handler?". */
export interface TrueFalseAnswer {
  activityId: string
  activityName: string
  questionId: string
  question: string
  response: boolean
  correctResponse: boolean
}

export interface XapiTracker {
  sceneExperienced: (sceneId: string) => void
  activityAttempted: (activityId: string, name: string) => void
  activityCompleted: (activityId: string, name: string, correct: number, total: number) => void
  answered: (answer: TrueFalseAnswer) => void
}

type StatementInput = Parameters<XapiClient['buildStatement']>[0]

interface Tracker {
  client: XapiClient
  base: string
}

const INTERACTION_TYPE = 'http://adlnet.gov/expapi/activities/cmi.interaction'
const ACTIVITY_TYPE = 'http://adlnet.gov/expapi/activities/assessment'

export function createXapiTracker({ scorm, dev, baseUrl, language, mockActivityIriBase }: XapiOptions): XapiTracker {
  async function loadConfig(): Promise<XapiConfig | null> {
    if (dev && new URLSearchParams(window.location.search).get('xapi') === 'mock') {
      return { enabled: true, mock: true, lmsHomePage: 'https://lms.example.com', activityIriBase: mockActivityIriBase }
    }
    try {
      const response = await fetch(`${baseUrl}xapi.config.json`, { cache: 'no-store' })
      return response.ok ? ((await response.json()) as XapiConfig) : null
    } catch {
      return null
    }
  }

  async function createTracker(): Promise<Tracker | null> {
    const config = await loadConfig()
    if (!config?.enabled) return null
    if (!config.lmsHomePage || !config.activityIriBase || (!config.mock && !config.endpoint)) {
      console.warn('[xapi] xapi.config.json is enabled but incomplete; xAPI tracking is off.')
      return null
    }
    const learnerId = scorm.api?.getLearnerId()
    const learnerName = scorm.api?.getLearnerName()
    const lrs = config.mock ? createMemoryLrs() : null
    const client = createXapiClient({
      endpoint: lrs ? 'https://mock.lrs/xapi/' : config.endpoint!,
      auth: config.auth,
      fetch: lrs?.fetch,
      debug: dev,
      defaults: {
        actor: {
          account: { homePage: config.lmsHomePage, name: (learnerId?.ok && learnerId.value) || 'anonymous' },
          ...(learnerName?.ok && learnerName.value ? { name: learnerName.value } : {}),
        },
      },
    })
    return { client, base: config.activityIriBase.replace(/\/$/, '') }
  }

  let tracker: Promise<Tracker | null> | null = null

  async function send(build: (base: string) => StatementInput): Promise<void> {
    tracker ??= createTracker()
    const current = await tracker
    if (!current) return
    const statement = current.client.buildStatement(build(current.base))
    const result = await current.client.sendStatement(statement)
    if (!result.ok) console.warn('[xapi] statement not sent', result.error)
    else if (dev) console.info('[xapi]', statement.verb.id, statement.object)
  }

  const activity = (base: string, id: string, name: string) => ({
    id: `${base}/activities/${id}`,
    definition: { type: ACTIVITY_TYPE, name: { [language]: name } },
  })

  return {
    sceneExperienced(sceneId) {
      void send((base) => ({ verb: VERBS.experienced, object: `${base}/scenes/${sceneId}` }))
    },

    activityAttempted(activityId, name) {
      void send((base) => ({ verb: VERBS.attempted, object: activity(base, activityId, name) }))
    },

    activityCompleted(activityId, name, correct, total) {
      void send((base) => ({
        verb: VERBS.completed,
        object: activity(base, activityId, name),
        result: { completion: true, score: { raw: correct, min: 0, max: total, scaled: total ? correct / total : 0 } },
      }))
    },

    answered(answer) {
      void send((base) => ({
        verb: VERBS.answered,
        object: {
          id: `${base}/activities/${answer.activityId}/questions/${answer.questionId}`,
          definition: {
            type: INTERACTION_TYPE,
            name: { [language]: answer.question },
            interactionType: 'true-false',
            correctResponsesPattern: [String(answer.correctResponse)],
          },
        },
        result: { response: String(answer.response), success: answer.response === answer.correctResponse },
        context: { contextActivities: { parent: [{ id: activity(base, answer.activityId, answer.activityName).id }] } },
      }))
    },
  }
}
