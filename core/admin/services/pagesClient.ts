import { apiRequest } from "./apiClient";

export type PageStatus = "draft" | "published" | "scheduled" | "archived";

export type PageAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type PageSummary = {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  updatedAt: string;
  author: PageAuthor | null;
};

export type PageDetail = {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  currentData: Record<string, unknown>;
  publishedData?: Record<string, unknown> | null;
  updatedAt: string;
  publishedAt?: string | null;
  authorId?: string | null;
  author?: PageAuthor | null;
};

export type PagePayload = {
  title: string;
  slug: string;
  template?: string;
  data: Record<string, unknown>;
};

export type PreviewResponse = {
  token: string;
  previewUrl: string;
  expiresAt: string;
};

export async function listPages() {
  return apiRequest<PageSummary[]>("/pages", { method: "GET" });
}

export async function getPage(id: string) {
  return apiRequest<PageDetail>(`/pages/${id}`, { method: "GET" });
}

export async function createPage(payload: PagePayload) {
  return apiRequest<PageDetail>("/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, { withCsrf: true });
}

export async function updatePage(id: string, payload: Partial<PagePayload>) {
  return apiRequest<PageDetail>(`/pages/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, { withCsrf: true });
}

export async function publishPage(id: string) {
  return apiRequest<{ ok: boolean }>(`/pages/${id}/publish`, {
    method: "POST",
  }, { withCsrf: true });
}

export async function unpublishPage(id: string) {
  return apiRequest<{ ok: boolean }>(`/pages/${id}/unpublish`, {
    method: "POST",
  }, { withCsrf: true });
}

export async function previewPage(id: string, ttlMinutes?: number) {
  return apiRequest<PreviewResponse>(`/pages/${id}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ttlMinutes }),
  }, { withCsrf: true });
}

export async function duplicatePage(id: string) {
  return apiRequest<PageDetail>(`/pages/${id}/duplicate`, {
    method: "POST",
  }, { withCsrf: true });
}

export async function deletePage(id: string) {
  return apiRequest<{ ok: boolean }>(`/pages/${id}`, {
    method: "DELETE",
  }, { withCsrf: true });
}
