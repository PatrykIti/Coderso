// Action-executor menu + SEO previews and handlers (TASK-569-01). Bodies are byte-identical to the legacy monolith.

import { isDeepStrictEqual } from "node:util";
import type { getSeoDocumentByTarget } from "../seo/seoService";
import type { MenuItemInput } from "../menus/menuService";
import type { MenuItemNode, MenuItemRecord } from "../menus/treeBuilder";
import type {
  AssistantActionExecutionItem,
  AssistantActionPreviewChange,
  AssistantMenuItemDeleteAction,
  AssistantMenuItemUpdateAction,
  AssistantMenuItemUpsertAction,
  AssistantMenuUpsertAction,
  AssistantSeoDocumentDeleteAction,
  AssistantSeoDocumentUpdateAction,
  AssistantSeoDocumentUpsertAction,
} from "./actionPlanTypes";
import { createPreviewChange } from "./actionDiffService";
import type { ActionExecutorDeps, ActionHandlerContext } from "./actionExecutorTypes";
import {
  normalizeSeoSlugForAction,
  resourceIdInputKey,
  findMenuByLocation,
  resolveResourceIdInput,
  buildLocatorPreviewDependency,
} from "./actionExecutorResourceIds";

const flattenMenuNodes = (nodes: MenuItemNode[]): MenuItemRecord[] =>
  nodes.flatMap((node) => {
    const { children: _children, ...record } = node;
    return [record, ...flattenMenuNodes(node.children)];
  });

const findMenuItemForAction = (items: MenuItemRecord[], action: AssistantMenuItemUpsertAction) =>
  items.find((item) => item.href === action.input.href) ?? null;

const collectMenuItemDeleteIds = (items: MenuItemRecord[], itemId: string) => {
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

export const buildMenuUpsertPreview = async (
  action: AssistantMenuUpsertAction,
  deps: ActionExecutorDeps
) => {
  const existing = await findMenuByLocation(action.input.location, deps);
  const nextValue = {
    ...(existing ? { id: existing.id } : {}),
    name: action.input.name,
    location: action.input.location,
    status: action.input.status,
  };

  return createPreviewChange({
    action,
    targetType: "menu",
    targetKey: action.input.location,
    summary: `${existing ? "Update" : "Create"} menu "${action.input.name}"`,
    dependencies: [
      {
        actionId: null,
        targetType: "permission",
        targetKey: "menus:write",
        optional: false,
      },
    ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          location: existing.location,
          status: existing.status,
        }
      : null,
    nextValue,
  });
};

const buildNextMenuItem = (
  action: AssistantMenuItemUpsertAction,
  existing: MenuItemRecord | null,
  orderIndex: number
): MenuItemInput => ({
  ...(existing ? { id: existing.id } : {}),
  label: action.input.label,
  href: action.input.href,
  pageId: null,
  parentId:
    action.input.parentId !== undefined ? action.input.parentId : (existing?.parentId ?? null),
  orderIndex: action.input.orderIndex ?? existing?.orderIndex ?? orderIndex,
  settings: action.input.settings ?? existing?.settings ?? {},
});

export const buildMenuItemPreview = async (
  action: AssistantMenuItemUpsertAction,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const locator = await buildLocatorPreviewDependency(action.input.menuId, "menu", deps, ctx);
  const menuId = locator.resolvedId;
  const existingItems = menuId ? flattenMenuNodes(await deps.listMenuItems(menuId)) : [];
  const existing = findMenuItemForAction(existingItems, action);
  const nextValue = buildNextMenuItem(action, existing, existingItems.length);
  const targetKey = `${resourceIdInputKey(action.input.menuId)}/${action.input.href}`;

  return createPreviewChange({
    action,
    targetType: "menu-item",
    targetKey,
    summary: `${existing ? "Update" : "Create"} menu item "${action.input.label}"`,
    dependencies: [
      locator.dependency,
      {
        actionId: null,
        targetType: "permission",
        targetKey: "menus:write",
        optional: false,
      },
    ],
    beforeValue: existing,
    nextValue,
  });
};

const resolveMenuItemExecutionOperation = (
  preview: AssistantActionPreviewChange,
  existing: MenuItemRecord | null,
  nextItem: MenuItemInput
): AssistantActionPreviewChange["operation"] => {
  if (!existing) return preview.operation === "noop" ? "noop" : "create";
  return isDeepStrictEqual(existing, nextItem) ? "noop" : "update";
};

export const buildMenuItemDeletePreview = async (
  action: AssistantMenuItemDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existingItems = flattenMenuNodes(await deps.listMenuItems(action.input.menuId));
  const existing = existingItems.find((item) => item.id === action.input.itemId) ?? null;
  const deleteIds = existing
    ? collectMenuItemDeleteIds(existingItems, existing.id)
    : new Set<string>();
  const matches =
    existing?.label === action.input.label &&
    (action.input.expectedHref === undefined || existing.href === action.input.expectedHref) &&
    (action.input.expectedParentId === undefined ||
      existing.parentId === action.input.expectedParentId);

  return createPreviewChange({
    action,
    targetType: "menu-item",
    targetKey: `${action.input.menuId}/${action.input.itemId}`,
    operation: "delete",
    summary: `Delete menu item "${action.input.label}"`,
    warnings:
      deleteIds.size > 1
        ? [
            `This menu item has ${deleteIds.size - 1} nested child item(s) that will also be removed.`,
          ]
        : [],
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Menu item no longer matches the planned delete target."
                : "Menu item was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          label: existing.label,
          href: existing.href,
          pageId: existing.pageId,
          parentId: existing.parentId,
          deleteIds: [...deleteIds].sort((left, right) => left.localeCompare(right)),
        }
      : null,
    nextValue: existing
      ? {
          remainingItems: existingItems.length - deleteIds.size,
        }
      : null,
  });
};

