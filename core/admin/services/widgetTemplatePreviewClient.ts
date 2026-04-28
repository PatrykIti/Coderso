import { apiRequest } from "./apiClient";

export type WidgetTemplatePreviewDevice = "desktop" | "tablet" | "mobile";

export type WidgetTemplatePreviewRequest = {
  ttlMinutes?: number;
  device?: WidgetTemplatePreviewDevice;
  viewport?: { width: number; height: number };
};

export type WidgetTemplatePreviewResponse = {
  token: string;
  previewUrl: string;
  expiresAt: string;
  blocksCount: number;
};

export async function previewWidgetTemplate(
  id: string,
  payload: WidgetTemplatePreviewRequest = {}
) {
  return apiRequest<WidgetTemplatePreviewResponse>(
    `/widget-templates/${encodeURIComponent(id)}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}
