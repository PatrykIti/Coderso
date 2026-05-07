import type {
  WidgetAudience,
  WidgetBlock,
  WidgetComplexity,
  WidgetPreset,
  WidgetSurface,
} from "../../../widgets/types";
import type { WidgetPackEnforcement } from "../../../widgets/modulePackMatrix";

export const blueprintPageSectionSlots = [
  "hero",
  "before-listing",
  "listing",
  "after-listing",
  "footer",
] as const;

export type BlueprintPageSectionSlot = (typeof blueprintPageSectionSlots)[number];

export const blueprintPageSectionAliases = [
  "hero",
  "listing-filters",
  "content-list",
  "cta",
  "form-embed",
  "testimonials",
  "contact",
  "faq",
  "posts-feed",
  "steps",
] as const;

export type BlueprintPageSectionAlias = (typeof blueprintPageSectionAliases)[number];

export type BlueprintPageSectionPackEvidence = {
  module: string;
  label: string;
  enforcement: WidgetPackEnforcement;
  pagePresets: string[];
  sectionPresets: string[];
  compositeWidgets: string[];
  notes?: string;
};

export type BlueprintReadyPageSectionLibraryEntry = {
  status: "ready";
  alias: BlueprintPageSectionAlias;
  label: string;
  slot: BlueprintPageSectionSlot;
  widgetType: string;
  defaultVariant: string;
  widgetComplexity: WidgetComplexity;
  widgetAudience: WidgetAudience;
  widgetModule: string;
  requires: string[];
  surfaces: WidgetSurface[];
  presets: WidgetPreset[];
  pack: BlueprintPageSectionPackEvidence;
};

export type BlueprintGatedPageSectionLibraryEntry = {
  status: "gated";
  alias: BlueprintPageSectionAlias;
  label: string;
  slot: BlueprintPageSectionSlot;
  reason: string;
  widgetType?: string | null;
  expectedModule?: string | null;
};

export type BlueprintPageSectionLibraryEntry =
  | BlueprintReadyPageSectionLibraryEntry
  | BlueprintGatedPageSectionLibraryEntry;

export type BlueprintPageSectionSeedInput = {
  id?: string;
  variant?: string;
  data?: Record<string, unknown>;
  slots?: WidgetBlock["slots"];
  layout?: WidgetBlock["layout"];
  visibility?: WidgetBlock["visibility"];
  editor?: WidgetBlock["editor"];
};
