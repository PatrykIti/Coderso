import type { ComponentType } from "react";

export type WidgetCategory =
  | "layout"
  | "content"
  | "forms"
  | "navigation"
  | "media";

export type WidgetVariant = {
  id: string;
  label: string;
  description?: string;
};

export type WidgetEditorProps<T> = {
  value: T;
  onChange: (next: T) => void;
  variant: string;
  onVariantChange?: (next: string) => void;
};

export type WidgetDefinition<T = Record<string, unknown>> = {
  type: string;
  title: string;
  description?: string;
  category: WidgetCategory;
  canHaveChildren?: boolean;
  variants: WidgetVariant[];
  schema: Record<string, unknown>;
  defaults: T;
  editor: {
    wizard: ComponentType<WidgetEditorProps<T>>;
    visual: ComponentType<WidgetEditorProps<T>>;
    advanced: ComponentType<WidgetEditorProps<T>>;
  };
  render: ComponentType<{ data: T; variant: string }>;
};

export const containerTokens = ["default", "narrow", "full"] as const;
export const spacingTokens = [
  "none",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
] as const;

export type ContainerToken = (typeof containerTokens)[number];
export type SpacingToken = (typeof spacingTokens)[number];
export type DeviceTarget = "desktop" | "tablet" | "mobile";
export type EditorMode = "wizard" | "visual" | "advanced";

export type WidgetLayout = {
  container: ContainerToken;
  padding: { top: SpacingToken; bottom: SpacingToken };
  margin: { top: SpacingToken; bottom: SpacingToken };
  background: { color: string; image?: string | null };
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
};
