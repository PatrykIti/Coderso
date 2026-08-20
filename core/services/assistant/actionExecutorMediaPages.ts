// Action-executor media-reference + detail-page previews and handlers (TASK-569-01). Bodies are byte-identical to the legacy monolith.

import type { DetailPageDocument } from "../content/detailPageTypes";
import type {
  AssistantActionExecutionItem,
  AssistantActionPreviewChange,
  AssistantDetailPageUpsertAction,
  AssistantMediaReferenceAttachAction,
} from "./actionPlanTypes";
import { createPreviewChange } from "./actionDiffService";
import type { ActionExecutorDeps, ActionHandlerContext } from "./actionExecutorTypes";
import { resolveResourceIdInput, buildLocatorPreviewDependency } from "./actionExecutorResourceIds";

const attachMediaReferenceValue = (currentValue: unknown, mediaId: string) => {
  if (Array.isArray(currentValue)) {
    const existing = currentValue.filter((item): item is string => typeof item === "string");
    return existing.includes(mediaId) ? existing : [...existing, mediaId];
  }
  return mediaId;
};

const buildMediaReferenceNextData = (
  action: AssistantMediaReferenceAttachAction,
  currentData: Record<string, unknown>
) => ({
  ...currentData,
  [action.input.field]: attachMediaReferenceValue(
    currentData[action.input.field],
    action.input.mediaId
  ),
});

export const buildMediaReferencePreview = async (
  action: AssistantMediaReferenceAttachAction,
  deps: ActionExecutorDeps
) => {
  const [media, entry] = await Promise.all([
    deps.getMediaById(action.input.mediaId),
    deps.getEntry(action.input.targetId),
  ]);
  const currentData = entry?.data ?? {};
  const nextData = entry ? buildMediaReferenceNextData(action, currentData) : null;
  const warnings = [
    ...(media ? [] : ["The media asset does not exist."]),
    ...(entry ? [] : ["The entry target does not exist."]),
  ];

  return createPreviewChange({
    action,
    targetType: "media-reference",
    targetKey: `${action.input.targetType}/${action.input.targetId}/${action.input.field}`,
    summary: `Attach media ${action.input.mediaId} to entry field "${action.input.field}"`,
    warnings,
    dependencies: [
      {
        actionId: null,
        targetType: "media",
        targetKey: action.input.mediaId,
        optional: false,
      },
      {
        actionId: null,
        targetType: action.input.targetType,
        targetKey: action.input.targetId,
        optional: false,
      },
    ],
    conflicts:
      media && entry
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message:
                "Media asset and entry target are required before the reference can be attached.",
            },
          ],
    beforeValue: entry
      ? {
          field: action.input.field,
          value: currentData[action.input.field] ?? null,
        }
      : null,
    nextValue: entry
      ? {
          field: action.input.field,
          value: nextData?.[action.input.field] ?? null,
        }
      : action.input,
  });
};

const summarizeDetailPageDocument = (document: DetailPageDocument) => ({
  id: document.id,
  name: document.name,
  status: document.status,
  contentTypeId: document.contentTypeId,
  contentTypeSlug: document.contentTypeSlug,
  titlePattern: document.titlePattern,
  // Preview metadata may still describe a rejected v1-shaped plan document
  // (TASK-580-03-L06): v1 payloads fail closed at the strict write
  // normalizer, so summarize whichever body the invalid payload carried.
  blocksCount: Array.isArray(document.sections)
    ? document.sections.reduce((count, section) => count + section.blocks.length, 0)
    : (document.blocks?.length ?? 0),
  bindingsCount: document.bindings.length,
  relatedCount: document.related?.length ?? 0,
  publicImpact:
    document.status === "published" ? "published-detail-template" : "draft-detail-template",
});

/**
 * Detail-page documents are authored as schemaVersion 2 sections only
 * (TASK-580-03-L06). v1 `blocks` payloads must fail closed at the strict
 * write normalizer with `detail_page_legacy_v1_invalid`; no v1→v2 bridge
 * runs in any assistant path.
 */
const resolveDetailPageActionDocument = async (
  action: AssistantDetailPageUpsertAction,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "priorResults">
) => {
  if (action.input.contentTypeId === undefined) return action.input.document;
  const contentTypeId = await resolveResourceIdInput(action.input.contentTypeId, deps, ctx);
  return {
    ...action.input.document,
    contentTypeId,
  };
};

