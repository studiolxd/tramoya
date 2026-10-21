import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { zipSync } from 'fflate'

export interface ScormPackageOptions {
  /** Project folder, with package.json and the production build. */
  root: string
  /** Course title shown by the LMS. */
  title: string
  /** Manifest identifier; defaults to com.studiolxd.<package name>. */
  identifier?: string
  /** Build folder, relative to root. */
  distDir?: string
  /** Output folder, relative to root. */
  releaseDir?: string
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)])),
  )
  return files.flat()
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function manifest(identifier: string, title: string, version: string, files: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${escapeXml(identifier)}" version="${escapeXml(version)}"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org">
    <organization identifier="org">
      <title>${escapeXml(title)}</title>
      <item identifier="item" identifierref="resource" isvisible="true">
        <title>${escapeXml(title)}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource" type="webcontent" adlcp:scormtype="sco" href="index.html">
${files.map((file) => `      <file href="${escapeXml(file)}"/>`).join('\n')}
    </resource>
  </resources>
</manifest>
`
}

// Packages the production build as a SCORM 1.2 zip ready to upload to an
// LMS: <releaseDir>/<package name>-scorm12-<version>.zip. Each client's xAPI
// settings go in xapi.config.json, at the root of the zip; it can be edited
// without rebuilding. Returns the path of the zip.
export async function createScormPackage({
  root,
  title,
  identifier,
  distDir = 'dist',
  releaseDir = 'release',
}: ScormPackageOptions): Promise<string> {
  const { name, version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as { name: string; version: string }
  const dist = join(root, distDir)
  const paths = (await listFiles(dist)).sort()
  const relativePaths = paths.map((path) => relative(dist, path).split(sep).join('/'))

  const entries: Record<string, Uint8Array> = {
    'imsmanifest.xml': new TextEncoder().encode(manifest(identifier ?? `com.studiolxd.${name}`, title, version, relativePaths)),
  }
  for (const [index, path] of paths.entries()) entries[relativePaths[index]] = await readFile(path)

  const release = join(root, releaseDir)
  await mkdir(release, { recursive: true })
  const target = join(release, `${name}-scorm12-${version}.zip`)
  await writeFile(target, zipSync(entries, { level: 9 }))
  console.log(`SCORM 1.2 package: ${relative(root, target)} (${relativePaths.length} files)`)
  return target
}
