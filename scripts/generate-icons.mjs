import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

const sizes = [192, 512];
const svgPath = join(publicDir, 'tortu.svg');

async function generateIcons() {
  for (const size of sizes) {
    // Add padding and background color
    const padding = Math.floor(size * 0.15);
    const innerSize = size - (padding * 2);

    // First resize the SVG, then composite onto a colored background
    const resizedTurtle = await sharp(svgPath)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    // Create background with rounded corners and composite the turtle on top
    const roundedCorners = Buffer.from(
      `<svg width="${size}" height="${size}">
        <rect width="${size}" height="${size}" rx="${size * 0.2}" ry="${size * 0.2}" fill="#f5f0e8"/>
      </svg>`
    );

    await sharp(roundedCorners)
      .composite([
        {
          input: resizedTurtle,
          top: padding,
          left: padding,
        }
      ])
      .png()
      .toFile(join(iconsDir, `icon-${size}x${size}.png`));

    console.log(`Generated icon-${size}x${size}.png`);
  }
}

generateIcons().catch(console.error);