export const buildDetailPagePreview = async (
  action: AssistantDetailPageUpsertAction,
  ctx: ActionHandlerContext
) => {
  const targetKey = action.input.document.id;
  const contentTypeDependency =
    action.input.contentTypeId === undefined
      ? null
      : await buildLocatorPreviewDependency(
          action.input.contentTypeId,
          "content-type",
          ctx.deps,
          ctx
        );

  if (contentTypeDependency?.pending) {
    const existing = await ctx.deps.getDetailPageDocument(action.input.document.id);
    return createPreviewChange({
      action,
      targetType: "detail-page",
      targetKey,
      summary: `${existing ? "Update" : "Create"} detail template ${action.input.document.name}`,
      dependencies: [contentTypeDependency.dependency],
      beforeValue: existing ? summarizeDetailPageDocument(existing.currentDocument) : null,
      nextValue: summarizeDetailPageDocument(action.input.document),
    });
  }

  if (contentTypeDependency && !contentTypeDependency.resolvedId) {
    return createPreviewChange({
      action,
      targetType: "detail-page",
      targetKey,
      summary: `Create/update detail template ${action.input.document.name}`,
      dependencies: [contentTypeDependency.dependency],
      conflicts: [
        {
          code: "assistant_action_locator_unresolved",
          severity: "error",
          message: "The detail template content type locator could not be resolved.",
        },
      ],
      beforeValue: null,
      nextValue: summarizeDetailPageDocument(action.input.document),
    });
  }

  const document =
    contentTypeDependency?.resolvedId !== undefined && contentTypeDependency.resolvedId !== null
      ? {
          ...action.input.document,
          contentTypeId: contentTypeDependency.resolvedId,
        }
      : action.input.document;

  try {
    const prepared = await ctx.deps.prepareDetailPageDocumentUpsert({
      document,
      expectedExistingId: action.input.expectedExistingId,
    });

    return createPreviewChange({
      action,
      targetType: "detail-page",
      targetKey,
      summary: `${prepared.existing ? "Update" : "Create"} detail template ${prepared.document.name}`,
      dependencies: [
        {
          actionId: null,
          targetType: "content-type",
          targetKey: prepared.contentType.id,
          optional: false,
        },
      ],
      beforeValue: prepared.existing
        ? summarizeDetailPageDocument(prepared.existing.currentDocument)
        : null,
      nextValue: summarizeDetailPageDocument(prepared.document),
    });
  } catch (error) {
    const code =
      error instanceof Error &&
      (error.message === "detail_page_conflict" ||
        error.message === "detail_page_content_type_mismatch" ||
        error.message === "detail_page_legacy_v1_invalid")
        ? error.message
        : "detail_page_invalid";
    const message =
      code === "detail_page_conflict"
        ? "expectedExistingId does not match the detail template id being upserted."
        : code === "detail_page_content_type_mismatch"
          ? "The existing detail template id belongs to a different content type."
          : code === "detail_page_legacy_v1_invalid"
            ? "Legacy schemaVersion 1 detail-page documents are no longer accepted; re-author with schemaVersion 2 sections."
            : "The detail template document or its linked content type is invalid.";

    return createPreviewChange({
      action,
      targetType: "detail-page",
      targetKey,
      summary: `Create/update detail template ${action.input.document.name}`,
      conflicts: [
        {
          code,
          severity: "error",
          message,
        },
      ],
      dependencies: [
        {
          actionId: null,
          targetType: "content-type",
          targetKey: action.input.document.contentTypeId,
          optional: false,
        },
      ],
      beforeValue: null,
      nextValue: summarizeDetailPageDocument(action.input.document),
    });
  }
};

export const executeMediaReferenceAction = async (
  action: AssistantMediaReferenceAttachAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const [media, entry] = await Promise.all([
    deps.getMediaById(action.input.mediaId),
    deps.getEntry(action.input.targetId),
  ]);
  if (!media || !entry) {
    throw new Error("assistant_action_dependency_missing");
  }

  const nextData = buildMediaReferenceNextData(action, entry.data);
  const record =
    preview.operation === "noop"
      ? entry
      : await deps.updateEntry(entry.id, {
          data: nextData,
        });

  return {
    actionId: action.id,
    type: action.type,
    targetType: "media-reference",
    targetKey: `${action.input.targetType}/${action.input.targetId}/${action.input.field}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/entries",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Media reference already matched the planned field value."
        : "Media reference is attached to the entry draft.",
  };
};

export const executeDetailPageAction = async (
  action: AssistantDetailPageUpsertAction,
  preview: AssistantActionPreviewChange,
  ctx: ActionHandlerContext
): Promise<AssistantActionExecutionItem> => {
  const prepared = await ctx.deps.prepareDetailPageDocumentUpsert({
    document: await resolveDetailPageActionDocument(action, ctx.deps, ctx),
    expectedExistingId: action.input.expectedExistingId,
  });
  const targetKey = `${prepared.contentType.slug}/${prepared.document.id}`;
  const beforeRecord = prepared.existing;
  const record =
    preview.operation === "noop"
      ? prepared.existing
      : (
          await ctx.deps.upsertDetailPageDocument({
            document: prepared.document,
            expectedExistingId: action.input.expectedExistingId,
          })
        ).record;

  const finalRecord = record ?? beforeRecord;
  if (!finalRecord) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "detail-page",
    targetKey,
    operation: preview.operation,
    status: "success",
    resourceId: finalRecord.id,
    adminHref: `/admin/advanced/engine/${encodeURIComponent(
      prepared.contentType.id
    )}/collection/detail-template/${encodeURIComponent(finalRecord.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Detail template already matched the planned document."
        : `Detail template "${finalRecord.name}" is ready for ${prepared.contentType.slug}.`,
  };
};
