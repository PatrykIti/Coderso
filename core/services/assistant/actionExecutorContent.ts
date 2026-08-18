// Action-executor content route + content type previews and handlers (TASK-569-01). Bodies are byte-identical to the legacy monolith.

import type { ContentRouteSetting } from "../settings/settingsContracts";
import { mergeContentTypeSchemaFields } from "../content/contentTypeSchemaFields";
import { normalizeSitePath } from "../../site/cache/siteCache";
import type {
  AssistantActionExecutionItem,
  AssistantActionPreviewChange,
  AssistantContentRouteUpsertAction,
  AssistantContentTypeFieldAddAction,
  AssistantContentTypeUpsertAction,
  AssistantContentTypeDeleteAction,
} from "./actionPlanTypes";
import { createPreviewChange } from "./actionDiffService";
import type { ActionExecutorDeps } from "./actionExecutorTypes";

export const buildContentRoutePreview = async (
  action: AssistantContentRouteUpsertAction,
  deps: ActionExecutorDeps
) => {
  const current = ((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
  const existing = current.find((entry) => entry.type === action.input.typeSlug) ?? null;
  const nextValue = buildContentRouteRecord(existing, action.input);
  const warnings =
    action.input.listPath !== normalizeSitePath(action.input.detailPath.replace("/:slug", ""))
      ? [
          "The public catalog page stays separate from the system list route so custom page content is not shadowed by runtime list routing.",
        ]
      : [];

  return createPreviewChange({
    action,
    targetType: "content-route",
    targetKey: action.input.typeSlug,
    summary: `${existing ? "Update" : "Create"} content route ${action.input.detailPath}`,
    warnings,
    beforeValue: existing,
    nextValue,
  });
};

export const buildContentTypePreview = async (
  action: AssistantContentTypeUpsertAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  return createPreviewChange({
    action,
    targetType: "content-type",
    targetKey: action.input.slug,
    summary: `${existing ? "Update" : "Create"} content type "${action.input.name}"`,
    beforeValue: existing
      ? {
          name: existing.name,
          slug: existing.slug,
          schema: existing.schema,
        }
      : null,
    nextValue: action.input,
  });
};

export const buildContentTypeFieldAddPreview = async (
  action: AssistantContentTypeFieldAddAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  const matches = existing?.id === action.input.id && existing.name === action.input.name;
  let nextSchema: Record<string, unknown> | null = null;
  const conflicts: AssistantActionPreviewChange["conflicts"] = [];
  if (!existing || !matches) {
    conflicts.push({
      code: "assistant_action_dependency_missing",
      severity: "error",
      message: existing
        ? "Content type no longer matches the planned field-add target."
        : "Content type was not found.",
    });
  } else {
    try {
      nextSchema = mergeContentTypeSchemaFields(
        existing.schema as Record<string, unknown>,
        action.input.fields
      );
    } catch (error) {
      conflicts.push({
        code: "assistant_action_dependency_conflict",
        severity: "error",
        message:
          error instanceof Error && error.message === "content_type_field_conflict"
            ? "One or more planned fields already exist on this content type."
            : "Planned fields cannot be merged into the current content type schema.",
      });
    }
  }

  return createPreviewChange({
    action,
    targetType: "content-type",
    targetKey: action.input.slug,
    operation: "update",
    summary: `Add ${action.input.fields.length} field(s) to content type "${action.input.name}"`,
    conflicts,
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
          schema: existing.schema,
        }
      : null,
    nextValue:
      existing && nextSchema
        ? {
            id: existing.id,
            name: existing.name,
            slug: existing.slug,
            schema: nextSchema,
          }
        : null,
  });
};

export const buildContentTypeDeletePreview = async (
  action: AssistantContentTypeDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  const matches = existing?.id === action.input.id && existing.name === action.input.name;
  const entryCount = Math.max(0, Math.floor(action.input.expectedEntryCount ?? 0));
  return createPreviewChange({
    action,
    targetType: "content-type",
    targetKey: action.input.slug,
    operation: "delete",
    summary: `Delete content type "${action.input.name}"`,
    warnings:
      entryCount > 0
        ? [`This content type has ${entryCount} entries and cannot be safely deleted alone.`]
        : [],
    conflicts:
      existing && matches && entryCount === 0
        ? []
        : [
            {
              code:
                entryCount > 0
                  ? "assistant_action_dependency_conflict"
                  : "assistant_action_dependency_missing",
              severity: "error",
              message:
                entryCount > 0
                  ? "Content type still has entries and needs a broader reviewed delete plan."
                  : existing
                    ? "Content type no longer matches the planned delete target."
                    : "Content type was not found.",
            },
          ],
    beforeValue: existing ? { id: existing.id, name: existing.name, slug: existing.slug } : null,
    nextValue: null,
  });
};

const mergeContentRoute = (current: ContentRouteSetting[], nextRoute: ContentRouteSetting) => {
  const filtered = current.filter((entry) => entry.type !== nextRoute.type);
  return [...filtered, nextRoute].sort((left, right) => left.type.localeCompare(right.type));
};

const buildContentRouteRecord = (
  existing: ContentRouteSetting | null,
  input: AssistantContentRouteUpsertAction["input"]
): ContentRouteSetting => ({
  type: input.typeSlug,
  listPath: input.listPath,
  detailPath: input.detailPath,
  enabled: input.enabled,
  ...(Object.prototype.hasOwnProperty.call(input, "detailPageId")
    ? { detailPageId: input.detailPageId ?? null }
    : existing && Object.prototype.hasOwnProperty.call(existing, "detailPageId")
      ? { detailPageId: existing.detailPageId ?? null }
      : {}),
});

export const executeContentRouteAction = async (
  action: AssistantContentRouteUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const current = ((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
  const existing = current.find((entry) => entry.type === action.input.typeSlug) ?? null;
  const nextRoute = buildContentRouteRecord(existing, action.input);

  if (preview.operation !== "noop") {
    await deps.setSetting("site.contentRoutes", mergeContentRoute(current, nextRoute));
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "content-route",
    targetKey: action.input.typeSlug,
    operation: preview.operation,
    status: "success",
    resourceId: action.input.typeSlug,
    adminHref: "/admin/settings/site",
    publicHref: action.input.detailPath.replace(":slug", "example-project"),
    message:
      preview.operation === "noop"
        ? "Public detail route already matched the desired contract."
        : "Public detail route updated.",
  };
};

export const executeContentTypeAction = async (
  action: AssistantContentTypeUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  const record =
    preview.operation === "create"
      ? await deps.createContentType(action.input)
      : preview.operation === "update" && existing
        ? await deps.updateContentType(existing.id, {
            name: action.input.name,
            slug: action.input.slug,
            schema: action.input.schema,
          })
        : existing;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "content-type",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/engine",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Content type already matched the planned schema."
        : "Content type is ready.",
  };
};

export const executeContentTypeFieldAddAction = async (
  action: AssistantContentTypeFieldAddAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  if (!existing || existing.id !== action.input.id || existing.name !== action.input.name) {
    throw new Error("assistant_action_dependency_missing");
  }
  const nextSchema = mergeContentTypeSchemaFields(
    existing.schema as Record<string, unknown>,
    action.input.fields
  );
  const record =
    preview.operation === "noop"
      ? existing
      : await deps.updateContentType(existing.id, {
          schema: nextSchema,
        });
  if (!record) throw new Error("assistant_action_dependency_missing");
  return {
    actionId: action.id,
    type: action.type,
    targetType: "content-type",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: `/admin/advanced/engine/${encodeURIComponent(record.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Content type already had the planned fields."
        : "Content type fields were updated.",
  };
};

export const executeContentTypeDeleteAction = async (
  action: AssistantContentTypeDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const entryCount = Math.max(0, Math.floor(action.input.expectedEntryCount ?? 0));
  const existing = await deps.getContentTypeBySlug(action.input.slug);
  if (
    !existing ||
    existing.id !== action.input.id ||
    existing.name !== action.input.name ||
    entryCount > 0
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const deleted = await deps.deleteContentType(existing.id);
  if (!deleted) throw new Error("assistant_action_dependency_missing");
  return {
    actionId: action.id,
    type: action.type,
    targetType: "content-type",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/engine",
    publicHref: null,
    message: `Deleted content type "${deleted.name}".`,
  };
};
