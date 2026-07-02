import { randomUUID } from "node:crypto";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { menuItems, menus, pages } from "../../db/schema";
import { normalizeMenuItemSettings } from "./menuItemSettings";
import { isEmptyMenuDocument, normalizeMenuDocumentV2ForWrite } from "./menuDocumentV2";
import { normalizeMenuNavExtras } from "./menuNavExtras";
import { normalizeMenuAppearance, type MenuSettings } from "./normalizeMenuAppearance";
import {
  assertNoCycles,
  buildMenuTree,
  type MenuItemNode,
  type MenuItemRecord,
} from "./treeBuilder";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | DbTransaction;

export type CreateMenuInput = {
  name: string;
  location?: string | null;
  status?: MenuStatus;
};

export type UpdateMenuInput = {
  name?: string;
  location?: string | null;
  status?: MenuStatus;
  /**
   * Menu appearance (TASK-458-02): validated through
   * `normalizeMenuAppearance` (throws machine-readable
   * `menu_appearance_invalid`), persisted in the `menus.settings` envelope.
   * `null` clears the stored appearance back to the legacy look;
   * `undefined` leaves it untouched, so publish/draft lifecycle updates
   * carry the appearance exactly like items.
   */
  appearance?: unknown;
  /**
   * Menu design document (TASK-499-02): validated through
   * `normalizeMenuDocumentV2ForWrite` (throws machine-readable
   * `menu_document_invalid`), persisted next to the appearance/extras in the
   * `menus.settings` envelope under the `document` key. `null` or an empty
   * document clears the slot back to the legacy/default look; `undefined`
   * leaves it untouched. Document updates merge per key, so the appearance and
   * extras keys are never dropped.
   */
  document?: unknown;
  /**
   * Nav extras blocks (TASK-458-03): validated through
   * `normalizeMenuNavExtras` (throws machine-readable
   * `menu_nav_extras_invalid`), persisted next to the appearance in the
   * `menus.settings` envelope. `null` or an empty list clears the slot;
   * `undefined` leaves it untouched. Appearance and extras updates merge
   * per key, so either can change without dropping the other.
   */
  extras?: unknown;
};

export type MenuStatus = "draft" | "published";

