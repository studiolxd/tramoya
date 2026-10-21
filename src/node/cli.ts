#!/usr/bin/env node
// Command line tools for games built with Tramoya, run from the game folder.
//
//   tramoya scorm --title "Course title" [--identifier com.studiolxd.game]
//       Packages dist/ as a SCORM 1.2 zip in release/ (build first).

import { parseArgs } from 'node:util'
import { createScormPackage } from './scormPackage.ts'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    title: { type: 'string' },
    identifier: { type: 'string' },
  },
})

const [command] = positionals

if (command === 'scorm') {
  if (!values.title) {
    console.error('tramoya scorm: --title is required')
    process.exit(1)
  }
  await createScormPackage({ root: process.cwd(), title: values.title, identifier: values.identifier })
} else {
  console.error(`Usage: tramoya scorm --title "Course title" [--identifier id]`)
  process.exit(1)
}
