import type { ComponentType, ReactNode } from "react";

export type WidgetCategory = "layout" | "content" | "forms" | "navigation" | "media";

export type WidgetComplexity = "composite" | "atomic";

export type WidgetAudience = "beginner" | "intermediate" | "advanced";
export type WidgetSurface =
  | "page-builder"
  | "widget-library"
  | "custom-screen-builder"
  | "admin-list-view"
  | "admin-editor-view";

export type WidgetDataAccess = {
  source: "none" | "selected-content-type" | "selected-entry";
  modes: Array<"read" | "write">;
};

export type WidgetBindingTarget = {
  propPath: string;
  label: string;
  description?: string;
  modes?: Array<"read" | "write">;
};

export type WidgetPreset = {
  id: string;
  label: string;
  description?: string;
};

export type WidgetVariant = {
  id: string;
  label: string;
  description?: string;
};

export type WidgetSlotDefinition = {
  id: string;
  label: string;
  kind?: "fixed" | "repeatable";
  minItems?: number;
  maxItems?: number;
  allowedTypes?: string[];
};

export type WidgetRenderMode = "public" | "editor-preview" | "admin-preview";

export type NestedRenderSurface = "default-block" | "row-flow-item";

export type WidgetPreviewState = {
  status: "idle" | "loading" | "ready" | "error";
  dataPatch?: Record<string, unknown>;
  message?: string;
  requestKey?: string;
};

export type WidgetRuntimeScriptRegistry = {
  registerScript: (id: string, source: string) => void;
  renderScripts: () => ReactNode[];
};

export type WidgetRenderContext = {
  mode: WidgetRenderMode;
  previewDevice?: DeviceTarget;
  previewState?: WidgetPreviewState | null;
  runtimeScripts?: WidgetRuntimeScriptRegistry;
  nestedSurface?: NestedRenderSurface;
};

export type WidgetEditorSlotTarget = {
  definitionId: string;
  slotId: string;
  label: string;
  kind: "fixed" | "repeatable";
  instanceId?: string;
};

export type WidgetEditorBookingFlowSummary = {
  blockId: string;
  flowId: string;
  label: string;
};

export type WidgetEditorBookingFlows = {
  calendars: WidgetEditorBookingFlowSummary[];
};

export type WidgetBlockPatch = Partial<WidgetBlock> | ((current: WidgetBlock) => WidgetBlock);

export type WidgetBlockPatcher = (patch: WidgetBlockPatch) => void;

export type WidgetEditorProps<T> = {
  value: T;
  onChange: (next: T) => void;
  variant: string;
  onVariantChange?: (next: string) => void;
  onBlockPatch?: WidgetBlockPatcher;
  context?: WidgetEditorContext;
};

export type WidgetEditorContext = {
  surface: WidgetSurface;
  blockId?: string;
  editorMode?: EditorMode;
  previewState?: WidgetPreviewState | null;
  setPreviewState?: (state: WidgetPreviewState | null) => void;
  jumpToBindingPropPath?: (propPath: string) => void;
  getBindingState?: (propPath: string) => "literal" | "bound" | "mixed";
  slotTargets?: WidgetEditorSlotTarget[];
  bookingFlows?: WidgetEditorBookingFlows;
  widgetPreviewData?: Record<string, unknown>;
};

export type WidgetSlotControlSection = {
  id: string;
  title: string;
  description?: string;
  mode?: "visual" | "advanced";
};

export type WidgetRepeatableSlotSyncAdapter = {
  definitionId: string;
  buildDefaultItem?: (instanceId: string, nextIndex: number) => unknown;
  appendItem?: (data: Record<string, unknown>, nextItem: unknown) => Record<string, unknown>;
  removeItemByInstanceId?: (
    data: Record<string, unknown>,
    instanceId: string
  ) => Record<string, unknown>;
  reorderItemsByInstanceIds?: (
    data: Record<string, unknown>,
    orderedInstanceIds: string[]
  ) => Record<string, unknown>;
};

export type WidgetEditorCapabilities = {
  visualOwnsVariantSelection?: boolean;
  slotControlSection?: WidgetSlotControlSection;
  supportsPreviewState?: boolean;
};

export type WidgetDefinition<T = Record<string, unknown>> = {
  type: string;
  title: string;
  description?: string;
  category: WidgetCategory;
  complexity?: WidgetComplexity;
  audience?: WidgetAudience;
  module?: string;
  presets?: WidgetPreset[];
  requires?: string[];
  surfaces?: WidgetSurface[];
  dataAccess?: WidgetDataAccess;
  bindingTargets?: WidgetBindingTarget[];
  canHaveChildren?: boolean;
  slots?: WidgetSlotDefinition[];
  repeatableSlotSync?: WidgetRepeatableSlotSyncAdapter[];
  variants: WidgetVariant[];
  schema: Record<string, unknown>;
  defaults: T;
  editor: {
    wizard: ComponentType<WidgetEditorProps<T>>;
    visual: ComponentType<WidgetEditorProps<T>>;
    advanced: ComponentType<WidgetEditorProps<T>>;
  };
  editorCapabilities?: WidgetEditorCapabilities;
  render: ComponentType<{
    data: T;
    variant: string;
    slots?: Record<string, WidgetBlock[]>;
    previewDevice?: DeviceTarget;
    pageDefaults?: WidgetLayoutDefaults;
    blockId?: string;
    renderContext?: WidgetRenderContext;
    renderBlock?: (block: WidgetBlock, context?: WidgetRenderContext) => ReactNode;
  }>;
};

export const containerTokens = ["default", "narrow", "full"] as const;
export const spacingTokens = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const;

export type ContainerToken = (typeof containerTokens)[number];
export type SpacingToken = (typeof spacingTokens)[number];
export type InheritableContainerToken = ContainerToken | "inherit";
export type InheritableSpacingToken = SpacingToken | "inherit";
export type DeviceTarget = "desktop" | "tablet" | "mobile";
export type EditorMode = "wizard" | "visual" | "advanced";

export type WidgetLayout = {
  container: InheritableContainerToken;
  padding: { top: InheritableSpacingToken; bottom: InheritableSpacingToken };
  margin: { top: InheritableSpacingToken; bottom: InheritableSpacingToken };
  background: { color: string; image?: string | null };
};

export type WidgetLayoutDefaults = {
  container: ContainerToken;
  padding: { top: SpacingToken; bottom: SpacingToken };
  margin: { top: SpacingToken; bottom: SpacingToken };
};

export type WidgetVisibility = {
  enabled: boolean;
  devices: DeviceTarget[];
};

export type WidgetEditorState = {
  mode: EditorMode;
  wizardCompleted: boolean;
};

export type WidgetBlock = {
  id: string;
  type: string;
  variant?: string;
  data: Record<string, unknown>;
  layout?: WidgetLayout;
  visibility?: WidgetVisibility;
  editor?: WidgetEditorState;
  children?: WidgetBlock[];
  slots?: Record<string, WidgetBlock[]>;
};
