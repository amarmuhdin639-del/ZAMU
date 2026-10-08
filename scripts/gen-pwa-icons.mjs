// Generates ZAMU PWA icons (bone-inverse: ink background, cream geometric Z, red chip)
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const INK = '#141412'
const CREAM = '#faf9f5'
const RED = '#e0401f'

function iconSvg(size, scale = 1) {
  // Z drawn in a 512 coordinate space then scaled
  const s = (n) => n * scale
  return Buffer.from(`
  <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="${INK}"/>
    <g transform="translate(${s(118)}, ${s(112)}) scale(${scale})">
      <rect x="0" y="0" width="276" height="62" fill="${CREAM}"/>
      <rect x="0" y="226" width="276" height="62" fill="${CREAM}"/>
      <polygon points="276,0 276,72 0,288 0,216" fill="${CREAM}"/>

    </g>
  </svg>`)
}

async function main() {
  const pub = path.resolve(__dirname, '..', 'public')
  const icons = path.join(pub, 'icons')
  const app = path.resolve(__dirname, '..', 'src', 'app')

  await sharp(iconSvg(512, 1)).png().toFile(path.join(icons, 'icon-512.png'))
  await sharp(iconSvg(192, 1)).png().toFile(path.join(icons, 'icon-192.png'))
  // maskable: content scaled down inside full-bleed background (safe zone)
  await sharp(iconSvg(512, 0.72)).png().toFile(path.join(icons, 'maskable-512.png'))
  // apple touch icon (iOS home screen, 180)
  await sharp(iconSvg(180, 1)).png().toFile(path.join(icons, 'apple-touch-icon.png'))
  // Next.js favicon / app icons
  await sharp(iconSvg(256, 1)).png().toFile(path.join(app, 'icon.png'))
  await sharp(iconSvg(180, 1)).png().toFile(path.join(app, 'apple-icon.png'))

  console.log('ZAMU PWA icons generated')
}

main().catch((e) => { console.error(e); process.exit(1) })
