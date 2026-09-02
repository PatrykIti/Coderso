import type { MenuItemInput, MenuItemRecord } from "@/services/menusClient";
import { normalizeMenuItemSettings } from "../../../services/menus/menuItemSettings";

import type { MenuDropIntent } from "./menuDnD";

const collectRecordDescendants = (items: MenuItemRecord[], id: string) => {
  const childrenMap = new Map<string | null, MenuItemRecord[]>();
  items.forEach((item) => {
    const key = item.parentId ?? null;
    const existing = childrenMap.get(key) ?? [];
    existing.push(item);
    childrenMap.set(key, existing);
  });

  const descendants = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const children = childrenMap.get(current) ?? [];
    for (const child of children) {
      if (descendants.has(child.id)) continue;
      descendants.add(child.id);
      stack.push(child.id);
    }
  }
  return descendants;
};

export const buildMenuItemsPayload = (items: MenuItemRecord[]): MenuItemInput[] =>
  items.map((entry) => {
    const href = entry.href?.trim() ?? "";
    const base = {
      id: entry.id,
      label: entry.label.trim(),
      parentId: entry.parentId ?? null,
      orderIndex: entry.orderIndex,
      settings: normalizeMenuItemSettings(entry.settings),
    };

    return {
      ...base,
      ...(entry.pageId ? { pageId: entry.pageId } : href ? { href } : {}),
    };
  });

export const moveMenuItems = (
  items: MenuItemRecord[],
  dragId: string,
  targetId: string,
  intent: MenuDropIntent
) => {
  if (dragId === targetId) return items;
  const dragItem = items.find((item) => item.id === dragId);
  const targetItem = items.find((item) => item.id === targetId);
  if (!dragItem || !targetItem) return items;

  const nextParentId = intent === "child" ? targetItem.id : (targetItem.parentId ?? null);
  if (nextParentId === dragId) return items;

  const descendants = collectRecordDescendants(items, dragId);
  if (nextParentId && descendants.has(nextParentId)) return items;

  const oldParentId = dragItem.parentId ?? null;
  const buildSiblings = (parentId: string | null) =>
    items
      .filter((item) => (item.parentId ?? null) === parentId && item.id !== dragId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

  const oldSiblings = buildSiblings(oldParentId);
  const newSiblings = oldParentId === nextParentId ? oldSiblings : buildSiblings(nextParentId);

  const targetIndex = newSiblings.findIndex((item) => item.id === targetId);
  const insertIndex =
    intent === "child"
      ? newSiblings.length
      : intent === "before"
        ? targetIndex === -1
          ? newSiblings.length
          : Math.max(0, targetIndex)
        : targetIndex === -1
          ? newSiblings.length
          : Math.max(0, targetIndex + 1);

  const moved = { ...dragItem, parentId: nextParentId };
  const nextSiblings = [...newSiblings];
  nextSiblings.splice(insertIndex, 0, moved);

  const updates = new Map<string, MenuItemRecord>();
  oldSiblings.forEach((item, index) => {
    updates.set(item.id, { ...item, orderIndex: index });
  });
  nextSiblings.forEach((item, index) => {
    updates.set(item.id, { ...item, orderIndex: index });
  });

  return items.map((item) => updates.get(item.id) ?? item);
};

export const moveMenuItemToRoot = (
  items: MenuItemRecord[],
  dragId: string,
  position: "start" | "end" = "end"
) => {
  const dragItem = items.find((item) => item.id === dragId);
  if (!dragItem) return items;

  const oldParentId = dragItem.parentId ?? null;
  const buildSiblings = (parentId: string | null) =>
    items
      .filter((item) => (item.parentId ?? null) === parentId && item.id !== dragId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

  const oldSiblings = buildSiblings(oldParentId);
  const rootSiblings = buildSiblings(null);

  const moved = { ...dragItem, parentId: null };
  const nextRoot = position === "start" ? [moved, ...rootSiblings] : [...rootSiblings, moved];

  const updates = new Map<string, MenuItemRecord>();
  oldSiblings.forEach((item, index) => {
    updates.set(item.id, { ...item, orderIndex: index });
  });
  nextRoot.forEach((item, index) => {
    updates.set(item.id, { ...item, orderIndex: index });
  });

  return items.map((item) => updates.get(item.id) ?? item);
};

export const validateMenuItemsPayload = (items: MenuItemRecord[]) => {
  for (const entry of items) {
    if (!entry.label.trim()) {
      return {
        ok: false,
        message: "Each menu item must have a label.",
        itemId: entry.id,
      } as const;
    }
    const hasHref = Boolean(entry.href && entry.href.trim().length > 0);
    const hasPage = Boolean(entry.pageId);
    if ((hasHref && hasPage) || (!hasHref && !hasPage)) {
      return {
        ok: false,
        message: "Each menu item must link to a page or a custom URL.",
        itemId: entry.id,
      } as const;
    }
  }
  return { ok: true } as const;
};
