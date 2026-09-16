# 遷移と状態

## ナビゲーション
Tabは「ホーム」「候補」「マイページ」。スタック：月選択、スクショ、期間、仕分け、写真拡大、完了、設定詳細。Paywallは閉じられるmodal。OS確認は自作しない。
`design/screens.json` は全48状態の遷移定義。Sxxは参照番号であり、URLやReactコンポーネント名ではない。

## 主動線
```text
初回 S01 → S02 → OS許可 → S03 / S37 / S38 / S45
無料 S03 → S04またはS05 → S07(初回だけ) → S08
S08 → [S09候補 / S10残す] → S12(区切り)
S12 → S13候補確認 → OS削除確認 → S15照合 → S16成功 / S40問題
候補0：S12 → S14 → ホームまたは次の区切り
拡大：S08/S13 → S11 → 呼び出し元
上限：50枚目の決定を保存 → S17 → S48資格確認 → S18/S19 or S20
申込：Paywall → OS購入確認 → S30 → S21(trial) / S26(有料)
購入キャンセル → S46 → 直前画面（候補/位置/枠を保持）
trial開始 → S21 → S23、通知は本人が選んだ場合だけS22
プラン → S25/S26 → OS管理 → S27更新停止 / S28失効
```

## 重要な戻り先
Paywallを閉じる/OSキャンセルでホームへ強制送還しない。`returnTo`にsessionId、cursor、candidate集合、フィルタを保持。
「区切る」やアプリ終了は記録保存。アプリ内の独自「本当に終了しますか？」を繰り返さない。
写真拡大が候補から呼ばれた場合は候補へ、仕分けからなら仕分けへ戻す。

## モデルを分離する
PhotoPermission（unknown/limited/full/denied/restricted）
LibraryLoad（idle/loading/ready/empty/failed）
ReviewSession（idle/active/paused/summary）、DeletionJob（idle/awaiting_os/pending/succeeded/partial/failed/unknown）
ProductLoad（loading/ready/error）、IntroEligibility（checking/eligible/ineligible/unknown）
PurchaseOperation（idle/pending/cancelled/failed/verified）
Entitlement（free/trial_active/subscribed/grace/expired/revoked/legacy_lifetime/unknown）

48画面の不足する例外は `design/state_variants.json` の18バリアントで定義。
「OSからキャンセルを受けた」「SDKの返答が不明」「期限が切れた」を同じエラーとして処理しない。

## データ不整合の防止
枠残数、現在の決定、セッション進捗は1つのトランザクションで保存。
ネイティブ削除へ渡す候補IDをスナップショット化し、処理中の変更を禁止。
写真ライブラリの外部変更を監視/再照合し、既に消えたものや権限外の項目を操作しない。
同じ写真が月別とスクショに出てもdecisionと当日枠のキーは共通assetId。

## 共通ガード
`design/transition-guards.json` を全入口から適用する。料金を見る前に商品/資格を確認する。候補ゼロから削除成功へ遷移しない。
