import React, { useEffect, useRef, useState } from "react";
import { BrandMark } from "../ui/BrandMark";
import {
  AccessibilityInfo,
  Linking,
  Pressable,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useApp } from "../state/AppContext";
import {
  finishOnboarding,
  onboardingState,
  updateOnboarding,
  type IntroStep,
} from "../domain/onboarding";
import { emptyAnalysis } from "../domain/analysis";
import { hasPro } from "../domain/policy";
import { interactionFeedback } from "../data/feedback";
import {
  Button,
  Card,
  Icon,
  IconButton,
  Page,
  Progress,
} from "../ui/components";
import { palette as p, styles as s } from "../ui/theme";
import { Celebration } from "../ui/Celebration";
import { Paywall } from "./billing";

// This shipped lesson artwork comes from the project's supplied design assets.
// It is not connected to PhotoRepository, decisions, quota, or OS deletion.
const coast = require("../../assets/onboarding/coast.jpg");
const order: IntroStep[] = [
  "welcome",
  "compare",
  "swipe",
  "permission",
  "discover",
  "pro",
];
function useMotionPreference() {
  const app = useApp();
  const [os, setOS] = useState(true);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (live) setOS(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setOS,
    );
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return os || app.state.settings.reduceMotion;
}
function LessonPhoto({ index = 0 }: { index?: number }) {
  return (
    <Image
      source={coast}
      contentFit="cover"
      style={{
        width: "100%",
        height: "100%",
        transform: [{ scale: 1 + index * 0.08 }],
      }}
      accessibilityLabel="練習用の海の写真"
    />
  );
}
function HeroCard({ index, reduced }: { index: number; reduced: boolean }) {
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: reduced ? 120 : 600 });
  }, [reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateX: reduced
          ? (index - 1) * 60
          : (index - 1) * (120 - 60 * progress.value),
      },
      { translateY: reduced ? 0 : 18 * (1 - progress.value) },
      { rotate: `${reduced ? 0 : (index - 1) * (15 - 7 * progress.value)}deg` },
      { scale: reduced ? 1 : 0.9 + progress.value * 0.1 },
    ],
  }));
  return (
    <Animated.View style={[o.heroCard, { zIndex: index === 1 ? 3 : 1 }, style]}>
      <LessonPhoto index={index} />
      {index === 1 ? (
        <View style={o.keepBadge}>
          <Icon name="checkmark-circle" color={p.green} size={16} />
          <Text style={o.badgeText}>大切な1枚を残す</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}
function CompareTile({
  index,
  selected,
  confirmed,
  disabled,
  reduced,
  onPress,
}: {
  index: number;
  selected: boolean;
  confirmed: boolean;
  disabled: boolean;
  reduced: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(confirmed && selected ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(confirmed && selected ? 1 : 0, {
      duration: reduced ? 120 : 450,
    });
  }, [confirmed, selected, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.72,
    transform: [
      { translateY: reduced ? 0 : progress.value * 40 },
      { scale: reduced ? 1 : 1 - progress.value * 0.16 },
    ],
  }));
  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`練習用の写真${index + 1}${index === 0 ? "、残すおすすめ" : ""}`}
        accessibilityState={{ checked: selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[
          o.comparePhoto,
          { borderColor: selected ? p.blue : "transparent" },
        ]}
      >
        <LessonPhoto index={index} />
        <View
          style={[
            o.check,
            { backgroundColor: selected ? p.blue : "rgba(0,0,0,0.5)" },
          ]}
        >
          {selected ? (
            <Animated.View
              entering={reduced ? FadeIn.duration(120) : ZoomIn.duration(140)}
            >
              <Icon name="checkmark" color="#fff" size={17} />
            </Animated.View>
          ) : null}
        </View>
      </Pressable>
      {index === 0 ? (
        <Text style={[s.caption, { color: p.green, textAlign: "center" }]}>
          残すおすすめ
        </Text>
      ) : null}
    </Animated.View>
  );
}
function LessonSwipe({
  reduced,
  disabled,
  kept,
  candidate,
  onChoose,
}: {
  reduced: boolean;
  disabled: boolean;
  kept: boolean;
  candidate: boolean;
  onChoose: (value: "keep" | "candidate") => Promise<void>;
}) {
  const x = useSharedValue(0),
    lock = useSharedValue(false);
  const { width } = useWindowDimensions();
  const submit = async (value: "keep" | "candidate") => {
    try {
      await onChoose(value);
    } finally {
      x.value = 0;
      lock.value = false;
    }
  };
  const request = (value: "keep" | "candidate") => {
    if (disabled || lock.value) return;
    lock.value = true;
    x.value = withTiming(
      reduced ? 0 : (value === "keep" ? 1 : -1) * width,
      { duration: reduced ? 0 : 170 },
      (done) => {
        if (done) runOnJS(submit)(value);
      },
    );
  };
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-12, 12])
    .failOffsetY([-30, 30])
    .onUpdate((e) => {
      if (!lock.value) x.value = e.translationX;
    })
    .onEnd((e) => {
      if (lock.value) return;
      if (
        Math.abs(x.value) > 75 ||
        (Math.abs(x.value) > 24 &&
          Math.abs(e.velocityX) > 750 &&
          Math.sign(x.value) === Math.sign(e.velocityX))
      ) {
        lock.value = true;
        const value = x.value > 0 ? "keep" : "candidate";
        x.value = withTiming(
          reduced ? 0 : Math.sign(x.value) * width,
          { duration: reduced ? 0 : 170 },
          (done) => {
            if (done) runOnJS(submit)(value);
          },
        );
      } else x.value = reduced ? 0 : withSpring(0, { damping: 22 });
    })
    .onFinalize(() => {
      if (!lock.value) x.value = reduced ? 0 : withSpring(0, { damping: 22 });
    });
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: reduced ? 0 : x.value },
      { rotate: `${reduced ? 0 : x.value / 30}deg` },
    ],
  }));
  const keepStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, x.value / 70)),
  }));
  const candidateStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, -x.value / 70)),
  }));
  return (
    <View style={{ gap: 18 }}>
      <View
        style={{ height: 265, alignItems: "center", justifyContent: "center" }}
      >
        <View
          style={[
            o.swipeCard,
            {
              position: "absolute",
              transform: [{ scale: 0.96 }, { translateY: 8 }],
              opacity: 0.45,
            },
          ]}
        >
          <LessonPhoto index={1} />
        </View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[o.swipeCard, style]}>
            <LessonPhoto index={kept ? 1 : 0} />
            <Animated.View
              style={[
                o.swipeLabel,
                { left: 12, backgroundColor: p.mint },
                keepStyle,
              ]}
            >
              <Text style={{ color: p.green, fontWeight: "700" }}>残す →</Text>
            </Animated.View>
            <Animated.View
              style={[
                o.swipeLabel,
                { right: 12, backgroundColor: p.pink },
                candidateStyle,
              ]}
            >
              <Text style={{ color: p.rose, fontWeight: "700" }}>← 候補へ</Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
      <View style={[s.row, { justifyContent: "space-evenly" }]}>
        <View style={o.center}>
          <IconButton
            name={candidate ? "checkmark" : "close"}
            label="練習で削除候補にする"
            background={p.pink}
            color={p.rose}
            size={64}
            disabled={disabled}
            onPress={() => request("candidate")}
          />
          <Text style={s.caption}>
            {candidate ? "候補にできました" : "左に候補へ"}
          </Text>
        </View>
        <View style={o.center}>
          <IconButton
            name="checkmark"
            label="練習で写真を残す"
            background={p.mint}
            color={p.green}
            size={64}
            disabled={disabled}
            onPress={() => request("keep")}
          />
          <Text style={s.caption}>{kept ? "残せました" : "右に残す"}</Text>
        </View>
      </View>
    </View>
  );
}
export function Onboarding() {
  const app = useApp(),
    intro = onboardingState(app.state),
    reduced = useMotionPreference();
  const step = intro.step,
    analysis = app.analysis || emptyAnalysis;
  const [working, setWorking] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    resultFeedback = useRef(false),
    initialLoad = useRef(false);
  const allowed = app.permission === "full" || app.permission === "limited";
  const transact = async (
    work: () => Promise<void>,
    feedback: "selection" | "confirm" | "success" | null = "confirm",
  ) => {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setError("");
    try {
      await work();
      if (feedback) void interactionFeedback(app.state.settings, feedback);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "保存できませんでした。もう一度お試しください。",
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };
  const patch = (
    values: Parameters<typeof updateOnboarding>[1],
    feedback: "selection" | "confirm" | "success" = "confirm",
  ) =>
    transact(async () => {
      await app.mutate((s) => updateOnboarding(s, values));
    }, feedback);
  const finish = () =>
    transact(async () => {
      await app.mutate(finishOnboarding);
      app.dismissPurchaseResult();
      router.replace("/");
    }, "success");
  const advancePermission = () =>
    patch({ step: allowed ? "discover" : "permission" });
  useEffect(() => {
    if (!initialLoad.current) {
      initialLoad.current = true;
      void app.loadBilling();
    }
  }, []);
  useEffect(() => {
    if (step === "permission" && allowed && !working)
      void transact(async () => {
        await app.mutate((s) => updateOnboarding(s, { step: "discover" }));
      }, null);
  }, [step, allowed]);
  useEffect(() => {
    if (
      step === "pro" &&
      hasPro(app.entitlement, Date.now()) &&
      !["verified", "restored"].includes(app.purchaseState) &&
      !intro.completed
    )
      void finish();
  }, [step, app.entitlement, app.purchaseState]);
  useEffect(() => {
    if (
      step === "discover" &&
      !resultFeedback.current &&
      (analysis.groups.length > 0 || app.photos.some((p) => p.screenshot))
    ) {
      resultFeedback.current = true;
      void interactionFeedback(app.state.settings, "success");
    }
  }, [step, analysis.groups.length, app.photos]);
  if (intro.completed)
    return (
      <Page>
        <Text style={s.title}>準備はできています</Text>
        <Button title="ホームへ" onPress={() => router.replace("/")} />
      </Page>
    );
  if (step === "pro")
    return (
      <Paywall
        onboarding
        onFinish={() => void finish()}
        finishing={working}
        finishError={error}
      />
    );
  const nextFromDiscovery = () => {
    if (
      intro.mode === "replay" ||
      hasPro(app.entitlement, Date.now()) ||
      !allowed ||
      !app.photos.length ||
      !!app.libraryError ||
      analysis.status === "error" ||
      analysis.status === "unavailable"
    )
      return finish();
    return patch({ step: "pro" });
  };
  const requestPhotos = () =>
    transact(async () => {
      const permission = await app.repository.permission(true);
      void app.reload();
      if (permission === "full" || permission === "limited")
        await app.mutate((s) => updateOnboarding(s, { step: "discover" }));
    });
  const headings = {
    welcome: [
      "いらない写真を、\nまとめて整理。",
      "見比べて選ぶ。1枚ずつスワイプ。\n自分に合う方法で、すっきり。",
    ],
    compare: [
      intro.compared ? "選んだ写真だけ、候補へ。" : "残す写真を、見比べる。",
      intro.compared
        ? "実際の写真は削除されていません。\n最後にiPhoneの確認が出ます。"
        : "いらない写真をタップしてみてください。\n残したい1枚は、そのままで。",
    ],
    swipe: [
      intro.kept && intro.candidate
        ? "これで、使い方はOK。"
        : "右に残す。左に候補。",
      intro.kept && intro.candidate
        ? "あとは、自分の写真で。"
        : "写真を左右に動かしてみましょう。\n下のボタンでも操作できます。",
    ],
    permission: [
      "あなたの写真で、\nはじめましょう。",
      "すべての写真でも、選んだ写真だけでも。",
    ],
    discover: [
      "整理できる写真を、\n探しています。",
      "ホームに移っても解析は続きます。",
    ],
  }[step];
  let action = "はじめる",
    onNext: () => void = () => void patch({ step: "compare" });
  if (step === "compare") {
    action = intro.compared
      ? "スワイプも試す"
      : intro.selected.length
        ? `${intro.selected.length}枚を候補へ`
        : "写真を選んでください";
    onNext = () =>
      void (intro.compared
        ? patch({ step: "swipe" })
        : patch({ compared: true }, "success"));
  }
  if (step === "swipe") {
    action =
      intro.kept && intro.candidate
        ? "自分の写真ではじめる"
        : "練習を終えて次へ";
    onNext = () => void advancePermission();
  }
  if (step === "permission") {
    action =
      app.permission === "denied" || app.permission === "restricted"
        ? "設定でアクセスを確認"
        : "写真を選ぶ";
    onNext = () =>
      void (app.permission === "denied" || app.permission === "restricted"
        ? Linking.openSettings()
        : requestPhotos());
  }
  if (step === "discover") {
    action =
      app.loading || analysis.status === "scanning"
        ? "解析を続けて先へ"
        : "次へ";
    onNext = () => void nextFromDiscovery();
  }
  const at = order.indexOf(step);
  const skip = () =>
    step === "welcome" || step === "compare" || step === "swipe"
      ? void advancePermission()
      : void finish();
  return (
    <Page
      style={{ gap: 22 }}
      footer={
        <>
          {error ? (
            <Text accessibilityRole="alert" style={{ color: p.rose }}>
              {error}
            </Text>
          ) : null}
          <Button
            title={action}
            loading={working}
            disabled={
              step === "compare" && !intro.compared && !intro.selected.length
            }
            onPress={onNext}
          />
          {step === "permission" ? (
            <Button
              title="あとで"
              variant="ghost"
              disabled={working}
              onPress={() => void finish()}
            />
          ) : (
            <Text style={[s.caption, { textAlign: "center" }]}>
              {step === "welcome"
                ? "写真30枚・動画5本まで毎日無料"
                : step === "compare" || step === "swipe"
                  ? "練習用の写真です。無料枠は減りません。"
                  : "写真を開発者へ送信しません。"}
            </Text>
          )}
        </>
      }
    >
      <View style={s.between}>
        <View style={[s.row, { gap: 4 }]}>
          {at > 0 ? (
            <IconButton
              name="chevron-back"
              label="説明を一つ戻る"
              disabled={working}
              background="transparent"
              onPress={() =>
                void patch({
                  step:
                    step === "discover" && allowed ? "swipe" : order[at - 1]!,
                })
              }
            />
          ) : null}
          <BrandMark size={28} />
          <Text style={[s.heading, { fontSize: 18 }]}>PhotoSweep</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            intro.mode === "replay" ? "説明を閉じる" : "説明をスキップ"
          }
          disabled={working}
          onPress={() => (intro.mode === "replay" ? void finish() : skip())}
          style={{
            minHeight: 44,
            justifyContent: "center",
            paddingHorizontal: 6,
          }}
        >
          <Text style={s.caption}>
            {intro.mode === "replay" ? "閉じる" : "スキップ"}
          </Text>
        </Pressable>
      </View>
      <View
        accessibilityLabel={`使い方 ${at + 1} / 6`}
        style={{ flexDirection: "row", gap: 5 }}
      >
        {order.map((item, i) => (
          <View
            key={item}
            style={{
              height: 3,
              flex: 1,
              borderRadius: 3,
              backgroundColor: i <= at ? p.blue : p.border,
            }}
          />
        ))}
      </View>
      <Animated.View
        key={step}
        entering={reduced ? FadeIn.duration(120) : FadeInDown.duration(240)}
        style={{ gap: 22 }}
      >
        {step === "welcome" ? (
          <>
            <View style={o.hero}>
              {[0, 2, 1].map((i) => (
                <HeroCard key={i} index={i} reduced={reduced} />
              ))}
            </View>
            <Copy title={headings[0]!} detail={headings[1]!} />
            <View style={o.featureRow}>
              <Icon name="shield-checkmark-outline" color={p.cyan} />
              <Text style={[s.caption, { flex: 1 }]}>
                削除する写真は、自分で決められます。
              </Text>
            </View>
          </>
        ) : null}
        {step === "compare" ? (
          <>
            <Copy title={headings[0]!} detail={headings[1]!} />
            <View style={o.practice}>
              <Text style={o.badgeText}>練習 · 同じ日の3枚</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0, 1, 2].map((i) => {
                const selected = intro.selected.includes(i);
                return (
                  <CompareTile
                    key={i}
                    index={i}
                    selected={selected}
                    confirmed={intro.compared}
                    disabled={working || intro.compared}
                    reduced={reduced}
                    onPress={() =>
                      void patch(
                        {
                          selected: selected
                            ? intro.selected.filter((n) => n !== i)
                            : [...intro.selected, i],
                        },
                        "selection",
                      )
                    }
                  />
                );
              })}
            </View>
            <View style={[o.featureRow, { justifyContent: "space-between" }]}>
              <Icon name="trash-outline" color={p.cyan} />
              <Text style={[s.label, { flex: 1 }]}>
                {intro.compared
                  ? `候補に${intro.selected.length}枚入りました`
                  : `${intro.selected.length}枚を選択中`}
              </Text>
              {intro.compared ? (
                <Animated.View
                  entering={reduced ? undefined : ZoomIn.duration(450)}
                >
                  <Icon name="checkmark-circle" color={p.green} size={28} />
                </Animated.View>
              ) : null}
            </View>
          </>
        ) : null}
        {step === "swipe" ? (
          <>
            <Copy title={headings[0]!} detail={headings[1]!} />
            {intro.kept && intro.candidate ? (
              <View style={{ alignItems: "center" }}>
                <Celebration reduced={reduced} />
                <Text style={[s.caption, { marginTop: 12 }]}>
                  本番では「戻す」で取り消せます。
                </Text>
              </View>
            ) : (
              <LessonSwipe
                reduced={reduced}
                disabled={working}
                kept={intro.kept}
                candidate={intro.candidate}
                onChoose={(value) =>
                  patch(
                    value === "keep" ? { kept: true } : { candidate: true },
                    intro.kept || intro.candidate ? "success" : "confirm",
                  )
                }
              />
            )}
          </>
        ) : null}
        {step === "permission" ? (
          <>
            <View style={o.permissionIcon}>
              <Icon name="images-outline" size={68} color={p.cyan} />
              <View style={o.shield}>
                <Icon name="shield-checkmark" color={p.green} size={29} />
              </View>
            </View>
            <Copy title={headings[0]!} detail={headings[1]!} />
            <Card>
              <Text style={s.label}>解析は、このiPhoneの中だけ。</Text>
              <Text style={s.body}>
                アクセス範囲はあとから変更できます。写真を選んだだけでは削除されません。
              </Text>
            </Card>
            {app.permission === "denied" || app.permission === "restricted" ? (
              <Text style={s.body}>
                写真へのアクセスが許可されていません。設定で変更するか、あとから始められます。
              </Text>
            ) : null}
          </>
        ) : null}
        {step === "discover" ? (
          <>
            <Copy
              title={
                app.libraryError || analysis.status === "error"
                  ? "写真を読み込めませんでした。"
                  : !app.loading && !app.photos.length
                    ? "写真を選んで、はじめよう。"
                    : analysis.status === "unavailable"
                      ? "写真から整理をはじめる。"
                      : analysis.status === "complete"
                        ? "写真の準備ができました。"
                        : headings[0]!
              }
              detail={
                analysis.status === "complete"
                  ? "似た写真やスクショから、まとめて整理できます。"
                  : headings[1]!
              }
            />
            <View style={o.scan}>
              <Icon name="scan-outline" color={p.cyan} size={54} />
              <Text style={[s.title, { fontSize: 38 }]}>
                {app.photos.length.toLocaleString()}
                <Text style={s.body}> 枚</Text>
              </Text>
              <Text accessibilityLiveRegion="polite" style={s.caption}>
                {app.loading
                  ? "写真を読み込み中"
                  : analysis.status === "scanning"
                    ? `${analysis.processed.toLocaleString()} / ${analysis.total.toLocaleString()}枚を解析中`
                    : analysis.status === "complete"
                      ? "端末内の解析が完了"
                      : !allowed
                        ? "写真へのアクセスを確認してください"
                        : "解析の準備中"}
              </Text>
              <Progress
                value={analysis.total ? analysis.processed / analysis.total : 0}
              />
            </View>
            {[
              [
                "似ている写真",
                analysis.groups
                  .filter((g) => g.kind === "similar")
                  .reduce((n, g) => n + g.ids.length, 0),
              ],
              [
                "同じ画像",
                analysis.groups
                  .filter((g) => g.kind === "duplicate")
                  .reduce((n, g) => n + g.ids.length, 0),
              ],
              [
                "スクリーンショット",
                app.photos.filter((p) => p.screenshot).length,
              ],
              ["動画", app.photos.filter(p => p.kind === "video").length],
            ].map(([label, count], i) => (
              <Animated.View
                key={label}
                entering={
                  reduced ? undefined : FadeInDown.delay(i * 65).duration(240)
                }
                style={o.featureRow}
              >
                <Icon
                  name={i === 2 ? "phone-portrait-outline" : "images-outline"}
                  color={p.cyan}
                />
                <Text style={[s.label, { flex: 1 }]}>{label}</Text>
                <Text style={[s.label, { color: p.cyan }]}>
                  {i < 2 && ["idle", "scanning"].includes(analysis.status)
                    ? `${count}枚 · 解析中`
                    : i < 2 &&
                        ["unavailable", "error"].includes(analysis.status)
                      ? "未確認"
                      : `${count}${i === 3 ? "本" : "枚"}`}
                </Text>
              </Animated.View>
            ))}
            {analysis.status === "unavailable" ? (
              <Text style={s.body}>
                類似写真の解析を利用できません。スクショやスワイプでの整理はホームから始められます。
              </Text>
            ) : null}
            {analysis.unavailable > 0 ? (
              <Text style={s.caption}>
                {analysis.unavailable}
                枚は端末に画像がないなどの理由で解析対象外です。
              </Text>
            ) : null}
            {app.libraryError || analysis.status === "error" ? (
              <Card>
                <Text style={s.body}>
                  読み込みを完了できませんでした。あとからホームで再試行できます。
                </Text>
                <Button
                  title="再読み込み"
                  variant="secondary"
                  onPress={() => void app.reload()}
                />
              </Card>
            ) : null}
            {!app.loading && !app.photos.length ? (
              <Text style={s.body}>
                整理できる写真はまだありません。ホームからアクセス範囲を変更できます。
              </Text>
            ) : null}
          </>
        ) : null}
      </Animated.View>
    </Page>
  );
}
function Copy({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={{ gap: 12 }}>
      <Text
        accessibilityRole="header"
        style={[s.title, { fontSize: 28, lineHeight: 37 }]}
      >
        {title}
      </Text>
      <Text style={s.body}>{detail}</Text>
    </View>
  );
}
export function HomeOrientation() {
  const app = useApp(),
    intro = onboardingState(app.state);
  const [working, setWorking] = useState(false);
  const lock = useRef(false);
  if (!intro.completed || intro.homeHintSeen) return null;
  const done = async () => {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    try {
      await app.mutate((s) => updateOnboarding(s, { homeHintSeen: true }));
      void interactionFeedback(app.state.settings, "confirm");
    } catch {
      app.notify("案内を閉じられませんでした。もう一度お試しください。");
    } finally {
      setWorking(false);
      lock.current = false;
    }
  };
  return (
    <Card style={{ borderColor: p.blue }}>
      <Text accessibilityRole="header" style={s.heading}>
        まずは、ここから。
      </Text>
      <Text style={s.body}>
        ホーム：似た写真やスクショをまとめて整理。{"\n"}
        スワイプ：月を選んで、1枚ずつ。{"\n"}
        削除候補：保存した候補を確認して削除。
      </Text>
      <Button
        title="わかった、整理をはじめる"
        loading={working}
        onPress={() => void done()}
      />
    </Card>
  );
}
const o = StyleSheet.create({
  center: { alignItems: "center", gap: 8 },
  hero: { height: 270, alignItems: "center", justifyContent: "center" },
  heroCard: {
    position: "absolute",
    width: 154,
    height: 212,
    borderRadius: 21,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#68C2FF",
    backgroundColor: p.surface,
  },
  keepBadge: {
    position: "absolute",
    left: 5,
    right: 5,
    bottom: 10,
    backgroundColor: "#153D32",
    padding: 7,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: p.surface,
    borderRadius: 16,
  },
  practice: {
    alignSelf: "flex-start",
    backgroundColor: p.lavender,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  comparePhoto: {
    height: 183,
    borderRadius: 14,
    borderWidth: 3,
    overflow: "hidden",
  },
  check: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  swipeCard: {
    width: 205,
    height: 256,
    borderRadius: 21,
    overflow: "hidden",
    backgroundColor: p.surface,
  },
  swipeLabel: { position: "absolute", top: 15, padding: 10, borderRadius: 10 },
  permissionIcon: {
    alignSelf: "center",
    width: 150,
    height: 150,
    borderRadius: 38,
    backgroundColor: p.lavender,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 25,
  },
  shield: {
    position: "absolute",
    right: -4,
    bottom: -4,
    backgroundColor: p.mint,
    padding: 12,
    borderRadius: 23,
  },
  scan: {
    padding: 24,
    backgroundColor: p.surface,
    borderRadius: 22,
    gap: 16,
    alignItems: "stretch",
  },
});
