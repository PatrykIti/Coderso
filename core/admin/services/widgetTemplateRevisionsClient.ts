import { apiRequest } from "./apiClient";
import type { WidgetTemplateSettings } from "../../services/widgets/widgetTemplateSettings";

export type WidgetTemplateRevision = {
  id: string;
  templateId: string;
  version: number;
  name: string;
  description: string | null;
  category: string;
  status: "draft" | "published";
  blocks: Array<Record<string, unknown>>;
  settings: WidgetTemplateSettings;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string } | null;
};

export async function listWidgetTemplateRevisions(templateId: string) {
  return apiRequest<{ items: WidgetTemplateRevision[] }>(
    `/widget-templates/${encodeURIComponent(templateId)}/revisions`,
    { method: "GET" }
  );
}

export async function restoreWidgetTemplateRevision(
  templateId: string,
  revisionId: string
) {
  return apiRequest<{ ok: boolean }>(
    `/widget-templates/${encodeURIComponent(templateId)}/revisions/${encodeURIComponent(
      revisionId
    )}/restore`,
    { method: "POST" },
    { withCsrf: true }
  );
}
