import google from 'googlethis';
import fs from 'fs';
import path from 'path';
import https from 'https';

const terms = [
  { term: 'Waist Coat clothing isolated white background', filename: 'waist_coat.jpg' },
  { term: 'Lehenga heavy cane clothing isolated white background', filename: 'lehenga.jpg' },
  { term: 'Shorts half pant clothing isolated white background', filename: 'half_pant.jpg' },
  { term: 'Jeans trouser clothing isolated white background', filename: 'pant.jpg' },
  { term: 'Suit blazer clothing isolated white background', filename: 'suit.jpg' },
  { term: 'Dress gown clothing isolated white background', filename: 'dress.jpg' },
  { term: 'Folded shirt laundry isolated white background', filename: 'shirt.jpg' },
  { term: 'Blanket bed quilt isolated white background', filename: 'blanket.jpg' },
  { term: 'Sofa furniture isolated white background', filename: 'sofa.jpg' },
  { term: 'Sneaker shoe isolated white background', filename: 'shoe.jpg' },
  { term: 'Laundry basket isolated white background', filename: 'laundry.jpg' },
];

const outDir = path.resolve('public/images/services');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(path.join(outDir, filename));
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  for (const item of terms) {
    console.log(`Searching for: ${item.term}`);
    try {
      const images = await google.image(item.term, { safe: false });
      if (images && images.length > 0) {
        let downloaded = false;
        // Try the first 5 images in case some links are broken
        for (let i = 0; i < Math.min(5, images.length); i++) {
          try {
            const url = images[i].url;
            console.log(`  Attempting download from: ${url}`);
            await downloadImage(url, item.filename);
            console.log(`  -> Successfully downloaded ${item.filename}`);
            downloaded = true;
            break;
          } catch (e) {
            console.log(`  -> Failed: ${e.message}`);
          }
        }
        if (!downloaded) {
          console.log(`  -> Could not download any image for ${item.term}`);
        }
      }
    } catch (e) {
      console.error(`Error searching ${item.term}:`, e);
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }
}

run();