export const buildMenuItemUpdatePreview = async (
  action: AssistantMenuItemUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existingItems = flattenMenuNodes(await deps.listMenuItems(action.input.menuId));
  const existing = existingItems.find((item) => item.id === action.input.itemId) ?? null;
  const matches =
    existing?.label === action.input.label &&
    (action.input.expectedHref === undefined || existing.href === action.input.expectedHref) &&
    (action.input.expectedParentId === undefined ||
      existing.parentId === action.input.expectedParentId);
  const nextValue = existing
    ? {
        ...existing,
        ...action.input.patch,
      }
    : null;

  return createPreviewChange({
    action,
    targetType: "menu-item",
    targetKey: `${action.input.menuId}/${action.input.itemId}`,
    summary: `Update menu item "${action.input.label}"`,
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Menu item no longer matches the planned update target."
                : "Menu item was not found.",
            },
          ],
    beforeValue: existing,
    nextValue,
  });
};

const loadSeoActionTarget = async (
  action: AssistantSeoDocumentUpsertAction & { input: { targetId: string } },
  deps: ActionExecutorDeps
) => {
  if (action.input.targetType === "page") {
    const page = await deps.getPage(action.input.targetId);
    return page
      ? {
          id: page.id,
          title: page.title,
          slug: normalizeSeoSlugForAction(page.slug),
        }
      : null;
  }
  const entry = await deps.getEntry(action.input.targetId);
  return entry
    ? {
        id: entry.id,
        title: entry.title,
        slug: normalizeSeoSlugForAction(entry.slug),
      }
    : null;
};

const buildSeoNextValue = (
  action: AssistantSeoDocumentUpsertAction & { input: { targetId: string } },
  existing: Awaited<ReturnType<typeof getSeoDocumentByTarget>>,
  target: { title: string; slug: string | null }
) => ({
  targetType: action.input.targetType,
  targetId: action.input.targetId,
  slug:
    action.input.seo.slug !== undefined
      ? normalizeSeoSlugForAction(action.input.seo.slug)
      : (existing?.slug ?? target.slug),
  title:
    action.input.seo.title !== undefined
      ? action.input.seo.title
      : (existing?.title ?? target.title),
  description:
    action.input.seo.description !== undefined
      ? action.input.seo.description
      : (existing?.description ?? null),
  canonicalUrl:
    action.input.seo.canonicalUrl !== undefined
      ? action.input.seo.canonicalUrl
      : (existing?.canonicalUrl ?? null),
  robots:
    action.input.seo.robots !== undefined ? action.input.seo.robots : (existing?.robots ?? null),
});

export const buildSeoDocumentPreview = async (
  action: AssistantSeoDocumentUpsertAction,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const locator = await buildLocatorPreviewDependency(
    action.input.targetId,
    action.input.targetType,
    deps,
    ctx
  );
  const resolvedAction = locator.resolvedId
    ? {
        ...action,
        input: {
          ...action.input,
          targetId: locator.resolvedId,
        },
      }
    : null;
  const target = resolvedAction ? await loadSeoActionTarget(resolvedAction, deps) : null;
  const existing = target
    ? await deps.getSeoDocumentByTarget(action.input.targetType, target.id)
    : null;
  const nextValue =
    target && resolvedAction
      ? buildSeoNextValue(resolvedAction, existing, target)
      : {
          targetType: action.input.targetType,
          targetId: resourceIdInputKey(action.input.targetId),
          ...action.input.seo,
        };
  const targetKey = `${action.input.targetType}/${resourceIdInputKey(action.input.targetId)}`;

  return createPreviewChange({
    action,
    targetType: "seo-document",
    targetKey,
    summary: `${existing ? "Update" : "Create"} SEO document for ${targetKey}`,
    warnings: target || locator.pending ? [] : ["The SEO target does not exist."],
    dependencies: [locator.dependency],
    conflicts:
      target || locator.pending
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: "SEO target is required before the document can be updated.",
            },
          ],
    beforeValue: existing
      ? {
          targetType: existing.targetType,
          targetId: existing.targetId,
          slug: existing.slug,
          title: existing.title,
          description: existing.description,
          canonicalUrl: existing.canonicalUrl,
          robots: existing.robots,
        }
      : null,
    nextValue,
  });
};

