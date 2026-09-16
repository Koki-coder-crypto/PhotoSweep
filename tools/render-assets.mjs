import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
const source = fs.readFileSync(new URL('../assets/icon.svg', import.meta.url), 'utf8');
for (const [name, size] of [['icon.png', 1024], ['splash-icon.png', 512]]) {
  fs.writeFileSync(new URL(`../assets/${name}`, import.meta.url), new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng());
}
console.log('Rendered original vector artwork to iOS icon and splash assets.');
