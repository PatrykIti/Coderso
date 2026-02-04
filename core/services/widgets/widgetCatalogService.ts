import type { WidgetDefinition } from "../../widgets/types";
import { listWidgets } from "../../widgets/registry";
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
    status: "published" as const,
  }));

  const templateItems = templates.map((template) => ({
    id: template.id,
    source: "template" as const,
    name: template.name,
    description: template.description ?? null,
    category: template.category,
    variants: ["default"],
    status: template.status as "draft" | "published",
  }));

  return [...coreItems, ...templateItems];
}

export async function listWidgetCatalog(): Promise<WidgetCatalogItem[]> {
  ensureRuntimeWidgetsRegistered();
  const coreWidgets = listWidgets();
  const templates = await listWidgetTemplates();
  return buildWidgetCatalog(coreWidgets, templates);
}