export const buildSeoDocumentDeletePreview = async (
  action: AssistantSeoDocumentDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getSeoDocument(action.input.id);
  const expectedSlug = action.input.expectedSlug
    ? normalizeSeoSlugForAction(action.input.expectedSlug)
    : null;
  const matches =
    existing?.targetType === action.input.targetType &&
    existing.targetId === action.input.targetId &&
    (!expectedSlug || normalizeSeoSlugForAction(existing.slug) === expectedSlug) &&
    (!action.input.expectedTitle || existing.title === action.input.expectedTitle);

  return createPreviewChange({
    action,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${action.input.targetId}`,
    operation: "delete",
    summary: `Delete SEO document for ${action.input.targetType} ${action.input.targetId}`,
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "SEO document no longer matches the planned delete target."
                : "SEO document was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          targetType: existing.targetType,
          targetId: existing.targetId,
          slug: existing.slug,
          title: existing.title,
          status: existing.status,
        }
      : null,
    nextValue: null,
  });
};

export const buildSeoDocumentUpdatePreview = async (
  action: AssistantSeoDocumentUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getSeoDocument(action.input.id);
  const expectedSlug = action.input.expectedSlug
    ? normalizeSeoSlugForAction(action.input.expectedSlug)
    : null;
  const matches =
    existing?.targetType === action.input.targetType &&
    existing.targetId === action.input.targetId &&
    (!expectedSlug || normalizeSeoSlugForAction(existing.slug) === expectedSlug) &&
    (!action.input.expectedTitle || existing.title === action.input.expectedTitle);

  return createPreviewChange({
    action,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${action.input.targetId}`,
    summary: `Update SEO document for ${action.input.targetType} ${action.input.targetId}`,
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "SEO document no longer matches the planned update target."
                : "SEO document was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          title: existing.title,
          description: existing.description,
          canonicalUrl: existing.canonicalUrl,
          robots: existing.robots,
        }
      : null,
    nextValue: existing ? { ...existing, ...action.input.patch } : null,
  });
};

export const executeMenuUpsertAction = async (
  action: AssistantMenuUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await findMenuByLocation(action.input.location, deps);
  const record =
    preview.operation === "create"
      ? await deps.createMenu(action.input)
      : preview.operation === "update" && existing
        ? await deps.updateMenu(existing.id, action.input)
        : existing;
  if (!record) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "menu",
    targetKey: action.input.location,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: `/admin/menus/${encodeURIComponent(record.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Menu already matched the planned location."
        : `Menu "${record.name}" is ready.`,
  };
};

export const executeMenuItemAction = async (
  action: AssistantMenuItemUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "priorResults">
) => {
  const menuId = await resolveResourceIdInput(action.input.menuId, deps, ctx);
  const existingItems = flattenMenuNodes(await deps.listMenuItems(menuId));
  const existing = findMenuItemForAction(existingItems, action);
  const nextItem = buildNextMenuItem(action, existing, existingItems.length);
  const operation = resolveMenuItemExecutionOperation(preview, existing, nextItem);
  const nextItems =
    operation === "create"
      ? [...existingItems, nextItem]
      : operation === "update"
        ? existingItems.map((item) => (existing && item.id === existing.id ? nextItem : item))
        : existingItems;

  const tree =
    operation === "noop"
      ? await deps.listMenuItems(menuId)
      : await deps.replaceMenuItems(menuId, nextItems);
  const saved =
    flattenMenuNodes(tree).find((item) => item.href === action.input.href) ?? existing ?? null;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "menu-item",
    targetKey: `${menuId}/${action.input.href}`,
    operation,
    status: "success" as const,
    resourceId: saved?.id ?? null,
    adminHref: `/admin/menus/${encodeURIComponent(menuId)}`,
    publicHref: action.input.href,
    message:
      operation === "noop"
        ? "Menu item already matched the planned navigation link."
        : "Menu item is ready in navigation.",
  };
};

export const executeMenuItemDeleteAction = async (
  action: AssistantMenuItemDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existingItems = flattenMenuNodes(await deps.listMenuItems(action.input.menuId));
  const existing = existingItems.find((item) => item.id === action.input.itemId) ?? null;
  if (
    !existing ||
    existing.label !== action.input.label ||
    (action.input.expectedHref !== undefined && existing.href !== action.input.expectedHref) ||
    (action.input.expectedParentId !== undefined &&
      existing.parentId !== action.input.expectedParentId)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const deleted = await deps.deleteMenuItem(action.input.menuId, action.input.itemId);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "menu-item",
    targetKey: `${action.input.menuId}/${action.input.itemId}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.deleted.id,
    adminHref: `/admin/menus/${encodeURIComponent(action.input.menuId)}`,
    publicHref: deleted.deleted.href,
    message: `Deleted menu item "${deleted.deleted.label}".`,
  };
};

