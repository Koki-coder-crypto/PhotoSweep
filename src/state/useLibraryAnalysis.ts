import { useEffect, useRef, useState } from "react";
import type {
  Permission,
  Photo,
  PhotoFingerprint,
  PhotoRepository,
} from "../domain/types";
import {
  buildPhotoGroups,
  duplicateCandidates,
  emptyAnalysis,
  type LibraryAnalysis,
} from "../domain/analysis";

export function useLibraryAnalysis(
  repository: PhotoRepository,
  photos: Photo[],
  permission: Permission,
  loading: boolean,
): LibraryAnalysis {
  const [state, setState] = useState<LibraryAnalysis>(emptyAnalysis);
  const cache = useRef(
    new Map<string, { modified: number; value: PhotoFingerprint }>(),
  );
  const digests = useRef(new Map<string, string>());
  useEffect(() => {
    if (loading) return;
    if (permission !== "full" && permission !== "limited") {
      cache.current.clear();
      digests.current.clear();
      setState(emptyAnalysis);
      return;
    }
    if (!repository.fingerprints) {
      setState({ ...emptyAnalysis, status: "unavailable" });
      return;
    }
    let cancelled = false;
    const live = new Set(photos.map((p) => p.id));
    for (const id of cache.current.keys())
      if (!live.has(id)) {
        cache.current.delete(id);
        digests.current.delete(id);
      }
    const work = photos.filter((p) => {
      const cached = cache.current.get(p.id);
      if (cached && cached.modified !== (p.modifiedAt || 0)) {
        cache.current.delete(p.id);
        digests.current.delete(p.id);
      }
      return !cache.current.has(p.id);
    });
    const valid = () => [...cache.current.values()].map((x) => x.value);
    let processed = photos.length - work.length;
    const publish = (status: LibraryAnalysis["status"], error = "") => {
      if (!cancelled)
        setState({
          status,
          processed,
          total: photos.length,
          unavailable: Math.max(0, processed - cache.current.size),
          error,
          groups: buildPhotoGroups(photos, valid(), digests.current),
        });
    };
    void (async () => {
      publish("scanning");
      for (let i = 0; i < work.length; i += 24) {
        const batch = work.slice(i, i + 24);
        const result = await repository.fingerprints!(batch.map((p) => p.id));
        if (cancelled) return;
        const modified = new Map(batch.map((p) => [p.id, p.modifiedAt || 0]));
        result.forEach((value) => {
          if (modified.has(value.id))
            cache.current.set(value.id, {
              modified: modified.get(value.id) || 0,
              value,
            });
        });
        processed += batch.length;
        // Publish progressively without rebuilding every group for every 24 images.
        if (i === 0 || i % 240 === 0) publish("scanning");
        await new Promise<void>((resolve) => setTimeout(resolve, 12));
      }
      const candidates = duplicateCandidates(valid()).filter(
        (id) => !digests.current.has(id),
      );
      if (repository.contentDigests)
        for (let i = 0; i < candidates.length; i += 8) {
          const result = await repository.contentDigests(
            candidates.slice(i, i + 8),
          );
          if (cancelled) return;
          result.forEach((item) => {
            if (live.has(item.id)) digests.current.set(item.id, item.digest);
          });
          if (i % 80 === 0) publish("scanning");
          await new Promise<void>((resolve) => setTimeout(resolve, 12));
        }
      publish("complete");
    })().catch((e) =>
      publish(
        "error",
        e instanceof Error ? e.message : "写真を解析できませんでした。",
      ),
    );
    return () => {
      cancelled = true;
    };
  }, [repository, photos, permission, loading]);
  return state;
}
