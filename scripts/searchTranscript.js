const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function search() {
  const filePath = path.join('C:', 'Users', 'shash.DESKTOP-7JGCNTQ', '.gemini', 'antigravity-ide', 'brain', 'e7418ac2-014d-4686-a795-843b45a5d729', '.system_generated', 'logs', 'transcript_full.jsonl');
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let found = [];
  for await (const line of rl) {
    if (line.includes('HomeScreen.tsx')) {
      found.push(line);
    }
  }
  
  // Just print the last 5 occurrences to avoid huge output
  for (let i = Math.max(0, found.length - 5); i < found.length; i++) {
    console.log(found[i].substring(0, 1000));
  }
}
search();
