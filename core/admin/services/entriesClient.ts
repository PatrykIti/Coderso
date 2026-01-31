import { apiRequest } from "./apiClient";

export type EntryStatus = "draft" | "published";

export type EntryAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type EntrySummary = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: EntryStatus;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  author?: EntryAuthor | null;
};

export type EntryDetail = EntrySummary;

export type EntryPayload = {
  title: string;
  slug: string;
  data: Record<string, unknown>;
};

export type PreviewResponse = {
  token: string;
  previewUrl: string;
  expiresAt: string;
};

export async function listEntries(typeSlug: string) {
  return apiRequest<EntrySummary[]>(`/content/${typeSlug}/entries`, {
    method: "GET",
  });
}

export async function getEntry(typeSlug: string, id: string) {
  return apiRequest<EntryDetail>(`/content/${typeSlug}/entries/${id}`, {
    method: "GET",
  });
}

export async function createEntry(typeSlug: string, payload: EntryPayload) {
  return apiRequest<EntryDetail>(
    `/content/${typeSlug}/entries`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateEntry(
  typeSlug: string,
  id: string,
  payload: Partial<EntryPayload>
) {
  return apiRequest<EntryDetail>(
    `/content/${typeSlug}/entries/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function previewEntry(
  typeSlug: string,
  id: string,
  ttlMinutes?: number
) {
  return apiRequest<PreviewResponse>(
    `/content/${typeSlug}/entries/${id}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttlMinutes }),
    },
    { withCsrf: true }
  );
}

export async function publishEntry(typeSlug: string, id: string) {
  return apiRequest<{ ok: boolean }>(
    `/content/${typeSlug}/entries/${id}/publish`,
    { method: "POST" },
    { withCsrf: true }
  );
}

export async function unpublishEntry(typeSlug: string, id: string) {
  return apiRequest<{ ok: boolean }>(
    `/content/${typeSlug}/entries/${id}/unpublish`,
    { method: "POST" },
    { withCsrf: true }
  );
}
