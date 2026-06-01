import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys } from "@/services/cachePolicy";
import { seoAuditCheckIds, type SeoAuditCheckId } from "../../services/seo/seoTypes";

export { seoAuditCheckIds, type SeoAuditCheckId };

export type SeoIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

export type SeoDocumentItem = {
  id: string;
  targetType: "page" | "entry";
  targetId: string;
  targetTitle: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  score: number | null;
  status: "ok" | "warning" | "issue";
  issues: SeoIssue[];
  lastAuditAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SeoAuditPayload = {
  targetType?: "page" | "entry";
  targetId?: string;
  checks?: SeoAuditCheckId[];
};

export async function listSeo() {
  return apiRequest<SeoDocumentItem[]>("/seo", { method: "GET" });
}

export async function getSeo(id: string) {
  return apiRequest<SeoDocumentItem>(`/seo/${id}`, { method: "GET" });
}

export async function updateSeo(
  id: string,
  payload: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
    robots?: string;
  }
) {
  const updated = await apiRequest<SeoDocumentItem>(
    `/seo/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  broadcastCacheEvent({ key: cacheKeys.seoList, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.seoDetail(updated.id), action: "update" });
  return updated;
}

export async function runSeoAudit(payload: SeoAuditPayload = {}) {
  const result = await apiRequest<{ audited: number }>(
    "/seo/audit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  broadcastCacheEvent({ key: cacheKeys.seoList, action: "invalidate" });
  return result;
}

export const clearSeoCache = () => undefined;
