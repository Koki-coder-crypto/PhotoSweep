# 既存リポジトリの読み取り確認

2026-09-16、GitHub connectorで以下6ファイルを読み取り。mainのファイル単位blob SHAを記録。全リポジトリ監査・依存インストール・実行・StoreKit検証は未実施。

## `package.json`
Blob SHA: `87f3afea9deca8fe9eff4399852a593647212501`

Expo ~57.0.0 / React 19.2.0 / RN 0.86.2 / expo-iap ^4.7.0 / expo-haptics / expo-media-library を宣言。typecheck, doctor, test:logic scriptあり。解決済みの証拠ではない。

参照: https://github.com/Koki-coder-crypto/PhotoSweep/blob/main/package.json

## `app/paywall.tsx`
Blob SHA: `bc1614092a18bfb11e3f261bcfdc608e0ee75491`

lifetimeだけを購入。価格失敗時に¥2,480へfallback。purchase callbackでfinishTransaction後setIsPro(true)。このファイルから購読の期限・資格・更新判定は確認できない。

参照: https://github.com/Koki-coder-crypto/PhotoSweep/blob/main/app/paywall.tsx

## `src/store/AppStore.tsx`
Blob SHA: `95a95bf1d44f41be21a51d4c7364ce6d0f76998f`

isPro/freeDeletesUsed/freedBytesをAsyncStorage保存。selectedIdsはメモリ状態。サブスク・日別ユニーク枠・永続candidateへ改修必要。

参照: https://github.com/Koki-coder-crypto/PhotoSweep/blob/main/src/store/AppStore.tsx

## `src/lib/photoScanner.ts`
Blob SHA: `8b25bc9112e990fe62a209eab98983487f54b5db`

6,000枚上限、750枚ページ。類似は時刻・縦横比・解像度による推定。画像内容のAI類似判定ではない。uriへasset.id代入の有効性も対応SDKで要確認。

参照: https://github.com/Koki-coder-crypto/PhotoSweep/blob/main/src/lib/photoScanner.ts

## `app.json`
Blob SHA: `3319353464c03e200a88c448c50fed67ee17ca63`

bundle ID com.kokicoder.photosweep、iPhone/縦画面、light、MediaLibrary/IAP plugin、英語権限文、privacy manifestのAPI配列は空。生成物のプライバシー宣言の妥当性は未検証。

参照: https://github.com/Koki-coder-crypto/PhotoSweep/blob/main/app.json

## `src/lib/monetization.ts`
Blob SHA: `5b0558f927d06b2b520803b2e676318aa2690c19`

lifetime SKU、FREE_DELETE_LIMIT=30、DEFAULT_LIFETIME_PRICE_JPY=2480。最新案と不一致。

参照: https://github.com/Koki-coder-crypto/PhotoSweep/blob/main/src/lib/monetization.ts

## 実装前に読むべき追加ファイル
app/home.tsx、app/review.tsx、app/_layout.tsx、tests/scanner.logic.test.mjs、eas.json、lockfile、.github、既存AGENTS。
以前の会話ではrootとsrc/app下に重複ファイルが見えていた。今回の6ファイルだけから不要と判断して削除しない。実際のimport経路を追跡する。
既存テストが本番関数を呼んでいるかを確認し、本番関数へ接続する。テスト内に同じアルゴリズムを書き直すだけでは本番への保証にならない。

## 優先修正
1. 正規StoreKitデータに基づくsubscription lifecycle。
2. 架空の固定価格fallbackを除去。
3. 削除30枚制限から、仕分け50枚/日の分離。
4. セッション/候補/無料枠の永続化と安全なデータ移行。
5. 推定容量・類似表示を初版から除外。POP UIを実装。
