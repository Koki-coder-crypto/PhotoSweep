import * as Media from "expo-media-library/legacy";
import { requireNativeModule } from "expo-modules-core";
import type {
  AssetSize,
  Permission,
  Photo,
  PhotoRepository,
  Scope,
  PhotoFingerprint,
} from "../domain/types";
const access = requireNativeModule<{
  screenRecordings(ids: string[]): Promise<string[]>;
  size(id: string): Promise<AssetSize>;
  fingerprints?(ids: string[]): Promise<PhotoFingerprint[]>;
  contentDigests?(ids: string[]): Promise<{ id: string; digest: string }[]>;
  permission(): Promise<Permission>;
  inspect(
    ids: string[],
  ): Promise<{ present: string[]; missing: string[]; inaccessible: string[] }>;
  deleteRequested(
    ids: string[],
  ): Promise<"confirmed" | "cancelled" | "unknown">;
}>("PhotoSweepAccess");
const map = (a: Media.Asset): Photo => ({
  id: a.id,
  kind: a.mediaType === "video" ? "video" : "photo",
  duration: a.duration,
  uri: a.uri,
  width: a.width,
  height: a.height,
  createdAt: a.creationTime,
  modifiedAt: a.modificationTime,
  screenshot: a.mediaSubtypes?.includes("screenshot") || false,
});
function dates(scope: Scope) {
  if (!scope.month) return { start: scope.start, end: scope.end };
  const [year, month] = scope.month.split("-").map(Number) as [number, number];
  return {
    start: new Date(year, month - 1, 1).getTime(),
    end: new Date(year, month, 1).getTime(),
  };
}
export function createPhotoRepository(): PhotoRepository {
  return {
    size: (id) => access.size(id),
    fingerprints: access.fingerprints
      ? (ids) => access.fingerprints!(ids)
      : undefined,
    contentDigests: access.contentDigests
      ? (ids) => access.contentDigests!(ids)
      : undefined,
    async permission(request = false) {
      if (request && (await access.permission()) !== "restricted")
        await Media.requestPermissionsAsync(false, ["photo", "video"]);
      return access.permission();
    },
    async selectMore() {
      await Media.presentPermissionsPickerAsync(["photo", "video"]);
    },
    async page(scope, after, limit = 100) {
      const range = dates(scope);
      const page = await Media.getAssetsAsync({
        first: limit,
        after,
        mediaType: scope.screenshotsOnly ? ["photo"] : scope.recordingsOnly ? ["video"] : scope.mediaKind ? [scope.mediaKind] : ["photo", "video"],
        sortBy: [["creationTime", scope.order === "oldest"]],
        createdAfter: range.start === undefined ? undefined : range.start - 1,
        createdBefore: range.end,
        ...(scope.screenshotsOnly
          ? { mediaSubtypes: ["screenshot"] as Media.MediaSubtype[] }
          : {}),
      });
      const recordings = new Set(await access.screenRecordings(page.assets.filter(a => a.mediaType === "video").map(a => a.id)));
      return {
        items: page.assets.map(a => ({ ...map(a), screenRecording: recordings.has(a.id) })).filter(a => !scope.recordingsOnly || a.screenRecording),
        next: page.hasNextPage ? page.endCursor : undefined,
        total: page.totalCount,
      };
    },
    async resolve(id) {
      const info = await Media.getAssetInfoAsync(id, {
        shouldDownloadFromNetwork: true,
      });
      if (!info) throw new Error("この写真を読み込めません。");
      return { ...map(info), uri: info.localUri || info.uri };
    },
    inspect: (ids) => access.inspect(ids),
    deleteRequested: (ids) => access.deleteRequested(ids),
    subscribe(callback) {
      const sub = Media.addListener(callback);
      return () => sub.remove();
    },
  };
}
