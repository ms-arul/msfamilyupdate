import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.join(__dirname, 'public', 'mslogo.png');
const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Android mipmap icon sizes
const mipmapSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Foreground icon sizes (for adaptive icons - needs padding)
const foregroundSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function generateIcons() {
  for (const [dir, size] of Object.entries(mipmapSizes)) {
    const outputDir = path.join(resDir, dir);

    // ic_launcher.png - standard launcher icon
    await sharp(logoPath)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, 'ic_launcher.png'));
    console.log(`Generated ${dir}/ic_launcher.png (${size}x${size})`);

    // ic_launcher_round.png - round launcher icon
    const roundMask = Buffer.from(
      `<svg width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
      </svg>`
    );

    await sharp(logoPath)
      .resize(size, size, { fit: 'cover' })
      .composite([{
        input: roundMask,
        blend: 'dest-in'
      }])
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_round.png'));
    console.log(`Generated ${dir}/ic_launcher_round.png (${size}x${size})`);
  }

  // Generate foreground icons for adaptive icons
  for (const [dir, size] of Object.entries(foregroundSizes)) {
    const outputDir = path.join(resDir, dir);

    // ic_launcher_foreground.png - with padding for adaptive icon safe zone
    const iconSize = Math.round(size * 0.65); // 65% of the total size (safe zone)
    await sharp(logoPath)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .extend({
        top: Math.round((size - iconSize) / 2),
        bottom: Math.round((size - iconSize) / 2),
        left: Math.round((size - iconSize) / 2),
        right: Math.round((size - iconSize) / 2),
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .resize(size, size) // ensure exact size after extend rounding
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));
    console.log(`Generated ${dir}/ic_launcher_foreground.png (${size}x${size})`);
  }

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
