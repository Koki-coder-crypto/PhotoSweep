# 公開前チェック

## ビルド前に必要

- [ ] Expo認証・project ID・無料ビルド残量を確認。
- [ ] Apple Bundle ID・iPhone登録・署名を設定。
- [ ] App Store Connectのアプリ・週額サブスクリプション・非消耗型の買い切りを登録。
- [ ] 実商品から価格・期間・体験資格を取得できる。

## 公開前に必要

- [ ] 正式な問い合わせ先と運営者を確定。以前の仮メールアドレスは使用しない。
- [ ] `web/privacy.html` / `web/terms.html` / `web/support.html` の原稿を正式情報で確定し、HTTPSで公開。
- [ ] `.env.example` の公開URLと商品IDを設定。URLが誰でも閲覧できることを確認。
- [ ] `npm run check`、`npm run export:ios`、`npm run check:release-bundle` に合格。
- [ ] `docs/device-test-results.json` の実機検証を完了。未実行を合格にしない。
- [ ] 本番相当ビルドで開発素材・デモ課金・Metro依存がないことを確認。
- [ ] 署名済みアプリのPrivacy Manifest・写真/通知権限を点検。
- [ ] 実機スクリーンショットと日本語説明を用意。推定容量・旧30枚削除制限・連絡先整理・動画最適化を説明しない。
- [ ] App Privacy申告、税務/銀行/有料App契約、審査連絡先を本人が確認。
- [ ] `npm run release:check` に合格。

`release:check` は未設定のURLや未実機検証のままproductionビルドへ進まないためのチェックです。開発/previewビルドの検証はこれらを埋める前から行えます。App Storeへの提出・公開は今回の作業範囲外です。

依存ライブラリの監査結果と対応範囲は `implementation-status.md` を参照してください。
