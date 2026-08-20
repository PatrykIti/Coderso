import type { LegacyWidgetBlock } from "../renderContracts/legacyWidgetBlock";

export const customScreenBindingModes = ["read", "write", "readwrite"] as const;

export const customScreenStatusValues = ["draft", "active"] as const;

export const customScreenCollectionRoleValues = [
  "canonical-admin-screen",
  "secondary-admin-screen",
] as const;

export const customScreenRowClickModes = ["editor-view", "classic-editor"] as const;

export const customScreenCreateModes = ["editor-view", "drawer"] as const;

export const customScreenListColumnSources = ["system", "field"] as const;

export const customScreenListFormatters = [
  "text",
  "number",
  "boolean",
  "date",
  "select",
  "media",
  "relation",
] as const;

export const customScreenSortDirections = ["asc", "desc"] as const;

export const customScreenListFilterOperators = ["equals"] as const;

export type CustomScreenBindingMode = (typeof customScreenBindingModes)[number];

export type CustomScreenStatus = (typeof customScreenStatusValues)[number];

export type CustomScreenCollectionRole = (typeof customScreenCollectionRoleValues)[number];

export type CustomScreenDefinitionVersion = 1 | 2 | 3 | 4;

export type CustomScreenListColumnSource = (typeof customScreenListColumnSources)[number];

export type CustomScreenListFormatter = (typeof customScreenListFormatters)[number];

export type CustomScreenSortDirection = (typeof customScreenSortDirections)[number];

export type CustomScreenListFilterOperator = (typeof customScreenListFilterOperators)[number];

export type CustomScreenBinding = {
  id: string;
  widgetId: string;
  propPath: string;
  field: string;
  mode: CustomScreenBindingMode;
};

export type ScreenFieldBinding = {
  id: string;
  blockId: string;
  propPath: string;
  source: "entry";
  field: string;
  mode: CustomScreenBindingMode;
};

export type CustomScreenDefinitionV1 = {
  schemaVersion: 1;
  blocks: LegacyWidgetBlock[];
  bindings: CustomScreenBinding[];
};

export type CustomScreenListColumn = {
  id: string;
  source: CustomScreenListColumnSource;
  field: string;
  label: string;
  formatter: CustomScreenListFormatter;
  visible: boolean;
};

export type CustomScreenListFilter = {
  id: string;
  source: CustomScreenListColumnSource;
  field: string;
  label: string;
  operator: CustomScreenListFilterOperator;
  enabled: boolean;
};

export type CustomScreenListRowTemplate = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
};

export type CustomScreenListViewDefinition = {
  columns: CustomScreenListColumn[];
  filters: CustomScreenListFilter[];
  defaultSort: {
    field: string;
    direction: CustomScreenSortDirection;
  };
  bulkActions: {
    delete: boolean;
    publish: boolean;
    unpublish: boolean;
  };
  rowTemplate?: CustomScreenListRowTemplate;
};

export type CustomScreenListViewDefinitionV2 = CustomScreenListViewDefinition & {
  rowClick: (typeof customScreenRowClickModes)[number];
  createMode: (typeof customScreenCreateModes)[number];
};

export type CustomScreenEditorViewDefinition = {
  blocks: LegacyWidgetBlock[];
  bindings: CustomScreenBinding[];
  saveMode: "entry";
  interactionMode: "inline";
};

export type ScreenBlockV1 = {
  id: string;
  type: string;
  label?: string;
  variant?: string;
  style?: ScreenBlockStyleV1;
  data: Record<string, unknown>;
  layout?: LegacyWidgetBlock["layout"];
  visibility?: LegacyWidgetBlock["visibility"];
  editor?: LegacyWidgetBlock["editor"];
  legacyWidgetType?: string;
  children?: ScreenBlockV1[];
  slots?: Record<string, ScreenBlockV1[]>;
};

