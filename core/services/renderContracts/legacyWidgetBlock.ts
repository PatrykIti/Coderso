/**
 * Legacy stored-content compatibility types for the retired v1 page-widget
 * kernel (TASK-580). Type-only, no runtime value.
 *
 * These shapes exist so surviving read paths (custom screens, widget template
 * service, site cache) can still type stored v1 `WidgetBlock` documents after
 * `core/widgets/**` is removed. Do not add value/behavior here; the v1 kernel
 * is gone and no new surface may author these shapes.
 */
import type {
  ContainerToken,
  DeviceTarget,
  InheritableContainerToken,
  InheritableSpacingToken,
  SpacingToken,
} from "./tokens";

export type LegacyWidgetEditorMode = "wizard" | "visual" | "advanced";

export type LegacyWidgetLayout = {
  container: InheritableContainerToken;
  padding: { top: InheritableSpacingToken; bottom: InheritableSpacingToken };
  margin: { top: InheritableSpacingToken; bottom: InheritableSpacingToken };
  background: { color: string; image?: string | null };
};

export type LegacyWidgetLayoutDefaults = {
  container: ContainerToken;
  padding: { top: SpacingToken; bottom: SpacingToken };
  margin: { top: SpacingToken; bottom: SpacingToken };
};

export type LegacyWidgetVisibility = {
  enabled: boolean;
  devices: DeviceTarget[];
};

export type LegacyWidgetEditorState = {
  mode: LegacyWidgetEditorMode;
  wizardCompleted: boolean;
};

export type LegacyWidgetBlock = {
  id: string;
  type: string;
  variant?: string;
  data: Record<string, unknown>;
  layout?: LegacyWidgetLayout;
  visibility?: LegacyWidgetVisibility;
  editor?: LegacyWidgetEditorState;
  children?: LegacyWidgetBlock[];
  slots?: Record<string, LegacyWidgetBlock[]>;
};

export type {
  ContainerToken,
  DeviceTarget,
  InheritableContainerToken,
  InheritableSpacingToken,
  SpacingToken,
} from "./tokens";
