#!/usr/bin/env node
/**
 * PWA icon generator.
 *
 * Reads frontend/public/favicon.svg and emits all the raster PWA + social
 * assets that a Lighthouse 95+ PWA / SEO audit expects:
 *
 *   frontend/public/icon-192.png            192×192  — Android home screen
 *   frontend/public/icon-512.png            512×512  — Android splash / high-res
 *   frontend/public/icon-192-maskable.png   192×192  — safe-zone masked
 *   frontend/public/icon-512-maskable.png   512×512  — safe-zone masked
 *   frontend/public/apple-touch-icon.png    180×180  — iOS home screen
 *   frontend/public/og-image.png           1200×630  — OpenGraph / Twitter Card
 *
 * Run:
 *   cd scripts && npm run icons
 *
 * Only needed when favicon.svg or brand colors change — the PNG outputs
 * are committed so CI doesn't need to re-run this on every build.
 */

import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'frontend', 'public');
const SOURCE_SVG = path.join(PUBLIC_DIR, 'favicon.svg');

// Brand palette — matches tailwind tokens in the app (birik lime + ink)
const INK = { r: 10, g: 10, b: 10, alpha: 1 };

async function ensureDir(dir) {
  try { await mkdir(dir, { recursive: true }); } catch { /* already exists */ }
}

async function writeOut(filename, buffer) {
  const full = path.join(PUBLIC_DIR, filename);
  await writeFile(full, buffer);
  console.log(`  ✓ ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

/**
 * Basic square icon — resize the SVG to the target box with no padding.
 * The favicon is already a lime tile with rounded corners, so this works
 * for both the standard and "any" maskable purpose on well-behaved hosts.
 */
async function renderIcon(svgBuffer, size) {
  return sharp(svgBuffer, { density: 300 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Maskable icon — Android crops a mask-shaped viewport out of the icon
 * (circle / rounded-square / squircle depending on OEM). Spec requires
 * the logo to sit inside an 80% safe zone, with the outer 10% on each
 * side reserved for the mask. We do this by placing a scaled icon on
 * a full-bleed lime background so cropping is cosmetic, not mutilating.
 */
async function renderMaskable(svgBuffer, size) {
  const inner = Math.round(size * 0.7); // 70% logo in center = safe for any mask
  const logo = await sharp(svgBuffer, { density: 300 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Lime canvas same color as the favicon tile (#C4FF4D)
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 196, g: 255, b: 77, alpha: 1 } },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * OpenGraph / Twitter card — 1200×630 dark canvas with the logo centered.
 * Keeping it deliberately minimal: raster logo on ink background, no
 * typography (typography in OG images tends to look bad on mobile previews
 * where the image is ~600px wide). Social hosts (Slack, WhatsApp, X, FB)
 * need a raster here; SVG does not embed.
 */
async function renderOgImage(svgBuffer) {
  const logoSize = 320;
  const logo = await sharp(svgBuffer, { density: 300 })
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: { width: 1200, height: 630, channels: 4, background: INK },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  console.log(`Reading ${path.relative(REPO_ROOT, SOURCE_SVG)}`);
  const svgBuffer = await readFile(SOURCE_SVG);
  await ensureDir(PUBLIC_DIR);

  console.log('\nRendering icons:');
  await writeOut('icon-192.png', await renderIcon(svgBuffer, 192));
  await writeOut('icon-512.png', await renderIcon(svgBuffer, 512));
  await writeOut('icon-192-maskable.png', await renderMaskable(svgBuffer, 192));
  await writeOut('icon-512-maskable.png', await renderMaskable(svgBuffer, 512));
  await writeOut('apple-touch-icon.png', await renderIcon(svgBuffer, 180));
  await writeOut('og-image.png', await renderOgImage(svgBuffer));

  console.log('\nAll icons written. Next:');
  console.log('  1. Verify manifest.json + index.html reference these filenames.');
  console.log('  2. Commit the PNGs.');
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
