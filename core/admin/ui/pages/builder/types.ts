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

export type LayoutValue = {
  container: ContainerToken;
  padding: { top: SpacingToken; bottom: SpacingToken };
  margin: { top: SpacingToken; bottom: SpacingToken };
  background: { color: string; image?: string | null };
};

export type Block = {
  id: string;
  type: string;
  variant?: string;
  data: Record<string, unknown>;
  layout: LayoutValue;
  visibility: { devices: DeviceTarget[]; enabled: boolean };
  editor: { mode: EditorMode; wizardCompleted: boolean };
};

export type WidgetVariant = {
  id: string;
  label: string;
  description?: string;
};

export type WidgetDefinition = {
  type: string;
  label: string;
  description: string;
  variants: WidgetVariant[];
  wizard: {
    prompt: string;
    options: WidgetVariant[];
  };
};
