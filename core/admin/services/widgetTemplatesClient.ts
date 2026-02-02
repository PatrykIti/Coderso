import { apiRequest } from "./apiClient";

export type WidgetTemplateStatus = "draft" | "published";
export type WidgetTemplateCategory = string;

export type WidgetTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: WidgetTemplateCategory;
  status: WidgetTemplateStatus;
  blocks: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
};

export type WidgetTemplateCreate = {
  name: string;
  description?: string | null;
  category: WidgetTemplateCategory;
  status?: WidgetTemplateStatus;
  blocks?: Array<Record<string, unknown>>;
};

export type WidgetTemplateUpdate = {
  name?: string;
  description?: string | null;
  category?: WidgetTemplateCategory;
  status?: WidgetTemplateStatus;
  blocks?: Array<Record<string, unknown>>;
};

export async function listWidgetTemplates() {
  return apiRequest<{ items: WidgetTemplate[] }>("/widget-templates", {
    method: "GET",
  });
}

export async function getWidgetTemplate(id: string) {
  return apiRequest<WidgetTemplate>(
    `/widget-templates/${encodeURIComponent(id)}`,
    { method: "GET" }
  );
}

export async function createWidgetTemplate(payload: WidgetTemplateCreate) {
  return apiRequest<WidgetTemplate>(
    "/widget-templates",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateWidgetTemplate(
  id: string,
  payload: WidgetTemplateUpdate
) {
  return apiRequest<WidgetTemplate>(
    `/widget-templates/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function deleteWidgetTemplate(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/widget-templates/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}
