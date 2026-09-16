import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
if (fs.existsSync('.env')) process.loadEnvFile('.env');
const errors = [];
const required = ['EXPO_PUBLIC_EAS_PROJECT_ID', 'EXPO_PUBLIC_PRIVACY_URL', 'EXPO_PUBLIC_TERMS_URL', 'EXPO_PUBLIC_OPERATOR_NAME', 'EXPO_PUBLIC_MONTHLY_PRODUCT_ID', 'EXPO_PUBLIC_ANNUAL_PRODUCT_ID'];
for (const key of required) if (!process.env[key]?.trim()) errors.push(`${key}: 未設定`);
if (!process.env.EXPO_PUBLIC_SUPPORT_EMAIL && !process.env.EXPO_PUBLIC_SUPPORT_URL) errors.push('正式な問い合わせ窓口が未設定');
for (const key of ['EXPO_PUBLIC_PRIVACY_URL', 'EXPO_PUBLIC_TERMS_URL', 'EXPO_PUBLIC_SUPPORT_URL']) {
  const value = process.env[key]; if (!value) continue;
  try { const url = new URL(value); if (url.protocol !== 'https:' || /localhost|example\.|\.invalid$/.test(url.hostname)) throw Error(); }
  catch { errors.push(`${key}: 公開済みHTTPS URLが必要`); }
}
const record = JSON.parse(fs.readFileSync('docs/device-test-results.json', 'utf8'));
if (!record.buildId || !record.iosVersionVerified) errors.push('署名付きiOSビルドと実機情報が未検証');
for (const test of record.tests) if (test.status !== 'PASS' || !test.evidence) errors.push(`実機未合格: ${test.id}`);
const bundle = spawnSync(process.execPath, ['tools/check-release-bundle.mjs'], { encoding: 'utf8' });
if (bundle.status !== 0) errors.push('本番バンドルの検証が未合格');
if (errors.length) { console.error('公開前の未完了項目:\n' + errors.map(x => `- ${x}`).join('\n')); process.exitCode = 1; }
else console.log('公開前の設定・実機証跡・バンドル確認に合格。提出・公開は別操作です。');
