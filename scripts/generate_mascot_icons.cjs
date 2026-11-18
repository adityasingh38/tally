const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const asset = (...parts) => path.join(root, 'assets', ...parts);
const native = (...parts) => path.join(root, ...parts);
const dark = '#0E0F0C';

async function main() {
  const svg = await fs.readFile(asset('tally-mascot-logo.svg'));

  async function mascot(size) {
    return sharp(svg).resize(size, size).png().toBuffer();
  }

  async function square(size, mascotSize, background) {
    const image = await mascot(mascotSize);
    return sharp({ create: { width: size, height: size, channels: 4, background } })
      .composite([{ input: image, left: Math.floor((size - mascotSize) / 2), top: Math.floor((size - mascotSize) / 2) }])
      .png()
      .toBuffer();
  }

  const icon = await square(1024, 1024, dark);
  await fs.writeFile(asset('icon.png'), icon);
  await fs.writeFile(asset('adaptive-icon.png'), await square(1024, 720, '#00000000'));
  await fs.writeFile(asset('splash-icon.png'), await square(1000, 700, '#00000000'));
  await fs.writeFile(asset('favicon.png'), await square(196, 196, dark));
  await fs.writeFile(asset('tally-mascot-logo.png'), await mascot(1254));

  const appIconDir = native('ios', 'tally', 'Images.xcassets', 'AppIcon.appiconset');
  await fs.writeFile(path.join(appIconDir, 'AppIcon-1024.png'), icon);
  await fs.writeFile(path.join(appIconDir, 'Contents.json'), JSON.stringify({
    images: [{ filename: 'AppIcon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
    info: { version: 1, author: 'expo' }
  }, null, 2) + '\n');

  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(densities)) {
    const dir = native('android', 'app', 'src', 'main', 'res', `mipmap-${density}`);
    await fs.writeFile(path.join(dir, 'ic_launcher.webp'), await sharp(icon).resize(size).webp({ quality: 95 }).toBuffer());

    const circle = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${dark}"/></svg>`);
    const mascotSize = Math.round(size * 0.78);
    const round = await sharp({ create: { width: size, height: size, channels: 4, background: '#00000000' } })
      .composite([
        { input: circle },
        { input: await mascot(mascotSize), left: Math.floor((size - mascotSize) / 2), top: Math.floor((size - mascotSize) / 2) }
      ])
      .webp({ quality: 95 })
      .toBuffer();
    await fs.writeFile(path.join(dir, 'ic_launcher_round.webp'), round);
  }

  const splashSizes = { mdpi: 180, hdpi: 270, xhdpi: 360, xxhdpi: 540, xxxhdpi: 720 };
  for (const [density, size] of Object.entries(splashSizes)) {
    const logo = await sharp(svg)
      .extract({ left: 70, top: 74, width: 884, height: 876 })
      .resize(size, size)
      .png()
      .toBuffer();
    await fs.writeFile(native('android', 'app', 'src', 'main', 'res', `drawable-${density}`, 'splashscreen_logo.png'), logo);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
