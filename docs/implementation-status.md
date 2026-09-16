# 実装・検証の記録 — 2026-09-17

POP V3を既存リポジトリへ実装し、Windowsで実行可能な検証を行いました。**署名付きiOSビルド、実機操作、Sandbox検証は未完了です。** 全工程の完了条件にはまだ達していません。

作業場所: `C:/Users/koki/Documents/ChatGPT/PhotoSweep`。ブランチ: `codex/pop-v3`。元のコミット: `1cb1ad3d04d7a8cd61f10ff1d38d5c9eceed492e`。デスクトップ資料を `handoff/` に保存し、古い画面の重複ソースと旧仕様を置き換えました。リモートへpush、ストアへの提出・公開、有料ビルドは行っていません。

## 実装

- 紫・ミント・ピンクのPOP V3、ホーム/候補/マイページ、月別・OS分類によるスクショ、カードのスワイプ、ボタン、拡大、スキップ、取り消し、再開。
- 20枚ごとの結果、すべて残した場合の成果表示、短い完了演出、保存後の触覚、任意の操作音、Reduce Motion対応。端末の安全領域を使用。
- PhotoRepository / ReviewPersistence / BillingAdapterと無料枠ポリシーを分離。SQLiteのトランザクションで判断・候補・進行位置・無料枠を保存。
- PhotoKitの権限と削除ブリッジ。キャンセルを区別し、結果不明は候補を保持。再起動では存在確認のみ行い、削除を再実行しない。
- 無料50枚/日、Proの上限解除・期間指定・並び順・20/50/100枚。安全操作は無料のまま。
- expo-iapの実商品・価格・体験資格・検証済み権利への接続。保留、復元、更新停止、失効、取消、猶予期間を扱う。ネイティブStoreKit応答の実機確認は未実施。
- アイコン、起動画面、任意通知、ヘルプ、公開前の規約/プライバシー/ストア原稿、開発カタログ、ビルド設定、公開前チェック。

## 検証結果

環境: Windows、Node 24.13.0、Expo 57.0.23、React Native 0.86.3。

| 検証 | 結果 | 証跡 |
|---|---|---|
| TypeScript | PASS | `artifacts/check.log` |
| 本番関数・実SQL・依存互換性 | 37/37 PASS | 同上、`tests/*.test.ts` |
| 画面・Provider・StoreKitアダプター（OS応答はmock） | 90/90 PASS | 同上、`tests/*.test.tsx` |
| Expo Doctor | 21/21 PASS | 同上 |
| iOS用JavaScript/Hermesバンドル | PASS | `artifacts/export-ios.log`, `dist/ios/metadata.json` |
| 開発カタログ・デモ写真の本番除外 | PASS | `npm run check:release-bundle` |
| npm audit | 0件 | `artifacts/npm-audit.json` |
| 48状態＋18追加状態のWeb表示 | 66状態を表示・スクリーンショット保存 | `artifacts/catalog.json`, `artifacts/screens/` |
| Webで100枚のボタン仕分け | 完走（無料50＋デモPro50） | `artifacts/browser-flow.json` |
| 削除後の遷移不具合の再検証 | デモ10枚の削除結果画面へ正常遷移 | `artifacts/deletion-regression.txt` |
| 360/375/390/430px幅の課金画面 | 横スクロールなし、測定したボタンは44px以上 | `artifacts/responsive.json` |
| ネイティブ設定のintrospection | iOS16.4、ローカルモジュール認識、マイク権限なし、音声バックグラウンドなし | `artifacts/native-config.json` |
| Xcode/署名付きiOSビルド | BLOCKED（Expo未認証。WindowsのprebuildもiOS生成非対応） | 下記 |
| 実機・Sandbox・触覚・VoiceOver・Dynamic Type | NOT_RUN | `docs/device-test-results.json` |
| 公開前チェック | BLOCKED（設定と実機証跡が未完了のため意図どおり停止） | `artifacts/release-check.log` |

10,000判断のSQLite保存・再読込はWindows上で約0.31秒（当該テスト内の計測）。これはiPhoneの写真読み込み速度や操作FPSの測定ではありません。UIマウントテストは文字の実際の配置やVoiceOverの読み上げ順を保証しません。Webの画面確認ではOSの許可・購入・削除を代替できません。

元資料の93シナリオは実機の受け入れ条件を含むため、Windowsの成功を理由にPASSへ変えていません。実機記録は `device-test-results.json` に分離しています。

## 見つけて修正した問題

1. Expo SDK 57とReact Native/TypeScript/依存peerの不一致を解消しlockfileを作成。
2. Webでデモ画像の解決APIが動作しない問題を修正。
3. SQLite再読込でoptional値が変化する差異を解消し、保存失敗時の一括rollbackを検証。
4. 開発用写真が最初の本番バンドルへ混入したため、Metroのrelease解決から開発モジュールを除外。不要なアイコンフォントも削減。
5. 整理開始の連打、50枚目の完了/上限画面の競合を修正。到達記録を判断と同じトランザクションに移動。
6. 裏に残る仕分け画面が削除結果を上書きする問題を、表示中の画面だけが遷移するよう修正。デモで再確認。
7. 上限後にホームが20枚を約束する表示、スクショ入口の残数不一致を修正し回帰テストを追加。
8. 削除前のアクセス確認失敗で待機画面に入る問題を修正。OSキャンセル・結果不明では成功扱いにしない。
9. 購入保留後のイベント、キャンセル後の再表示、1商品が取れない場合の別商品の有効権利を補強。
10. ネイティブ設定に不要な音声バックグラウンド実行が付いていたため無効化。
11. 依存監査14件の根元にあったdecode-uri-componentとuuidを修正。SDK全体を降格させず、互換性テストを追加。現在の監査結果は0件。

`vendor/decode-uri-component/` は上流0.5.0のアルゴリズムを変更せずCommonJSのexport形式だけ調整したものです。query-string 7との互換性を保ちます。上流ソースとMITライセンスを記録。xcodeのuuidは11.1.1へ限定overrideし、プロジェクトID生成をテストしました。上流が対応したらこの橋渡しを外します。

## 再開に必要なこと

1. Expo公式ブラウザログインを完了。`eas whoami` は最後の確認時点で `Not logged in`。無料ビルド残量も未取得。認証後に無料枠内か確認し、開発ビルドへ進む。
2. AppleのBundle ID・署名・iPhone登録、App Store Connectのアプリ/月額・年額商品を設定。Apple認証・2FAは本人の画面で実施。
3. iPhone 15で検証。申告されたiOS「26.61」は端末設定で正式な表記を再確認。削除してよいテスト写真だけを使用。
4. 正式な運営者、問い合わせ窓口、公開する規約・プライバシーURLを決定。旧仮メールアドレスは使用していない。

[実機検証手順](DEVICE_TESTING.md) と [公開前チェック](RELEASE_CHECKLIST.md) を参照してください。保存失敗・OS挙動・StoreKitの本番相当ビルドでの問題が見つかった場合は、該当箇所を修正して同条件で再実行します。
