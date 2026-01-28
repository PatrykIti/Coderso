import { apiRequest } from "./apiClient";

export type MediaRecord = {
  id: string;
  key: string;
  url: string;
  type: "image" | "file";
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  createdAt: string;
  createdBy?: string | null;
};

export type MediaUploadResponse = {
  id: string;
  url: string;
  key: string;
};

export type MediaUpdatePayload = {
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
};

export async function listMedia() {
  return apiRequest<MediaRecord[]>("/media", { method: "GET" });
}

export async function uploadMedia(file: File, meta?: MediaUpdatePayload) {
  const formData = new FormData();
  formData.set("file", file);
  if (meta?.alt) formData.set("alt", meta.alt);
  if (meta?.title) formData.set("title", meta.title);
  if (meta?.caption) formData.set("caption", meta.caption);

  return apiRequest<MediaUploadResponse>(
    "/media",
    {
      method: "POST",
      body: formData,
    },
    { withCsrf: true }
  );
}

export async function updateMedia(id: string, payload: MediaUpdatePayload) {
  return apiRequest<MediaRecord>(
    `/media/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function deleteMedia(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/media/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
    { withCsrf: true }
  );
}
