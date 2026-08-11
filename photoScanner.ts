import { AssetField, MediaType, Query } from 'expo-media-library';
import { estimateBytes } from './format';

export type PhotoItem = {
  id: string;
  uri: string;
  width: number;
  height: number;
  createdAt: number;
  filename: string;
  estimatedBytes: number;
};

export type SimilarGroup = {
  id: string;
  photos: PhotoItem[];
  estimatedSavingsBytes: number;
};

export type ScanResult = {
  photos: PhotoItem[];
  large: PhotoItem[];
  old: PhotoItem[];
  similarGroups: SimilarGroup[];
  estimatedLibraryBytes: number;
  scannedAt: number;
  truncated: boolean;
};

const MAX_SCAN = 6000;
const PAGE_SIZE = 750;

function aspectRatio(item: PhotoItem) {
  return item.width / Math.max(item.height, 1);
}

export function buildSimilarGroups(items: PhotoItem[]): SimilarGroup[] {
  const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
  const raw: PhotoItem[][] = [];
  let current: PhotoItem[] = [];

  for (const item of sorted) {
    const previous = current[current.length - 1];
    if (!previous) {
      current = [item];
      continue;
    }

    const closeInTime = Math.abs(item.createdAt - previous.createdAt) <= 8_000;
    const sameShape = Math.abs(aspectRatio(item) - aspectRatio(previous)) < 0.02;
    const currentPixels = item.width * item.height;
    const previousPixels = previous.width * previous.height;
    const similarResolution =
      Math.abs(currentPixels - previousPixels) /
        Math.max(currentPixels, previousPixels, 1) <
      0.1;

    if (closeInTime && sameShape && similarResolution) current.push(item);
    else {
      if (current.length >= 2) raw.push(current);
      current = [item];
    }
  }

  if (current.length >= 2) raw.push(current);

  return raw
    .map((photos, index) => {
      const byKeepScore = [...photos].sort((a, b) => {
        const aPixels = a.width * a.height;
        const bPixels = b.width * b.height;
        return bPixels - aPixels;
      });
      const removableCandidates = byKeepScore.slice(1);
      return {
        id: `${photos[0].id}:${index}`,
        photos,
        estimatedSavingsBytes: removableCandidates.reduce(
          (sum, photo) => sum + photo.estimatedBytes,
          0,
        ),
      };
    })
    .sort((a, b) => b.estimatedSavingsBytes - a.estimatedSavingsBytes);
}

export async function scanLibrary(): Promise<ScanResult> {
  const metadata: Awaited<ReturnType<Query['exeForMetadata']>> = [];

  for (let offset = 0; offset < MAX_SCAN; offset += PAGE_SIZE) {
    const page = await new Query()
      .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
      .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
      .offset(offset)
      .limit(PAGE_SIZE)
      .exeForMetadata();

    metadata.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const photos: PhotoItem[] = metadata.map(asset => {
    const width = asset.width ?? 0;
    const height = asset.height ?? 0;
    return {
      id: asset.id,
      uri: asset.id,
      width,
      height,
      createdAt: asset.creationTime ?? 0,
      filename: asset.filename ?? 'Photo',
      estimatedBytes: estimateBytes(width, height),
    };
  });

  const now = Date.now();
  const oldThreshold = now - 365 * 24 * 60 * 60 * 1000;
  const measurable = photos.filter(photo => photo.width > 0 && photo.height > 0);
  const large = [...measurable]
    .sort((a, b) => b.estimatedBytes - a.estimatedBytes)
    .slice(0, Math.min(300, measurable.length));
  const old = photos.filter(photo => photo.createdAt > 0 && photo.createdAt < oldThreshold);
  const similarGroups = buildSimilarGroups(
    photos.filter(photo => photo.createdAt > 0 && photo.width > 0 && photo.height > 0),
  );

  return {
    photos,
    large,
    old,
    similarGroups,
    estimatedLibraryBytes: photos.reduce((sum, photo) => sum + photo.estimatedBytes, 0),
    scannedAt: now,
    truncated: metadata.length >= MAX_SCAN,
  };
}
