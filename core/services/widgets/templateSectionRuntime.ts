import type { WidgetBlock } from "../../widgets/types";
import { getWidgetTemplate } from "./widgetTemplateService";

export type TemplateSectionRuntimeResolution = {
  blocks: WidgetBlock[];
  templateName?: string;
  error?: "template_missing" | "template_unpublished" | "template_loop";
};

const ensureId = (value: string) => value.trim();

export async function resolveTemplateSectionRuntimeData(
  templateId: string,
  options: { preview: boolean; templateStack?: string[] }
): Promise<TemplateSectionRuntimeResolution> {
  const normalizedId = ensureId(templateId);
  if (!normalizedId) {
    return { blocks: [] };
  }

  if (options.templateStack?.includes(normalizedId)) {
    return { blocks: [], error: "template_loop" };
  }

  const template = await getWidgetTemplate(normalizedId);
  if (!template) {
    return { blocks: [], error: "template_missing" };
  }

  if (!options.preview && template.status !== "published") {
    return { blocks: [], error: "template_unpublished" };
  }

  const blocks = Array.isArray(template.blocks) ? template.blocks : [];
  return { blocks, templateName: template.name ?? undefined };
}
