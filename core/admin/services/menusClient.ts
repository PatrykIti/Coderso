import { apiRequest } from "./apiClient";

export type MenuSummary = {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
};

export type MenuItemRecord = {
  id: string;
  label: string;
  href: string | null;
  pageId: string | null;
  parentId: string | null;
  orderIndex: number;
};

export type MenuItemNode = MenuItemRecord & { children: MenuItemNode[] };

export type MenuWithItems = {
  menu: MenuSummary;
  items: MenuItemNode[];
};

export type MenuItemInput = {
  id?: string;
  label: string;
  href?: string | null;
  pageId?: string | null;
  parentId?: string | null;
  orderIndex?: number;
};

export async function listMenus() {
  return apiRequest<MenuSummary[]>("/menus", { method: "GET" });
}

export async function getMenuWithItems(menuId: string) {
  return apiRequest<MenuWithItems>(`/menus/${menuId}`, { method: "GET" });
}

export async function createMenu(input: { name: string; location?: string | null }) {
  return apiRequest<MenuSummary>("/menus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      location: input.location ?? null,
    }),
  }, { withCsrf: true });
}

export async function updateMenu(
  menuId: string,
  input: { name?: string; location?: string | null }
) {
  return apiRequest<MenuSummary>(`/menus/${menuId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }, { withCsrf: true });
}

export async function replaceMenuItems(menuId: string, items: MenuItemInput[]) {
  return apiRequest<{ ok: boolean }>(`/menus/${menuId}/items`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  }, { withCsrf: true });
}

export async function deleteMenu(menuId: string) {
  return apiRequest<{ ok: boolean }>(`/menus/${menuId}`, {
    method: "DELETE",
  }, { withCsrf: true });
}
