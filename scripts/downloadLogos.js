const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const logosDir = path.join(__dirname, '..', 'assets', 'logos');

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    };
    client.get(url, options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function main() {
  const logos = [
    { name: 'paytm.png', url: 'https://cdn-icons-png.flaticon.com/512/825/825454.png' },
    { name: 'cred.png', url: 'https://cdn.icon-icons.com/icons2/3914/PNG/512/cred_logo_icon_248962.png' },
  ];

  for (const item of logos) {
    const dest = path.join(logosDir, item.name);
    try {
      await download(item.url, dest);
      console.log(`Successfully downloaded ${item.name}`);
    } catch (e) {
      console.error(`Error downloading ${item.name}:`, e.message);
    }
  }
}

main();
