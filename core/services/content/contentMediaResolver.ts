export type ContentMediaCandidate = {
  url?: string;
  mediaId?: string;
  alt?: string;
};

export type ResolvedContentMedia = {
  url: string;
  alt?: string;
};

export type ContentMediaCache = Map<string, ResolvedContentMedia | null>;
export type ContentMediaLookup = {
  id: string;
  url?: string | null;
  alt?: string | null;
  title?: string | null;
} | null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isLikelyUrl = (value: string) =>
  /^https?:\/\//i.test(value) || value.startsWith("/") || value.startsWith("data:image/");

const trimToOptional = (value: string | undefined) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const readMediaCandidate = (value: unknown): ContentMediaCandidate | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return isLikelyUrl(trimmed) ? { url: trimmed } : { mediaId: trimmed };
  }
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const resolved = readMediaCandidate(candidate);
      if (resolved) return resolved;
    }
    return null;
  }
  if (!isRecord(value)) return null;

  const urlCandidate =
    typeof value.url === "string"
      ? trimToOptional(value.url)
      : typeof value.src === "string"
        ? trimToOptional(value.src)
        : undefined;
  const mediaId =
    typeof value.id === "string"
      ? trimToOptional(value.id)
      : typeof value.assetId === "string"
        ? trimToOptional(value.assetId)
        : undefined;
  const alt =
    typeof value.alt === "string"
      ? trimToOptional(value.alt)
      : typeof value.title === "string"
        ? trimToOptional(value.title)
        : undefined;

  if (urlCandidate && isLikelyUrl(urlCandidate)) {
    return { url: urlCandidate, mediaId, alt };
  }
  if (mediaId) {
    return { mediaId, alt };
  }
  return null;
};

export async function resolveContentItemImage(
  candidate: ContentMediaCandidate | null,
  cache: ContentMediaCache,
  deps: {
    getMediaById?: (id: string) => Promise<ContentMediaLookup>;
  } = {}
) {
  if (!candidate) {
    return { src: undefined as string | undefined, alt: undefined as string | undefined };
  }
  if (candidate.url) {
    return { src: candidate.url, alt: candidate.alt };
  }
  const mediaId = candidate.mediaId;
  if (!mediaId) {
    return { src: undefined as string | undefined, alt: candidate.alt };
  }
  if (!deps.getMediaById) {
    return { src: undefined as string | undefined, alt: candidate.alt };
  }

  if (cache.has(mediaId)) {
    const cached = cache.get(mediaId);
    return {
      src: cached?.url,
      alt: candidate.alt ?? cached?.alt,
    };
  }

  try {
    const media = await deps.getMediaById(mediaId);
    if (!media?.url) {
      cache.set(mediaId, null);
      return { src: undefined as string | undefined, alt: candidate.alt };
    }
    cache.set(mediaId, {
      url: media.url,
      alt: media.alt ?? media.title ?? undefined,
    });
    return {
      src: media.url,
      alt: candidate.alt ?? media.alt ?? media.title ?? undefined,
    };
  } catch {
    cache.set(mediaId, null);
    return { src: undefined as string | undefined, alt: candidate.alt };
  }
}
