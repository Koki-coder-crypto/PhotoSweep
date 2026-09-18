import { formatBytes, summarizeSizes } from "../domain/media";
import React, { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Animated, { ZoomIn, useReducedMotion } from "react-native-reanimated";
import { useApp } from "../state/AppContext";
import { emptyAnalysis, type PhotoGroup } from "../domain/analysis";
import { hasPro, remaining } from "../domain/policy";
import { ReviewError } from "../domain/review";
import { Button, Icon, Page, StateView } from "../ui/components";
import { palette as p, styles as s } from "../ui/theme";
import { go, run } from "./actions";
import { PhotoTile } from "./cleanup";
type Category = "similar" | "duplicate" | "screenshots" | "all";
const labels: Record<Category, string> = {
  similar: "似ている写真",
  duplicate: "同じ画像",
  screenshots: "スクリーンショット",
  all: "すべての写真",
};
export function Collection({ initialKind }: { initialKind?: Category } = {}) {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: Category =
    initialKind ||
    (["similar", "duplicate", "screenshots", "all"].includes(params.kind || "")
      ? (params.kind as Category)
      : "all");
  const app = useApp(),
    analysis = app.analysis || emptyAnalysis,
    reduced = useReducedMotion() || app.state.settings.reduceMotion;
  const [selected, setSelected] = useState<Set<string>>(new Set()),
    [working, setWorking] = useState(false);
  const busyRef = useRef(false),
    grouped = kind === "similar" || kind === "duplicate";
  const photos = useMemo(
    () =>
      app.photos.filter((photo) => photo.kind !== "video" && (kind !== "screenshots" || photo.screenshot)),
    [app.photos, kind],
  );
  const lookup = useMemo(
    () => new Map(photos.map((photo) => [photo.id, photo])),
    [photos],
  );
  const groups = analysis.groups
    .filter((g) => g.kind === kind)
    .map((g) => ({ ...g, ids: g.ids.filter((id) => lookup.has(id)) }))
    .filter((g) => g.ids.length > 1);
  const available = grouped
      ? groups.flatMap((g) => g.ids)
      : photos.map((p) => p.id),
    eligible = new Set(available);
  const selection = [...selected].filter((id) => eligible.has(id));
  const unresolved = ["pending", "unknown"].includes(
    app.state.deletion?.status || "",
  );
  const locked = app.busy || working || unresolved;
  const toggle = (id: string) => {
    if (locked) return;
    setSelected((old) => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const recommended = () =>
    setSelected(
      new Set(
        groups.flatMap((g) =>
          g.ids.filter(
            (id) => id !== g.recommended && !lookup.get(id)?.favorite,
          ),
        ),
      ),
    );
  const remove = async () => {
    if (busyRef.current || locked || !selection.length) return;
    const fresh = selection.filter(
      (id) => !app.state.decisions[id] && !app.state.used.includes(id),
    );
    if (
      !hasPro(app.entitlement, Date.now()) &&
      fresh.length > remaining(app.state)
    ) {
      go("/paywall?source=selection");
      return;
    }
    busyRef.current = true;
    setWorking(true);
    try {
      await app.stageCandidates(selection);
      await app.deletePhotos(selection);
      go("/result");
    } catch (e) {
      if (e instanceof ReviewError && e.code === "quota") go("/quota");
      else
        app.notify(
          e instanceof Error ? e.message : "削除を開始できませんでした。",
        );
    } finally {
      busyRef.current = false;
      setWorking(false);
    }
  };
  const thumb = (id: string, recommendedId?: string) => {
    const photo = lookup.get(id);
    if (!photo) return null;
    const checked = selected.has(id);
    return (
      <View key={id} style={{ flex: 1, aspectRatio: 0.8 }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`${new Date(photo.createdAt).toLocaleDateString("ja-JP")}の写真${id === recommendedId ? "、残すおすすめ" : ""}`}
          accessibilityState={{ checked, disabled: locked }}
          disabled={locked}
          onPress={() => toggle(id)}
          style={[c.thumb, { borderColor: checked ? p.blue : "transparent" }]}
        >
          <PhotoTile photo={photo} />
          <View
            style={[
              c.check,
              {
                backgroundColor: checked ? p.blue : "rgba(0,0,0,0.4)",
                borderColor: checked ? p.blue : "#fff",
              },
            ]}
          >
            {checked ? (
              <Animated.View
                entering={reduced ? undefined : ZoomIn.duration(140)}
              >
                <Icon name="checkmark" color="#fff" size={17} />
              </Animated.View>
            ) : null}
          </View>
          {id === recommendedId ? (
            <View style={c.recommend}>
              <Icon name="checkmark-circle" color={p.green} size={12} />
              <Text style={{ fontSize: 10, color: "#fff", fontWeight: "600" }}>
                残すおすすめ
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="写真を拡大"
          onPress={() => go(`/zoom?id=${encodeURIComponent(id)}`)}
          style={c.zoom}
        >
          <Icon name="expand-outline" size={18} color="#fff" />
        </Pressable>
      </View>
    );
  };
  return (
    <Page
      title={labels[kind]}
      back
      scroll={false}
      style={{ paddingHorizontal: 14, gap: 12 }}
      footer={
        <>
          {unresolved ? (
            <Button title="前の削除結果を確認" onPress={() => go("/result")} />
          ) : (
            <Button
              title={working ? "削除を確認中…" : `${selection.length}枚を削除`}
              icon="trash-outline"
              disabled={!selection.length || locked}
              loading={working}
              onPress={() => void remove()}
            />
          )}
          <Text style={[s.caption, c.center]}>
            選択した写真だけを削除 · 次にiPhoneの確認が表示されます
          </Text>
        </>
      }
    >
      <View style={s.between}>
        <Text style={s.body}>
          {available.length}枚 · {selection.length}枚選択
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={locked}
          onPress={() =>
            selection.length
              ? setSelected(new Set())
              : grouped
                ? recommended()
                : setSelected(new Set(available))
          }
          style={c.textButton}
        >
          <Text style={{ color: p.cyan, fontWeight: "600" }}>
            {selection.length
              ? "選択解除"
              : grouped
                ? "おすすめ以外を選択"
                : "すべて選択"}
          </Text>
        </Pressable>
      </View>
      {grouped ? (
        <Text style={s.caption}>
          {kind === "duplicate"
            ? "元の画像データが一致する写真です。編集済み・Live Photoは対象外です。"
            : "見た目と撮影日時が近い写真です。削除前に内容を見比べてください。"}
        </Text>
      ) : null}
      {!available.length ? (
        <StateView
          icon={
            analysis.status === "scanning"
              ? "scan-outline"
              : "checkmark-circle-outline"
          }
          title={
            grouped && analysis.status === "scanning"
              ? "写真を解析しています"
              : grouped && analysis.status === "unavailable"
                ? "新しいビルドが必要です"
                : "写真がありません"
          }
          description={
            grouped && analysis.status === "scanning"
              ? "見つかった写真から順に表示します。"
              : grouped && analysis.status === "unavailable"
                ? "新しいアプリをインストールすると解析できます。"
                : "写真を追加すると、ここに表示されます。"
          }
        />
      ) : grouped ? (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          windowSize={5}
          renderItem={({ item: g }) => (
            <GroupRow group={g} renderPhoto={thumb} />
          )}
        />
      ) : (
        <FlatList
          data={photos}
          numColumns={3}
          keyExtractor={(photo) => photo.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={24}
          windowSize={7}
          columnWrapperStyle={{ gap: 5 }}
          renderItem={({ item }) => (
            <View style={{ width: "32.4%", marginBottom: 5 }}>
              {thumb(item.id)}
            </View>
          )}
        />
      )}
      {selection.length > 0 && !hasPro(app.entitlement, Date.now()) ? (
        <Text style={s.caption}>
          今日の無料分：あと{remaining(app.state)}枚 ·
          保存済みの候補の削除は無料
        </Text>
      ) : null}
    </Page>
  );
}
function GroupRow({
  group,
  renderPhoto,
}: {
  group: PhotoGroup;
  renderPhoto: (id: string, recommended?: string) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ gap: 10, marginBottom: 22 }}>
      <Text style={s.label}>
        {group.ids.length}枚の
        {group.kind === "duplicate" ? "同じ画像" : "似ている写真"}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {group.ids.slice(0, expanded ? undefined : 4).map((id) => (
          <View key={id} style={{ width: "49%" }}>
            {renderPhoto(id, group.recommended)}
          </View>
        ))}
      </View>
      {!expanded && group.ids.length > 4 ? (
        <Button
          title={`残り${group.ids.length - 4}枚を見る`}
          variant="secondary"
          onPress={() => setExpanded(true)}
        />
      ) : null}
    </View>
  );
}
export function Screenshots() {
  return <Collection initialKind="screenshots" />;
}
export function Candidates() {
  const app = useApp(),
    photos = app.photos.filter(
      (p) => app.state.decisions[p.id]?.choice === "candidate",
    );
  const sizes = summarizeSizes(photos.map(p => p.id), app.state.sizes);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const unresolved = ["pending", "unknown"].includes(
    app.state.deletion?.status || "",
  );
  const remove = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await app.deletePhotos(photos.map((p) => p.id));
      go("/result");
    } catch (e) {
      app.notify(
        e instanceof Error ? e.message : "削除を開始できませんでした。",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Page
      title="削除候補"
      scroll={false}
      style={{ gap: 12, paddingHorizontal: 14 }}
      footer={
        photos.length || unresolved ? (
          <>
            <Button
              title={unresolved ? "削除結果を確認" : `${photos.length}件を削除`}
              icon="trash-outline"
              disabled={app.busy || busy}
              loading={busy}
              onPress={() => (unresolved ? go("/result") : void remove())}
            />
            <Text style={[s.caption, c.center]}>
              iPhoneの確認が出るまで、写真は削除されません
            </Text>
          </>
        ) : undefined
      }
    >
      {!photos.length ? (
        <StateView
          icon="trash-outline"
          title="削除候補はありません"
          description="スワイプで左に送った写真が、ここに集まります。"
        >
          <Button title="写真を整理する" onPress={() => go("/swipe")} />
        </StateView>
      ) : (
        <>
          <Text style={s.body}>{photos.filter(p => p.kind !== 'video').length}枚の写真 · {photos.filter(p => p.kind === 'video').length}本の動画</Text>
          <Text style={s.caption}>{sizes.knownBytes ? formatBytes(sizes.knownBytes) + (sizes.estimated ? '（概算）' : '（確認済み）') : 'サイズ未確認'}{sizes.unknownCount ? ` · ${sizes.unknownCount}件は未確認` : ''} · ×で候補から外せます</Text>
          <FlatList
            data={photos}
            numColumns={3}
            keyExtractor={(p) => p.id}
            initialNumToRender={24}
            windowSize={7}
            columnWrapperStyle={{ gap: 5 }}
            renderItem={({ item }) => (
              <View
                style={{ width: "32.4%", aspectRatio: 0.8, marginBottom: 5 }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="候補の写真を拡大"
                  onPress={() => go(`/zoom?id=${encodeURIComponent(item.id)}`)}
                  style={c.thumb}
                >
                  <PhotoTile photo={item} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="この写真を候補から外す"
                  disabled={unresolved || app.busy || busy}
                  onPress={() =>
                    void run(app, () => app.removeCandidate(item.id))
                  }
                  style={[
                    c.zoom,
                    { left: undefined, right: 0, top: 0, bottom: undefined },
                  ]}
                >
                  <Icon name="close-circle" color="#fff" size={28} />
                </Pressable>
              </View>
            )}
          />
          <Text style={s.caption}>
            iCloud写真の同期先からも削除されます。「最近削除した項目」から通常30日間は復元できます。
          </Text>
        </>
      )}
    </Page>
  );
}
const c = StyleSheet.create({
  center: { textAlign: "center" },
  textButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 },
  thumb: {
    flex: 1,
    borderRadius: 13,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: p.surface,
  },
  check: {
    position: "absolute",
    right: 9,
    bottom: 9,
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  recommend: {
    position: "absolute",
    left: 4,
    top: 6,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "#153D32",
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  zoom: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,10,24,0.55)",
    borderRadius: 12,
  },
});
