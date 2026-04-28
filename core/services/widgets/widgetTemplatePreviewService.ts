import type { WidgetBlock } from "../../widgets/types";
import { getWidgetTemplate } from "./widgetTemplateService";
import {
  normalizeWidgetTemplateSettings,
  type WidgetTemplateSettings,
} from "./widgetTemplateSettings";

export type WidgetTemplatePreviewModel = {
  id: string;
  name: string;
  description: string | null;
  blocks: WidgetBlock[];
  settings: WidgetTemplateSettings;
  blocksCount: number;
};

export async function getWidgetTemplatePreviewModel(
  templateId: string
): Promise<WidgetTemplatePreviewModel> {
  const template = await getWidgetTemplate(templateId);
  if (!template) throw new Error("widget_template_not_found");

  const blocks = Array.isArray(template.blocks)
    ? (template.blocks as WidgetBlock[])
    : [];
  const settings = normalizeWidgetTemplateSettings(template.settings);

  return {
    id: template.id,
    name: template.name ?? "Template preview",
    description: template.description ?? null,
    blocks,
    settings,
    blocksCount: blocks.length,
  };
}
