import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { menuItems, menus } from "../../db/schema";
import {
  assertNoCycles,
  buildMenuTree,
  type MenuItemNode,
  type MenuItemRecord,
} from "./treeBuilder";

export type CreateMenuInput = {
  name: string;
  location?: string | null;
};

export type UpdateMenuInput = {
  name?: string;
  location?: string | null;
};

export type MenuItemInput = {
  id?: string;
  label: string;
  href?: string | null;
  pageId?: string | null;
  parentId?: string | null;
  orderIndex?: number;
};

export type MenuWithItems = {
  menu: typeof menus.$inferSelect;
  items: MenuItemNode[];
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeMenuItems(items: MenuItemInput[]): MenuItemRecord[] {
  if (!Array.isArray(items)) {
    throw new Error("menu_items_invalid");
  }

  const normalized = items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error("menu_items_invalid");
    }

    const label = normalizeString(item.label);
    if (!label) {
      throw new Error("menu_item_label_required");
    }

    const href = normalizeString(item.href ?? null);
    const pageId = normalizeString(item.pageId ?? null);

    if ((href && pageId) || (!href && !pageId)) {
      throw new Error("menu_item_link_invalid");
    }

    const id = normalizeString(item.id) ?? randomUUID();
    const parentId = normalizeString(item.parentId ?? null);
    const orderIndex = Number.isFinite(item.orderIndex)
      ? Number(item.orderIndex)
      : index;

    return {
      id,
      label,
      href,
      pageId,
      parentId,
      orderIndex,
    };
  });

  const ids = new Set<string>();
  for (const item of normalized) {
    if (ids.has(item.id)) {
      throw new Error("menu_item_id_duplicate");
    }
    ids.add(item.id);
  }

  for (const item of normalized) {
    if (item.parentId && !ids.has(item.parentId)) {
      item.parentId = null;
    }
    if (item.parentId === item.id) {
      throw new Error("menu_items_cycle");
    }
  }

  assertNoCycles(normalized);
  return normalized;
}

export async function listMenus() {
  return db.select().from(menus).orderBy(asc(menus.createdAt));
}

export async function getMenu(menuId: string) {
  const [row] = await db.select().from(menus).where(eq(menus.id, menuId));
  return row ?? null;
}


export async function createMenu(input: CreateMenuInput) {
  const [row] = await db
    .insert(menus)
    .values({
      name: input.name,
      location: input.location ?? null,
    })
    .returning();
  return row ?? null;
}

export async function updateMenu(menuId: string, input: UpdateMenuInput) {
  const [row] = await db
    .update(menus)
    .set({
      name: input.name,
      location: input.location ?? null,
    })
    .where(eq(menus.id, menuId))
    .returning();
  return row ?? null;
}

export async function deleteMenu(menuId: string) {
  const [row] = await db
    .delete(menus)
    .where(eq(menus.id, menuId))
    .returning();
  return row ?? null;
}

export async function listMenuItems(menuId: string) {
  const rows = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.menuId, menuId))
    .orderBy(asc(menuItems.orderIndex));

  const records: MenuItemRecord[] = rows.map((row) => ({
    id: row.id,
    label: row.label,
    href: row.href ?? null,
    pageId: row.pageId ?? null,
    parentId: row.parentId ?? null,
    orderIndex: row.orderIndex,
  }));

  return buildMenuTree(records);
}

export async function getMenuWithItems(menuId: string): Promise<MenuWithItems | null> {
  const menu = await getMenu(menuId);
  if (!menu) return null;

  const items = await listMenuItems(menuId);
  return { menu, items };
}

export async function replaceMenuItems(menuId: string, items: MenuItemInput[]) {
  const menu = await getMenu(menuId);
  if (!menu) throw new Error("menu_not_found");

  const normalized = normalizeMenuItems(items);

  const inserted = await db.transaction(async (tx) => {
    await tx.delete(menuItems).where(eq(menuItems.menuId, menuId));
    if (normalized.length === 0) return [] as MenuItemRecord[];

    return tx
      .insert(menuItems)
      .values(
        normalized.map((item) => ({
          ...item,
          menuId,
        }))
      )
      .returning();
  });

  const records: MenuItemRecord[] = inserted.map((row) => ({
    id: row.id,
    label: row.label,
    href: row.href ?? null,
    pageId: row.pageId ?? null,
    parentId: row.parentId ?? null,
    orderIndex: row.orderIndex,
  }));

  return buildMenuTree(records);
}
