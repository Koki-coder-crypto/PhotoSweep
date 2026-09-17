import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, {
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useApp } from "../state/AppContext";
import { emptyAnalysis } from "../domain/analysis";
import { hasPro, remaining } from "../domain/policy";
import type { Photo } from "../domain/types";
import {
  Button,
  Card,
  Icon,
  IconButton,
  Page,
  Progress,
  StateView,
} from "../ui/components";
import { palette as p, styles as s } from "../ui/theme";
import { go, monthKey, monthLabel, run } from "./actions";

export function MotionPreview({ step = 0 }: { step?: number }) {
  const app = useApp(),
    osReduced = useReducedMotion();
  const reduced = osReduced || app.state.settings.reduceMotion,
    position = useSharedValue(0);
  useEffect(() => {
    position.value = reduced
      ? 0
      : withRepeat(
          withSequence(
            withTiming(1, { duration: 1500 }),
            withTiming(0, { duration: 1500 }),
          ),
          -1,
        );
    return () => cancelAnimation(position);
  }, [reduced, step]);
  const card = useAnimatedStyle(() => ({
    transform: [
      { translateX: step === 2 ? (position.value - 0.5) * 75 : 0 },
      { translateY: -position.value * 7 },
      { rotate: `${step === 2 ? position.value * 8 - 4 : -5}deg` },
    ],
  }));
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={c.preview}
    >
      <LinearGradient
        colors={["#073D89", "#071126", p.bg]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          c.illustration,
          {
            left: 42,
            top: 48,
            transform: [{ rotate: "-15deg" }],
            backgroundColor: "#103A65",
          },
        ]}
      >
        <Icon name="sunny" size={60} color="#63D4F2" />
      </View>
      <Animated.View style={[c.illustration, { left: 100, top: 60 }, card]}>
        <LinearGradient
          colors={["#2B98D0", "#175A9F", "#0B356D"]}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            width: 55,
            height: 55,
            borderRadius: 28,
            backgroundColor: "#D0FAFF",
            position: "absolute",
            top: 22,
            right: 20,
          }}
        />
        <View
          style={{
            width: 180,
            height: 140,
            backgroundColor: "#154A73",
            transform: [{ rotate: "35deg" }],
            position: "absolute",
            left: -35,
            top: 125,
            borderRadius: 20,
          }}
        />
        <View style={{ position: "absolute", bottom: 15, left: 15 }}>
          <Icon
            name={step === 1 ? "checkmark-circle" : "images"}
            color="#fff"
            size={34}
          />
        </View>
      </Animated.View>
      <View style={c.previewBadge}>
        <Icon
          name={
            step === 2 ? "swap-horizontal" : step === 1 ? "checkmark" : "layers"
          }
          color="#fff"
          size={24}
        />
      </View>
    </View>
  );
}
export function Welcome() {
  const [step, setStep] = useState(0),
    reduced = useReducedMotion();
  const copy = [
    ["写真を、すっきり。", "似た写真とスクショを\nまとめて整理。"],
    ["残す写真は、自分で。", "見比べて選択。\n削除は最後に確認できます。"],
    [
      "1枚ずつなら、\nスワイプ。",
      "右に残す。左に削除候補。\nいつでも一つ戻れます。",
    ],
  ][step]!;
  return (
    <Page
      style={{ gap: 20, justifyContent: "space-between" }}
      footer={
        <>
          <Button
            title={step === 2 ? "写真を選んではじめる" : "次へ"}
            onPress={() => (step === 2 ? go("/permission") : setStep(step + 1))}
          />
          <Text style={[s.caption, c.center]}>
            アカウント登録なし · 1日50枚まで無料
          </Text>
        </>
      }
    >
      <View style={s.between}>
        <Text style={[s.heading, { fontSize: 19 }]}>PhotoSweep</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => go("/permission")}
          style={c.textButton}
        >
          <Text style={s.caption}>スキップ</Text>
        </Pressable>
      </View>
      <View style={[s.row, { gap: 6 }]}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= step ? p.blue : p.border,
            }}
          />
        ))}
      </View>
      <MotionPreview step={step} />
      <Animated.View
        key={step}
        entering={reduced ? undefined : FadeInDown.duration(240)}
        style={{ gap: 16, paddingBottom: 18 }}
      >
        <Text
          accessibilityRole="header"
          style={[s.title, c.center, { fontSize: 30 }]}
        >
          {copy[0]}
        </Text>
        <Text style={[s.body, c.center]}>{copy[1]}</Text>
      </Animated.View>
      <View style={[s.between, { minHeight: 44 }]}>
        {step > 0 ? (
          <IconButton
            name="chevron-back"
            label="前の説明へ"
            onPress={() => setStep(step - 1)}
          />
        ) : (
          <View />
        )}
        <Text style={s.caption}>{step + 1} / 3</Text>
      </View>
    </Page>
  );
}
export function PermissionScreen() {
  const app = useApp();
  const finish = async (request: boolean) => {
    if (request) await app.repository.permission(true);
    await app.mutate((state) => ({ ...state, onboarded: true }));
    router.replace("/");
    void app.reload();
  };
  return (
    <Page
      back
      title="写真へのアクセス"
      footer={
        <>
          <Button
            title="写真を選ぶ"
            loading={app.busy}
            onPress={() => void run(app, () => finish(true))}
          />
          <Button
            title="あとで"
            variant="ghost"
            onPress={() => void run(app, () => finish(false))}
          />
        </>
      }
    >
      <MotionPreview step={1} />
      <Text style={[s.title, c.center]}>
        {"整理する写真を\n選んでください"}
      </Text>
      <Text style={[s.body, c.center]}>
        {
          "すべての写真、または選んだ写真だけ。\nアクセス範囲はあとから変更できます。"
        }
      </Text>
      <Card>
        <View style={s.row}>
          <Icon name="shield-checkmark-outline" />
          <Text style={[s.body, { flex: 1 }]}>
            解析はこのiPhoneの中で行います。写真を開発者へ送信しません。
          </Text>
        </View>
      </Card>
    </Page>
  );
}
export function PhotoTile({ photo }: { photo?: Photo }) {
  return photo ? (
    <Image
      source={{ uri: photo.uri }}
      style={{ flex: 1, backgroundColor: p.surface }}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={photo.id}
    />
  ) : (
    <View
      style={{
        flex: 1,
        backgroundColor: p.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name="images-outline" color={p.muted} size={38} />
    </View>
  );
}
function CategoryCard({
  title,
  subtitle,
  photos,
  onPress,
}: {
  title: string;
  subtitle: string;
  photos: Photo[];
  onPress(): void;
}) {
  const {fontScale} = useWindowDimensions();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}、${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [c.category, { width:fontScale>1.35?'100%':'48%', opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={{ height: 148, flexDirection: "row", gap: 3 }}>
        <PhotoTile photo={photos[0]} />
        {photos[1] ? <PhotoTile photo={photos[1]} /> : null}
      </View>
      <LinearGradient
        colors={["transparent", "#101626"]}
        style={{ position: "absolute", top: 80, left: 0, right: 0, height: 70 }}
      />
      <View style={{ padding: 12, gap: 7 }}>
        <Text style={[s.label, { fontSize: 16 }]}>{title}</Text>
        <View style={s.between}>
          <Text style={[s.caption, { color: p.cyan, flex: 1 }]}>
            {subtitle}
          </Text>
          <Icon name="chevron-forward" size={19} />
        </View>
      </View>
    </Pressable>
  );
}
export function Home() {
  const app = useApp(),
    analysis = app.analysis || emptyAnalysis,
    pro = hasPro(app.entitlement, Date.now());
  const byId = useMemo(
    () => new Map(app.photos.map((p) => [p.id, p])),
    [app.photos],
  );
  const groups = (kind: "similar" | "duplicate") =>
    analysis.groups.filter((g) => g.kind === kind);
  const groupPhotos = (kind: "similar" | "duplicate") =>
    groups(kind)
      .flatMap((g) => g.ids)
      .slice(0, 2)
      .map((id) => byId.get(id)!)
      .filter(Boolean);
  const groupLabel = (kind: "similar" | "duplicate") =>
    groups(kind).length
      ? `${groups(kind).length}組 · ${groups(kind).reduce((n, g) => n + g.ids.length, 0)}枚`
      : analysis.status === "scanning"
        ? "解析中…"
        : analysis.status === "complete"
          ? "見つかりませんでした"
          : "写真を確認";
  const allowed = ["full", "limited"].includes(app.permission),
    screenshots = app.photos.filter((p) => p.screenshot);
  const resume =
    app.state.session &&
    app.state.session.cursor < app.state.session.ids.length;
  return (
    <Page style={{ gap: 18 }}>
      <View style={s.between}>
        <View style={[s.row, { gap: 8, flexShrink: 1 }]}>
          <Icon name="sparkles" color={p.cyan} size={24} />
          <Text style={[s.heading, { fontSize: 25, flexShrink:1 }]}>PhotoSweep</Text>
        </View>
        <View style={[s.row, { gap: 4 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Proプラン"
            onPress={() => go(pro ? "/plan" : "/paywall")}
            style={c.proPill}
          >
            <Icon name="star" color="#fff" size={12} />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
              PRO
            </Text>
          </Pressable>
          <IconButton
            name="settings-outline"
            label="設定"
            color={p.ink}
            background="transparent"
            onPress={() => go("/settings")}
          />
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <View style={s.between}>
          <Text style={s.body}>
            {allowed
              ? `${(app.libraryTotal ?? app.photos.length).toLocaleString()}枚の写真`
              : "写真をまとめて整理"}
          </Text>
          <Text style={s.caption}>
            {pro ? "上限なし" : `今日あと${remaining(app.state)}枚`}
          </Text>
        </View>
        {app.loading || analysis.status === "scanning" ? (
          <>
            <Progress
              value={analysis.total ? analysis.processed / analysis.total : 0}
            />
            <Text accessibilityLiveRegion="polite" style={s.caption}>
              {app.loading
                ? "写真を読み込み中"
                : `解析中 ${analysis.processed.toLocaleString()} / ${analysis.total.toLocaleString()}枚`}{" "}
              · ほかの操作もできます
            </Text>
          </>
        ) : (
          <Text style={s.caption}>写真を選ぶ → 内容を確認 → 削除</Text>
        )}
      </View>
      {!allowed ? (
        <Card>
          <Text style={s.heading}>写真へのアクセスが必要です</Text>
          <Text style={s.body}>整理したい写真を選んでください。</Text>
          <Button
            title="写真へのアクセスを設定"
            onPress={() =>
              app.permission === "denied" || app.permission === "restricted"
                ? void Linking.openSettings()
                : go("/permission")
            }
          />
        </Card>
      ) : (
        <>
          {app.permission === "limited" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void run(app, app.selectMore)}
              style={c.inlineNotice}
            >
              <Icon name="add-circle-outline" />
              <Text style={[s.label, { flex: 1 }]}>選択した写真のみ表示中</Text>
              <Text style={{ color: p.cyan }}>追加</Text>
            </Pressable>
          ) : null}
          {app.libraryError ? (
            <Card>
              <Text style={s.body}>{app.libraryError}</Text>
              <Button
                title="再読み込み"
                variant="secondary"
                onPress={() => void app.reload()}
              />
            </Card>
          ) : null}
          {resume ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => go("/review")}
              style={c.resume}
            >
              <Icon name="play-circle" color="#fff" size={30} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.label}>スワイプの続きから</Text>
                <Text style={[s.caption, { color: "#D5EAFF" }]}>
                  {app.state.session!.cursor} / {app.state.session!.target}枚 ·
                  前回の続き
                </Text>
              </View>
              <Icon name="chevron-forward" color="#fff" />
            </Pressable>
          ) : null}
          <View style={s.between}>
            <Text style={s.heading}>まとめて整理</Text>
            <Text style={s.caption}>削除する写真は自分で選択</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <CategoryCard
              title="似ている写真"
              subtitle={groupLabel("similar")}
              photos={groupPhotos("similar")}
              onPress={() => go("/collection?kind=similar")}
            />
            <CategoryCard
              title="同じ画像"
              subtitle={groupLabel("duplicate")}
              photos={groupPhotos("duplicate")}
              onPress={() => go("/collection?kind=duplicate")}
            />
            <CategoryCard
              title="スクリーンショット"
              subtitle={`${screenshots.length.toLocaleString()}枚`}
              photos={screenshots.slice(0, 2)}
              onPress={() => go("/collection?kind=screenshots")}
            />
            <CategoryCard
              title="すべての写真"
              subtitle={`${app.photos.length.toLocaleString()}枚`}
              photos={app.photos.slice(0, 2)}
              onPress={() => go("/collection?kind=all")}
            />
          </View>
          {analysis.status === "unavailable" ? (
            <Text style={s.caption}>
              類似写真の解析には、新しいビルドのインストールが必要です。スクショとスワイプ整理は使えます。
            </Text>
          ) : null}
          {analysis.unavailable > 0 ? (
            <Text style={s.caption}>
              iCloudのみの写真など{analysis.unavailable}
              枚は解析対象外です。ダウンロード後、もう一度解析できます。
            </Text>
          ) : null}
          {analysis.status === "error" ? (
            <Card>
              <Text style={s.body}>
                解析を完了できませんでした。{analysis.error}
              </Text>
              <Button title="もう一度解析" onPress={() => void app.reload()} />
            </Card>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => go("/swipe")}
            style={c.inlineNotice}
          >
            <Icon name="swap-horizontal" size={26} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.label}>1枚ずつ見て決める</Text>
              <Text style={s.caption}>月を選んで、左右にスワイプ</Text>
            </View>
            <Icon name="chevron-forward" />
          </Pressable>
        </>
      )}
      {app.state.deletedCount > 0 ? (
        <Text style={[s.caption, c.center]}>
          これまでに{app.state.deletedCount.toLocaleString()}枚を整理しました
        </Text>
      ) : null}
    </Page>
  );
}
export function SwipeLibrary() {
  const app = useApp();
  const months = [
    ...new Set(app.photos.map((photo) => monthKey(photo.createdAt))),
  ]
    .sort()
    .reverse();
  const start = async (month?: string) => {
    if (!hasPro(app.entitlement, Date.now()) && !remaining(app.state)) {
      go("/quota");
      return;
    }
    if (await run(app, () => app.start({ month, order: "newest" })))
      go(app.state.guided ? "/review" : "/guide");
  };
  return (
    <Page>
      <View style={s.between}>
        <Text style={s.title}>スワイプ</Text>
        <IconButton
          name="options-outline"
          label="期間と並び順"
          onPress={() => go("/filter")}
        />
      </View>
      <Text style={s.body}>右に残す。左に削除候補。</Text>
      {app.state.session &&
      app.state.session.cursor < app.state.session.ids.length ? (
        <Button title="前回の続きから" onPress={() => go("/review")} />
      ) : null}
      {!months.length ? (
        <StateView
          icon="images-outline"
          title="写真がありません"
          description="ホームから写真へのアクセスを確認してください。"
        />
      ) : (
        months.map((month) => {
          const photos = app.photos.filter(
              (photo) => monthKey(photo.createdAt) === month,
            ),
            reviewed = photos.filter(
              (photo) => app.state.decisions[photo.id],
            ).length;
          return (
            <Pressable
              key={month}
              accessibilityRole="button"
              disabled={photos.length === reviewed}
              accessibilityState={{ disabled: photos.length === reviewed }}
              accessibilityLabel={`${monthLabel(month)}、未整理${photos.length - reviewed}枚`}
              onPress={() => void start(month)}
              style={c.month}
            >
              <View
                style={{
                  width: 78,
                  height: 88,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <PhotoTile photo={photos[0]} />
              </View>
              <View style={{ flex: 1, gap: 9 }}>
                <Text style={s.heading}>{monthLabel(month)}</Text>
                <Text style={s.caption}>
                  {photos.length === reviewed
                    ? "整理済み"
                    : `あと${photos.length - reviewed}枚`}
                </Text>
                <Progress value={reviewed / photos.length} />
              </View>
              <Icon
                name={
                  photos.length === reviewed
                    ? "checkmark-circle"
                    : "chevron-forward"
                }
                color={photos.length === reviewed ? p.green : p.muted}
              />
            </Pressable>
          );
        })
      )}
    </Page>
  );
}
const c = StyleSheet.create({
  center: { textAlign: "center" },
  textButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 },
  preview: {
    height: 285,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    borderRadius: 28,
    overflow: "hidden",
  },
  illustration: {
    position: "absolute",
    width: 150,
    height: 208,
    borderRadius: 20,
    backgroundColor: "#216CAE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#5DBAFF",
  },
  previewBadge: {
    position: "absolute",
    right: 22,
    bottom: 25,
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: p.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  proPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: p.blue,
  },
  category: {
    width: "48%",
    borderRadius: 19,
    backgroundColor: p.surface,
    overflow: "hidden",
  },
  inlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    backgroundColor: p.surface,
    borderRadius: 16,
  },
  resume: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#086AD8",
    borderRadius: 16,
    padding: 16,
  },
  month: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    backgroundColor: p.surface,
    borderRadius: 18,
    padding: 12,
  },
});
