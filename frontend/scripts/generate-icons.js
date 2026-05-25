/**
 * Wishly — PWA Icon Generator
 * Run: npm run generate-icons
 * Requires: sharp (npm install sharp --save-dev)
 */

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC_SVG = join(ROOT, 'public/icons/icon.svg')
const OUT_DIR = join(ROOT, 'public/icons')

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

const svgBuffer = readFileSync(SRC_SVG)

console.log('Generating PWA icons...')

for (const size of SIZES) {
  const outPath = join(OUT_DIR, `icon-${size}.png`)
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outPath)
  console.log(`  ✓ icon-${size}.png`)
}

// Also generate maskable version (192 + 512) with extra padding
for (const size of [192, 512]) {
  const padding = Math.round(size * 0.1)
  const inner = size - padding * 2
  const outPath = join(OUT_DIR, `icon-${size}-maskable.png`)
  await sharp(svgBuffer)
    .resize(inner, inner)
    .extend({
      top: padding, bottom: padding, left: padding, right: padding,
      background: { r: 74, g: 122, b: 80, alpha: 1 }, // #4A7A50
    })
    .png()
    .toFile(outPath)
  console.log(`  ✓ icon-${size}-maskable.png`)
}

console.log('\nDone! Icons saved to public/icons/')
