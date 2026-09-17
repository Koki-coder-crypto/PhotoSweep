# 実装・検証の記録 — 2026-09-17

## 現行版：1.1.0
Cleanup使用録画を参照して画面と動線を刷新。端末内の類似・重複解析をSwiftで追加した。詳細は [CLEANUP_REDESIGN.md](CLEANUP_REDESIGN.md)。

- 濃紺＋青、写真カテゴリ、3ステップ初回説明、ホーム／スワイプ／削除候補。
- 比較一覧から選択→保存→OS確認。削除成功直後に一覧へ反映。
- 週額・買い切りの選択、実ストア価格、無料継続を明示。
- 1,000件・10,000件の類似分類、49→50→51枚、一括保存失敗、権限取消中の解析、購入型の誤設定、削除後の表示更新を追加検証。
- TypeScript PASS。本番関数・SQL・依存テスト50/50、UI・Provider・StoreKit・解析Hook107/107、合計157テストPASS。OS/課金応答はmockであり実機結果ではない。
- Expo Doctor21/21。iOS Hermesバンドルのデモ・カタログ除外PASS。
- Webは360・390・430幅、初回説明、比較・選択・デモ削除、週額／買い切り切替を確認。残す25回＋取り消し25回、候補25回＋取り消し25回の計100操作で位置と候補数が復元。再読込後の位置も確認。
- EAS無料枠（投入前iOS 1/15）でpreview Releaseを生成。ビルド **939de677-450f-48b3-97f7-8c4684c63d74** がFINISHED、Xcode ARCHIVE SUCCEEDED。Swift解析ファイルのコンパイルとネイティブモジュールのリンクを確認。
- IPAを検査：1.1.0 (1)、iOS16.4以降、署名・登録端末用プロファイル・Hermesバンドルを同梱。デモ文字列なし。14,465,927 bytes。PC/Metro不要の構成。
- 新版の実機起動・触覚・100操作・Sandboxは未実施。App Store Connectの商品・公開URL等の本人設定も残る。公開前チェックは合格扱いにしない。

[実機用ビルド](https://expo.dev/accounts/koki_123/projects/photosweep/builds/939de677-450f-48b3-97f7-8c4684c63d74)
証跡：artifacts/cleanup-final-check.log、cleanup-final-ui-tests.log、cleanup-analysis-hook.log、cleanup-xcode.txt、cleanup-ipa-verification.json、cleanup-home-390.png、cleanup-home-430.png。

## 今回修正した問題
一括選択での無料枠の二重消費を防止。保存失敗でOS削除を呼ばない。写真アクセス変更後に候補が0枚でも未確定削除の確認ボタンを維持。確定済み削除の表示を全件読み込み完了まで待たせない。解析中の権限取消・写真変更で古い結果を破棄。買い切りSKUが消耗型で登録されている場合は販売しない。小さい画面の説明の改行と、文字拡大時のカテゴリ配置を調整。

以下は刷新前の履歴であり、現行のUI・商品構成・配布先は上記を使用する。


POP V3を既存リポジトリへ実装し、Windowsで実行可能な検証と、EASで署名付きiOS開発ビルドを完了しました。**iPhoneへのインストール・実機操作・Sandbox検証は未完了です。** 全工程の完了条件にはまだ達していません。

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
| Xcode/署名付きiOS開発ビルド | PASS（EAS FINISHED、ARCHIVE SUCCEEDED、Ad Hoc IPA生成済み） | build ID `ec3bca0a-935d-4a56-99c3-18f2e4aeeeba` |
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
12. 初回EASビルドで、相対file指定のnpm overrideがquery-string配下の存在しないパスをlockfileへ記録していたことを検出。ローカルパッケージを直接依存にし、overrideをルート仕様への参照へ変更。EASと同じnpm 10.9.8で空のディレクトリから938パッケージをインストールし成功、監査0件。型検査・37本番テスト・90画面テスト・Expo診断21項目も再合格（`artifacts/check-after-eas-fix.log`）。クラウドでインストール成功を確認。

`vendor/decode-uri-component/` は上流0.5.0のアルゴリズムを変更せずCommonJSのexport形式だけ調整したものです。query-string 7との互換性を保ちます。上流ソースとMITライセンスを記録。xcodeのuuidは11.1.1へ限定overrideし、プロジェクトID生成をテストしました。上流が対応したらこの橋渡しを外します。

## 再開に必要なこと

1. 2026-09-17にExpoのkoki_123へのログインとFreeプラン（投入前iOS使用0/15回）を確認。プロジェクト接続、Apple認証、iPhone登録、Bundle ID登録、既存の有効な配布証明書の再利用、このiPhone用Ad Hocプロファイル作成まで完了。初回ビルド `c19d3ff0-c662-401b-ae10-f4ca0239b6d4` はnpm ciで失敗し無料枠の消費なし。修正・再検証後、開発ビルド `ec3bca0a-935d-4a56-99c3-18f2e4aeeeba` がFINISHED。ARCHIVE SUCCEEDEDと署名済みIPAの生成を確認。インストール・実機起動は未確認。
2. [修正版ビルド](https://expo.dev/accounts/koki_123/projects/photosweep/builds/ec3bca0a-935d-4a56-99c3-18f2e4aeeeba) を登録したiPhoneへインストール。Metroを8081で起動し、iOS開発バンドルのHTTP配信成功とLAN側の稼働応答を確認済み。App Store Connectのアプリ/月額・年額商品の設定も残る。Apple認証・2FAが再度必要な場合は本人の画面で実施。
3. iPhone 15で検証。申告されたiOS「26.61」は端末設定で正式な表記を再確認。削除してよいテスト写真だけを使用。
4. 正式な運営者、問い合わせ窓口、公開する規約・プライバシーURLを決定。旧仮メールアドレスは使用していない。

[実機検証手順](DEVICE_TESTING.md) と [公開前チェック](RELEASE_CHECKLIST.md) を参照してください。保存失敗・OS挙動・StoreKitの本番相当ビルドでの問題が見つかった場合は、該当箇所を修正して同条件で再実行します。
