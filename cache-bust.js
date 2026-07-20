// Reads styles.css and script.js, computes short hashes, and updates ?v= in all HTML files.
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function fileHash(file) {
  const data = fs.readFileSync(path.join(__dirname, file));
  return crypto.createHash('md5').update(data).digest('hex').slice(0, 8);
}

const cssHash = fileHash('styles.css');
const jsHash = fileHash('script.js');

const files = [
  'index.html',
  'de/index.html',
  'hr/index.html',
  'services/ux-design/index.html',
  'services/ai-procurement/index.html',
  'services/local-business/index.html',
  'de/services/ux-design/index.html',
  'de/services/ai-procurement/index.html',
  'de/services/local-business/index.html',
  'hr/services/ux-design/index.html',
  'hr/services/ai-procurement/index.html',
  'hr/services/local-business/index.html',
];

let cssUpdated = 0, jsUpdated = 0;
files.forEach(f => {
  const fp = path.join(__dirname, f);
  let html = fs.readFileSync(fp, 'utf8');
  const original = html;

  // Update styles.css ?v=
  html = html.replace(/(styles\.css)\?v=[a-z0-9]+/i, `$1?v=${cssHash}`);
  if (!/(styles\.css)\?v=/.test(html)) {
    html = html.replace(/(styles\.css)(")/i, `$1?v=${cssHash}$2`);
  }

  // Update script.js ?v=
  html = html.replace(/(script\.js)\?v=[a-z0-9]+/i, `$1?v=${jsHash}`);
  if (!/(script\.js)\?v=/.test(html)) {
    html = html.replace(/(script\.js)(")/i, `$1?v=${jsHash}$2`);
  }

  if (html !== original) {
    fs.writeFileSync(fp, html, 'utf8');
    if (/(styles\.css)\?v=/.test(html)) cssUpdated++;
    if (/(script\.js)\?v=/.test(html)) jsUpdated++;
  }
});

console.log(`styles.css hash: ${cssHash} - updated ${cssUpdated} file(s)`);
console.log(`script.js  hash: ${jsHash}  - updated ${jsUpdated} file(s)`);
