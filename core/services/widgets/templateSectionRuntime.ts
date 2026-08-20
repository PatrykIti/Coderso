import type { LegacyWidgetBlock } from "../renderContracts/legacyWidgetBlock";
import { normalizeTemplateSectionTemplateId } from "../renderContracts/templateSectionContract";
import { getWidgetTemplate } from "./widgetTemplateService";

export type TemplateSectionRuntimeResolution = {
  blocks: LegacyWidgetBlock[];
  templateId?: string;
  templateName?: string;
  error?: "template_missing" | "template_unpublished" | "template_loop";
};

export async function resolveTemplateSectionRuntimeData(
  templateId: string,
  options: { preview: boolean; templateStack?: string[] }
): Promise<TemplateSectionRuntimeResolution> {
  const trimmedId = typeof templateId === "string" ? templateId.trim() : "";
  if (!trimmedId) {
    return { blocks: [] };
  }

  const normalizedId = normalizeTemplateSectionTemplateId(templateId);
  if (!normalizedId) {
    return { blocks: [], error: "template_missing" };
  }

  if (options.templateStack?.includes(normalizedId)) {
    return { blocks: [], templateId: normalizedId, error: "template_loop" };
  }

  const template = await getWidgetTemplate(normalizedId);
  if (!template) {
    return { blocks: [], templateId: normalizedId, error: "template_missing" };
  }

  if (!options.preview && template.status !== "published") {
    return { blocks: [], templateId: normalizedId, error: "template_unpublished" };
  }

  const blocks = Array.isArray(template.blocks) ? template.blocks : [];
  return { blocks, templateId: normalizedId, templateName: template.name ?? undefined };
}
