import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist/ios');
if (!fs.existsSync(path.join(root, 'metadata.json'))) throw new Error('Run npm run export:ios first.');
const prohibited = ['DEV CATALOG', 'catalog-session', 'demo-', 'dog.jpg', 'sea.jpg', 'src/dev/adapters'];
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
let checked = 0;
for (const file of files(root)) {
  if (!/\.(hbc|js|json)$/.test(file)) continue;
  const bytes = fs.readFileSync(file); checked++;
  for (const text of prohibited) if (bytes.includes(Buffer.from(text))) throw new Error(`Development fixture found in ${file}: ${text}`);
}
console.log(`PASS: ${checked} release bundle/manifest files contain no catalog, mock products, or demo photo references.`);
