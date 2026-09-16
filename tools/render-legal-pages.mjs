import fs from 'node:fs';
if (fs.existsSync('.env')) process.loadEnvFile('.env');
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const operator = process.env.EXPO_PUBLIC_OPERATOR_NAME || '［運営者：公開前に確定］';
const contact = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || process.env.EXPO_PUBLIC_SUPPORT_URL || '［正式な問い合わせ窓口：公開前に確定］';
const draft = !process.env.EXPO_PUBLIC_OPERATOR_NAME || !(process.env.EXPO_PUBLIC_SUPPORT_EMAIL || process.env.EXPO_PUBLIC_SUPPORT_URL);
const pages = {
  privacy: ['プライバシーポリシー', [
    ['対象', 'PhotoSweepの写真整理機能と、お問い合わせにおける情報の取扱いを説明します。'],
    ['写真と端末内の記録', '写真は端末の写真ライブラリから表示します。写真の原本、位置情報、写真内容を開発者のサーバーへ送信しません。写真識別子、仕分け判断、進行位置、当日の無料枠、整理履歴、設定を端末内に保存します。写真へのアクセス範囲はiOSの設定から変更できます。'],
    ['情報の収集と通信', 'アカウント登録、広告SDK、外部分析SDKはありません。iCloud写真の取得、App Storeの購入・復元にはAppleとの通信が発生します。写真表示ではメモリキャッシュを使用します。Appleによる情報の取扱いはAppleのポリシーに従います。'],
    ['お問い合わせ', 'あなたが窓口に送る連絡先や相談内容を、返信と問題解決に使用します。写真を送る必要はありません。正式な問い合わせサービスを選定した時点で、委託先・保管期間・削除方法をこの項目へ記載してから公開します。'],
    ['記録の削除', '整理の記録はアプリ内でリセットできます。候補、進行位置、当日の無料枠はその操作では消えません。アプリを削除するとアプリ内のローカル記録は失われます。写真ライブラリの原本やApple Accountの契約は、アプリ削除だけでは消えません。バックアップの扱いはiOSの設定に依存します。'],
    ['変更と窓口', `取扱いを変更するときはこのページを更新します。運営者：${operator}。問い合わせ：${contact}。`],
  ]],
  terms: ['利用規約・購入条件', [
    ['サービス', `運営者 ${operator} が提供するPhotoSweepは、利用者が自分の写真を見直し、候補として選び、確認して削除するためのアプリです。`],
    ['写真の削除', '候補への仕分けだけでは写真を削除しません。利用者が候補を確認して削除を依頼し、iOSの確認を経て処理します。iCloud写真では同期先にも削除が反映されます。復元可否・実際の空き容量はAppleの処理や端末状態に依存します。重要な写真は確認・バックアップしてご利用ください。'],
    ['無料機能とPro', '無料では1日50枚の新しい写真を仕分けでき、1回の区切りは20枚です。Proは仕分け上限の解除、期間指定、並び替え、20・50・100枚の区切りを提供します。確認・削除・取り消し・保存は無料です。'],
    ['料金と更新', 'Proは月額または年額の自動更新サブスクリプションです。価格・通貨・対象者の無料体験は、購入時のApp Store画面に従います。無料体験は対象の方だけに適用されます。継続しない場合は終了の24時間以上前にApp Storeで解約してください。購入と請求はAppleが処理します。'],
    ['管理・復元・返金', '契約の管理・解約はApple Accountのサブスクリプションから行います。アプリを削除しただけでは契約は解約されません。復元はアプリ内から実行できます。返金はAppleの窓口に申請し、可否はAppleの判断に従います。'],
    ['利用条件と変更', '不正な購入・他者の権利を侵害する利用をしないでください。機能変更や提供終了時には必要な案内を行います。法令により認められる利用者の権利を制限するものではありません。アプリの使用許諾にはApple標準使用許諾契約が適用されます。'],
    ['運営者・連絡先', `運営者：${operator}。問い合わせ：${contact}。正式な公開情報を確定してから本ページを公開します。`],
  ]],
  support: ['ヘルプ・お問い合わせ', [
    ['写真が表示されない', 'iPhoneの設定でPhotoSweepの写真アクセスを確認してください。選択した写真のみを許可している場合、アプリからアクセスする写真を追加できます。iCloud上の写真には通信が必要な場合があります。'],
    ['削除した写真を戻したい', 'Appleの写真アプリから「最近削除した項目」を開いて復元します。通常30日間残りますが、完全削除した写真などは復元できません。PhotoSweepから原本を復元することはできません。'],
    ['購入・無料枠について', '新しい写真の仕分けは無料で1日50枚。候補の確認・削除・取り消し・保存はいつでも無料です。Proの管理や復元はマイページから開けます。購入の保留や確認失敗では、再購入の前にApp Storeの状況を確認してください。'],
    ['お問い合わせ', `窓口：${contact}。機種・iOSバージョン・アプリバージョン・問題が起きた操作をお知らせください。写真やパスワード、認証コードは送らないでください。運営者：${operator}。`],
  ]],
};
fs.mkdirSync('web', { recursive: true });
for (const [slug, [title, sections]] of Object.entries(pages)) {
  const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PhotoSweep · ${title}</title><style>body{margin:0;background:#FAF8FF;color:#242139;font:16px/1.9 system-ui,sans-serif}main{max-width:720px;margin:auto;padding:40px 24px}nav{display:flex;gap:20px;flex-wrap:wrap}a{color:#634CF5}h1{font-size:30px;line-height:1.4}h2{font-size:20px;margin-top:32px}aside{padding:16px;background:#FFF1CF;border-radius:16px}section{background:white;padding:8px 24px 16px;border-radius:24px;margin-top:16px}footer{margin-top:40px;font-size:13px;color:#777089}</style><main><nav><b>PhotoSweep</b><a href="support.html">ヘルプ</a><a href="privacy.html">プライバシー</a><a href="terms.html">規約</a></nav><h1>${title}</h1>${draft ? '<aside>公開前の原稿です。運営者と問い合わせサービスの情報を確定してから公開します。</aside>' : ''}${sections.map(([heading, text]) => `<section><h2>${escape(heading)}</h2><p>${escape(text)}</p></section>`).join('')}<footer>原稿更新：2026年9月17日</footer></main></html>`;
  fs.writeFileSync(`web/${slug}.html`, html);
  if (slug !== 'terms') fs.writeFileSync(`${slug}.html`, `<!doctype html><html lang="ja"><meta charset="utf-8"><title>PhotoSweep</title><a href="web/${slug}.html">現行の${title}を開く</a></html>`);
}
console.log('Generated local legal/support drafts. No publication performed.');
