import { buildMediaDeliveryPath } from "./mediaFileTrust";

export type MediaKeyProjection =
  | Readonly<{ addressable: true; url: string }>
  | Readonly<{ addressable: false; url: string }>;

export function tryBuildAddressableMediaPath(key: string): string | null {
  try {
    return buildMediaDeliveryPath(key);
  } catch {
    return null;
  }
}

export function resolveMediaKeyProjection(input: { id: string; key: string }): MediaKeyProjection {
  const url = tryBuildAddressableMediaPath(input.key);
  if (url !== null) {
    return { addressable: true, url };
  }
  return {
    addressable: false,
    url: `/media/%00unavailable/${encodeURIComponent(input.id)}`,
  };
}
