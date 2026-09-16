# PhotoSweep — POP V3

日本語・iPhone縦画面・iOS 16.4以降を対象にした写真整理アプリです。Expo SDK 57 / React Native 0.86 / TypeScriptで実装しています。

左右スワイプ、ボタン操作、拡大、取り消し、月別・スクショ整理、再開、削除候補の確認、20枚ごとの達成表示を備えます。判断と無料枠・進行位置はSQLiteの同一トランザクションで保存します。削除はPhotoKitのOS確認を経由します。

無料は新しい写真の仕分けが1日50枚、区切りは20枚。Proは仕分け上限の解除、期間指定、並び替え、20/50/100枚の区切りです。確認・削除・取り消しは常に無料。価格と体験資格と権利はStoreKitから取得します。架空の容量削減や推定重複検出はありません。

## 開発

Node.js 24推奨。最初に `npm ci` を実行してください。

```powershell
npm run check
npm run export:ios
npm run check:release-bundle
npm run web
```

Webはデモ写真・サンプル料金の開発プレビューです。OS確認、写真ライブラリ、StoreKit、触覚はiPhoneの開発ビルドで検証します。Expo Goは対象外です。

`http://localhost:8081/catalog` で48状態＋18追加状態を表示できます。開発用カタログとデモ素材はMetroの本番解決から除外しています。`npm run check:release-bundle` は出力を検査します。

## iOSビルド

`.env.example` をもとに公開識別子を設定します。秘密鍵・ログイン情報をリポジトリへ置かないでください。

```powershell
eas login --browser
eas whoami
eas account:usage --json --non-interactive
# 使用プランと残量を確認し、今回の実行が無料枠内のときだけ次へ。
npm run build:development
```

開発ビルドにはAppleの署名・iPhoneの端末登録が必要です。無料枠を使い切った場合は止め、有料枠・プランへ切り替えません。productionは公開設定・実機記録のチェックを通す必要があります。App Storeへの提出・公開はこの作業に含めません。

## 実装の場所

- `src/domain/`: 無料枠、セッション、削除ジョブ、権利判定。
- `src/data/`: SQLite、写真、StoreKit、通知、フィードバック。
- `modules/photosweep-access/`: PhotoKitの権限区別・存在確認・キャンセルを区別する削除ブリッジ。
- `src/screens/`, `src/ui/`: 共通のネイティブ画面と部品。
- `src/dev/`: 開発カタログ専用の状態・アダプター。
- `tests/`: 本番関数、実SQL、Provider、画面のテスト。
- `handoff/`: デスクトップから取り込んだ設計資料。参考資料とアプリ検証は区別します。

[検証結果と改善履歴](docs/implementation-status.md) / [実機検証手順](docs/DEVICE_TESTING.md) / [公開前チェック](docs/RELEASE_CHECKLIST.md)
