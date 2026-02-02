import { apiRequest } from "./apiClient";

export type WidgetTemplateCategory = {
  id: string;
  name: string;
};

export async function listWidgetTemplateCategories() {
  return apiRequest<{ items: WidgetTemplateCategory[] }>(
    "/widget-template-categories",
    { method: "GET" }
  );
}

export async function createWidgetTemplateCategory(payload: { name: string }) {
  return apiRequest<WidgetTemplateCategory>(
    "/widget-template-categories",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateWidgetTemplateCategory(
  id: string,
  payload: { name: string }
) {
  return apiRequest<WidgetTemplateCategory>(
    `/widget-template-categories/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function deleteWidgetTemplateCategory(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/widget-template-categories/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}
