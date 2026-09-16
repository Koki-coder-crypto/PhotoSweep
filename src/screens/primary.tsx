import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useApp } from "../state/AppContext";
import {
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  Page,
  Progress,
  StateView,
  Stat,
} from "../ui/components";
import { palette as p, styles as s } from "../ui/theme";
import { PhotoCard } from "../ui/PhotoCard";
import { Celebration } from "../ui/Celebration";
import { hasPro, remaining, validateScopeDates } from "../domain/policy";
import type { Photo, Scope } from "../domain/types";
import { dateLabel, go, monthKey, monthLabel, run } from "./actions";

export function Welcome() {
  const app = useApp();
  return (
    <Page style={{ justifyContent: "space-between", gap: 28 }}>
      <View style={[s.row, { marginTop: 20 }]}>
        <View
          style={{ backgroundColor: p.purple, padding: 10, borderRadius: 14 }}
        >
          <Icon name="images-outline" color="#fff" />
        </View>
        <Text style={[s.heading, { fontSize: 22 }]}>PhotoSweep</Text>
      </View>
      <View style={{ alignItems: "center", paddingVertical: 28 }}>
        <LinearGradient
          colors={["#F4E5FF", "#FFF1DC"]}
          style={{
            width: 260,
            height: 260,
            borderRadius: 130,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 142,
              height: 184,
              backgroundColor: "#BDA9FF",
              borderRadius: 25,
              position: "absolute",
              left: 18,
              top: 32,
              transform: [{ rotate: "-16deg" }],
              borderWidth: 7,
              borderColor: "#fff",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Icon name="sunny-outline" size={58} color="#fff" />
          </View>
          <View
            style={{
              width: 152,
              height: 190,
              backgroundColor: p.mint,
              borderRadius: 25,
              left: 40,
              top: 22,
              transform: [{ rotate: "12deg" }],
              borderWidth: 7,
              borderColor: "#fff",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: "0 12px 25px rgba(70,45,105,0.1)",
            }}
          >
            <Icon name="flower-outline" size={66} color={p.green} />
          </View>
          <View
            style={{
              position: "absolute",
              bottom: 5,
              right: 4,
              backgroundColor: p.purple,
              borderRadius: 22,
              padding: 15,
              transform: [{ rotate: "-8deg" }],
            }}
          >
            <Icon name="checkmark" color="#fff" size={27} />
          </View>
        </LinearGradient>
      </View>
      <View style={{ alignItems: "center", gap: 14 }}>
        <Chip>カメラロールに、ひと呼吸。</Chip>
        <Text
          style={[
            s.title,
            { fontSize: 34, lineHeight: 46, textAlign: "center" },
          ]}
        >
          写真整理、{`\n`}ちょっと楽しく。
        </Text>
        <Text style={[s.body, { textAlign: "center" }]}>
          残す。候補に入れる。{`\n`}スワイプで選んで、最後に確認。
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        <Button title="無料ではじめる" onPress={() => go("/permission")} />
        <Button
          title="使い方と料金を見る"
          variant="ghost"
          onPress={() => go("/paywall")}
        />
        <Text style={[s.caption, { textAlign: "center" }]}>
          1日50枚まで。登録なしで使えます。
        </Text>
      </View>
    </Page>
  );
}
export function PermissionScreen() {
  const app = useApp();
  const finish = async (request: boolean) => {
    if (request) await app.reload(true);
    await app.mutate((state) => ({ ...state, onboarded: true }));
    router.replace("/");
  };
  return (
    <Page
      title="写真へのアクセス"
      back
      footer={
        <>
          <Button
            title="写真を選ぶ"
            loading={app.loading}
            onPress={() => void run(app, () => finish(true))}
          />
          <Button
            title="今はしない"
            variant="ghost"
            onPress={() => void run(app, () => finish(false))}
          />
        </>
      }
    >
      <StateView
        icon="lock-closed-outline"
        title="整理する写真を選べます。"
        description="選んだ写真だけでも使えます。アクセス範囲は、あとから変更できます。"
      />
      <Card style={{ backgroundColor: p.lavender }}>
        <Text style={s.body}>
          写真を開発者のサーバーへ送りません。iCloud上の写真を読むときは、通信を使う場合があります。
        </Text>
      </Card>
    </Page>
  );
}
async function begin(app: ReturnType<typeof useApp>, scope: Scope) {
  if (!hasPro(app.entitlement, Date.now()) && remaining(app.state) === 0) {
    go("/quota");
    return;
  }
  if (await run(app, () => app.start(scope)))
    go(app.state.guided ? "/review" : "/guide");
}
export function Home() {
  const app = useApp(),
    pro = hasPro(app.entitlement, Date.now());
  const months = useMemo(
    () =>
      [...new Set(app.photos.map((photo) => monthKey(photo.createdAt)))]
        .sort()
        .reverse(),
    [app.photos],
  );
  const month = monthKey(Date.now()),
    current = app.photos.filter((photo) => monthKey(photo.createdAt) === month);
  const resumable =
    app.state.session &&
    app.state.session.status !== "summary" &&
    app.state.session.cursor < app.state.session.ids.length;
  const scope: Scope = { month, order: "newest" };
  const exhausted = !pro && remaining(app.state) === 0;
  const count = current.filter(
    (photo) => !app.state.decisions[photo.id],
  ).length;
  const target = Math.min(
    pro ? app.state.settings.batch : Math.min(20, remaining(app.state)),
    count,
  );
  return (
    <Page style={{ gap: 22 }}>
      <View style={[s.between, { paddingTop: 8 }]}>
        <View style={s.row}>
          <View
            style={{ backgroundColor: p.purple, padding: 8, borderRadius: 12 }}
          >
            <Icon name="images-outline" color="#fff" size={21} />
          </View>
          <Text style={s.heading}>PhotoSweep</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pro ? "プランを確認" : "Proの内容と料金を見る"}
          onPress={() => go(pro ? "/plan" : "/paywall")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Chip>{pro ? "Pro 利用中" : "Pro"}</Chip>
        </Pressable>
      </View>
      {app.preview ? (
        <Text style={[s.caption, { color: p.purple }]}>
          開発プレビュー · デモ写真／料金 · 実写真には触れません
        </Text>
      ) : null}
      {app.permission === "denied" ||
      app.permission === "restricted" ||
      app.permission === "unknown" ? (
        <StateView
          icon="images-outline"
          title={
            app.permission === "restricted"
              ? "写真へのアクセスが制限されています"
              : "写真を選んで、はじめよう。"
          }
          description={
            app.permission === "restricted"
              ? "この端末の利用制限で写真にアクセスできません。許可された環境でご利用ください。"
              : "選んだ写真だけでも、少しずつ整理できます。"
          }
        >
          <Button
            disabled={app.permission === "restricted"}
            title={
              app.permission === "denied"
                ? "iPhoneの設定を開く"
                : "写真へのアクセスを設定"
            }
            onPress={() =>
              app.permission === "denied"
                ? void Linking.openSettings()
                : go("/permission")
            }
          />
        </StateView>
      ) : (
        <>
          {app.permission === "limited" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void run(app, app.selectMore)}
              style={[
                s.row,
                { padding: 14, backgroundColor: p.lavender, borderRadius: 18 },
              ]}
            >
              <Icon name="lock-closed-outline" size={17} />
              <Text style={[s.caption, { flex: 1 }]}>選択した写真で整理中</Text>
              <Text
                style={{ color: p.purple, fontWeight: "700", fontSize: 12 }}
              >
                写真を追加
              </Text>
            </Pressable>
          ) : null}
          {months.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 22 }}
            >
              {months.slice(0, 8).map((key, i) => {
                const list = app.photos.filter(
                  (photo) => monthKey(photo.createdAt) === key,
                );
                const reviewed = list.filter(
                  (photo) => app.state.decisions[photo.id],
                ).length;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`${monthLabel(key)}を整理`}
                    onPress={() =>
                      void begin(app, { month: key, order: "newest" })
                    }
                    style={{ alignItems: "center", gap: 7 }}
                  >
                    <View
                      style={{
                        padding: 4,
                        borderWidth: 2,
                        borderColor: [
                          p.purple,
                          "#F6A6BF",
                          "#67BDA9",
                          "#90B6F4",
                        ][i % 4],
                        borderRadius: 40,
                      }}
                    >
                      <Image
                        source={{ uri: list[0]?.uri }}
                        contentFit="cover"
                        cachePolicy="memory"
                        style={{ width: 58, height: 58, borderRadius: 29 }}
                      />
                    </View>
                    <Text style={[s.caption, { fontWeight: "700" }]}>
                      {Number(key.split("-")[1])}月{" "}
                      {reviewed === list.length && list.length ? "✓" : ""}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="すべての月を見る"
                onPress={() => go("/months")}
                style={{ alignItems: "center", gap: 10 }}
              >
                <View
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    backgroundColor: p.lavender,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="grid-outline" />
                </View>
                <Text style={s.caption}>すべて</Text>
              </Pressable>
            </ScrollView>
          ) : null}
          <LinearGradient
            colors={["#8969F9", "#5D43D9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: 24,
              borderRadius: 30,
              gap: 14,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                width: 170,
                height: 170,
                borderRadius: 85,
                backgroundColor: "rgba(255,255,255,0.08)",
                right: -65,
                top: -40,
              }}
            />
            <Chip background="rgba(255,255,255,0.18)" color="#fff">
              {resumable ? "あなたの続きから" : monthLabel(month)}
            </Chip>
            <Text
              style={[s.title, { color: "#fff", fontSize: 30, marginTop: 6 }]}
            >
              {resumable
                ? "続き、見てみよう。"
                : exhausted
                  ? "今日も、ひと区切り。"
                  : count
                    ? `まず${target}枚だけ。`
                    : "写真に、ひと区切り。"}
            </Text>
            <Text style={{ color: "#F0E9FF", fontSize: 13, lineHeight: 21 }}>
              {resumable
                ? `${app.state.session!.cursor} / ${app.state.session!.target}枚まで保存しています。`
                : count
                  ? `今月はあと${count}枚${app.loading ? "（読み込み中）" : ""}。`
                  : "ほかの月の思い出も、少しずつ。"}
              {`\n`}途中でやめても、続きから。
            </Text>
            <View style={{ marginTop: 7 }}>
              <Button
                title={
                  resumable
                    ? "続きから整理する"
                    : exhausted
                      ? "今日の整理を確認"
                      : count
                        ? `${target}枚を見てみる`
                        : "整理する月を選ぶ"
                }
                variant="secondary"
                loading={app.busy}
                onPress={() =>
                  resumable
                    ? go("/review")
                    : exhausted
                      ? go("/quota")
                      : count
                        ? void begin(app, scope)
                        : go("/months")
                }
              />
            </View>
          </LinearGradient>
          <View style={s.row}>
            {[
              {
                title: "スクショ",
                caption: "用が済んだ画像から",
                icon: "scan-outline" as const,
                route: "/screenshots",
              },
              {
                title: "期間・並び順",
                caption: pro ? "好みの範囲で整理" : "Proで細かく選ぶ",
                icon: "options-outline" as const,
                route: "/filter",
              },
            ].map((item) => (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                onPress={() => go(item.route)}
                style={[s.card, { flex: 1, padding: 18, minHeight: 132 }]}
              >
                <Icon name={item.icon} />
                <Text style={s.label}>{item.title}</Text>
                <Text style={s.caption}>{item.caption}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ gap: 10 }}>
            <View style={s.between}>
              <Text style={s.caption}>
                {pro ? "あなたのペースで、何枚でも" : "今日、無料で使える枚数"}
              </Text>
              <Text style={[s.label, { color: p.purple }]}>
                {pro ? "枚数の上限なし" : `あと${remaining(app.state)}枚`}
              </Text>
            </View>
            {!pro ? <Progress value={app.state.used.length / 50} /> : null}
            <Text style={s.caption}>
              候補の確認・削除は、上限後も無料です。
            </Text>
          </View>
          {app.loading ? (
            <View style={s.row}>
              <ActivityIndicator color={p.purple} />
              <Text style={s.caption}>
                写真を読み込み中 · {app.photos.length}枚
              </Text>
            </View>
          ) : null}
          {app.libraryError ? (
            <Card>
              <Text style={s.body}>{app.libraryError}</Text>
              <Button
                title="もう一度読み込む"
                variant="secondary"
                onPress={() => void app.reload()}
              />
            </Card>
          ) : null}
          {!app.loading && !app.photos.length ? (
            <Card>
              <Text style={s.heading}>写真がありません</Text>
              <Text style={s.body}>
                アクセスする写真を変更してみてください。
              </Text>
              <Button
                title="写真のアクセスを変更"
                variant="secondary"
                onPress={() => void run(app, app.selectMore)}
              />
            </Card>
          ) : null}
        </>
      )}
    </Page>
  );
}
export function Months() {
  const app = useApp();
  const months = [
    ...new Set(app.photos.map((photo) => monthKey(photo.createdAt))),
  ]
    .sort()
    .reverse();
  return (
    <Page title="月を選ぶ" back>
      <Text style={s.title}>見たい月から、少しずつ。</Text>
      <Text style={s.body}>古い月の写真も、無料で整理できます。</Text>
      {months.map((key) => {
        const photos = app.photos.filter(
            (photo) => monthKey(photo.createdAt) === key,
          ),
          done = photos.filter((photo) => app.state.decisions[photo.id]).length;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            onPress={() => void begin(app, { month: key, order: "newest" })}
            style={[s.card, s.row]}
          >
            <Image
              source={{ uri: photos[0]?.uri }}
              style={{ width: 78, height: 90, borderRadius: 18 }}
              contentFit="cover"
              cachePolicy="memory"
            />
            <View style={{ flex: 1, gap: 10 }}>
              <View style={s.between}>
                <Text style={s.heading}>{Number(key.split("-")[1])}月</Text>
                <Text style={s.caption}>{photos.length}枚</Text>
              </View>
              <Text style={s.caption}>
                {monthLabel(key)} · {done ? `${done}枚 見直し済み` : "これから"}
              </Text>
              <Progress value={done / photos.length} />
            </View>
          </Pressable>
        );
      })}
      {app.loading ? (
        <ActivityIndicator color={p.purple} />
      ) : !months.length ? (
        <StateView
          title="写真がありません"
          description="写真へのアクセス範囲を確認してください。"
        />
      ) : null}
    </Page>
  );
}
export function Screenshots() {
  const app = useApp();
  const [onlyMonth, setMonth] = useState(false);
  const month = monthKey(Date.now());
  const photos = app.photos.filter(
    (photo) =>
      photo.screenshot && (!onlyMonth || monthKey(photo.createdAt) === month),
  );
  const unseen = photos.filter(
    (photo) => !app.state.decisions[photo.id],
  ).length;
  const pro = hasPro(app.entitlement, Date.now());
  const target = Math.min(
    unseen,
    pro ? app.state.settings.batch : Math.min(20, remaining(app.state)),
  );
  return (
    <Page
      title="スクショ"
      back
      footer={
        <Button
          title={
            target
              ? `${target}枚を見てみる`
              : !unseen
                ? "この範囲は見直し済み"
                : "今日の整理を確認"
          }
          disabled={!unseen}
          onPress={() =>
            void begin(app, {
              screenshotsOnly: true,
              ...(onlyMonth ? { month } : {}),
              order: "newest",
            })
          }
        />
      }
    >
      <Chip>SCREENSHOTS</Chip>
      <Text style={s.title}>もう使わない画像、{`\n`}見つけよう。</Text>
      <Text style={s.body}>メモ代わりの1枚も、あとで見ようの1枚も。</Text>
      <View style={s.row}>
        <Button
          title="すべて"
          variant={!onlyMonth ? "primary" : "secondary"}
          onPress={() => setMonth(false)}
        />
        <Button
          title="今月"
          variant={onlyMonth ? "primary" : "secondary"}
          onPress={() => setMonth(true)}
        />
      </View>
      <Text style={s.caption}>
        {photos.length}枚{app.loading ? " · 読み込み中" : ""}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {photos.slice(0, 18).map((photo) => (
          <View
            key={photo.id}
            style={{
              width: "31%",
              aspectRatio: 0.8,
              borderRadius: 15,
              overflow: "hidden",
              backgroundColor: p.lavender,
            }}
          >
            <Image
              source={{ uri: photo.uri }}
              style={{ flex: 1 }}
              contentFit="cover"
              cachePolicy="memory"
            />
          </View>
        ))}
      </View>
      {!photos.length ? (
        <StateView
          title="この範囲にスクショはありません"
          description="別の月や、写真へのアクセス範囲を確認できます。"
        />
      ) : null}
      <Button
        title="期間を指定する"
        variant="ghost"
        onPress={() => go("/filter?screenshots=1")}
      />
    </Page>
  );
}
export function Filter() {
  const app = useApp(),
    pro = hasPro(app.entitlement, Date.now());
  const params = useLocalSearchParams<{ screenshots?: string }>();
  const [start, setStart] = useState(monthKey(Date.now()) + "-01"),
    [end, setEnd] = useState(new Date().toLocaleDateString("sv-SE")),
    [order, setOrder] = useState<"newest" | "oldest">("newest");
  const range = validateScopeDates(start, end);
  return (
    <Page title="期間・並び順" back>
      <Chip>{pro ? "自分のペースで" : "PRO"}</Chip>
      <Text style={s.title}>見たいところを、{`\n`}ぴったり選ぶ。</Text>
      <Text style={s.body}>旅行の前後や、撮りためた季節の写真もまとめて。</Text>
      <Card>
        <Text style={s.label}>開始日</Text>
        <TextInput
          accessibilityLabel="開始日 YYYY-MM-DD"
          editable={pro}
          value={start}
          onChangeText={setStart}
          placeholder="YYYY-MM-DD"
          style={input}
        />
        <Text style={s.label}>終了日</Text>
        <TextInput
          accessibilityLabel="終了日 YYYY-MM-DD"
          editable={pro}
          value={end}
          onChangeText={setEnd}
          placeholder="YYYY-MM-DD"
          style={input}
        />
        {range.error ? (
          <Text style={{ color: p.rose }}>{range.error}</Text>
        ) : null}
      </Card>
      <View style={s.row}>
        <Button
          title="新しい順"
          variant={order === "newest" ? "primary" : "secondary"}
          onPress={() => setOrder("newest")}
        />
        <Button
          title="古い順"
          variant={order === "oldest" ? "primary" : "secondary"}
          onPress={() => setOrder("oldest")}
        />
      </View>
      {pro ? (
        <>
          <Text style={s.heading}>1回の区切り</Text>
          <View style={s.row}>
            {([20, 50, 100] as const).map((n) => (
              <Button
                key={n}
                title={`${n}枚`}
                variant={
                  app.state.settings.batch === n ? "primary" : "secondary"
                }
                onPress={() => void run(app, () => app.settings({ batch: n }))}
              />
            ))}
          </View>
          <Button
            title="この範囲で整理する"
            disabled={!!range.error}
            onPress={() =>
              void begin(app, {
                start: range.start,
                end: range.end,
                order,
                screenshotsOnly: params.screenshots === "1",
              })
            }
          />
        </>
      ) : (
        <>
          <Button
            title="Proの内容と料金を見る"
            onPress={() => go("/paywall")}
          />
          <Button
            title="月を選んで整理する（無料）"
            variant="secondary"
            onPress={() => go("/months")}
          />
        </>
      )}
    </Page>
  );
}
export function Guide() {
  const app = useApp();
  return (
    <Page
      title="最初の操作ガイド"
      back
      footer={
        <Button
          title="1枚目を見てみる"
          onPress={() =>
            void run(app, async () => {
              await app.mutate((s) => ({ ...s, guided: true }));
              router.replace("/review");
            })
          }
        />
      }
    >
      <StateView
        icon="hand-left-outline"
        title="写真を見て、左右へ。"
        description="左は削除候補。右は残す。候補に入れただけでは、写真は消えません。"
      >
        <View style={s.row}>
          <Stat value="← 候補" label="あとで確認して削除" />
          <Stat value="残す →" label="大切な写真は、そのまま" mint />
        </View>
      </StateView>
      <Card>
        <Text style={s.body}>
          下のボタンでも操作できます。迷ったらスキップ。取り消しも、いつでも無料です。
        </Text>
      </Card>
    </Page>
  );
}
export function Review({ previewDrag = 0 }: { previewDrag?: number } = {}) {
  const app = useApp();
  const session = app.state.session;
  const [failed, setFailed] = useState("");
  const deciding = useRef(false);
  const id = session?.ids[session.cursor];
  const photo = app.photos.find((photo) => photo.id === id);
  const next = app.photos.find(
    (photo) => photo.id === session?.ids[session.cursor + 1],
  );
  const candidates = Object.values(app.state.decisions).filter(
    (d) => d.choice === "candidate",
  ).length;
  useFocusEffect(
    useCallback(() => {
      if (
        !deciding.current &&
        (session?.status === "summary" ||
          (session && session.cursor >= session.ids.length))
      )
        router.replace("/summary");
    }, [session?.status, session?.cursor, session?.ids.length]),
  );
  const choose = async (choice: "keep" | "candidate" | "skip") => {
    if (!id || deciding.current) return;
    deciding.current = true;
    try {
      await app.choose(id, choice);
      setFailed("");
      const reachesLimit =
        choice !== "skip" &&
        !hasPro(app.entitlement, Date.now()) &&
        !app.state.used.includes(id) &&
        remaining(app.state) === 1;
      if (reachesLimit && app.state.quotaNoticeDay !== app.state.day) {
        go("/quota");
      } else if (session && session.cursor + 1 >= session.ids.length)
        router.replace("/summary");
    } finally {
      deciding.current = false;
    }
  };
  if (!session)
    return (
      <Page title="仕分け" back>
        <StateView
          title="見たい写真を選ぼう"
          description="月別やスクショから、少しずつはじめられます。"
        >
          <Button title="ホームへ" onPress={() => router.replace("/")} />
        </StateView>
      </Page>
    );
  return (
    <Page scroll title="写真の仕分け" back style={{ gap: 16 }}>
      <View style={s.between}>
        <Chip>
          {session.scope.month
            ? monthLabel(session.scope.month)
            : session.scope.screenshotsOnly
              ? "スクショ"
              : "写真の見直し"}
        </Chip>
        <Text style={s.label}>
          {Math.min(session.cursor + 1, session.target)}{" "}
          <Text style={s.caption}>/ {session.target}枚</Text>
        </Text>
      </View>
      <Progress value={session.cursor / session.target} />
      {photo && failed !== id ? (
        <PhotoCard
          key={id}
          previewDrag={previewDrag}
          photo={photo}
          next={next}
          disabled={app.busy}
          reduceMotion={app.state.settings.reduceMotion}
          onDecision={choose}
          onZoom={() => go(`/zoom?id=${encodeURIComponent(id!)}`)}
          onError={() => setFailed(id!)}
        />
      ) : (
        <StateView
          icon="cloud-offline-outline"
          title={app.loading ? "写真を読み込み中" : "この写真を読み込めません"}
          description="iCloudの通信や写真へのアクセスをご確認ください。スキップしても無料枠は減りません。"
        >
          <Button
            title="もう一度読み込む"
            variant="secondary"
            onPress={() => {
              setFailed("");
              void app.reload();
            }}
          />
          <Button
            title="この写真をスキップ"
            variant="ghost"
            onPress={() => void run(app, () => choose("skip"))}
          />
        </StateView>
      )}
      <View style={[s.between, { paddingHorizontal: 10, marginTop: 7 }]}>
        <IconButton
          name="arrow-undo-outline"
          label="前の操作を戻す"
          onPress={() => void run(app, app.undo)}
          disabled={app.busy || !session.steps.length}
        />
        <View style={{ alignItems: "center", gap: 8 }}>
          <IconButton
            name="close"
            label="削除候補にする"
            size={76}
            background={p.pink}
            color={p.rose}
            disabled={app.busy || !photo || failed === id}
            onPress={() => void run(app, () => choose("candidate"))}
          />
          <Text style={[s.caption, { color: p.rose }]}>候補へ</Text>
        </View>
        <View style={{ alignItems: "center", gap: 8 }}>
          <IconButton
            name="checkmark"
            label="写真を残す"
            size={76}
            background={p.mint}
            color={p.green}
            disabled={app.busy || !photo || failed === id}
            onPress={() => void run(app, () => choose("keep"))}
          />
          <Text style={[s.caption, { color: p.green }]}>残す</Text>
        </View>
        <IconButton
          name="play-skip-forward-outline"
          label="この写真をスキップ"
          onPress={() => void run(app, () => choose("skip"))}
          disabled={app.busy}
        />
      </View>
      {!hasPro(app.entitlement, Date.now()) ? (
        <Text style={[s.caption, { textAlign: "center" }]}>
          {remaining(app.state) === 10
            ? "今日はあと10枚、無料で整理できます。"
            : `今日の無料分 あと${remaining(app.state)}枚`}
        </Text>
      ) : null}
      <Button
        title={`候補${candidates}枚を確認`}
        variant="secondary"
        onPress={() => go("/candidates")}
      />
      <Button
        title="今日はここまで"
        variant="ghost"
        onPress={() =>
          void run(app, async () => {
            await app.mutate((s) => ({
              ...s,
              session: s.session
                ? { ...s.session, status: "paused" }
                : undefined,
            }));
            router.replace("/");
          })
        }
      />
    </Page>
  );
}
export function Summary() {
  const app = useApp(),
    session = app.state.session;
  const result = app.state.history.find((h) => h.id === session?.id);
  const kept = result?.kept || 0,
    candidates = result?.candidates || 0;
  const scope = session?.scope;
  const more =
    app.loading ||
    app.photos.some(
      (photo) =>
        !app.state.decisions[photo.id] &&
        (!scope?.month || monthKey(photo.createdAt) === scope.month) &&
        (!scope?.screenshotsOnly || photo.screenshot) &&
        (!scope?.start || photo.createdAt >= scope.start) &&
        (!scope?.end || photo.createdAt < scope.end),
    );
  return (
    <Page title="ひと区切り" back>
      <StateView
        badge={
          kept + candidates ? (
            <Celebration reduced={app.state.settings.reduceMotion} />
          ) : undefined
        }
        icon="checkmark"
        tone="green"
        title={
          kept + candidates
            ? `${kept + candidates}枚、見直しました。`
            : "今日はここまで。"
        }
        description={
          candidates
            ? "写真に、少し余白ができました。候補は最後に確認できます。"
            : "全部残すのも、整理のひとつ。見直したところまで保存しました。"
        }
      >
        <View style={s.row}>
          <Stat value={`${kept}枚`} label="残した写真" mint />
          <Stat value={`${candidates}枚`} label="今回の候補" />
        </View>
      </StateView>
      {candidates ? (
        <Button title="候補を確認する" onPress={() => go("/candidates")} />
      ) : null}
      <Button
        title={more ? "もう少し整理する" : "別の月を選ぶ"}
        variant={candidates ? "secondary" : "primary"}
        onPress={() =>
          more
            ? void begin(app, session?.scope || { order: "newest" })
            : go("/months")
        }
      />
      <Button
        title="今日はここまで"
        variant="ghost"
        onPress={() => router.replace("/")}
      />
      {!hasPro(app.entitlement, Date.now()) ? (
        <Button
          title="まとめて整理したい？ Proの内容を見る"
          variant="ghost"
          onPress={() => go("/paywall")}
        />
      ) : null}
    </Page>
  );
}
export function Candidates() {
  const app = useApp();
  const ids = Object.entries(app.state.decisions)
    .filter(([, d]) => d.choice === "candidate")
    .map(([id]) => id);
  const photos = ids
    .map((id) => app.photos.find((p) => p.id === id))
    .filter((p): p is Photo => !!p);
  const [visible, setVisible] = useState(60);
  const locked =
    app.busy ||
    app.state.deletion?.status === "pending" ||
    app.state.deletion?.status === "unknown";
  return (
    <Page
      title="削除候補の確認"
      footer={
        ids.length ? (
          <>
            <Text style={[s.caption, { textAlign: "center" }]}>
              確認・削除はいつでも無料です
            </Text>
            <Button
              title={locked ? "削除結果を確認" : `${photos.length}枚を削除`}
              variant="danger"
              disabled={!photos.length || app.busy}
              onPress={() =>
                locked
                  ? go("/result")
                  : void run(app, async () => {
                      await app.deletePhotos(photos.map((p) => p.id));
                      go("/result");
                    })
              }
            />
          </>
        ) : undefined
      }
    >
      {!ids.length ? (
        <StateView
          icon="heart-outline"
          tone="rose"
          title="削除候補はありません。"
          description="残したい写真を残せたのも、整理の成果です。"
        >
          <Button title="ほかの写真を見てみる" onPress={() => go("/months")} />
        </StateView>
      ) : (
        <>
          <Text style={s.title}>
            この{photos.length}枚を{`\n`}削除しますか？
          </Text>
          <Text style={s.body}>×で候補から外す · 写真をタップで拡大</Text>
          {ids.length !== photos.length ? (
            <Text style={{ color: p.rose }}>
              表示できない候補が{ids.length - photos.length}
              枚あります。写真へのアクセスを確認してください。表示できる写真だけを削除します。
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {photos.slice(0, visible).map((photo) => (
              <View key={photo.id} style={{ width: "31%", aspectRatio: 0.86 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="候補の写真を拡大"
                  onPress={() => go(`/zoom?id=${encodeURIComponent(photo.id)}`)}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    overflow: "hidden",
                    backgroundColor: p.lavender,
                  }}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={{ flex: 1 }}
                    contentFit="cover"
                    cachePolicy="memory"
                  />
                </Pressable>
                <View style={{ position: "absolute", right: -4, top: -4 }}>
                  <IconButton
                    name="close"
                    label="この写真を候補から外す"
                    size={44}
                    background="#fff"
                    color={p.ink}
                    disabled={locked}
                    onPress={() =>
                      void run(app, () => app.removeCandidate(photo.id))
                    }
                  />
                </View>
              </View>
            ))}
          </View>
          {photos.length > visible ? (
            <Button
              title="さらに候補を表示"
              variant="secondary"
              onPress={() => setVisible((n) => n + 60)}
            />
          ) : null}
          <Card style={{ backgroundColor: p.yellow, borderWidth: 0 }}>
            <Text style={[s.caption, { color: "#805817" }]}>
              iCloud写真を使っている場合は、同期先からも削除されます。通常は「最近削除した項目」で30日間復元できます。完全削除など、復元できない場合もあります。
            </Text>
          </Card>
          <Button
            title="仕分けに戻る"
            variant="ghost"
            onPress={() =>
              app.state.session ? go("/review") : router.replace("/")
            }
          />
        </>
      )}
    </Page>
  );
}
export function DeletionResult() {
  const app = useApp(),
    job = app.state.deletion;
  useFocusEffect(
    useCallback(() => {
      if (job?.status === "cancelled") router.replace("/candidates");
    }, [job?.status]),
  );
  const waiting = job?.status === "pending",
    unknown = job?.status === "unknown",
    done = job?.status === "done";
  const title = waiting
    ? "削除の結果を確認中"
    : unknown
      ? "結果を確認できませんでした"
      : done
        ? `${job.deleted.length}枚を削除しました。`
        : job?.status === "cancelled"
          ? "削除をキャンセルしました"
          : "残った候補を確認しましょう";
  return (
    <Page title="削除の結果" back>
      <StateView
        icon={
          waiting ? "hourglass-outline" : done ? "checkmark" : "images-outline"
        }
        tone={done ? "green" : "purple"}
        title={title}
        description={
          waiting
            ? "iPhoneから結果が戻るまでお待ちください。"
            : unknown
              ? "候補は保持されています。もう一度結果を確認できます。削除を自動で繰り返すことはありません。"
              : done
                ? "大切な写真を残して、すっきり。"
                : "写真の状態を確認してから、もう一度操作してください。"
        }
      >
        {waiting ? (
          <ActivityIndicator color={p.purple} />
        ) : unknown ? (
          <Button
            title="削除結果を再確認"
            onPress={() => void app.reconcile()}
          />
        ) : (
          <Button
            title={done ? "ほかの写真を見てみる" : "候補を確認する"}
            onPress={() => go(done ? "/months" : "/candidates")}
          />
        )}
      </StateView>
      {done ? (
        <Button
          title="削除した写真を戻す方法"
          variant="ghost"
          onPress={() => go("/restore-photo")}
        />
      ) : null}
      <Button
        title="ホームへ"
        variant="secondary"
        onPress={() => router.replace("/")}
      />
    </Page>
  );
}
export function Quota() {
  const app = useApp();
  const count = Object.values(app.state.decisions).filter(
    (d) => d.choice === "candidate",
  ).length;
  return (
    <Page title="今日のひと区切り" back>
      <StateView
        icon="sparkles-outline"
        title="今日も、よく進みました。"
        description={`無料で使える${50}枚を整理しました。日付が変わると、新しい写真をまた整理できます。`}
      />
      <Button title="Proの内容と料金を見る" onPress={() => go("/paywall")} />
      <Button
        title={`候補${count}枚を確認する（無料）`}
        variant="secondary"
        onPress={() => go("/candidates")}
      />
      {app.state.session?.steps.length ? (
        <Button
          title="前の操作を戻す（無料）"
          variant="ghost"
          onPress={() =>
            void run(app, async () => {
              await app.undo();
              router.replace("/review");
            })
          }
        />
      ) : null}
      <Button
        title="今日はここまで"
        variant="ghost"
        onPress={() => router.replace("/")}
      />
    </Page>
  );
}
export function Zoom() {
  const app = useApp();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id || app.state.session?.ids[app.state.session.cursor];
  const [photo, setPhoto] = useState(app.photos.find((p) => p.id === id));
  const [error, setError] = useState(""),
    [scale, setScale] = useState(1);
  useEffect(() => {
    let alive = true;
    if (id)
      void app.repository
        .resolve(id)
        .then((p) => {
          if (alive) setPhoto(p);
        })
        .catch(() => {
          if (alive)
            setError("写真を読み込めません。通信状況をご確認ください。");
        });
    return () => {
      alive = false;
    };
  }, [id, app.repository]);
  return (
    <Page
      title="写真の拡大"
      back
      scroll={false}
      style={{ backgroundColor: p.dark, padding: 0 }}
    >
      {error ? (
        <Text style={{ color: "#fff", padding: 22 }}>{error}</Text>
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        maximumZoomScale={4}
        minimumZoomScale={1}
        centerContent
      >
        {photo ? (
          <Image
            source={{ uri: photo.uri }}
            style={{
              flex: 1,
              minHeight: 400 * scale,
              width: `${scale * 100}%`,
            }}
            contentFit="contain"
            cachePolicy="memory"
          />
        ) : (
          <ActivityIndicator color="#fff" />
        )}
      </ScrollView>
      <View style={{ padding: 20, gap: 14 }}>
        <Text style={{ color: "#DDD5ED", textAlign: "center", fontSize: 12 }}>
          {photo ? dateLabel(photo.createdAt) : ""}
        </Text>
        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 22 }}
        >
          <IconButton
            label="縮小する"
            name="remove"
            onPress={() => setScale((v) => Math.max(1, v - 0.5))}
          />
          <IconButton
            label="拡大する"
            name="add"
            onPress={() => setScale((v) => Math.min(3, v + 0.5))}
          />
        </View>
        <Button
          title="写真の確認に戻る"
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
    </Page>
  );
}
const input = {
  backgroundColor: p.bg,
  borderWidth: 1,
  borderColor: p.border,
  borderRadius: 14,
  minHeight: 50,
  padding: 14,
  fontSize: 16,
  color: p.ink,
};
