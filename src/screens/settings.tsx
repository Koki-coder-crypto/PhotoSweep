import React, { useEffect, useState } from "react";
import { Alert, Linking, Platform, Switch, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { useApp } from "../state/AppContext";
import { hasPro } from "../domain/policy";
import { notificationPermission } from "../data/notifications";
import { config } from "../config";
import { replayOnboarding } from "../domain/onboarding";
import {
  Button,
  Card,
  Chip,
  Page,
  Row,
  StateView,
  Stat,
} from "../ui/components";
import { palette as p, styles as s } from "../ui/theme";
import { dateLabel, go, run } from "./actions";
export function SettingsScreen() {
  const app = useApp();
  const pro = hasPro(app.entitlement, Date.now());
  return (
    <Page title="設定" back>
      <Card style={{ backgroundColor: p.lavender }}>
        <Text style={s.heading}>{pro ? "PhotoSweep Pro" : "無料プラン"}</Text>
        <Text style={s.body}>
          {pro
            ? "枚数制限なし。期間や並び順も選べます。"
            : "毎日、写真30枚・動画5本。確認・取り消し・削除は無料。"}
        </Text>
        <Button
          title={pro ? "プランを確認・管理" : "Proの内容と料金を見る"}
          onPress={() => go(pro ? "/plan" : "/paywall")}
        />
      </Card>
      <Card style={{ paddingVertical: 4 }}>
        <Row
          icon="hand-left-outline"
          title="使い方を見る"
          onPress={() =>
            void run(app, async () => {
              await app.mutate(replayOnboarding);
              go("/onboarding");
            })
          }
        />
        <Row
          icon="calendar-outline"
          title="整理の記録"
          onPress={() => go("/history")}
        />
        <Row
          icon="pulse-outline"
          title="振動・音・動き"
          onPress={() => go("/feedback")}
        />
        <Row
          icon="notifications-outline"
          title="通知"
          onPress={() => go("/notifications")}
        />
        <Row
          icon="images-outline"
          title="写真へのアクセス"
          subtitle={
            app.permission === "limited"
              ? "選択した写真のみ"
              : app.permission === "full"
                ? "すべての写真"
                : "未許可"
          }
          onPress={() => go("/permission")}
        />
        <Row
          icon="receipt-outline"
          title="契約の管理・購入を復元"
          onPress={() => go("/plan")}
        />
      </Card>
      <Card style={{ paddingVertical: 4 }}>
        <Row
          icon="help-circle-outline"
          title="ヘルプ・問い合わせ"
          onPress={() => go("/help")}
        />
        <Row
          icon="shield-checkmark-outline"
          title="プライバシー"
          onPress={() => go("/privacy")}
        />
        <Row
          icon="document-text-outline"
          title="利用規約・購入条件"
          onPress={() => go("/terms")}
        />
      </Card>
      {__DEV__ ? (
        <Button
          title="開発用の画面カタログ"
          variant="ghost"
          onPress={() => go("/catalog")}
        />
      ) : null}
      <Text style={[s.caption, { textAlign: "center" }]}>PhotoSweep {Constants.expoConfig?.version}</Text>
    </Page>
  );
}
export function Feedback() {
  const app = useApp();
  return (
    <Page title="振動・音・動き" back>
      <Card>
        <Row
          icon="pulse-outline"
          title="振動"
          subtitle="仕分けが保存されたときに、軽く。"
          end={
            <Switch
              accessibilityLabel="振動"
              value={app.state.settings.haptics}
              onValueChange={(v) =>
                void run(app, () => app.settings({ haptics: v }))
              }
              trackColor={{ true: p.purple }}
            />
          }
        />
        <Row
          icon="volume-low-outline"
          title="操作音"
          subtitle="初期設定はオフ。消音モードを尊重します。"
          end={
            <Switch
              accessibilityLabel="操作音"
              value={app.state.settings.sound}
              onValueChange={(v) =>
                void run(app, () => app.settings({ sound: v }))
              }
              trackColor={{ true: p.purple }}
            />
          }
        />
        <Row
          icon="leaf-outline"
          title="動きを控えめに"
          subtitle="iPhone側の視差効果を減らす設定も優先します。"
          end={
            <Switch
              accessibilityLabel="動きを控えめに"
              value={app.state.settings.reduceMotion}
              onValueChange={(v) =>
                void run(app, () => app.settings({ reduceMotion: v }))
              }
              trackColor={{ true: p.purple }}
            />
          }
        />
      </Card>
      <Button
        title="振動を試す"
        variant="secondary"
        disabled={!app.state.settings.haptics}
        onPress={() => {
          if (Platform.OS !== "web")
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          else app.notify("振動はiPhoneで確認できます。");
        }}
      />
    </Page>
  );
}
export function NotificationsScreen() {
  const app = useApp();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    void notificationPermission().then(setAllowed);
  }, []);
  const set = async (key: "weekly" | "trialReminder", value: boolean) => {
    const granted = value ? await notificationPermission(true) : allowed;
    setAllowed(granted);
    if (value && !granted) {
      app.notify("通知は許可されていません。iPhoneの設定から変更できます。");
      return;
    }
    await app.settings({ [key]: value });
  };
  return (
    <Page title="通知" back>
      <Text style={s.title}>思い出したいときだけ。</Text>
      <Text style={s.body}>
        通知は任意です。ロック画面に写真の内容や枚数を表示しません。
      </Text>
      <Card>
        <Row
          icon="calendar-outline"
          title="週1回のリマインダー"
          subtitle="日曜19時。少し見返すきっかけに。"
          end={
            <Switch
              accessibilityLabel="週1回の通知"
              value={allowed && app.state.settings.weekly}
              onValueChange={(v) => void run(app, () => set("weekly", v))}
              trackColor={{ true: p.purple }}
            />
          }
        />
        <Row
          icon="time-outline"
          title="無料体験の終了前"
          subtitle="確認済みの終了日時の48時間前にお知らせ。"
          end={
            <Switch
              accessibilityLabel="体験終了前の通知"
              value={allowed && app.state.settings.trialReminder}
              onValueChange={(v) =>
                void run(app, () => set("trialReminder", v))
              }
              trackColor={{ true: p.purple }}
            />
          }
        />
      </Card>
      {!allowed ? (
        <Button
          title="iPhoneの通知設定を開く"
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
      <Text style={s.caption}>
        通知の到達は端末の設定・状態に左右されます。契約の終了日時と解約は、App
        Storeでもご確認ください。終了まで48時間未満の場合は予約しません。
      </Text>
    </Page>
  );
}
export function History({
  initialConfirm = false,
}: { initialConfirm?: boolean } = {}) {
  const app = useApp();
  const [confirm, setConfirm] = useState(initialConfirm);
  const kept = app.state.history.reduce((n, h) => n + h.kept, 0),
    candidates = app.state.history.reduce((n, h) => n + h.candidates, 0);
  return (
    <Page title="整理の記録" back>
      <Chip>SMALL STEPS, REAL PROGRESS</Chip>
      <Text style={s.title}>少しずつ、すっきり。</Text>
      <View style={s.row}>
        <Stat
          label="区切りまで見直した写真"
          value={`${kept + candidates}枚`}
          mint
        />
        <Stat
          label="確認して削除した写真"
          value={`${app.state.deletedCount}枚`}
        />
      </View>
      {app.state.history.length ? (
        [...app.state.history].reverse().map((h) => (
          <Card key={h.id}>
            <Text style={s.label}>{dateLabel(h.at)}</Text>
            <Text style={s.body}>
              残す {h.kept}枚 · 候補 {h.candidates}枚
            </Text>
          </Card>
        ))
      ) : (
        <StateView
          icon="leaf-outline"
          title="最初のひと区切りから。"
          description="20枚を見直すと、ここに記録が残ります。"
        />
      )}
      {confirm ? (
        <Card>
          <Text style={s.heading}>整理の記録だけをリセットしますか？</Text>
          <Text style={s.body}>
            写真、候補、仕分け位置、今日の無料枠、契約は変わりません。
          </Text>
          <Button
            title="記録だけリセット"
            variant="danger"
            onPress={() =>
              void run(app, async () => {
                await app.mutate((s) => ({
                  ...s,
                  history: [],
                  deletedCount: 0,
                }));
                setConfirm(false);
              })
            }
          />
          <Button
            title="キャンセル"
            variant="ghost"
            onPress={() => setConfirm(false)}
          />
        </Card>
      ) : (
        <Button
          title="整理の記録をリセット"
          variant="ghost"
          onPress={() => setConfirm(true)}
        />
      )}
    </Page>
  );
}
export function Help() {
  const app = useApp();
  const contact = async () => {
    if (config.supportUrl) {
      await Linking.openURL(config.supportUrl);
      return;
    }
    if (!config.supportEmail) {
      app.notify("問い合わせ窓口は公開前に設定します。");
      return;
    }
    const url = `mailto:${config.supportEmail}?subject=${encodeURIComponent("PhotoSweepについて")}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else {
      await Clipboard.setStringAsync(config.supportEmail);
      app.notify(
        "問い合わせ先をコピーしました。メールアプリに貼り付けてください。",
      );
    }
  };
  return (
    <Page title="ヘルプ・問い合わせ" back>
      <Text style={s.title}>困ったときは、ここから。</Text>
      <Card style={{ paddingVertical: 4 }}>
        <Row
          icon="hand-left-outline"
          title="仕分けの使い方"
          onPress={() => go("/guide")}
        />
        <Row
          icon="arrow-undo-outline"
          title="消した写真を戻す方法"
          onPress={() => go("/restore-photo")}
        />
        <Row
          icon="images-outline"
          title="写真が表示されない"
          onPress={() => go("/permission")}
        />
        <Row
          icon="receipt-outline"
          title="購入・復元・解約について"
          onPress={() => go("/plan")}
        />
      </Card>
      <Card>
        <Text style={s.heading}>よくある質問</Text>
        <Text style={s.label}>候補にしたら、すぐ消えますか？</Text>
        <Text style={s.body}>
          消えません。候補で写真を確認して「削除」を押し、iPhoneの確認を経て削除します。
        </Text>
        <Text style={s.label}>iCloudの写真はどうなりますか？</Text>
        <Text style={s.body}>
          削除は同期している端末にも反映されます。通信が必要な写真は、読み込みに時間がかかることがあります。
        </Text>
        <Text style={s.label}>無料枠を使い切りました。</Text>
        <Text style={s.body}>
          候補の確認・削除・取り消しは引き続き無料です。新しい写真の仕分けは日付が変わると再開できます。
        </Text>
      </Card>
      <Button
        title="問い合わせる"
        variant="secondary"
        disabled={!config.supportUrl && !config.supportEmail}
        onPress={() => void run(app, contact)}
      />
      {__DEV__ && !config.supportEmail && !config.supportUrl ? (
        <Text style={s.caption}>
          開発中：正式な問い合わせ窓口は未設定です。公開前チェックで検出します。
        </Text>
      ) : null}
    </Page>
  );
}
export function RestorePhoto() {
  return (
    <Page title="消した写真を戻す" back>
      <StateView
        icon="arrow-undo-outline"
        title="iPhoneの「写真」から戻せます"
        description="写真アプリの「最近削除した項目」で対象の写真を選び、「復元」を操作します。通常30日間残りますが、完全削除など復元できない場合があります。"
      />
      <Card>
        <Text style={s.body}>
          PhotoSweep内で削除済みの写真を復元することはできません。iCloud写真では同期先の端末にも復元が反映されます。
        </Text>
      </Card>
      <Button
        title="Appleの案内を見る"
        onPress={() =>
          void Linking.openURL("https://support.apple.com/ja-jp/124460")
        }
      />
    </Page>
  );
}
export function Privacy() {
  return (
    <Page title="プライバシー" back>
      <Card>
        <Text style={s.heading}>写真を開発者へ送信しません</Text>
        <Text style={s.body}>
          写真の表示・仕分けに必要な情報は端末内で扱います。広告SDK、外部分析SDK、アカウント登録はありません。iCloud写真の読み込みにはAppleとの通信が発生する場合があります。
        </Text>
        <Text style={s.heading}>端末に保存する情報</Text>
        <Text style={s.body}>
          写真の識別子、残す・候補の判断、進行位置、日ごとの無料枠、整理の記録、設定を保存します。写真の原本や位置情報を独自の記録として保存しません。
        </Text>
        <Text style={s.heading}>購入と問い合わせ</Text>
        <Text style={s.body}>
          購入・支払いはAppleが処理します。お問い合わせでは、あなたが送信する内容だけを窓口で受け取ります。
        </Text>
      </Card>
      {config.privacyUrl ? (
        <Button
          title="プライバシーポリシー全文"
          variant="secondary"
          onPress={() => void Linking.openURL(config.privacyUrl)}
        />
      ) : null}
      {config.operator ? (
        <Text style={s.caption}>運営者：{config.operator}</Text>
      ) : null}
    </Page>
  );
}
export function Terms() {
  return (
    <Page title="利用規約・購入条件" back>
      <Card>
        <Text style={s.heading}>写真の整理</Text>
        <Text style={s.body}>
          削除対象はあなたが選択します。確認画面で写真を確認してください。削除や復元の結果、iCloud同期、端末の空き容量はiOSの処理に依存します。
        </Text>
        <Text style={s.heading}>無料利用とPro</Text>
        <Text style={s.body}>
          無料では1日30枚の写真と5本の動画を仕分けできます。Proでは枚数上限の解除、期間指定、並び替え、区切り枚数の選択と動画圧縮ができます。削除・確認・取り消し・保存は無料です。
        </Text>
        <Text style={s.heading}>購入・自動更新</Text>
        <Text style={s.body}>
          Proには自動更新プランと、1回の支払いで利用できる買い切りプランがあります。提供中のプラン・料金・期間・無料体験の有無は購入画面のApp
          Store情報に従います。無料体験は対象の方のみ利用できます。終了の24時間以上前に解約しない場合、自動更新されます。
        </Text>
        <Text style={s.heading}>管理・復元・返金</Text>
        <Text style={s.body}>
          契約の管理・解約はApple
          Accountから行います。購入の復元はアプリ内から利用できます。返金はAppleの窓口へ申請でき、可否はAppleの判断によります。
        </Text>
      </Card>
      <Button
        title="Apple標準使用許諾契約"
        variant="secondary"
        onPress={() =>
          void Linking.openURL(
            "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
          )
        }
      />
      {config.termsUrl ? (
        <Button
          title="運営者情報・規約全文"
          variant="secondary"
          onPress={() => void Linking.openURL(config.termsUrl)}
        />
      ) : null}
    </Page>
  );
}
