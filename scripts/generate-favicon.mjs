/**
 * Generates public/favicon.png from public/detailopslogo.png.
 * Run: node scripts/generate-favicon.mjs
 * The app uses /favicon.png (and /favicon.ico via rewrite).
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const logoPath = path.join(root, 'public', 'detailopslogo.png');
const outPath = path.join(root, 'public', 'favicon.png');

const FAVICON_SIZE = 64;
const ICON_SIZE = 38;
const BG_TOLERANCE = 45;
// Crop wider than square so the full "DO" icon is included (not cut off on the right)
const CROP_WIDTH = 420;
const CROP_HEIGHT = 387;

async function main() {
  const buffer = fs.readFileSync(logoPath);
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const cropW = Math.min(CROP_WIDTH, w);
  const cropH = Math.min(CROP_HEIGHT, h);
  if (cropW <= 0 || cropH <= 0) throw new Error('Invalid logo size');

  const cropped = sharp(buffer).extract({ left: 0, top: 0, width: cropW, height: cropH });
  const { data, info } = await cropped.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  const stride = channels;

  const r0 = data[0];
  const g0 = data[1];
  const b0 = data[2];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * stride;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dr = Math.abs(r - r0);
      const dg = Math.abs(g - g0);
      const db = Math.abs(b - b0);
      if (dr <= BG_TOLERANCE && dg <= BG_TOLERANCE && db <= BG_TOLERANCE) {
        data[i + 3] = 0;
      }
    }
  }

  const noBg = await sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  const iconBuf = await sharp(noBg)
    .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const left = Math.round((FAVICON_SIZE - ICON_SIZE) / 2);
  const resized = await sharp({
    create: { width: FAVICON_SIZE, height: FAVICON_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: iconBuf, left, top: left }])
    .png()
    .toBuffer();

  fs.writeFileSync(outPath, resized);
  console.log('Wrote', outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
