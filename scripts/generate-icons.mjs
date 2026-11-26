// Generates the PWA icons (the only bitmaps besides desk-scene.png) from code-drawn SVG.
// Run with: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

// Art is drawn on a 512 grid. `scale` shrinks it toward the center for the maskable safe zone.
function iconSvg(scale) {
  const t = `translate(256 256) scale(${scale}) translate(-256 -256)`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0" stop-color="#1a0a2e"/>
      <stop offset="1" stop-color="#0d0514"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="60%" r="50%">
      <stop offset="0" stop-color="#ffaa44" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffaa44" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dcebff" stop-opacity="0.38"/>
      <stop offset="0.5" stop-color="#bedcff" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#dcebff" stop-opacity="0.3"/>
    </linearGradient>
    <radialGradient id="orange" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#ffb066"/><stop offset="0.45" stop-color="#ff7a1f"/><stop offset="1" stop-color="#c85a00"/>
    </radialGradient>
    <radialGradient id="purple" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#a070d0"/><stop offset="0.45" stop-color="#5b2a86"/><stop offset="1" stop-color="#2e1048"/>
    </radialGradient>
    <radialGradient id="green" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#b2f09a"/><stop offset="0.45" stop-color="#6fcb4f"/><stop offset="1" stop-color="#35a050"/>
    </radialGradient>
    <linearGradient id="lid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6a4a8c"/><stop offset="1" stop-color="#3a2058"/>
    </linearGradient>
    <clipPath id="body"><path d="M146 172 H366 Q392 172 392 200 V404 Q392 436 360 436 H152 Q120 436 120 404 V200 Q120 172 146 172 Z"/></clipPath>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="${t}">
    <ellipse cx="256" cy="300" rx="190" ry="170" fill="url(#glow)"/>
    <ellipse cx="256" cy="444" rx="150" ry="14" fill="#000" fill-opacity="0.4"/>
    <g clip-path="url(#body)">
      <circle cx="200" cy="378" r="46" fill="url(#orange)"/>
      <circle cx="312" cy="384" r="42" fill="url(#purple)"/>
      <circle cx="256" cy="330" r="40" fill="url(#green)"/>
      <circle cx="184" cy="364" r="12" fill="#fff" fill-opacity="0.55"/>
      <circle cx="298" cy="372" r="10" fill="#fff" fill-opacity="0.4"/>
      <circle cx="242" cy="318" r="10" fill="#fff" fill-opacity="0.55"/>
    </g>
    <path d="M146 172 H366 Q392 172 392 200 V404 Q392 436 360 436 H152 Q120 436 120 404 V200 Q120 172 146 172 Z" fill="url(#glass)" stroke="#dcebff" stroke-opacity="0.8" stroke-width="6"/>
    <rect x="136" y="150" width="240" height="28" rx="12" fill="#dcebff" fill-opacity="0.55" stroke="#dcebff" stroke-width="3"/>
    <path d="M148 206 V380" stroke="#fff" stroke-opacity="0.7" stroke-width="10" stroke-linecap="round"/>
    <path d="M168 196 V212" stroke="#fff" stroke-opacity="0.5" stroke-width="8" stroke-linecap="round"/>
    <rect x="128" y="108" width="256" height="50" rx="14" fill="url(#lid)" stroke="#8a6ab0" stroke-width="3"/>
    <rect x="140" y="114" width="232" height="8" rx="4" fill="#fff" fill-opacity="0.2"/>
    <circle cx="256" cy="86" r="30" fill="url(#lid)" stroke="#8a6ab0" stroke-width="3"/>
    <circle cx="246" cy="76" r="8" fill="#fff" fill-opacity="0.45"/>
  </g>
</svg>`
}

const targets = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  // Art spans about 0.1..0.9 of the grid; 0.72 keeps it inside the central 80 percent circle.
  { file: 'icon-maskable-512.png', size: 512, scale: 0.72 },
]

mkdirSync(outDir, { recursive: true })
for (const { file, size, scale } of targets) {
  const png = new Resvg(iconSvg(scale), { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(join(outDir, file), png)
  console.log(`wrote public/icons/${file} (${size}x${size})`)
}
