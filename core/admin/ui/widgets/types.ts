export type WidgetCategoryId = "hero" | "grid" | "forms" | "media";

export type WidgetItem = {
  id: string;
  name: string;
  category: WidgetCategoryId;
  categoryLabel: string;
  badge?: string;
  isFavorite?: boolean;
};
