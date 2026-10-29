import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDirectory = path.resolve('public/images');
const outputDirectory = path.join(sourceDirectory, 'responsive');
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png']);
const targetWidths = [480, 800, 1200];

await mkdir(outputDirectory, { recursive: true });

const entries = await readdir(sourceDirectory, { withFileTypes: true });
const sources = entries
  .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
  .map((entry) => path.join(sourceDirectory, entry.name));

for (const source of sources) {
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read image dimensions: ${source}`);
  }

  const widths = [...new Set(targetWidths.map((width) => Math.min(width, metadata.width!)))];
  const outputName = path.basename(source, path.extname(source));
  for (const width of widths) {
    const output = path.join(outputDirectory, `${outputName}-${width}.webp`);
    await sharp(source)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78, effort: 5 })
      .toFile(output);
  }
}

console.log(`Generated ${sources.length} responsive WebP image sets in ${outputDirectory}.`);
