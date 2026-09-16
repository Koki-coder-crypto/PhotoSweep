import React, { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useApp } from "../state/AppContext";
import { hasPro, productCTA } from "../domain/policy";
import {
  Button,
  Card,
  Chip,
  Icon,
  Page,
  Row,
  StateView,
} from "../ui/components";
import { palette as p, styles as s } from "../ui/theme";
import { dateLabel, go, run } from "./actions";
export function Paywall({
  initialPeriod,
}: { initialPeriod?: "month" | "year" } = {}) {
  const app = useApp();
  const params = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<"year" | "month">(
    initialPeriod || (params.period === "month" ? "month" : "year"),
  );
  useEffect(() => {
    void app.loadBilling();
  }, []);
  useFocusEffect(useCallback(() => {
    if (app.purchaseState === "cancelled") {
      app.notify("登録をキャンセルしました。");
      app.dismissPurchaseResult();
      if (router.canGoBack()) router.back();
    }
  }, [app.purchaseState]));
  const product = app.products.find((p) => p.period === period),
    cta = productCTA(product),
    pro = hasPro(app.entitlement, Date.now());
  const close = () => {
    app.dismissPurchaseResult();
    router.canGoBack() ? router.back() : router.replace("/");
  };
  if (pro && ["verified", "restored"].includes(app.purchaseState))
    return (
      <Page title="PhotoSweep Pro" back>
        <StateView
          icon="checkmark"
          tone="green"
          title={
            app.purchaseState === "restored"
              ? "購入を復元しました。"
              : app.entitlement.kind === "trial"
                ? "無料体験が始まりました。"
                : "Proをご利用いただけます。"
          }
          description={
            "expiresAt" in app.entitlement
              ? `${dateLabel(app.entitlement.expiresAt)}まで利用できます。プランの管理はいつでも設定から。`
              : "購入済みの権利を確認しました。"
          }
        >
          <Button title="続きに戻る" onPress={close} />
          {app.entitlement.kind === "trial" ? (
            <Button
              title="終了前の通知を設定"
              variant="secondary"
              onPress={() => go("/notifications")}
            />
          ) : null}
        </StateView>
      </Page>
    );
  if (pro)
    return (
      <Page title="PhotoSweep Pro" back>
        <StateView
          icon="diamond-outline"
          title="Proをご利用中です"
          description="写真を、あなたのペースで整理できます。"
        >
          <Button title="プランを確認する" onPress={() => go("/plan")} />
          <Button title="整理に戻る" variant="secondary" onPress={close} />
        </StateView>
      </Page>
    );
  if (app.purchaseState === "pending")
    return (
      <Page title="購入状況の確認" back>
        <StateView
          icon="hourglass-outline"
          title="購入の確認を待っています"
          description="Appleの承認待ち、または購入状況を確認中です。無料の写真整理には戻れます。"
        >
          <Button
            title="購入状況を確認する"
            onPress={() => void app.refreshEntitlement()}
          />
          <Button
            title="閉じて整理に戻る"
            variant="secondary"
            onPress={close}
          />
        </StateView>
      </Page>
    );
  if (app.purchaseState === "failed" || app.purchaseState === "none")
    return (
      <Page title="購入状況" back>
        <StateView
          icon="receipt-outline"
          title={
            app.purchaseState === "none"
              ? "復元できる購入がありません"
              : "購入の確認を完了できませんでした"
          }
          description={
            app.purchaseState === "none"
              ? "購入したApple Accountでサインインしているか確認してください。復元によって新しい契約は始まりません。"
              : "請求状況はApp Storeで確認できます。もう一度購入する前に、購入の復元をお試しください。"
          }
        >
          <Button
            title="購入を復元・再確認"
            onPress={() => void app.restore()}
          />
          <Button title="無料のまま戻る" variant="secondary" onPress={close} />
          <Button
            title="App Storeで契約を確認"
            variant="ghost"
            onPress={() => void app.manage()}
          />
        </StateView>
      </Page>
    );
  return (
    <Page
      title="PhotoSweep Pro"
      back
      footer={
        <>
          <Button
            title={
              app.billingError
                ? "料金を再読み込み"
                : app.billingLoading
                  ? "購入条件を確認中"
                  : cta.label
            }
            disabled={!app.billingError && (!cta.enabled || app.billingLoading)}
            onPress={() =>
              app.billingError
                ? void app.loadBilling()
                : product
                  ? void app.purchase(product.id)
                  : undefined
            }
          />
          <Text style={[s.caption, { textAlign: "center", color: p.ink }]}>
            {cta.disclosure}
          </Text>
          <Button title="無料のまま続ける" variant="ghost" onPress={close} />
        </>
      }
    >
      <LinearGradient
        colors={["#EEE6FF", "#FFF0F6"]}
        style={{
          padding: 24,
          borderRadius: 28,
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <Chip>PHOTOSWEEP PRO</Chip>
        <View
          style={{
            backgroundColor: "#fff",
            padding: 16,
            borderRadius: 22,
            transform: [{ rotate: "-8deg" }],
          }}
        >
          <Icon name="sparkles-outline" size={34} />
        </View>
        <Text style={s.title}>写真も、気持ちも。{`\n`}もっと軽やかに。</Text>
        <Text style={s.body}>
          まとめて整理したい日に、{`\n`}あなたのペースを止めない。
        </Text>
      </LinearGradient>
      <View style={{ gap: 14 }}>
        {[
          "仕分け枚数の上限なし",
          "好きな期間・並び順で整理",
          "20・50・100枚から区切りを選べる",
        ].map((text) => (
          <View style={s.row} key={text}>
            <Icon name="checkmark-circle" color={p.green} size={22} />
            <Text style={[s.label, { flex: 1 }]}>{text}</Text>
          </View>
        ))}
      </View>
      {app.preview ? (
        <Text style={[s.caption, { color: p.rose }]}>
          開発用のサンプル料金です。実際の購入は発生しません。
        </Text>
      ) : null}
      {app.billingError ? (
        <Card>
          <Text style={s.body}>{app.billingError}</Text>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {(["year", "month"] as const).map((key) => {
            const item = app.products.find((p) => p.period === key);
            const selected = period === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${key === "year" ? "年額" : "月額"}プラン ${item?.displayPrice || "取得中"}`}
                onPress={() => setPeriod(key)}
                style={[
                  s.card,
                  {
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? p.purple : p.border,
                    backgroundColor: selected ? "#F2EEFF" : "#fff",
                    padding: 18,
                  },
                ]}
              >
                <View style={s.between}>
                  <View style={{ gap: 7, flex: 1 }}>
                    <Text style={s.label}>
                      {key === "year" ? "年額プラン" : "月額プラン"}
                    </Text>
                    <Text
                      style={{ color: p.ink, fontSize: 25, fontWeight: "800" }}
                    >
                      {item
                        ? `${item.displayPrice} / ${key === "year" ? "年" : "月"}`
                        : "料金を取得中"}
                    </Text>
                    {item?.eligibility === "eligible" && item.trialDays > 0 ? (
                      <Text
                        style={{
                          color: p.purple,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        対象の方は最初の{item.trialDays}日間無料
                      </Text>
                    ) : null}
                  </View>
                  <Icon
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    color={selected ? p.purple : p.muted}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      <Text style={s.caption}>
        無料体験は対象の方のみです。継続しない場合は終了の24時間以上前にApp
        Storeで解約してください。Appleの確認画面で購入条件をご確認ください。
      </Text>
      <View style={{ gap: 2 }}>
        <Button
          title="購入を復元"
          variant="ghost"
          onPress={() => void app.restore()}
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button
            title="利用規約"
            variant="ghost"
            onPress={() => go("/terms")}
          />
          <Button
            title="プライバシー"
            variant="ghost"
            onPress={() => go("/privacy")}
          />
        </View>
      </View>
    </Page>
  );
}
export function Plan() {
  const app = useApp(),
    e = app.entitlement,
    active = hasPro(e, Date.now());
  useEffect(() => {
    void app.refreshEntitlement();
    void app.loadBilling();
  }, []);
  const product =
    "productId" in e
      ? app.products.find((p) => p.id === e.productId)
      : undefined;
  const title =
    e.kind === "trial"
      ? "無料体験中"
      : e.kind === "legacy"
        ? "購入済み（買い切り）"
        : e.kind === "grace"
          ? "お支払いを確認してください"
          : active
            ? "Proをご利用中"
            : e.kind === "unknown"
              ? "購入状況を確認中"
              : e.kind === "revoked"
                ? "購入の取消を確認しました"
                : e.kind === "expired"
                  ? "Proの期間が終了しました"
                  : "無料プラン";
  return (
    <Page title="プランの確認" back>
      <Card style={{ backgroundColor: p.lavender, padding: 26 }}>
        <Chip>YOUR PLAN</Chip>
        <Icon name="diamond-outline" size={34} />
        <Text style={s.title}>{title}</Text>
        {product ? (
          <Text style={s.heading}>
            {product.displayPrice} / {product.period === "year" ? "年" : "月"}
          </Text>
        ) : null}
        {"expiresAt" in e ? (
          <>
            <Text style={s.body}>{dateLabel(e.expiresAt)}まで利用可能</Text>
            <Chip
              color={e.autoRenew ? p.purple : p.green}
              background={e.autoRenew ? "#fff" : p.mint}
            >
              {e.autoRenew ? "自動更新 オン" : "自動更新 オフ"}
            </Chip>
          </>
        ) : null}
      </Card>
      {e.kind === "grace" || ("billingRetry" in e && e.billingRetry) ? (
        <Text style={s.body}>
          お支払い情報をApp
          Storeで確認してください。確認済みの利用期限まではProを利用できます。
        </Text>
      ) : null}
      {!active ? (
        <>
          <Text style={s.body}>
            記録と候補はそのまま。無料の写真整理を続けられます。
          </Text>
          <Button
            title="Proの内容と料金を見る"
            onPress={() => go("/paywall")}
          />
        </>
      ) : null}
      <Button
        title="プランの管理・解約"
        variant="secondary"
        onPress={() => void app.manage()}
      />
      <Button
        title="購入を復元"
        variant="ghost"
        onPress={() =>
          void run(app, async () => {
            await app.restore();
            go("/paywall");
          })
        }
      />
      {e.kind === "trial" ? (
        <Button
          title="体験終了前の通知"
          variant="ghost"
          onPress={() => go("/notifications")}
        />
      ) : null}
      <Button
        title="整理に戻る"
        variant="ghost"
        onPress={() => router.replace("/")}
      />
      <Text style={s.caption}>
        契約はApple Accountで管理されます。自動更新を止めた場合の利用期限も、App
        Storeの確認済み情報に従います。
      </Text>
    </Page>
  );
}
