import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateImageAsync } from '@expo/image-utils';
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const src = fileURLToPath(new URL('../assets/brand/photosweep-broom.png', import.meta.url));
// Only production sizing/encoding. The original generated artwork is kept intact.
for (const [name, size] of [['icon.png', 1024], ['splash-icon.png', 512]]) {
  const { source } = await generateImageAsync({ projectRoot }, {
    src, name, width: size, height: size, resizeMode: 'contain', removeTransparency: true,
  });
  fs.writeFileSync(new URL(`../assets/${name}`, import.meta.url), source);
}
console.log('Generated iOS icon and splash sizes from the PhotoSweep broom master.');
