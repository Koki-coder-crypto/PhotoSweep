# PhotoSweep｜Codexへ渡す一式

**今回作るのはPhotoSweep 1本。iPhone向け、ポップなPOP V3、基本無料＋7日間の有料プラン体験。**
このフォルダは仕様・画像・検証用データです。アプリ本体ではありません。

## ユーザーの操作（Windows）
1. ZIPを展開します。中の `photosweep-handoff` フォルダを、PhotoSweepの `package.json` と同じ場所へ置きます。既存ファイルは上書きしません。
2. デスクトップのCodexで **PhotoSweepのプロジェクトフォルダ** を開きます。`photosweep-handoff`だけをアプリルートとして開かないでください。
3. `CODEX_START_PROMPT.md` の本文を、そのままCodexに貼り付けます。

```text
PhotoSweep/
  package.json       ← 既存アプリ
  app/
  src/
  photosweep-handoff/
    START_HERE.md
    CODEX_START_PROMPT.md
    index.html       ← 48画面を閲覧
    design/
    docs/
    contracts/
```

まだローカルにリポジトリがない場合は、Codexに `Koki-coder-crypto/PhotoSweep` を作業フォルダへ取得させてから配置します。既存の作業コピーがある場合はそれを使い、重複して作り直さないでください。認証は正規ログインで行い、秘密鍵やパスワードをチャットへ貼りません。

## Codexが最初に読む順番
1. このファイル・`PROVENANCE.md`
2. `docs/00_PRODUCT_BRIEF.md` と `docs/08_REPO_AUDIT.md`
3. `docs/09_IMPLEMENTATION_TASKS.md`
4. `design/tokens.json`、`design/screens.json`、`design/copy.ja.json`
5. 担当画面の `design/screens/Sxx.png` を数枚ずつ目視
6. 写真：`docs/05_PHOTO_SAFETY.md`／課金：`docs/04_MONETIZATION.md`
7. `docs/10_TEST_PLAN.md`・`docs/12_RELEASE_CHECKLIST.md`

**計画を書くだけで止まらず、作業ブランチ上で実装・テスト・修正まで進める。**
ただしAppleの本人認証、有料利用、実写真削除、公開などは本人確認を経る。

## 現在の確定事項
- UIは紫を中心に、ミント・ピンクをアクセントにしたPOP V3。写真カードと操作の手応えを主役にする。
- 写真の月別・スクショ整理、左右スワイプ、削除候補、取り消し、再開。
- 基本無料は **1日50枚の新しい仕分け**。無料の区切りは20枚。上限は最適値の実証ではなく初回の検証設定。
- Proは仕分け枚数上限解除、期間指定・並び替え、20/50/100枚の区切り。
- 月額480円／年額2,400円は候補価格。双方、同一グループで対象者のみ初回7日無料。
- 買い切りの新規販売は採用しない。ただし実在する既存買い切り購入者の権利は尊重する。
- 削除確認・取り消し・候補から外す・候補の削除・途中保存・契約管理は無料。
- Appleの権限／削除／購入確認を使用。見た目だけの偽ダイアログを作らない。

## 同梱内容
48画面PNG＋12枚の一覧、HTMLギャラリー、画面遷移・追加状態、日本語文言、デザイントークン、課金・触覚仕様、技術計画、作業順序、テスト仕様、Apple/EAS設定表、Codex開始指示。
`contracts/` は仕様判断を実行して確認できる参照モデルです。写真APIやStoreKitの実装・検証の代わりにはなりません。

## 品質・実行範囲
`reports/PACKAGE_CHECK.json` と `reports/CONTRACT_TESTS.txt` は今回の引き継ぎセット検証の結果。
アプリの型検査・起動・iPhone実機・購入・削除は今回実行していません。Codexはこれらを別途実行し証拠を残します。

48画面は会話上の最新デザインからの再構成です。元画像そのものの完全復元ではありません。詳しくは `PROVENANCE.md`。

## すぐ確認するコマンド（Node.jsがある場合）
リポジトリのルートから：
```sh
node photosweep-handoff/tools/verify_handoff.mjs
node --test photosweep-handoff/contracts/policy.test.mjs
```
写真にアクセスせず、ネット通信せず、購入せずに実行できます。