export const executeMenuItemUpdateAction = async (
  action: AssistantMenuItemUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existingItems = flattenMenuNodes(await deps.listMenuItems(action.input.menuId));
  const existing = existingItems.find((item) => item.id === action.input.itemId) ?? null;
  if (
    !existing ||
    existing.label !== action.input.label ||
    (action.input.expectedHref !== undefined && existing.href !== action.input.expectedHref) ||
    (action.input.expectedParentId !== undefined &&
      existing.parentId !== action.input.expectedParentId)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const nextItems = existingItems.map((item) =>
    item.id === existing.id
      ? {
          ...item,
          ...action.input.patch,
        }
      : item
  );
  const tree =
    preview.operation === "noop"
      ? await deps.listMenuItems(action.input.menuId)
      : await deps.replaceMenuItems(action.input.menuId, nextItems);
  const saved = flattenMenuNodes(tree).find((item) => item.id === existing.id) ?? null;
  if (!saved) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "menu-item",
    targetKey: `${action.input.menuId}/${action.input.itemId}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: saved.id,
    adminHref: `/admin/menus/${encodeURIComponent(action.input.menuId)}`,
    publicHref: saved.href,
    message:
      preview.operation === "noop"
        ? "Menu item already matched the planned patch."
        : `Updated menu item "${saved.label}".`,
  };
};

export const executeSeoDocumentAction = async (
  action: AssistantSeoDocumentUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "priorResults">
) => {
  const resolvedTargetId = await resolveResourceIdInput(action.input.targetId, deps, ctx);
  const resolvedAction = {
    ...action,
    input: {
      ...action.input,
      targetId: resolvedTargetId,
    },
  };
  const target = await loadSeoActionTarget(resolvedAction, deps);
  if (!target) {
    throw new Error("assistant_action_dependency_missing");
  }

  const existing = await deps.getSeoDocumentByTarget(action.input.targetType, resolvedTargetId);
  const nextValue = buildSeoNextValue(resolvedAction, existing, target);
  const record = preview.operation === "noop" ? existing : await deps.upsertSeoDocument(nextValue);

  return {
    actionId: action.id,
    type: action.type,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${resolvedTargetId}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: record ? `/admin/seo/${encodeURIComponent(record.id)}` : "/admin/seo",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "SEO document already matched the planned metadata."
        : "SEO document is ready.",
  };
};

export const executeSeoDocumentDeleteAction = async (
  action: AssistantSeoDocumentDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getSeoDocument(action.input.id);
  const expectedSlug = action.input.expectedSlug
    ? normalizeSeoSlugForAction(action.input.expectedSlug)
    : null;
  if (
    !existing ||
    existing.targetType !== action.input.targetType ||
    existing.targetId !== action.input.targetId ||
    (expectedSlug && normalizeSeoSlugForAction(existing.slug) !== expectedSlug) ||
    (action.input.expectedTitle && existing.title !== action.input.expectedTitle)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const deleted = await deps.deleteSeoDocument(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${action.input.targetId}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/seo",
    publicHref: null,
    message: `Deleted SEO document for ${deleted.targetType} ${deleted.targetId}.`,
  };
};

export const executeSeoDocumentUpdateAction = async (
  action: AssistantSeoDocumentUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getSeoDocument(action.input.id);
  const expectedSlug = action.input.expectedSlug
    ? normalizeSeoSlugForAction(action.input.expectedSlug)
    : null;
  if (
    !existing ||
    existing.targetType !== action.input.targetType ||
    existing.targetId !== action.input.targetId ||
    (expectedSlug && normalizeSeoSlugForAction(existing.slug) !== expectedSlug) ||
    (action.input.expectedTitle && existing.title !== action.input.expectedTitle)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateSeoDocumentById(existing.id, action.input.patch);
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "seo-document",
    targetKey: `${action.input.targetType}/${action.input.targetId}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/seo/${encodeURIComponent(updated.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "SEO document already matched the planned patch."
        : `Updated SEO document for ${updated.targetType} ${updated.targetId}.`,
  };
};
