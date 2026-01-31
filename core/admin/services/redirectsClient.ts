import { apiRequest } from "./apiClient";

export type RedirectStatusCode = 301 | 302 | 307 | 308;

export type RedirectItem = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: RedirectStatusCode;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RedirectCreateInput = {
  fromPath: string;
  toPath: string;
  statusCode: RedirectStatusCode;
  enabled?: boolean;
};

export type RedirectUpdateInput = Partial<RedirectCreateInput>;

export async function listRedirects() {
  return apiRequest<RedirectItem[]>("/redirects", { method: "GET" });
}

export async function createRedirect(payload: RedirectCreateInput) {
  return apiRequest<RedirectItem>(
    "/redirects",
    {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
}

export async function updateRedirect(id: string, payload: RedirectUpdateInput) {
  return apiRequest<RedirectItem>(
    `/redirects/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
}

export async function deleteRedirect(id: string) {
  return apiRequest<{ ok: true }>(
    `/redirects/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}
