import React, { useCallback, useEffect, useState, useRef } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  ZoomIn,
  useReducedMotion,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useApp } from "../state/AppContext";
import { hasPro, productCTA } from "../domain/policy";
import {
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  Page,
  Row,
  StateView,
} from "../ui/components";
import { palette as p, styles as s } from "../ui/theme";
import { dateLabel, go, run } from "./actions";
import type { StoreProduct } from "../domain/types";
import { interactionFeedback } from "../data/feedback";
import { Celebration } from "../ui/Celebration";
export function Paywall({
  initialPeriod,
  onboarding = false,
  onFinish,
  finishing = false,
  finishError = "",
}: {
  initialPeriod?: StoreProduct["period"];
  onboarding?: boolean;
  onFinish?: () => void;
  finishing?: boolean;
  finishError?: string;
} = {}) {
  const app = useApp();
  const osReduced = useReducedMotion(),
    reduced = osReduced || app.state.settings.reduceMotion;
  const celebrated = useRef(false);
  useEffect(() => {
    if (
      hasPro(app.entitlement, Date.now()) &&
      ["verified", "restored"].includes(app.purchaseState) &&
      !celebrated.current
    ) {
      celebrated.current = true;
      void interactionFeedback(app.state.settings, "success");
    }
  }, [app.entitlement, app.purchaseState]);
  const finishNotice = finishError ? (
    <Text accessibilityRole="alert" style={{ color: p.rose }}>
      {finishError}
    </Text>
  ) : null;
  const params = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<StoreProduct["period"]>(
    initialPeriod || (params.period === "month" ? "month" : "week"),
  );
  useEffect(() => {
    void app.loadBilling();
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (app.purchaseState === "cancelled") {
        app.notify("登録をキャンセルしました。");
        app.dismissPurchaseResult();
        if (onFinish) onFinish();
        else if (router.canGoBack()) router.back();
      }
    }, [app.purchaseState]),
  );
  const product =
      app.products.find((p) => p.period === period) || app.products[0],
    cta = productCTA(product),
    pro = hasPro(app.entitlement, Date.now());
  const close = () => {
    if (finishing) return;
    if (onFinish) {
      onFinish();
      return;
    }
    app.dismissPurchaseResult();
    router.canGoBack() ? router.back() : router.replace("/");
  };
  if (pro && ["verified", "restored"].includes(app.purchaseState))
    return (
      <Page title="PhotoSweep Pro" back={!onboarding}>
        {finishNotice}
        <StateView
          badge={<Celebration reduced={app.state.settings.reduceMotion} />}
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
          <Button
            title={onboarding ? "整理をはじめる" : "続きに戻る"}
            loading={finishing}
            onPress={close}
          />
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
      <Page title="PhotoSweep Pro" back={!onboarding}>
        {finishNotice}
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
      <Page title="購入状況の確認" back={!onboarding}>
        {finishNotice}
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
      <Page title="購入状況" back={!onboarding}>
        {finishNotice}
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
  const periodName = (value: StoreProduct["period"]) =>
    ({ week: "週額", month: "月額", year: "年額", lifetime: "買い切り" })[
      value
    ];
  const periodUnit = (value: StoreProduct["period"]) =>
    ({ week: "週", month: "月", year: "年", lifetime: "永久" })[value];
  return (
    <Page
      style={{ gap: 18 }}
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
            disabled={
              finishing ||
              (!app.billingError && (!cta.enabled || app.billingLoading))
            }
            onPress={() =>
              app.billingError
                ? void app.loadBilling()
                : product
                  ? void app.purchase(product.id)
                  : undefined
            }
          />
          {finishError ? (
            <Text accessibilityRole="alert" style={{ color: p.rose }}>
              {finishError}
            </Text>
          ) : null}
          <Text style={[s.caption, { textAlign: "center", color: p.ink }]}>
            {cta.disclosure}
          </Text>
          <Button
            title="無料のまま続ける"
            variant="ghost"
            loading={finishing}
            onPress={close}
          />
        </>
      }
    >
      <View style={s.between}>
        <IconButton
          name="close"
          label="課金画面を閉じる"
          color={p.muted}
          background="transparent"
          onPress={close}
        />
        <Text style={s.eyebrow}>PhotoSweep PRO</Text>
        <View style={{ width: 48 }} />
      </View>
      {onboarding ? (
        <Text style={[s.caption, { textAlign: "center" }]}>
          最後に、あなたに合うプランを。
        </Text>
      ) : null}
      <Animated.View
        entering={reduced ? FadeIn.duration(120) : ZoomIn.duration(240)}
        style={{ alignItems: "center", gap: 12, paddingBottom: 8 }}
      >
        <View
          style={{
            width: onboarding ? 56 : 72,
            height: onboarding ? 56 : 72,
            borderRadius: 22,
            backgroundColor: p.blue,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="sparkles" size={36} color="#fff" />
        </View>
        <Text style={[s.title, { textAlign: "center", fontSize: 30 }]}>
          枚数を気にせず、{`\n`}まとめて整理。
        </Text>
      </Animated.View>
      <View style={{ gap: 16 }}>
        {[
          ["infinite-outline", "1日の枚数制限なし"],
          ["options-outline", "期間・順番・整理枚数を自由に"],
        ].map(([icon, text]) => (
          <View key={text} style={s.row}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: p.lavender,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={icon as any} color={p.cyan} />
            </View>
            <Text style={[s.label, { flex: 1 }]}>{text}</Text>
          </View>
        ))}
      </View>
      {app.preview ? (
        <Text style={[s.caption, { color: p.cyan }]}>
          開発用のサンプル料金です。購入は発生しません。
        </Text>
      ) : null}
      {app.billingError ? (
        <Card>
          <Text style={s.body}>{app.billingError}</Text>
          <Text style={s.caption}>写真の整理は無料のまま続けられます。</Text>
        </Card>
      ) : (
        <View style={{ gap: 10, marginTop: 10 }}>
          {app.products.length ? (
            app.products.map((item) => {
              const selected = product?.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityLabel={
                    periodName(item.period) + "プラン " + item.displayPrice
                  }
                  accessibilityState={{ selected }}
                  onPress={() => {
                    if (product?.id !== item.id) {
                      setPeriod(item.period);
                      void interactionFeedback(app.state.settings, "selection");
                    }
                  }}
                  style={[
                    s.card,
                    {
                      borderWidth: 2,
                      borderColor: selected ? p.blue : p.border,
                      backgroundColor: selected ? p.lavender : p.surface,
                      padding: 16,
                    },
                  ]}
                >
                  <View style={s.between}>
                    <View style={{ gap: 6, flex: 1 }}>
                      <Text style={[s.label, { fontSize: 18 }]}>
                        {item.displayPrice}
                        {item.period === "lifetime"
                          ? " · 買い切り"
                          : " / " + periodUnit(item.period)}
                      </Text>
                      <Text style={s.caption}>
                        {item.period === "lifetime"
                          ? "1回のお支払い。自動更新なし。"
                          : item.eligibility === "eligible" &&
                              item.trialDays > 0
                            ? "最初の" +
                              item.trialDays +
                              "日間無料。いつでも解約できます。"
                            : "いつでも解約できます。"}
                      </Text>
                    </View>
                    <Animated.View
                      key={String(selected)}
                      entering={
                        reduced ? FadeIn.duration(120) : ZoomIn.duration(140)
                      }
                    >
                      <Icon
                        name={selected ? "radio-button-on" : "radio-button-off"}
                        color={selected ? p.cyan : p.muted}
                      />
                    </Animated.View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Card>
              <Text style={s.body}>ストアの料金を確認しています…</Text>
            </Card>
          )}
        </View>
      )}
      <View style={[s.row, { justifyContent: "center", flexWrap: "wrap" }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void app.restore()}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={s.caption}>購入を復元</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => go("/terms")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={s.caption}>利用規約</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => go("/privacy")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={s.caption}>プライバシー</Text>
        </Pressable>
      </View>
      <Text style={s.caption}>
        無料体験は対象の方のみです。継続しない場合は終了の24時間以上前にApp
        Storeで解約してください。購入前にAppleの確認画面をご確認ください。
      </Text>
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
        <Icon name="diamond-outline" size={34} />
        <Text style={s.title}>{title}</Text>
        {product ? (
          <Text style={s.heading}>
            {product.displayPrice} /{" "}
            {
              { week: "週", month: "月", year: "年", lifetime: "買い切り" }[
                product.period
              ]
            }
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
