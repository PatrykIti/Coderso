export type WidgetCategoryId = "layout" | "content" | "forms" | "navigation" | "media";
export type WidgetSource = "core" | "template";

export type WidgetItem = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  badge?: string;
  isFavorite?: boolean;
  source?: WidgetSource;
  description?: string | null;
  status?: "draft" | "published";
};
