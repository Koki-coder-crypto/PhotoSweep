# 検証計画

## 証拠を分ける
A. handoffのファイル整合（今回実行）
B. contractsの参照方針テスト（今回実行）
C. アプリの本番関数・UIテスト（Codexで実行）
D. iOS native build・実機/StoreKit sandbox（認証後に実行）
E. 実利用/課金率テスト（公開後）。A/Bが通ってもC/D/Eを実行済みにしない。

`contracts/acceptance-scenarios.json` に受け入れシナリオを用意。全項目は初期NOT_RUN。
`contracts/policy.test.mjs` は同じフォルダの参照関数を直接import。アプリ実装では本番関数を直接テストするよう置き換え、参照モデルだけを走らせて済ませない。

## 最低の機能カバレッジ
- 権限：full、limited、denied、restricted、後から取り消し。
- 読み込み：0件、1件、19/20/21件、大規模、iCloudのみ、ネット断、途中終了。
- 操作：keep/candidate/skip/undo、表示だけは枠不消費、二重tap、保存失敗。
- 枠：49→50→51、同一asset複数経路、undo再操作、日付、終了・再開、リセット。
- 削除：候補追加で消さない、対象一致、OSキャンセル、全成功、部分/不明、再起動、重複送信防止。
- 課金：対象/対象外/不明、実料金、年/月product、開始、更新、失効、返金、grace、restore、legacy。
- UX：課金を閉じて正しい位置に戻る、無料候補処理、触覚オフ、音オフ、Reduce Motion、Dynamic Type、VoiceOver。

## 自動と手動
純粋関数：Node/Jest等、永続store統合：実adapterまたは制御可能な永続化テスト。
コンポーネント：React Native Testing Library等、実際に追加するツールは互換性を確認。
E2E：テスト用データを注入する開発ビルドで経路を検査。iOS権限/削除/購入はnativeの実機確認が必要。
スクリーンショット比較：参照PNGの再現だけでなく、数字・ボタン・文字が実データで正しいか検査。

## サイズと性能
360/375/390/430pt幅、大きな文字、ライト/必要なダーク拡大画面、低電力、写真1,000件以上。
画面作成・一覧更新・swipeのフレーム詰まりを実測。目標は予測と分けてログ。
対象6,000件超でもtruncated表示を全件として見せない。

## エビデンス
テスト名、日時、OS/端末/SDK、入力、期待、結果、実行コマンド、log/screenshot path。
デモ写真のみ。スクリーンショットに本物の個人写真・アカウント情報を残さない。
失敗をskipにして合格にしない。実行環境がない場合NOT_RUN/BLOCKEDとする。
