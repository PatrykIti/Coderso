export type WidgetCategoryId = "layout" | "content" | "forms" | "navigation" | "media";

export type WidgetItem = {
  id: string;
  name: string;
  category: WidgetCategoryId;
  categoryLabel: string;
  badge?: string;
  isFavorite?: boolean;
};
