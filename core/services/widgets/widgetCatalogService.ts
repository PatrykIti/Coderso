import type {
  WidgetAudience,
  WidgetComplexity,
  WidgetDefinition,
  WidgetPreset,
} from "../../widgets/types";
import { listWidgetsForSurface, validateModulePackMatrix } from "../../widgets/registry";
import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";

// Reusable templates moved to the Page Templates surface (page-templates
// routes + admin UI); the widget catalog is core-widget-only.
export type WidgetCatalogSource = "core";

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

export function buildWidgetCatalog(coreWidgets: WidgetDefinition[]): WidgetCatalogItem[] {
  return coreWidgets.map((widget) => ({
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
}

export async function listWidgetCatalog(): Promise<WidgetCatalogItem[]> {
  ensureRuntimeWidgetsRegistered();
  const coreWidgets = listWidgetsForSurface("widget-library");
  validateModulePackMatrix({ widgets: coreWidgets, strictOnly: true });
  return buildWidgetCatalog(coreWidgets);
}
