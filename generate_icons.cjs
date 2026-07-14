const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, 'public', 'msfamily.png');
const RES_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Android launcher icon sizes per density
const LAUNCHER_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Adaptive icon foreground sizes (108dp with 72dp safe zone, scaled)
const FOREGROUND_SIZES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function generateIcons() {
  console.log('🎨 Generating Android launcher icons from msfamily.png...\n');

  // Generate standard launcher icons (ic_launcher.png and ic_launcher_round.png)
  for (const [folder, size] of Object.entries(LAUNCHER_SIZES)) {
    const outputDir = path.join(RES_DIR, folder);
    
    // ic_launcher.png — square with white background
    const launcherPath = path.join(outputDir, 'ic_launcher.png');
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toFile(launcherPath);
    console.log(`  ✅ ${folder}/ic_launcher.png (${size}x${size})`);

    // ic_launcher_round.png — circular with white background
    const roundSize = size;
    const circleRadius = Math.floor(roundSize / 2);
    const circleMask = Buffer.from(
      `<svg width="${roundSize}" height="${roundSize}">
        <circle cx="${circleRadius}" cy="${circleRadius}" r="${circleRadius}" fill="white"/>
      </svg>`
    );

    await sharp(SOURCE)
      .resize(roundSize, roundSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_round.png'));
    console.log(`  ✅ ${folder}/ic_launcher_round.png (${roundSize}x${roundSize} round)`);
  }

  // Generate adaptive icon foregrounds (ic_launcher_foreground.png)
  // The foreground should have the logo centered with padding for the safe zone
  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    const outputDir = path.join(RES_DIR, folder);
    const logoSize = Math.floor(size * 0.55); // Logo takes ~55% of the foreground for safe zone

    // Create transparent canvas, place resized logo in center
    const resizedLogo = await sharp(SOURCE)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    })
      .composite([{
        input: resizedLogo,
        gravity: 'centre',
      }])
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));
    console.log(`  ✅ ${folder}/ic_launcher_foreground.png (${size}x${size}, logo ${logoSize}x${logoSize})`);
  }

  // Also update the drawable splash icon
  const splashPath = path.join(RES_DIR, 'drawable', 'splash.png');
  await sharp(SOURCE)
    .resize(288, 288, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(splashPath);
  console.log(`  ✅ drawable/splash.png (288x288)`);

  console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
