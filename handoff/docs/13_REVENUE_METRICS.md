# 収益化の検証（初版で外部追跡を勝手に入れない）

イベント案：permission_result、session_started、decision_committed、session_completed、candidate_reviewed、delete_result、paywall_viewed、plan_selected、purchase_pending、entitlement_verified、trial_verified、renewal_status_changed。
最初はローカル開発logger/no-op adapter。個別写真ID/画像/EXIF/人の属性/スクショ文面を外部へ送らない。
外部集計サービスは予算・収集内容・公開説明・本人承認が揃ってから。ストアの実レポートと照合する。

## 指標
初回20枚完了率、課金画面到達率、eligibleの試用開始率、実取引による7日体験から課金への移行、返金率、更新停止、継続利用、クラッシュ。
trial開始を有料売上へ数えない。年額の一括売上とMRR換算を分ける。売上と手取り利益を分ける。
閲覧・試用開始・課金のサンプル数と期間を必ず表示する。

## 実験の順序
まず無料体験までの正常動作と明確な説明。その後、初回提案位置や50枚枠を少数の明確な版で比較。
価格を変える場合はストア設定・UI説明・既存契約の扱いを合わせて確認。
「もっと多く消させる」「解約を見つけにくくする」や警告の誇張を収益化としない。
50枚がベスト、POP UIで課金が何%増えたなどの測定結果はまだない。
