const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourcePath = 'C:\\Users\\sonali\\.gemini\\antigravity-ide\\brain\\e7e1caa2-5f51-4def-a046-b6d9acd4945c\\.user_uploaded\\media_1788165599657.png';

async function main() {
  console.log('Processing user logo from:', sourcePath);
  
  if (!fs.existsSync(sourcePath)) {
    console.error('Source file not found!');
    process.exit(1);
  }

  const websitePublicImages = path.join(__dirname, '..', 'safaikart-website', 'public', 'images');
  const rootAssets = path.join(__dirname, '..', 'assets');

  fs.mkdirSync(websitePublicImages, { recursive: true });
  fs.mkdirSync(rootAssets, { recursive: true });

  // 1. Direct 1:1 raw copy
  fs.copyFileSync(sourcePath, path.join(websitePublicImages, 'logo.png'));
  fs.copyFileSync(sourcePath, path.join(websitePublicImages, 'logo-icon.png'));
  fs.copyFileSync(sourcePath, path.join(rootAssets, 'logo.png'));
  console.log('Raw logo copied to public and assets.');

  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  console.log('Image dimensions:', metadata.width, 'x', metadata.height);

  // 2. Extract the exact background green color from corners
  // Sample top-left pixel or use the rich dark green
  const bg = { r: 6, g: 53, b: 23, alpha: 1 }; // #063517

  // 3. Create a clean square icon version (512x512)
  await sharp(sourcePath)
    .resize(512, 512, {
      fit: 'contain',
      background: bg
    })
    .png()
    .toFile(path.join(websitePublicImages, 'logo-icon-512.png'));

  // 4. Create an optimized mobile app icon (1024x1024)
  await sharp(sourcePath)
    .resize(1024, 1024, {
      fit: 'contain',
      background: bg
    })
    .png()
    .toFile(path.join(rootAssets, 'icon-logo.png'));

  console.log('Processed images successfully generated!');
}

main().catch(console.error);
