// Generates icon-192.png and icon-512.png for the Kindrest PWA
// Brand: chocolate bg #30211a, mustard K #c9981f

import sharp from 'sharp'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')

function makeSVG(size) {
  const cx = size / 2
  const cy = size / 2

  // Scale the K relative to icon size — fills ~60% of the square
  const fontSize = Math.round(size * 0.62)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&amp;display=swap');
    </style>
  </defs>

  <!-- Chocolate background -->
  <rect width="${size}" height="${size}" fill="#30211a" rx="${Math.round(size * 0.22)}"/>

  <!-- Subtle warm inner glow -->
  <radialGradient id="glow" cx="50%" cy="48%" r="52%">
    <stop offset="0%"  stop-color="#4a2e24" stop-opacity="1"/>
    <stop offset="100%" stop-color="#30211a" stop-opacity="1"/>
  </radialGradient>
  <rect width="${size}" height="${size}" fill="url(#glow)" rx="${Math.round(size * 0.22)}"/>

  <!-- Mustard K — geometric, bold, clean at small sizes -->
  <text
    x="${cx}"
    y="${cy + fontSize * 0.35}"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${fontSize}"
    font-weight="bold"
    font-style="italic"
    fill="#c9981f"
    text-anchor="middle"
    letter-spacing="-2"
  >K</text>

  <!-- Subtle mustard underline accent -->
  <rect
    x="${cx - size * 0.18}"
    y="${cy + fontSize * 0.42}"
    width="${size * 0.36}"
    height="${Math.max(2, Math.round(size * 0.018))}"
    fill="#c9981f"
    opacity="0.6"
    rx="${Math.round(size * 0.01)}"
  />
</svg>`
}

async function generateIcon(size, filename) {
  const svg = Buffer.from(makeSVG(size))
  const outPath = `${publicDir}/${filename}`
  await sharp(svg).png().toFile(outPath)
  console.log(`✓ Generated ${filename} (${size}×${size})`)
}

await generateIcon(192, 'icon-192.png')
await generateIcon(512, 'icon-512.png')
console.log('\n✓ Both PWA icons written to /public')
