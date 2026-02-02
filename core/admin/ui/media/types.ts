export type MediaKind = "image" | "document" | "audio";

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
