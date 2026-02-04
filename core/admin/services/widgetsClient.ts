import { apiRequest } from "./apiClient";

export type WidgetCatalogItem = {
  id: string;
  source: "core" | "template";
  name: string;
  description: string | null;
  category: string;
  variants: string[];
  status: "draft" | "published";
};

export async function listWidgetCatalog() {
  return apiRequest<{ items: WidgetCatalogItem[] }>("/widgets", {
    method: "GET",
  });
}