export type MenuItemInput = {
  id?: string;
  label: string;
  href?: string | null;
  pageId?: string | null;
  parentId?: string | null;
  orderIndex?: number;
  settings?: unknown;
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

export function normalizeMenuStatus(value: unknown, fallback: MenuStatus = "draft"): MenuStatus {
  return value === "published" || value === "draft" ? value : fallback;
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
    const orderIndex = Number.isFinite(item.orderIndex) ? Number(item.orderIndex) : index;

    return {
      id,
      label,
      href,
      pageId,
      parentId,
      orderIndex,
      settings: normalizeMenuItemSettings(item.settings),
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

export async function getMenu(menuId: string, client: DbClient = db) {
  const [row] = await client.select().from(menus).where(eq(menus.id, menuId));
  return row ?? null;
}

export async function createMenu(input: CreateMenuInput) {
  const status = normalizeMenuStatus(input.status, "draft");
  const now = new Date();
  const [row] = await db
    .insert(menus)
    .values({
      name: input.name,
      location: input.location ?? null,
      status,
      publishedAt: status === "published" ? now : null,
    })
    .returning();
  return row ?? null;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const readMenuDesignState = (envelope: Record<string, unknown>): Record<string, unknown> => {
  const state: Record<string, unknown> = {};
  if (hasOwn(envelope, "appearance")) {
    state.appearance = envelope.appearance;
  }
  if (hasOwn(envelope, "extras")) {
    state.extras = envelope.extras;
  }
  if (hasOwn(envelope, "document")) {
    state.document = envelope.document;
  }
  return state;
};

/**
 * Merges an appearance/extras update into the stored `menus.settings`
 * envelope per key (TASK-458-03): updating one key never drops the other,
 * unknown stored envelope keys are preserved non-destructively, and an
 * emptied envelope collapses back to `null` (the legacy shape).
 */
const mergeMenuSettingsEnvelope = (
  stored: unknown,
  input: Pick<UpdateMenuInput, "appearance" | "extras" | "document">,
  options?: { seedPublishedSnapshot?: boolean }
): MenuSettings | null => {
  const envelope: Record<string, unknown> = isPlainObject(stored) ? { ...stored } : {};
  if (options?.seedPublishedSnapshot && !isPlainObject(envelope.published)) {
    envelope.published = readMenuDesignState(envelope);
  }
  if (input.appearance !== undefined) {
    if (input.appearance === null) {
      delete envelope.appearance;
    } else {
      envelope.appearance = normalizeMenuAppearance(input.appearance);
    }
  }
  if (input.extras !== undefined) {
    const extras = input.extras === null ? [] : normalizeMenuNavExtras(input.extras);
    if (extras.length === 0) {
      delete envelope.extras;
    } else {
      envelope.extras = extras;
    }
  }
  if (input.document !== undefined) {
    if (input.document === null) {
      delete envelope.document;
    } else {
      const document = normalizeMenuDocumentV2ForWrite(input.document);
      if (isEmptyMenuDocument(document)) {
        delete envelope.document;
      } else {
        envelope.document = document;
      }
    }
  }
  return Object.keys(envelope).length > 0 ? (envelope as MenuSettings) : null;
};

const publishMenuSettingsEnvelope = (stored: unknown): MenuSettings | null => {
  const envelope: Record<string, unknown> = isPlainObject(stored) ? { ...stored } : {};
  const draftState = readMenuDesignState(envelope);
  if (Object.keys(draftState).length === 0 && !isPlainObject(envelope.published)) {
    return Object.keys(envelope).length > 0 ? (envelope as MenuSettings) : null;
  }
  envelope.published = draftState;
  return Object.keys(envelope).length > 0 ? (envelope as MenuSettings) : null;
};

export async function updateMenu(menuId: string, input: UpdateMenuInput) {
  const patch: Partial<typeof menus.$inferInsert> = {};
  const changesDesign =
    input.appearance !== undefined || input.extras !== undefined || input.document !== undefined;
  const publishes = input.status === "published";
  const existing = changesDesign || publishes ? await getMenu(menuId) : null;
  if ((changesDesign || publishes) && !existing) return null;

  if (input.name !== undefined) {
    patch.name = input.name;
  }
  if (input.location !== undefined) {
    patch.location = input.location;
  }
  if (input.status !== undefined) {
    const status = normalizeMenuStatus(input.status, "draft");
    patch.status = status;
    patch.publishedAt = status === "published" ? new Date() : null;
  }
  if (
    input.appearance !== undefined ||
    input.extras !== undefined ||
    input.document !== undefined
  ) {
    patch.settings = mergeMenuSettingsEnvelope(existing?.settings, input, {
      seedPublishedSnapshot: existing?.status === "published",
    });
  }
  if (publishes) {
    patch.settings = publishMenuSettingsEnvelope(patch.settings ?? existing?.settings);
  }

  const [row] = await db.update(menus).set(patch).where(eq(menus.id, menuId)).returning();
  return row ?? null;
}

export const publishMenu = (menuId: string) => updateMenu(menuId, { status: "published" });

export const moveMenuToDraft = (menuId: string) => updateMenu(menuId, { status: "draft" });

export async function deleteMenu(menuId: string) {
  const [row] = await db.delete(menus).where(eq(menus.id, menuId)).returning();
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
    settings: normalizeMenuItemSettings(row.settings),
  }));

  return buildMenuTree(records);
}

export async function getMenuWithItems(menuId: string): Promise<MenuWithItems | null> {
  const menu = await getMenu(menuId);
  if (!menu) return null;

  const items = await listMenuItems(menuId);
  return { menu, items };
}

export async function getMenuWithItemsByLocation(location: string): Promise<MenuWithItems | null> {
  const normalized = normalizeString(location);
  if (!normalized) return null;

  const [menu] = await db.select().from(menus).where(eq(menus.location, normalized));
  if (!menu) return null;

  const items = await listMenuItems(menu.id);
  return { menu, items };
}

async function replaceMenuItemsWithClient(
  client: DbClient,
  menuId: string,
  items: MenuItemInput[]
) {
  const menu = await getMenu(menuId, client);
  if (!menu) throw new Error("menu_not_found");

  const normalized = normalizeMenuItems(items);
  const pageIds = Array.from(
    new Set(normalized.map((item) => item.pageId).filter((id): id is string => Boolean(id)))
  );

  if (pageIds.length > 0) {
    const rows = await client
      .select({ id: pages.id })
      .from(pages)
      .where(inArray(pages.id, pageIds));
    const found = new Set(rows.map((row) => row.id));
    const missing = pageIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new Error("menu_item_page_missing");
    }
  }

  await client.delete(menuItems).where(eq(menuItems.menuId, menuId));
  const inserted =
    normalized.length === 0
      ? ([] as MenuItemRecord[])
      : await client
          .insert(menuItems)
          .values(
            normalized.map((item) => ({
              ...item,
              menuId,
            }))
          )
          .returning();

  const records: MenuItemRecord[] = inserted.map((row) => ({
    id: row.id,
    label: row.label,
    href: row.href ?? null,
    pageId: row.pageId ?? null,
    parentId: row.parentId ?? null,
    orderIndex: row.orderIndex,
    settings: normalizeMenuItemSettings(row.settings),
  }));

  return buildMenuTree(records);
}

export async function replaceMenuItems(menuId: string, items: MenuItemInput[]) {
  return db.transaction((tx) => replaceMenuItemsWithClient(tx, menuId, items));
}

export async function replaceMenuItemsTx(
  tx: DbTransaction,
  menuId: string,
  items: MenuItemInput[]
) {
  return replaceMenuItemsWithClient(tx, menuId, items);
}

const flattenMenuNodes = (nodes: MenuItemNode[]): MenuItemRecord[] =>
  nodes.flatMap((node) => {
    const { children: _children, ...record } = node;
    return [record, ...flattenMenuNodes(node.children)];
  });

const collectMenuItemDescendantIds = (items: MenuItemRecord[], itemId: string) => {
  const deleteIds = new Set([itemId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.parentId && deleteIds.has(item.parentId) && !deleteIds.has(item.id)) {
        deleteIds.add(item.id);
        changed = true;
      }
    }
  }
  return deleteIds;
};

export async function deleteMenuItem(menuId: string, itemId: string) {
  const existingItems = flattenMenuNodes(await listMenuItems(menuId));
  const existing = existingItems.find((item) => item.id === itemId) ?? null;
  if (!existing) return null;

  const deleteIds = collectMenuItemDescendantIds(existingItems, itemId);
  const nextItems = existingItems
    .filter((item) => !deleteIds.has(item.id))
    .map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      pageId: item.pageId,
      parentId: item.parentId,
      orderIndex: item.orderIndex,
      settings: item.settings,
    }));
  const items = await replaceMenuItems(menuId, nextItems);

  return {
    deleted: existing,
    deletedIds: [...deleteIds].sort((left, right) => left.localeCompare(right)),
    items,
  };
}
