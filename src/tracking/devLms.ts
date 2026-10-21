// Development only: with ?lms=local, a minimal SCORM 1.2 LMS stored in
// localStorage is installed as window.API, so resuming can be tested by
// reloading the page. ?lms=reset clears it.

const STORAGE_KEY = 'slxd-dev-lms'

type Cmi = Record<string, string>

const initialCmi: Cmi = {
  'cmi.core.student_id': 'dev-learner',
  'cmi.core.student_name': 'Prueba, Alumno',
  'cmi.core.lesson_status': 'not attempted',
  'cmi.core.lesson_location': '',
  'cmi.core.entry': 'ab-initio',
  'cmi.core.score.raw': '',
  'cmi.suspend_data': '',
}

function read(): Cmi {
  try {
    return { ...initialCmi, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  } catch {
    return { ...initialCmi }
  }
}

export function installDevLms(): void {
  const mode = new URLSearchParams(window.location.search).get('lms')
  if (mode === 'reset') localStorage.removeItem(STORAGE_KEY)
  if (mode !== 'local' && mode !== 'reset') return

  const cmi = read()
  if (cmi['cmi.suspend_data']) cmi['cmi.core.entry'] = 'resume'
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(cmi))

  Object.assign(window, {
    API: {
      LMSInitialize: () => 'true',
      LMSFinish: () => (save(), 'true'),
      LMSCommit: () => (save(), 'true'),
      LMSGetValue: (key: string) => cmi[key] ?? '',
      LMSSetValue: (key: string, value: string) => ((cmi[key] = String(value)), 'true'),
      LMSGetLastError: () => '0',
      LMSGetErrorString: () => '',
      LMSGetDiagnostic: () => '',
    },
  })
  console.info('[dev-lms] SCORM 1.2 LMS stored in localStorage', cmi)
}