export type ScreenSectionV1 = {
  id: string;
  type: "section";
  label?: string;
  data: Record<string, unknown>;
  layout?: LegacyWidgetBlock["layout"];
  visibility?: LegacyWidgetBlock["visibility"];
  style?: ScreenSectionStyleV1;
  blocks: ScreenBlockV1[];
};

export type ScreenDocumentV1 = {
  schemaVersion: 1;
  sections: ScreenSectionV1[];
};

export type CustomScreenEditorViewDefinitionV4 = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  saveMode: "entry";
  interactionMode: "inline";
};

export type CustomScreenDefinitionV2 = {
  schemaVersion: 2;
  listView: CustomScreenListViewDefinitionV2;
  editorView: {
    blocks: LegacyWidgetBlock[];
    bindings: CustomScreenBinding[];
    saveMode: "entry";
  };
};

export type CustomScreenDefinitionV3 = {
  schemaVersion: 3;
  listView: CustomScreenListViewDefinition;
  editorView: CustomScreenEditorViewDefinition;
};

export type CustomScreenDefinitionV4 = {
  schemaVersion: 4;
  listView: CustomScreenListViewDefinition;
  editorView: CustomScreenEditorViewDefinitionV4;
};

export type CustomScreenDefinition = CustomScreenDefinitionV4;

export type CustomScreenLegacyDefinition =
  CustomScreenDefinitionV1 | CustomScreenDefinitionV2 | CustomScreenDefinitionV3;

export type CustomScreenSidebarConfig = {
  showInSidebar: boolean;
  sidebarLabel: string | null;
};

export type CustomScreenCollectionLink = {
  collectionRole: CustomScreenCollectionRole | null;
  compositionKey: string | null;
};

export type CustomScreenDefinitionContext = {
  contentType?: {
    id?: string;
    slug?: string;
    name?: string;
    schema?: {
      required?: string[];
      properties?: Record<string, unknown>;
    };
  } | null;
};

export const defaultScreenSectionId = "section-default";

export const screenBlockDataAllowedKeys = {
  heading: ["label", "text", "level", "align", "field"],
  text: ["content", "tone", "label"],
  stat: ["label", "format", "trend", "deltaField", "field"],
  divider: ["variant", "label"],
  image: ["label", "fit", "ratio", "field", "src"],
  "related-list": ["label", "target", "displayField", "variant", "limit", "field"],
  tabs: ["label", "tabs"],
  button: ["label", "action", "variant", "href", "field"],
} as const satisfies Record<string, readonly string[]>;

export const compatibilityScreenBlockTypes = [
  "field",
  "field-group",
  "record-header",
  "columns",
  "rich-text",
  "legacy-widget",
] as const;

export type FixedScreenBlockType = keyof typeof screenBlockDataAllowedKeys;

export type ScreenTabItem = Readonly<{ id: string; label: string }>;

export const SCREEN_TAB_ID = /^[a-z][a-z0-9_-]{0,63}$/;

export const SCREEN_TABS_MIN = 1;

export const SCREEN_TABS_MAX = 24;

export const SCREEN_TAB_LABEL_MAX = 120;

export const SCREEN_DOCUMENT_SECTIONS_MAX = 120;

export const SCREEN_BLOCK_COLLECTION_MAX = 500;

// TASK-503-01: block-level style channel — a validated, sparse, additive subset on
// ScreenBlockV1. Consumed by the renderer (503-02 class maps + inline style) and the
// inspector Layout group (503-03). Enums coerce, ints clamp (coerce-not-throw, the
// screen module's value style); only unknown KEYS throw (rejectUnknownKeys).
export const screenBlockWidths = ["auto", "full", "half", "third", "two-thirds"] as const;

export const screenBlockAligns = ["start", "center", "end", "stretch"] as const;

export const screenImageRatios = ["auto", "1/1", "4/3", "16/9", "3/2"] as const;

export const SCREEN_BLOCK_MIN_HEIGHT_CLAMP = { min: 0, max: 640 } as const;

export const screenBlockBoxSides = ["top", "right", "bottom", "left"] as const;

export type ScreenBlockWidth = (typeof screenBlockWidths)[number];

