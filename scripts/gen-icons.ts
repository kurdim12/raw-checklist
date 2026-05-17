/**
 * One-shot icon generator. Reads public/icon.svg and writes PNG icons
 * required by the manifest + iOS. Re-run after changing the SVG:
 *   $ npx tsx scripts/gen-icons.ts
 */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', 'public');

interface Target {
  out: string;
  size: number;
  maskablePadding?: number;
}

const targets: Target[] = [
  { out: 'pwa-192.png',           size: 192 },
  { out: 'pwa-512.png',           size: 512 },
  { out: 'pwa-512-maskable.png',  size: 512, maskablePadding: 64 },
  { out: 'apple-touch-icon.png',  size: 180 },
  { out: 'favicon-32.png',        size: 32 },
];

async function main() {
  const svg = await readFile(resolve(root, 'icon.svg'));
  for (const t of targets) {
    let img = sharp(svg, { density: 384 }).resize(t.size, t.size);
    if (t.maskablePadding) {
      // PWA maskable: shrink the icon and pad with the brand color so the
      // safe-zone covers the OS mask shape (Android shape masking).
      const inner = t.size - t.maskablePadding * 2;
      img = sharp({
        create: {
          width: t.size,
          height: t.size,
          channels: 4,
          background: { r: 0x6f, g: 0x6b, b: 0x40, alpha: 1 },
        },
      })
        .composite([
          {
            input: await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer(),
            top: t.maskablePadding,
            left: t.maskablePadding,
          },
        ])
        .png();
    }
    const buf = await img.png().toBuffer();
    await writeFile(resolve(root, t.out), buf);
    process.stdout.write(`  ${t.out.padEnd(28)} ${t.size}x${t.size} (${buf.length} bytes)\n`);
  }
  process.stdout.write('Done.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
