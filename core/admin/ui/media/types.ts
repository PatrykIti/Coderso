export type MediaKind = "image" | "document" | "audio" | "video";

export type MediaItem = {
  id: string;
  name: string;
  originalName?: string | null;
  type: MediaKind;
  sizeBytes: number;
  url: string;
  mimeType: string;
  createdAt: string;
  width?: number | null;
  height?: number | null;
  title?: string | null;
  alt?: string | null;
  caption?: string | null;
};

export type MediaMetaUpdate = {
  title?: string | null;
  alt?: string | null;
  caption?: string | null;
};

export type MediaUsageItem = {
  id: string;
  type: "page" | "entry" | "post" | "commerce";
  title: string;
  context: string;
  targetId: string;
  targetSlug?: string | null;
  adminHref: string;
};
