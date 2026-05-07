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
  gatedReason?: string;
};

const aliasConfig: Record<BlueprintPageSectionAlias, AliasConfig> = {
  hero: {
    label: "Hero",
    slot: "hero",
  },
  "listing-filters": {
    label: "Listing Filters",
    slot: "before-listing",
  },
  "content-list": {
    label: "Content List",
    slot: "listing",
  },
  cta: {
    label: "CTA",
    slot: "after-listing",
  },
  "form-embed": {
    label: "Form Embed",
    slot: "after-listing",
  },
  testimonials: {
    label: "Testimonials",
    slot: "after-listing",
  },
  contact: {
    label: "Contact",
    slot: "footer",
  },
  faq: {
    label: "FAQ",
    slot: "after-listing",
  },
  "posts-feed": {
    label: "Posts Feed",
    slot: "listing",
  },
  steps: {
    label: "Steps",
    slot: "after-listing",
    gatedReason:
      "No deterministic steps widget or section-preset mapping exists in the current widget registry or module pack metadata.",
  },
};

const clonePackEvidence = (
  pack: ModuleWidgetPackDefinition,
  mapping: NonNullable<ModuleWidgetPackDefinition["assistantPageSections"]>[number]
): BlueprintPageSectionPackEvidence => ({
  module: pack.module,
  label: pack.label,
  enforcement: pack.enforcement,
  pagePresets: [...(mapping.pagePresets ?? [])],
  sectionPresets: [...(mapping.sectionPresets ?? [])],
  widgetType: mapping.widgetType,
  ...(pack.notes ? { notes: pack.notes } : {}),
});

const toGated = (
  alias: BlueprintPageSectionAlias,
  config: AliasConfig,
  reason: string,
  options?: {
    widgetType?: string;
    expectedModule?: string;
  }
): BlueprintGatedPageSectionLibraryEntry => ({
  status: "gated",
  alias,
  label: config.label,
  slot: config.slot,
  reason,
  ...(options?.widgetType ? { widgetType: options.widgetType } : {}),
  ...(options?.expectedModule ? { expectedModule: options.expectedModule } : {}),
});

const rawMediaValuePattern = /^(?:data:|blob:|file:|https?:\/\/)/i;
const mediaLikeKeyPattern = /(src|image|images|media|asset|video|gallery|url)$/i;

const assertTrustedMediaSectionData = (value: unknown, keyPath: string[] = []) => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertTrustedMediaSectionData(entry, [...keyPath, String(index)])
    );
    return;
  }
  if (!value || typeof value !== "object") {
    if (
      typeof value === "string" &&
      rawMediaValuePattern.test(value) &&
      keyPath.some((segment) => mediaLikeKeyPattern.test(segment))
    ) {
      throw new Error("assistant_blueprint_page_section_media_untrusted");
    }
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    assertTrustedMediaSectionData(nested, [...keyPath, key]);
  }
};

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
  const packWithMapping = packs.find((pack) =>
    (pack.assistantPageSections ?? []).some((entry) => entry.alias === alias)
  );
  const mapping = packWithMapping?.assistantPageSections?.find((entry) => entry.alias === alias);
  if (!packWithMapping || !mapping) {
    return toGated(
      alias,
      config,
      "No deterministic module-pack mapping exists for this page section alias."
    );
  }
  const widget = widgets.find((entry) => entry.type === mapping.widgetType);
  if (!widget) {
    return toGated(
      alias,
      config,
      `Widget "${mapping.widgetType}" is not registered for the page-builder surface.`,
      {
        widgetType: mapping.widgetType,
        expectedModule: packWithMapping.module,
      }
    );
  }
  if (!widget.surfaces?.includes("page-builder")) {
    return toGated(
      alias,
      config,
      `Widget "${widget.type}" is not available on the page-builder surface.`,
      {
        widgetType: widget.type,
        expectedModule: packWithMapping.module,
      }
    );
  }
  if (widget.complexity !== "composite") {
    return toGated(
      alias,
      config,
      `Widget "${widget.type}" is not classified as a composite page section.`,
      {
        widgetType: widget.type,
        expectedModule: packWithMapping.module,
      }
    );
  }
  if (!packWithMapping.compositeWidgets.includes(widget.type)) {
    return toGated(
      alias,
      config,
      `Module pack "${packWithMapping.module}" does not expose widget "${widget.type}" as a tracked composite section.`,
      {
        widgetType: widget.type,
        expectedModule: packWithMapping.module,
      }
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
    pack: clonePackEvidence(packWithMapping, mapping),
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
  assertTrustedMediaSectionData(input?.data);

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
