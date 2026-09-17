# PhotoSweep 1.1 — 写真をまとめて整理

日本語・iPhone縦画面・iOS 16.4以降を対象にした写真整理アプリです。Expo SDK 57 / React Native 0.86 / TypeScriptで実装しています。

端末内の類似・重複解析、写真の比較・複数選択、スクショ整理、左右スワイプ、拡大、取り消し、月別整理、中断・再開に対応します。ホームはカテゴリ、スワイプは月別、削除候補は保存済みの写真を確認する場所です。濃紺と青を基調に、3ステップの初回説明と固定された削除ボタンを採用しています。判断・無料枠・進行位置はSQLiteに一括保存し、削除はPhotoKitのOS確認を経由します。

無料は新しい写真の判断が1日50枚、スワイプの区切りは20枚。Proは上限解除、期間指定、並び替え、20/50/100枚の区切りです。保存済み候補の確認・削除・取り消しは無料。週額・買い切りの価格、体験資格、権利はStoreKitから取得します。類似は見た目と撮影日時、同じ画像は元データのSHA256一致を使います。容量削減量は推測しません。

## 開発

Node.js 24推奨。最初に `npm ci` を実行してください。

```powershell
npm run check
npm run export:ios
npm run check:release-bundle
npm run web
```

Webはデモ写真・サンプル料金の開発プレビューです。OS確認、写真ライブラリ、StoreKit、触覚はiPhoneの開発ビルドで検証します。Expo Goは対象外です。

`http://localhost:8081/catalog` で従来66状態と刷新した4画面を表示できます。開発用カタログとデモ素材はMetroの本番解決から除外しています。`npm run check:release-bundle` は出力を検査します。

## iOSビルド

`.env.example` をもとに公開識別子を設定します。秘密鍵・ログイン情報をリポジトリへ置かないでください。

```powershell
eas login --browser
eas whoami
eas account:usage --json --non-interactive
# 使用プランと残量を確認し、今回の実行が無料枠内のときだけ次へ。
npm run build:preview
```

内部配布にはAppleの署名・iPhoneの端末登録が必要です。previewはJSを同梱しMetro接続なしで起動します。developmentはPCでMetroを起動して使います。無料枠を使い切った場合は有料へ切り替えません。productionは公開設定・実機記録のチェックを通す必要があります。App Storeへの提出・公開は別操作です。

## 実装の場所

- `src/domain/`: 無料枠、セッション、削除ジョブ、権利判定。
- `src/data/`: SQLite、写真、StoreKit、通知、フィードバック。
- `modules/photosweep-access/`: PhotoKitの権限区別・存在確認・キャンセルを区別する削除ブリッジ。
- `src/domain/analysis.ts` / `PhotoSweepAnalysis.swift`: 類似・重複分類と端末内解析。
- `src/screens/`, `src/ui/`: 共通のネイティブ画面と部品。
- `src/dev/`: 開発カタログ専用の状態・アダプター。
- `tests/`: 本番関数、実SQL、Provider、画面のテスト。
- `handoff/`: デスクトップから取り込んだ設計資料。参考資料とアプリ検証は区別します。

[刷新の設計と動画の観察](docs/CLEANUP_REDESIGN.md) / [検証結果と改善履歴](docs/implementation-status.md) / [実機検証手順](docs/DEVICE_TESTING.md) / [公開前チェック](docs/RELEASE_CHECKLIST.md)
