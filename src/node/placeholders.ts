// Generates flat geometric PNG placeholders for a game's assets, so final
// artwork can later replace each file with the same name and size. Existing
// files are kept unless `force` is set. Needs the optional peer `sharp`.

import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export type PlaceholderShape = 'rect' | 'rounded' | 'circle'

export interface PlaceholderAsset {
  /** Path inside the public folder. */
  path: string
  width: number
  height: number
}

export interface Placeholder {
  /** `rect` for backgrounds (labelled in a corner); other shapes are labelled in the centre. */
  shape: PlaceholderShape
  color: string
  label: string
}

export interface PlaceholderOptions<Id extends string> {
  publicDir: string
  assets: Record<Id, PlaceholderAsset>
  placeholders: Record<Id, Placeholder>
  force?: boolean
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function shapeSvg(shape: PlaceholderShape, width: number, height: number, color: string): string {
  switch (shape) {
    case 'rect':
      return `<rect width="${width}" height="${height}" fill="${color}"/>`
    case 'rounded':
      return `<rect width="${width}" height="${height}" rx="${Math.min(width, height) / 2}" fill="${color}"/>`
    case 'circle':
      return `<circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 2}" fill="${color}"/>`
  }
}

function placeholderSvg({ width, height, path }: PlaceholderAsset, { shape, color, label }: Placeholder): string {
  const size = Math.max(14, Math.round(Math.min(width, height) / 14))
  const fileName = path.split('/').pop() ?? path
  const details = escapeXml(`${fileName} · ${width}×${height}`)

  // Backgrounds carry a small label in the bottom-left corner, where the
  // interface rarely sits; other shapes are labelled in the centre.
  if (shape === 'rect') {
    const small = Math.round(size * 0.45)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  ${shapeSvg(shape, width, height, color)}
  <g font-family="Helvetica, Arial, sans-serif" fill="#1d1d1f" opacity="0.6">
    <text x="${small}" y="${height - small * 2.6}" font-size="${small}" font-weight="700">${escapeXml(label)}</text>
    <text x="${small}" y="${height - small}" font-size="${small * 0.8}">${details}</text>
  </g>
</svg>`
  }

  const showDetails = shape !== 'circle'
  const labelY = showDetails ? height / 2 - size * 0.4 : height / 2 + size * 0.35
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  ${shapeSvg(shape, width, height, color)}
  <g font-family="Helvetica, Arial, sans-serif" fill="#1d1d1f" text-anchor="middle">
    <text x="50%" y="${labelY}" font-size="${size}" font-weight="700">${escapeXml(label)}</text>
    ${showDetails ? `<text x="50%" y="${labelY + size * 1.4}" font-size="${size * 0.6}">${details}</text>` : ''}
  </g>
</svg>`
}

/** Returns how many placeholders were created. */
export async function generatePlaceholders<Id extends string>({
  publicDir,
  assets,
  placeholders,
  force = false,
}: PlaceholderOptions<Id>): Promise<number> {
  const { default: sharp } = await import('sharp')
  let created = 0
  for (const id of Object.keys(assets) as Id[]) {
    const asset = assets[id]
    const target = join(publicDir, asset.path)
    if (existsSync(target) && !force) continue
    await mkdir(dirname(target), { recursive: true })
    await sharp(Buffer.from(placeholderSvg(asset, placeholders[id]))).png().toFile(target)
    console.log(`created ${asset.path}`)
    created++
  }
  return created
}
