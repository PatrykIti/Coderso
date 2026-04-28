import type { WidgetCategory } from "../../../widgets/types";

export const widgetCategoryOrder: WidgetCategory[] = [
  "layout",
  "content",
  "forms",
  "navigation",
  "media",
];

export const widgetCategoryLabels: Record<WidgetCategory, string> = {
  layout: "Layout",
  content: "Content",
  forms: "Forms",
  navigation: "Navigation",
  media: "Media",
};
