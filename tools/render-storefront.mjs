// Vector storefront layout. Real app captures are embedded unchanged.
// Run: node tools/render-storefront.mjs CAPTURE_DIRECTORY OUTPUT_DIRECTORY
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Resvg } from '@resvg/resvg-js';

const [source, output] = process.argv.slice(2);
if (!source || !output) throw new Error('Capture and output directories required');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
const captures = new Map();
for (const test of manifest) for (const a of test.attachments ?? []) {
  const m = /^(ja|en)-(0[1-7]-[a-z-]+)_/.exec(a.suggestedHumanReadableName);
  if (m) captures.set(`${m[1]}-${m[2]}`, path.join(source, a.exportedFileName));
}
const copy = [
  ['01-organize', ['写真も動画も、', 'すっきり。', '残したい思い出を、見つけやすく。'], ['Less clutter.', 'More memories.', 'Make room for the moments you love.']],
  ['02-comparison', ['同じ写真を、', 'まとめて整理。', '見比べて、残す一枚を選ぼう。'], ['Same photo?', 'Keep a favorite.', 'Compare duplicates. Choose what stays.']],
  ['03-monthly-swipe', ['右に残す。', '左に、候補。', '月を選んで、すいすい仕分け。'], ['Swipe right.', 'Keep the moment.', 'Swipe left to set it aside. Review later.']],
  ['04-large-videos', ['大きな動画が、', 'ひと目で。', 'サイズを見ながら、整理しよう。'], ['Find your', 'biggest videos.', 'See file sizes. Choose what to clear.']],
  ['06-candidates', ['消す前に、', 'もう一度。', '最後に確認するまで、削除されません。'], ['One last look.', 'Then delete.', 'Nothing is deleted until you confirm.']],
  ['07-result', ['整理の成果を、', '確かめる。', '削除した件数とデータサイズを確認。'], ['See what', 'you cleared.', 'View deleted items and their data size.']],
];
fs.mkdirSync(output, { recursive: true });
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const icon = fs.readFileSync('assets/icon.png').toString('base64');
const provenance = { build: '20010', captureRun: '35619661636', appSourceRevision: '8e25d20', scope: 'Six verified screens per locale. Compression comparison not captured. No claim the whole capture test run passed.', screenshots: [] };
for (const locale of ['ja', 'en']) for (let i = 0; i < copy.length; i++) {
  const [screen, ja, en] = copy[i];
  const text = locale === 'ja' ? ja : en;
  const filename = captures.get(`${locale}-${screen}`);
  if (!filename) throw new Error(`Missing original ${locale}-${screen}`);
  const original = fs.readFileSync(filename);
  const dimensions = [original.readUInt32BE(16), original.readUInt32BE(20)];
  if (dimensions[0] !== 1320 || dimensions[1] !== 2868) throw new Error(`Unexpected capture dimensions ${filename}`);
  const dark = [0, 2, 5].includes(i);
  const bg = dark ? '#617994' : '#F4F1EC';
  const ink = dark ? '#FFFFFF' : '#263C53';
  const accent = dark ? '#FFE0C9' : '#B45240';
  const subtle = dark ? '#E6EDF4' : '#566A80';
  const titleSize = locale === 'ja' ? 112 : 116;
  const deviceWidth = 916, deviceHeight = deviceWidth * 2868 / 1320;
  const x = (1284 - deviceWidth) / 2, y = 630;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1284" height="2778" viewBox="0 0 1284 2778">
  <defs>
    <linearGradient id="bg" x2="0.6" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="${dark ? '#3C536C' : '#E2E9EF'}"/></linearGradient>
    <clipPath id="icon"><rect x="80" y="58" width="72" height="72" rx="18"/></clipPath>
    <clipPath id="screen"><rect x="${x}" y="${y}" width="${deviceWidth}" height="${deviceHeight}" rx="57"/></clipPath>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="125%"><feDropShadow dx="0" dy="22" stdDeviation="25" flood-color="#132D45" flood-opacity="0.24"/></filter>
  </defs>
  <rect width="1284" height="2778" fill="url(#bg)"/>
  <circle cx="1240" cy="1180" r="590" fill="${dark ? '#91A9BF' : '#FFF9F0'}" opacity="0.17"/>
  <path d="M-100 2430 Q380 2760 1450 2420" fill="none" stroke="${dark ? '#E9B8A0' : '#B9C9D8'}" stroke-width="115" opacity="0.18"/>
  <image x="80" y="58" width="72" height="72" clip-path="url(#icon)" xlink:href="data:image/png;base64,${icon}"/>
  <text x="174" y="111" font-family="Noto Sans JP" font-size="42" font-weight="700" fill="${ink}">PhotoSweep</text>
  <text x="1204" y="108" text-anchor="end" font-family="Noto Sans JP" font-size="29" font-weight="500" fill="${subtle}">${locale === 'ja' ? '写真整理・動画圧縮' : 'PHOTO &amp; VIDEO ORGANIZER'}</text>
  <text x="78" y="294" font-family="Noto Sans JP" font-size="${titleSize}" font-weight="900" letter-spacing="-4" fill="${ink}">${esc(text[0])}</text>
  <text x="78" y="433" font-family="Noto Sans JP" font-size="${titleSize}" font-weight="900" letter-spacing="-4" fill="${accent}">${esc(text[1])}</text>
  <text x="82" y="525" font-family="Noto Sans JP" font-size="37" font-weight="500" fill="${subtle}">${esc(text[2])}</text>
  <rect x="${x - 18}" y="${y - 18}" width="${deviceWidth + 36}" height="${deviceHeight + 36}" rx="75" fill="${dark ? '#BDCDD9' : '#879DB2'}" filter="url(#shadow)"/>
  <rect x="${x - 8}" y="${y - 8}" width="${deviceWidth + 16}" height="${deviceHeight + 16}" rx="64" fill="#142433"/>
  <image x="${x}" y="${y}" width="${deviceWidth}" height="${deviceHeight}" clip-path="url(#screen)" xlink:href="data:image/png;base64,${original.toString('base64')}"/>
  <text x="80" y="2715" font-family="Noto Sans JP" font-size="26" fill="${subtle}">${locale === 'ja' ? '見て、選んで、自分のペースで。' : 'Review. Choose. Go at your own pace.'}</text>
  <text x="1204" y="2715" text-anchor="end" font-family="Noto Sans JP" font-size="26" fill="${subtle}">${String(i + 1).padStart(2, '0')} / 06</text>
  </svg>`;
  const name = `${locale}-${String(i + 1).padStart(2, '0')}-${screen.slice(3)}`;
  const renderedSvg = svg.replaceAll('Noto Sans JP', 'Yu Gothic');
  fs.writeFileSync(path.join(output, `${name}.svg`), renderedSvg);
  const result = new Resvg(renderedSvg, { font: { fontFiles: ['C:/Windows/Fonts/YuGothM.ttc', 'C:/Windows/Fonts/YuGothB.ttc'], loadSystemFonts: false, defaultFontFamily: 'Yu Gothic' } });
  const png = result.render().asPng();
  fs.writeFileSync(path.join(output, `${name}.png`), png);
  provenance.screenshots.push({ locale, screen, source: path.resolve(filename), sourceSHA256: sha(original), output: `${name}.png`, outputSHA256: sha(png), width: 1284, height: 2778 });
  console.log(`${name}.png`);
}
fs.writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2));
