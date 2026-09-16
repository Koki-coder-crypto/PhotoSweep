# 本人が必要なApple/EASの設定

このパッケージは設定を変更していない。Developer Programは加入済みとの過去の申告を前提にするが、現在のmembership・App Store Connect権限・課金同意は本人画面で再確認。

| 項目 | 現在分かること | 次の作業 |
|---|---|---|
| リポジトリ | Koki-coder-crypto/PhotoSweepを読み取り確認 | 同じrepoの作業コピーを使用 |
| Bundle ID | app.jsonではcom.kokicoder.photosweep | 登録済みidentifier/Appレコードと一致確認 |
| Appleログイン・2FA | 今回未実行 | 本人が正規画面で認証 |
| 契約・税金・銀行 | 今回未確認 | App Store Connectで本人が確認 |
| Subscription group | 未設定/未確認 | PhotoSweep Proの1group、月額/年額同level |
| 商品 | 候補monthly/annual | 実際に作成したIDを構成へ反映 |
| 料金 | 月480/年2,400は候補 | 日本の正規価格点と通貨表示を確認 |
| 無料体験 | 7日間の案 | 各商品で1weekのintroductory free trial設定。[A1] |
| EAS | 認証・projectID未確認 | npx eas-cli login等は実版の手順で本人認証 |
| Build | 今回未実行 | 無料枠/待ち時間を確認。有料が必要なら本人承認 |
| 署名 | 未確認 | 正規のcertificate/provisioning。秘密をGitに入れない |
| テスト用iPhone | 未接続 | テスト写真・対象OS・buildを準備 |
| 規約・privacy・連絡先 | 未確定 | 実情報の公開URLを設定、未設定で申請しない |

商品の表示名・期間・無料体験・現地総額・自動更新・復元・管理の内容をUIと一致させる。[A2]
Sandboxの体験期間は実時間の7日と同じとは限らない。UIを端末タイマーで補正せずsandbox取引の日時を使う。
Apple側反映や審査があるため、ビルド完了＝公開確定ではない。

## 認証待ちでもできること
UI/状態/純粋ロジック/型検査、テストアダプター、documentation、dev gallery。
ストア操作や実機の結果は模擬で代替して「成功」と報告しない。

## 秘密は本人管理
Appleパスワード/2FA、p8、private keys、Expo tokenをチャットへ要求しない。Codexが正規loginを起動し本人入力。
`config.example.json` は非秘密の設定例。キーをEXPO_PUBLIC_*に隠したつもりにしない。
