import { apiRequest } from "./apiClient";

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
  return apiRequest<SeoDocumentItem>(
    `/seo/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function runSeoAudit(payload: SeoAuditPayload = {}) {
  return apiRequest<{ audited: number }>(
    "/seo/audit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}
