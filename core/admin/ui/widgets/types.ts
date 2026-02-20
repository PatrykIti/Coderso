export type WidgetCategoryId = "layout" | "content" | "forms" | "navigation" | "media";
export type WidgetSource = "core" | "template";
export type WidgetComplexity = "composite" | "atomic";
export type WidgetAudience = "beginner" | "intermediate" | "advanced";
export type WidgetLibraryTab = "recommended" | "all";

export type WidgetItem = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  complexity: WidgetComplexity;
  audience: WidgetAudience;
  module: string;
  presets?: Array<{ id: string; label: string; description?: string }>;
  requires?: string[];
  badge?: string;
  isFavorite?: boolean;
  source?: WidgetSource;
  description?: string | null;
  status?: "draft" | "published";
};
