import { ResultSize } from "../ui/ResultSize";
import { MonthStories } from "../ui/MonthStories";
import { SwipeHint } from "../ui/SwipeHint";
import { VideoPreview } from "../ui/VideoPreview";
import { formatBytes, summarizeSizes } from "../domain/media";
import { useReviewPrompt } from "../state/useReviewPrompt";
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

async function begin(app: ReturnType<typeof useApp>, scope: Scope) {
  if (!hasPro(app.entitlement, Date.now()) && remaining(app.state) + remaining(app.state, "video") === 0) {
    go("/quota");
    return;
  }
  if (await run(app, () => app.start(scope)))
    go(app.state.guided ? "/review" : "/guide");
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
  const [hint, setHint] = useState(!app.state.monthHintSeen);
  const dismissHint = () => { setHint(false); if (!app.state.monthHintSeen) void run(app, () => app.mutate(s => ({ ...s, monthHintSeen: true }))); };
  const candidateIds = Object.keys(app.state.decisions).filter(id => app.state.decisions[id]?.choice === "candidate");
  const candidateSize = summarizeSizes(candidateIds, app.state.sizes);
  useEffect(() => {
    if (session?.scope.month && !app.state.monthHintSeen) void app.mutate(s => ({ ...s, monthHintSeen: true })).catch(() => {});
  }, [session?.scope.month]);
  const deciding = useRef(false);
  const [leaving, setLeaving] = useState<{ photo: Photo; next?: Photo; choice: "keep" | "candidate" } | null>(null);
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
    setHint(false);
    deciding.current = true;
    if (photo && choice !== 'skip') setLeaving({ photo, next, choice });
    try {
      await Promise.all([app.choose(id, choice), new Promise(resolve => setTimeout(resolve, app.state.settings.reduceMotion || choice === 'skip' ? 0 : 220))]);
      setFailed("");
      if (session && session.cursor + 1 >= session.ids.length) router.replace("/summary");
    } finally {
      setLeaving(null);
      deciding.current = false;
    }
  };
  const controls = session ? <View style={{ gap: 8 }}>
      <View style={[s.between, { paddingHorizontal: 10, marginTop: 0 }]}>
        <IconButton
          name="arrow-undo-outline"
          label="前の操作を戻す"
          onPress={() => void run(app, app.undo)}
          disabled={app.busy || !!leaving || !session.steps.length}
        />
        <View style={{ alignItems: "center", gap: 8 }}>
          <IconButton
            name="close"
            label="削除候補にする"
            size={64}
            background={p.pink}
            color={p.rose}
            disabled={app.busy || !!leaving || !photo || failed === id}
            onPress={() => void run(app, () => choose("candidate"))}
          />
          <Text style={[s.caption, { color: p.rose }]}>候補へ</Text>
        </View>
        <View style={{ alignItems: "center", gap: 8 }}>
          <IconButton
            name="checkmark"
            label="写真を残す"
            size={64}
            background={p.mint}
            color={p.green}
            disabled={app.busy || !!leaving || !photo || failed === id}
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
          写真 あと{remaining(app.state)}枚 · 動画 あと{remaining(app.state, "video")}本
        </Text>
      ) : null}
      <Text style={s.caption}>{candidateSize.knownBytes > 0 ? `${formatBytes(candidateSize.knownBytes)}${candidateSize.estimated ? '（概算）' : '（確認済み）'}` : candidates ? '候補のサイズを確認中' : '削除候補はありません'}{candidateSize.unknownCount ? ` · ${candidateSize.unknownCount}件は未確認` : ''}</Text>
      <Button
        title={`候補${candidates}件を確認`}
        variant="secondary"
        onPress={() => go("/candidates")}
      />
  </View> : undefined;
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
    <Page scroll style={{ gap: 10 }} footer={controls}>
      <MonthStories disabled={!!leaving} onSelect={month => { if (deciding.current) return; setHint(false); void run(app, () => app.start({ month, order: "newest" })); }} />

      <View style={s.between}>
        <IconButton name="chevron-back" label="戻る" onPress={() => router.canGoBack() ? router.back() : router.replace("/swipe")} />
        <Pressable accessibilityRole="button" accessibilityLabel="スワイプの説明" onPress={() => setHint(true)}><Text style={{ color: p.cyan, padding: 12 }}>?</Text></Pressable>
        <Chip>
          {session.scope.month
            ? monthLabel(session.scope.month)
            : session.scope.screenshotsOnly
              ? "スクショ"
              : "写真の見直し"}
        </Chip>
        <Text style={s.label}>
          {Math.min(session.cursor + 1, session.target)}{" "}
          <Text style={s.caption}>/ {session.target}件</Text>
        </Text>
      </View>
      <Progress value={session.cursor / session.target} />
      {photo?.kind === "video" ? <Text style={s.caption}>動画 · {Math.floor((photo.duration || 0) / 60)}:{String(Math.floor((photo.duration || 0) % 60)).padStart(2, '0')} · {app.state.sizes?.[photo.id]?.bytes != null ? formatBytes(app.state.sizes![photo.id]!.bytes!) : 'サイズ未確認'}</Text> : null}
      {(leaving?.photo || photo) && failed !== id ? (
        <View onTouchStart={() => { if (hint) setHint(false); }}>
        <PhotoCard
          key={leaving?.photo.id || id}
          exitDirection={leaving?.choice}
          previewDrag={previewDrag}
          photo={leaving?.photo || photo!}
          next={leaving?.next || next}
          disabled={app.busy || !!leaving}
          reduceMotion={app.state.settings.reduceMotion}
          onDecision={choose}
          onZoom={() => go(`/zoom?id=${encodeURIComponent(id!)}`)}
          onError={() => setFailed(id!)}
        />
        {hint ? <View style={{ position: 'absolute', left: 12, right: 12, bottom: 26 }}><SwipeHint reduced={app.state.settings.reduceMotion} onDismiss={dismissHint} /></View> : null}
        </View>
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
        (!scope?.mediaKind || (photo.kind || 'photo') === scope.mediaKind) &&
        (!scope?.recordingsOnly || photo.screenRecording) &&
        (!scope?.start || photo.createdAt >= scope.start) &&
        (!scope?.end || photo.createdAt < scope.end),
    );
  return (
    <Page title="整理の結果" back>
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
            ? "削除候補を確認すると、このまま削除できます。"
            : "すべて残しました。次の写真へ進めます。"
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
        title={more ? "次の写真へ" : "別の月を選ぶ"}
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
          title="枚数制限を解除する"
          variant="ghost"
          onPress={() => go("/paywall")}
        />
      ) : null}
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
  const cancelPrompt = useReviewPrompt(job?.id);
  const outcome = app.state.outcomes?.find(x => x.id === job?.id);
  const waiting = job?.status === "pending",
    unknown = job?.status === "unknown",
    done = job?.status === "done";
  const title = waiting
    ? "削除の結果を確認中"
    : unknown
      ? "結果を確認できませんでした"
      : done
        ? `${job.deleted.length}件を整理しました`
        : job?.status === "cancelled"
          ? "削除をキャンセルしました"
          : "残った候補を確認しましょう";
  return (
    <Page title="削除の結果" back onInteraction={cancelPrompt}>
      <StateView
        badge={
          done ? (
            <Celebration reduced={app.state.settings.reduceMotion} />
          ) : undefined
        }
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
                ? "一覧に反映しました。続けてほかの写真も整理できます。"
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
            title={done ? "写真の一覧に戻る" : "候補を確認する"}
            onPress={() => (done ? router.replace("/") : go("/candidates"))}
          />
        )}
      </StateView>
      {outcome ? <Card>
        <Text style={s.heading}>削除したデータ</Text><ResultSize bytes={outcome.knownBytes} reduced={app.state.settings.reduceMotion} suffix={outcome.estimated ? "（概算）" : outcome.unknownCount ? "（確認済み分）" : ""} />
        <Text style={s.body}>写真{outcome.photoCount}枚 · 動画{outcome.videoCount}本</Text>
        {outcome.unknownCount ? <Text style={s.caption}>{outcome.unknownCount}件のサイズは含まれていません。</Text> : null}
        {outcome.freeBefore !== undefined && outcome.freeAfter !== undefined ? <Text style={s.caption}>端末の空き容量（測定値）{formatBytes(outcome.freeBefore)} → {formatBytes(outcome.freeAfter)}</Text> : null}
        <Text style={s.caption}>削除した項目は「最近削除した項目」に通常30日間残ります。空き容量への反映には時間がかかることがあります。iCloud写真を使っている場合、同じアカウントの端末にも削除が反映されます。</Text>
        <Button title="別の月を整理する" onPress={() => go('/swipe')} />
      </Card> : null}
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
    <Page title="無料分の上限" back>
      <StateView
        icon="sparkles-outline"
        title="今日の無料枠"
        description={`写真はあと${remaining(app.state)}枚、動画はあと${remaining(app.state, "video")}本。毎日、写真30枚・動画5本まで整理できます。候補の確認・削除は引き続き無料です。`}
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
        {photo?.kind === "video" ? <VideoPreview uri={photo.uri} /> : photo ? (
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

export {
  Welcome,
  PermissionScreen,
  Home,
  SwipeLibrary as Months,
} from "./cleanup";
export { Candidates, Screenshots } from "./collection";
