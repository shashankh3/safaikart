const https = require('https');
const fs = require('fs');
const zlib = require('zlib');

const url = "https://storage.googleapis.com/eas-workflows-production/logs/c8689aa7-cbb2-4aad-a348-8ce979a8b0c1/dadf010f-ca41-4969-97ee-6618a9a1506b/2026-08-24T08%3A52%3A08Z-a88971eb-3245-44bf-a0a7-6cf02bcb0ce1.txt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=www-production%40exponentjs.iam.gserviceaccount.com%2F20260824%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260824T090603Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=040187eddc247b829c06f9c6034ecd32034fd654426ce7e0f24f46dad4151b09b9c5b6e08cf302b1c686924b88955ac3d384fa954d329e789d0f782fe3d74d405f35791439daff9368f2735e1e7bcaaab8e4e47872527745aa51979af51d084e6fe5d2062f46ee7a13998b5c9806c86fbd59370ac276432defbabb9908013ba41490263b8f870123321e9cf750467f63f07630d14a519d54c75d46a88ad9658825818b5a5462f72810957a25313fbce66a4c70e55b66cf5e14425efc1b9a1afd6a089d83cc1016cd3c465e2afce1927629b632d8791431e638333ca7df36058793a63624312a94e457f8b1cae21b20b4bd265a5b99282810e5a5d97fde515456";

https.get(url, (res) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    let buf = Buffer.concat(chunks);
    try {
      buf = zlib.brotliDecompressSync(buf);
      console.log('Successfully decompressed brotli!');
    } catch (e) {
      console.log('Brotli error:', e.message);
    }
    const text = buf.toString('utf-8');
    fs.writeFileSync('eas-build-extracted.txt', text);
    
    // Scan for errors
    const lines = text.split('\n');
    console.log(`Extracted ${lines.length} lines of logs`);
    lines.forEach((l, i) => {
      if (l.includes('FAILED') || l.includes('FAILURE:') || l.includes('error:') || l.includes('What went wrong:') || l.includes('AAPT:')) {
        console.log(`Line ${i + 1}: ${l}`);
      }
    });

    console.log('\n--- Tail of build logs ---');
    lines.slice(-60).forEach((l, i) => console.log(l));
  });
}).on('error', console.error);
