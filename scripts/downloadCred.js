const https = require('https');
const fs = require('fs');
const path = require('path');

const logosDir = path.join(__dirname, '..', 'assets', 'logos');
const dest = path.join(logosDir, 'cred.png');

const urls = [
  'https://companiesmarketcap.com/img/company-logos/256/CRED.D.png',
  'https://cdn.iconscout.com/icon/free/png-256/free-cred-3029864-2527263.png',
  'https://raw.githubusercontent.com/sonali/logos/main/cred.png'
];

function tryDownload(idx) {
  if (idx >= urls.length) {
    console.error('All CRED URLs failed');
    return;
  }
  const url = urls[idx];
  const file = fs.createWriteStream(dest);
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/png,image/*;q=0.8'
    }
  };
  https.get(url, options, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      https.get(res.headers.location, options, (res2) => {
        if (res2.statusCode === 200) {
          res2.pipe(file);
          file.on('finish', () => file.close(() => console.log('Successfully downloaded cred.png')));
        } else {
          tryDownload(idx + 1);
        }
      });
      return;
    }
    if (res.statusCode === 200) {
      res.pipe(file);
      file.on('finish', () => file.close(() => console.log('Successfully downloaded cred.png')));
    } else {
      tryDownload(idx + 1);
    }
  }).on('error', () => tryDownload(idx + 1));
}

tryDownload(0);
