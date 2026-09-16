# 技術計画

## 最初に実行する確認
`git status --short`、現在のbranch、package.json、lockfile、ルート/子のAGENTSを読む。
ユーザーの未コミット変更に重ねて消さない。安全なbranchを作る。reset --hardや強制push禁止。
Node/パッケージマネージャー/Expo/React Native/IAP/MediaLibraryの組み合わせが実在・対応するかを解決する。
今回見た宣言はExpo ~57、React Native 0.86.2等だが、依存をこの場でインストールした実績はない。
利用時点の公式情報とlockfileを照合し、診断してから最小変更で整合させる。勝手に最新へ総入れ替えしない。

## 構成の方向
既存Expo Routerを利用。状態を次のdomainに分離する。
- photoRepository：許可、ページ取得、asset詳細、変更監視、削除と再照合
- reviewStore：decision、cursor、session、candidate、journal、persistence
- quotaPolicy：日別ユニークID、枠、Pro時の振る舞い
- billingAdapter：商品、資格、購入、検証、権利状態、restore、management
- uxFeedback：振動・音・モーション、Reduce Motion
- metricsAdapter：開発用ローカル集計／将来の明示承認済み計測

正規の依存で不足するAPIを推測実装しない。expo-iapの対応版でintro eligibility/verified entitlement/management等を調べ、足りない分だけStoreKit 2の小さなbridgeを検討。
pro booleanをUIで持つ場合でも、検証済み権利selectorの派生値に限る。

## UI
tokens→共通Button/Chip/Card/PhotoCard/MonthRing/Sheet/PlanCard/StateView→画面。
再利用するために全画面を同じ空白カードへ潰さない。ホーム・仕分け・結果・課金には固有の構造を残す。
各画面は390×844参照。360/375pt幅、大きい文字でも料金と閉じる操作を失わない。Safe areaは実測。
routeごとに用途を分け、PNGのS番号をそのまま全部route化しない。

## 動作検証
Phase0でまずネイティブ開発ビルドの経路を確認する。画像/動画だけ作ってから依存問題を見つけない。
WindowsではローカルiOS simulatorを動かしたと報告しない。EAS開発ビルド＋iPhoneを軸にする。[E3]
課金などのネイティブ拡張が必要なためExpo Goでの表示だけを完成根拠にしない。
ブラウザ/テスト用アダプターはUI作業を続けるために利用し、Releaseから除外。

## データ・セキュリティ
秘密鍵/p8/Appleパスワード/Expo tokenはGitにもEXPO_PUBLIC_*にも入れない。
bundle ID、productID、公開URLは秘密ではないが、実在を勝手に断定しない。
写真APIのログは最小。スクショの自動提出にはユーザーの実写真を使わない。

## 既存購入と公開
旧買い切りの有効購入があれば維持。サブスクへの移行で既存ユーザーから二重請求しない。
新商品作成や有料契約、Appleの税務/銀行情報/規約同意/2FAは本人の操作。
無料プランから本当に価値を試せる状態にして、StoreKit sandboxで全状態を確認してから提出。
