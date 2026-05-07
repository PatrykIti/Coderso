import {
  listWidgetPackMatrix,
  type ModuleWidgetPackDefinition,
} from "../../../widgets/modulePackMatrix";
import { getWidget, listWidgetsForSurface } from "../../../widgets/registry";
import { ensureRuntimeWidgetsRegistered } from "../../../widgets/runtime";
import type { WidgetBlock, WidgetDefinition } from "../../../widgets/types";
import { normalizeWidgetBlock } from "../../../widgets/validator";
import {
  blueprintPageSectionAliases,
  type BlueprintGatedPageSectionLibraryEntry,
  type BlueprintPageSectionAlias,
  type BlueprintPageSectionLibraryEntry,
  type BlueprintPageSectionPackEvidence,
  type BlueprintPageSectionSeedInput,
  type BlueprintReadyPageSectionLibraryEntry,
} from "./blueprintPageSectionTypes";

type AliasConfig = {
  label: string;
  slot: BlueprintReadyPageSectionLibraryEntry["slot"];
  widgetType?: string;
  module?: string;
  gatedReason?: string;
};

const aliasConfig: Record<BlueprintPageSectionAlias, AliasConfig> = {
  hero: {
    label: "Hero",
    slot: "hero",
    widgetType: "hero",
    module: "content",
  },
  "listing-filters": {
    label: "Listing Filters",
    slot: "before-listing",
    widgetType: "listing-filters",
    module: "listings",
  },
  "content-list": {
    label: "Content List",
    slot: "listing",
    widgetType: "content-list",
    module: "listings",
  },
  cta: {
    label: "CTA",
    slot: "after-listing",
    widgetType: "cta-banner",
    module: "content",
  },
  "form-embed": {
    label: "Form Embed",
    slot: "after-listing",
    widgetType: "form-embed",
    module: "forms",
  },
  testimonials: {
    label: "Testimonials",
    slot: "after-listing",
    widgetType: "testimonials",
    module: "engagement",
  },
  contact: {
    label: "Contact",
    slot: "footer",
    widgetType: "contact",
    module: "forms",
  },
  faq: {
    label: "FAQ",
    slot: "after-listing",
    widgetType: "faq-accordion",
    module: "engagement",
  },
  "posts-feed": {
    label: "Posts Feed",
    slot: "listing",
    widgetType: "posts-feed",
    module: "listings",
  },
  steps: {
    label: "Steps",
    slot: "after-listing",
    module: "content",
    gatedReason:
      "No deterministic steps widget or section-preset mapping exists in the current widget registry or module pack metadata.",
  },
};

const clonePackEvidence = (pack: ModuleWidgetPackDefinition): BlueprintPageSectionPackEvidence => ({
  module: pack.module,
  label: pack.label,
  enforcement: pack.enforcement,
  pagePresets: [...pack.pagePresets],
  sectionPresets: [...pack.sectionPresets],
  compositeWidgets: [...pack.compositeWidgets],
  ...(pack.notes ? { notes: pack.notes } : {}),
});

const toGated = (
  alias: BlueprintPageSectionAlias,
  config: AliasConfig,
  reason: string
): BlueprintGatedPageSectionLibraryEntry => ({
  status: "gated",
  alias,
  label: config.label,
  slot: config.slot,
  reason,
  ...(config.widgetType ? { widgetType: config.widgetType } : {}),
  ...(config.module ? { expectedModule: config.module } : {}),
});

const resolveSources = (options?: {
  widgets?: WidgetDefinition[];
  packs?: ModuleWidgetPackDefinition[];
}) => {
  if (!options?.widgets || !options?.packs) {
    ensureRuntimeWidgetsRegistered();
  }

  return {
    widgets: options?.widgets ?? listWidgetsForSurface("page-builder"),
    packs: options?.packs ?? listWidgetPackMatrix(),
  };
};

export const resolveBlueprintPageSectionAlias = (
  alias: BlueprintPageSectionAlias,
  options?: {
    widgets?: WidgetDefinition[];
    packs?: ModuleWidgetPackDefinition[];
  }
): BlueprintPageSectionLibraryEntry => {
  const config = aliasConfig[alias];
  if (config.gatedReason) {
    return toGated(alias, config, config.gatedReason);
  }

  const { widgets, packs } = resolveSources(options);
  const widget = widgets.find((entry) => entry.type === config.widgetType);
  if (!widget || !config.widgetType) {
    return toGated(
      alias,
      config,
      `Widget "${config.widgetType ?? "unknown"}" is not registered for the page-builder surface.`
    );
  }
  if (!widget.surfaces?.includes("page-builder")) {
    return toGated(
      alias,
      config,
      `Widget "${widget.type}" is not available on the page-builder surface.`
    );
  }
  if (widget.complexity !== "composite") {
    return toGated(
      alias,
      config,
      `Widget "${widget.type}" is not classified as a composite page section.`
    );
  }

  const pack = packs.find((entry) => entry.module === config.module);
  if (!pack) {
    return toGated(
      alias,
      config,
      `Module pack "${config.module ?? "unknown"}" is not declared in the widget pack matrix.`
    );
  }
  if (!pack.compositeWidgets.includes(widget.type)) {
    return toGated(
      alias,
      config,
      `Module pack "${pack.module}" does not expose widget "${widget.type}" as a tracked composite section.`
    );
  }

  return {
    status: "ready",
    alias,
    label: config.label,
    slot: config.slot,
    widgetType: widget.type,
    defaultVariant: widget.variants[0]!.id,
    widgetComplexity: widget.complexity!,
    widgetAudience: widget.audience!,
    widgetModule: widget.module!,
    requires: [...(widget.requires ?? [])],
    surfaces: [...(widget.surfaces ?? [])],
    presets: [...(widget.presets ?? [])],
    pack: clonePackEvidence(pack),
  };
};

export const listBlueprintPageSectionLibrary = (options?: {
  widgets?: WidgetDefinition[];
  packs?: ModuleWidgetPackDefinition[];
}): BlueprintPageSectionLibraryEntry[] =>
  blueprintPageSectionAliases.map((alias) => resolveBlueprintPageSectionAlias(alias, options));

export const buildBlueprintPageSectionSeed = (
  alias: BlueprintPageSectionAlias,
  input?: BlueprintPageSectionSeedInput,
  options?: {
    widgets?: WidgetDefinition[];
    packs?: ModuleWidgetPackDefinition[];
  }
): WidgetBlock => {
  const resolution = resolveBlueprintPageSectionAlias(alias, options);
  if (resolution.status !== "ready") {
    throw new Error(`assistant_blueprint_page_section_unavailable:${alias}`);
  }

  const widget = getWidget(resolution.widgetType);
  if (!widget) {
    throw new Error(`assistant_blueprint_page_section_widget_missing:${resolution.widgetType}`);
  }

  return normalizeWidgetBlock({
    id: input?.id ?? `section-${alias}`,
    type: widget.type,
    variant: input?.variant ?? resolution.defaultVariant,
    data: input?.data ?? {},
    ...(input?.slots ? { slots: input.slots } : {}),
    ...(input?.layout ? { layout: input.layout } : {}),
    ...(input?.visibility ? { visibility: input.visibility } : {}),
    ...(input?.editor ? { editor: input.editor } : {}),
  });
};
