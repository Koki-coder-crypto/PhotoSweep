import type { Photo, PhotoFingerprint } from "./types.ts";

export interface PhotoGroup {
  id: string;
  ids: string[];
  recommended: string;
  kind: "similar" | "duplicate";
}
export interface LibraryAnalysis {
  status: "idle" | "scanning" | "complete" | "unavailable" | "error";
  processed: number;
  total: number;
  unavailable: number;
  groups: PhotoGroup[];
  error: string;
}
export const emptyAnalysis: LibraryAnalysis = {
  status: "idle",
  processed: 0,
  total: 0,
  unavailable: 0,
  groups: [],
  error: "",
};
export function hashDistance(a: string, b: string): number {
  if (!/^[0-9a-f]{16}$/i.test(a) || !/^[0-9a-f]{16}$/i.test(b)) return 65;
  let bits = BigInt(`0x${a}`) ^ BigInt(`0x${b}`),
    distance = 0;
  while (bits) {
    bits &= bits - 1n;
    distance++;
  }
  return distance;
}
export function buildPhotoGroups(
  photos: Photo[],
  fingerprints: PhotoFingerprint[],
  digests: Map<string, string> = new Map(),
): PhotoGroup[] {
  const byId = new Map(photos.map((p) => [p.id, p]));
  const prints = new Map(
    fingerprints.filter((p) => byId.has(p.id)).map((p) => [p.id, p]),
  );
  const quality = (id: string) => {
    const p = byId.get(id)!,
      f = prints.get(id);
    return (
      (p.favorite || f?.favorite ? 1e15 : 0) +
      p.width * p.height * 10 +
      (f?.quality || 0)
    );
  };
  const grouped = new Set<string>(),
    groups: PhotoGroup[] = [];
  const exact = new Map<string, string[]>();
  for (const [id, digest] of digests)
    if (byId.has(id) && /^[0-9a-f]{64}$/i.test(digest)) {
      const list = exact.get(digest) || [];
      list.push(id);
      exact.set(digest, list);
    }
  const add = (ids: string[], kind: PhotoGroup["kind"]) => {
    ids.sort((a, b) => quality(b) - quality(a) || a.localeCompare(b));
    ids.forEach((id) => grouped.add(id));
    groups.push({ id: `${kind}-${ids[0]}`, ids, recommended: ids[0]!, kind });
  };
  for (const ids of exact.values()) if (ids.length > 1) add(ids, "duplicate");
  // Compare with a group's representative, never chain unrelated images together.
  // Four 16-bit buckets bound comparisons on large libraries; timestamps limit false matches.
  const buckets = new Map<string, number[]>(),
    similar: string[][] = [];
  const ordered = [...photos].sort((a, b) => b.createdAt - a.createdAt);
  for (const photo of ordered) {
    const print = prints.get(photo.id);
    if (
      !print ||
      grouped.has(photo.id) ||
      photo.screenshot ||
      !/^[0-9a-f]{16}$/i.test(print.hash)
    )
      continue;
    const keys = Array.from(
      { length: 4 },
      (_, i) => `${i}:${print.hash.slice(i * 4, i * 4 + 4)}`,
    );
    const candidates = new Set(keys.flatMap((key) => buckets.get(key) || []));
    let match: number | undefined;
    for (const index of candidates) {
      const first = byId.get(similar[index]![0]!)!,
        firstPrint = prints.get(first.id)!;
      if (Math.abs(first.createdAt - photo.createdAt) > 86400000) continue;
      const ratio = first.width / first.height / (photo.width / photo.height);
      if (ratio < 0.9 || ratio > 1.1) continue;
      if (hashDistance(firstPrint.hash, print.hash) <= 7) {
        match = index;
        break;
      }
    }
    if (match !== undefined) similar[match]!.push(photo.id);
    else {
      const index = similar.push([photo.id]) - 1;
      keys.forEach((key) => {
        const list = buckets.get(key) || [];
        list.push(index);
        buckets.set(key, list);
      });
    }
  }
  similar.filter((ids) => ids.length > 1).forEach((ids) => add(ids, "similar"));
  return groups;
}
export function duplicateCandidates(prints: PhotoFingerprint[]): string[] {
  const byHash = new Map<string, string[]>();
  for (const p of prints)
    if (p.exactEligible) {
      const ids = byHash.get(p.hash) || [];
      ids.push(p.id);
      byHash.set(p.hash, ids);
    }
  return [...byHash.values()].filter((ids) => ids.length > 1).flat();
}
