import type {
  WidgetAudience,
  WidgetComplexity,
  WidgetDefinition,
  WidgetPreset,
} from "../../widgets/types";
import { listWidgetsForSurface, validateModulePackMatrix } from "../../widgets/registry";
import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import { listWidgetTemplates, type WidgetTemplateRecord } from "./widgetTemplateService";

export type WidgetCatalogSource = "core" | "template";

export type WidgetCatalogItem = {
  id: string;
  source: WidgetCatalogSource;
  name: string;
  description: string | null;
  category: string;
  variants: string[];
  complexity: WidgetComplexity;
  audience: WidgetAudience;
  module: string;
  presets: WidgetPreset[];
  requires: string[];
  status: "draft" | "published";
};

export function buildWidgetCatalog(
  coreWidgets: WidgetDefinition[],
  templates: WidgetTemplateRecord[]
): WidgetCatalogItem[] {
  const coreItems = coreWidgets.map((widget) => ({
    id: widget.type,
    source: "core" as const,
    name: widget.title,
      description: widget.description ?? null,
      category: widget.category,
      variants: widget.variants.map((variant) => variant.id),
      complexity: widget.complexity ?? "composite",
      audience: widget.audience ?? "beginner",
      module: widget.module ?? "general",
      presets: widget.presets ?? [],
      requires: widget.requires ?? [],
      status: "published" as const,
    }));

  const templateItems = templates.map((template) => ({
    id: template.id,
    source: "template" as const,
    name: template.name,
    description: template.description ?? null,
    category: template.category,
    variants: ["default"],
    complexity: "composite" as const,
    audience: "beginner" as const,
    module: "templates",
    presets: [],
    requires: [],
    status: template.status as "draft" | "published",
  }));

  return [...coreItems, ...templateItems];
}

export async function listWidgetCatalog(): Promise<WidgetCatalogItem[]> {
  ensureRuntimeWidgetsRegistered();
  const coreWidgets = listWidgetsForSurface("widget-library");
  validateModulePackMatrix({ widgets: coreWidgets, strictOnly: true });
  const templates = await listWidgetTemplates();
  return buildWidgetCatalog(coreWidgets, templates);
}