export type ScreenBlockAlign = (typeof screenBlockAligns)[number];

export type ScreenImageRatio = (typeof screenImageRatios)[number];

export type ScreenBlockBoxSpacingV1 = Partial<Record<(typeof screenBlockBoxSides)[number], number>>;

export type ScreenBlockStyleV1 = {
  width?: ScreenBlockWidth;
  minHeight?: number; // clamped int px 0..640 — height as min-height, content-safe
  margin?: ScreenBlockBoxSpacingV1; // per-side clamped ints, PAGE_BLOCK_BOX_SPACING_CLAMP
  padding?: ScreenBlockBoxSpacingV1;
  align?: ScreenBlockAlign;
};

export const screenBlockStyleAllowedKeys = [
  "width",
  "minHeight",
  "margin",
  "padding",
  "align",
] as const;

// TASK-505-01: section-level style channel — a NEW additive channel on ScreenSectionV1
// (does NOT reuse the dead `layout` field; retyping `layout` to an enum-validated shape
// would THROW on legacy WidgetLayout docs — not byte-safe). Mirrors ScreenBlockStyleV1
// exactly: enums coerce, ints clamp (coerce-not-throw), only unknown KEYS throw.
// `columns` absent → today's vertical `space-y-4` stack (byte-identical DOM).
export const screenSectionColumnPresets = [
  "1",
  "2",
  "3",
  "4",
  "1-1",
  "1-2",
  "2-1",
  "1-3",
  "3-1",
  "2-3",
  "3-2",
  "1-1-1",
  "1-1-1-1",
] as const;

export type ScreenSectionColumnPreset = (typeof screenSectionColumnPresets)[number];

export const SCREEN_SECTION_COLUMN_GAP_CLAMP = { min: 0, max: 64 } as const;

export type ScreenSectionStyleV1 = {
  columns?: ScreenSectionColumnPreset; // absent → vertical stack (unchanged)
  columnGap?: number; // clamped int px 0..64
};

export const screenSectionStyleAllowedKeys = ["columns", "columnGap"] as const;

// Preset → grid-template-columns fr-ratio map. EXPORTED as the single source of truth;
// 505-02 renderer emits `gridTemplateColumns: screenSectionColumnTemplate[preset]`.
// Owner's `3/4 : 1/4` = "3-1" → "3fr 1fr"; `1/4 : 3/4` = "1-3" → "1fr 3fr".
export const screenSectionColumnTemplate: Record<ScreenSectionColumnPreset, string> = {
  "1": "1fr",
  "2": "1fr 1fr",
  "3": "1fr 1fr 1fr",
  "4": "1fr 1fr 1fr 1fr",
  "1-1": "1fr 1fr",
  "1-2": "1fr 2fr",
  "2-1": "2fr 1fr",
  "1-3": "1fr 3fr",
  "3-1": "3fr 1fr",
  "2-3": "2fr 3fr",
  "3-2": "3fr 2fr",
  "1-1-1": "1fr 1fr 1fr",
  "1-1-1-1": "1fr 1fr 1fr 1fr",
};

// TASK-505-01 (Item B): transient, NEVER-persisted binding-GC warning surfaced on the
// PATCH 200 response record (505-03 renders it). Declared + exported HERE (single
// declaring file); customScreenService.ts only re-exposes it on the returned record.
export type CustomScreenBindingWarning = {
  code: "binding_field_removed" | "binding_block_removed";
  fields: string[]; // offending content-type field name(s), source order, de-duped
};

// TASK-505-01 (Item B): an OPTIONAL, caller-supplied mutable out-param threaded top-down
// through the WRITE normalizers. Pruned orphan field names accumulate by SIDE-EFFECT — no
// normalizer changes its return type. The service reads it AFTER the call (B5). ForRead
// variants pass a DISCARD instance to prune silently (optional read-repair cleanup).
export type ScreenBindingWarningSink = {
  removedFieldOrphans: string[];
  removedBlockOrphans: string[];
};
