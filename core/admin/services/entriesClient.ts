import { apiRequest } from "./apiClient";

export type EntryStatus = "draft" | "published" | "scheduled" | "archived";

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
  tags?: string[];
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  author?: EntryAuthor | null;
  seo?: EntrySeo | null;
};

export type EntryDetail = EntrySummary;

export type EntrySeo = {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export type EntryPayload = {
  title: string;
  slug: string;
  data: Record<string, unknown>;
};

export type EntryMetadataPayload = {
  status?: EntryStatus;
  scheduledAt?: string | null;
  tags?: string[];
  seo?: EntrySeo;
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

export async function updateEntryMetadata(
  typeSlug: string,
  id: string,
  payload: EntryMetadataPayload
) {
  return apiRequest<EntryDetail>(
    `/content/${typeSlug}/entries/${id}/metadata`,
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

export async function deleteEntry(typeSlug: string, id: string) {
  return apiRequest<{ ok: boolean }>(
    `/content/${typeSlug}/entries/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}
