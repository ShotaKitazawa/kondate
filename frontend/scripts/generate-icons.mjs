import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(resolve(__dirname, "../public/favicon.svg"));

for (const size of [192, 512]) {
  await sharp(svg)
    .resize(size)
    .png()
    .toFile(resolve(__dirname, `../public/icon-${size}.png`));
  console.log(`Generated icon-${size}.png`);
}
