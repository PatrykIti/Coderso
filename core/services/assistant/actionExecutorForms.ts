// Action-executor form + entry previews and handlers (TASK-569-01). Bodies are byte-identical to the legacy monolith.

import { isDeepStrictEqual } from "node:util";
import type { ContentRouteSetting } from "../settings/settingsContracts";
import type { FormFieldInput } from "../forms/validation";
import { normalizeSitePath } from "../../site/cache/siteCache";
import type {
  AssistantActionExecutionItem,
  AssistantActionPreviewChange,
  AssistantEntryUpsertDraftAction,
  AssistantEntryDeleteAction,
  AssistantEntrySampleCreateAction,
  AssistantEntryUpdateAction,
  AssistantFormUpsertAction,
  AssistantFormDeleteAction,
  AssistantFormArchiveAction,
  AssistantFormUpdateAction,
  AssistantFormAutomationUpsertAction,
} from "./actionPlanTypes";
import { createPreviewChange } from "./actionDiffService";
import type { ActionExecutorDeps } from "./actionExecutorTypes";

export const buildFormAutomationPreview = async (
  action: AssistantFormAutomationUpsertAction,
  deps: ActionExecutorDeps
) => {
  const form = (await deps.listForms()).find((entry) => entry.id === action.input.formId) ?? null;
  const actions = form ? await deps.listFormActions(action.input.formId) : [];
  const existing = actions.find((entry) => entry.id === action.input.action.id) ?? null;
  const nextActions = existing
    ? actions.map((entry) => (entry.id === action.input.action.id ? action.input.action : entry))
    : [...actions, { ...action.input.action, orderIndex: actions.length }];

  return createPreviewChange({
    action,
    targetType: "form-action",
    targetKey: `${action.input.formId}/${action.input.action.id}`,
    summary: `${existing ? "Update" : "Create"} form automation "${action.input.action.label}"`,
    warnings: form ? [] : ["The form does not exist."],
    conflicts: form
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error",
            message: "Form is required before automation can be updated.",
          },
        ],
    beforeValue: form
      ? {
          actions,
        }
      : null,
    nextValue: form
      ? {
          actions: nextActions,
        }
      : null,
  });
};

export const buildFormPreview = async (
  action: AssistantFormUpsertAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listForms()).find((entry) => entry.slug === action.input.slug) ?? null;
  return createPreviewChange({
    action,
    targetType: "form",
    targetKey: action.input.slug,
    summary: `${existing ? "Update" : "Create"} form "${action.input.name}"`,
    beforeValue: existing,
    nextValue: action.input,
  });
};

export const buildFormDeletePreview = async (
  action: AssistantFormDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getForm(action.input.id);
  const submissionCount = existing ? await deps.countFormSubmissions(existing.id) : 0;
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    existing.slug === action.input.slug &&
    (!expectedStatus || existing.status === expectedStatus);

  return createPreviewChange({
    action,
    targetType: "form",
    targetKey: action.input.slug,
    operation: "delete",
    summary: `Delete form "${action.input.name}"`,
    warnings:
      submissionCount > 0
        ? [
            `This form has ${submissionCount} submission${submissionCount === 1 ? "" : "s"} and cannot be safely hard-deleted.`,
          ]
        : [],
    conflicts:
      existing && matches && submissionCount === 0
        ? []
        : [
            {
              code:
                submissionCount > 0
                  ? "assistant_action_dependency_conflict"
                  : "assistant_action_dependency_missing",
              severity: "error",
              message:
                submissionCount > 0
                  ? "Form submissions must be retained; archive the form instead of hard-deleting it."
                  : existing
                    ? "Form no longer matches the planned delete target."
                    : "Form was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
          status: existing.status,
          submissionCount,
        }
      : null,
    nextValue: null,
  });
};

export const buildFormArchivePreview = async (
  action: AssistantFormArchiveAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getForm(action.input.id);
  const submissionCount = existing ? await deps.countFormSubmissions(existing.id) : 0;
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    existing.slug === action.input.slug &&
    (!expectedStatus || existing.status === expectedStatus || existing.status === "archived");
  const beforeValue = existing
    ? {
        id: existing.id,
        name: existing.name,
        slug: existing.slug,
        status: existing.status,
        submissionCount,
      }
    : null;
  const nextValue = existing
    ? {
        id: existing.id,
        name: existing.name,
        slug: existing.slug,
        status: "archived",
        submissionCount,
      }
    : null;

  return createPreviewChange({
    action,
    targetType: "form",
    targetKey: action.input.slug,
    summary: `Archive form "${action.input.name}"`,
    warnings:
      submissionCount > 0
        ? ["Existing submissions are retained and submission payloads are not exposed."]
        : [],
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Form no longer matches the planned archive target."
                : "Form was not found.",
            },
          ],
    beforeValue,
    nextValue,
  });
};

export const buildFormUpdatePreview = async (
  action: AssistantFormUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getForm(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    existing.slug === action.input.slug &&
    (!expectedStatus || existing.status === expectedStatus);

  return createPreviewChange({
    action,
    targetType: "form",
    targetKey: action.input.slug,
    summary: `Update form "${action.input.name}"`,
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Form no longer matches the planned update target."
                : "Form was not found.",
            },
          ],
    beforeValue: existing,
    nextValue: existing ? { ...existing, ...action.input.patch } : null,
  });
};

export const buildEntryUpsertDraftPreview = async (
  action: AssistantEntryUpsertDraftAction,
  deps: ActionExecutorDeps
) => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  const existing = contentType
    ? await deps.getEntryBySlug(contentType.id, action.input.slug)
    : null;

  return createPreviewChange({
    action,
    targetType: "entry",
    targetKey: `${action.input.contentTypeSlug}/${action.input.slug}`,
    summary: `${existing ? "Update" : "Create"} draft entry "${action.input.title}"`,
    warnings: contentType
      ? []
      : ["The content type does not exist yet and must be created earlier in the plan."],
    dependencies: [
      {
        actionId: null,
        targetType: "content-type",
        targetKey: action.input.contentTypeSlug,
        optional: false,
      },
    ],
    beforeValue: existing
      ? {
          title: existing.title,
          slug: existing.slug,
          data: existing.data,
        }
      : null,
    nextValue: {
      title: action.input.title,
      slug: action.input.slug,
      data: action.input.values,
    },
  });
};

const buildEntryPublicHref = async (
  contentTypeSlug: string,
  entrySlug: string,
  deps: ActionExecutorDeps
) => {
  const routes = ((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
  const route = routes.find((entry) => entry.type === contentTypeSlug && entry.enabled);
  if (!route?.detailPath) return null;
  return normalizeSitePath(route.detailPath.replace(":slug", entrySlug));
};

const readEntrySeoForPreview = async (entryId: string | null, deps: ActionExecutorDeps) =>
  entryId ? await deps.getSeoDocumentByTarget("entry", entryId) : null;

export const buildEntrySampleCreatePreview = async (
  action: AssistantEntrySampleCreateAction,
  deps: ActionExecutorDeps
) => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  const existing = contentType
    ? await deps.getEntryBySlug(contentType.id, action.input.slug)
    : null;
  const existingSeo = await readEntrySeoForPreview(existing?.id ?? null, deps);
  const existingSeoRecord = existingSeo as Record<string, unknown> | null;
  const seoMatches =
    action.input.seo === undefined ||
    (Boolean(existingSeo) &&
      Object.entries(action.input.seo).every(([key, value]) => existingSeoRecord?.[key] === value));
  const beforeValue = existing
    ? {
        title: existing.title,
        slug: existing.slug,
        status: existing.status,
        data: existing.data,
        seo: existingSeo
          ? {
              title: existingSeo.title,
              description: existingSeo.description,
              canonicalUrl: existingSeo.canonicalUrl,
              robots: existingSeo.robots,
            }
          : null,
      }
    : null;
  const nextValue = {
    title: action.input.title,
    slug: action.input.slug,
    status: action.input.status,
    data: action.input.values,
    seo: action.input.seo ?? null,
  };
  const operation =
    existing &&
    existing.status === "published" &&
    existing.title === action.input.title &&
    existing.slug === action.input.slug &&
    isDeepStrictEqual(existing.data, action.input.values) &&
    seoMatches
      ? "noop"
      : undefined;

  return createPreviewChange({
    action,
    targetType: "entry",
    targetKey: `${action.input.contentTypeSlug}/${action.input.slug}`,
    operation,
    summary: `${existing ? "Update" : "Create"} public sample entry "${action.input.title}"`,
    warnings: contentType
      ? ["Publishing this sample entry may make it visible on the public site."]
      : ["The content type does not exist yet and must be created earlier in the plan."],
    dependencies: [
      {
        actionId: null,
        targetType: "content-type",
        targetKey: action.input.contentTypeSlug,
        optional: false,
      },
    ],
    beforeValue,
    nextValue,
  });
};

export const buildEntryDeletePreview = async (
  action: AssistantEntryDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getEntry(action.input.id);
  const contentType = action.input.contentTypeSlug
    ? await deps.getContentTypeBySlug(action.input.contentTypeSlug)
    : null;
  const matches =
    Boolean(existing) &&
    (!action.input.expectedTitle || existing?.title === action.input.expectedTitle) &&
    (!action.input.expectedSlug || existing?.slug === action.input.expectedSlug) &&
    (!action.input.expectedStatus || existing?.status === action.input.expectedStatus) &&
    (!contentType || existing?.typeId === contentType.id);

  return createPreviewChange({
    action,
    targetType: "entry",
    targetKey: action.input.expectedSlug ?? action.input.id,
    operation: "delete",
    summary: `Delete entry "${action.input.expectedTitle ?? action.input.id}"`,
    warnings:
      existing?.status === "published"
        ? ["This entry is published and may be visible on the public site."]
        : [],
    conflicts: matches
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error",
            message: existing
              ? "Entry no longer matches the planned delete target."
              : "Entry was not found.",
          },
        ],
    beforeValue: existing
      ? {
          id: existing.id,
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
          typeId: existing.typeId,
        }
      : null,
    nextValue: null,
  });
};

export const buildEntryUpdatePreview = async (
  action: AssistantEntryUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getEntry(action.input.id);
  const contentType = action.input.contentTypeSlug
    ? await deps.getContentTypeBySlug(action.input.contentTypeSlug)
    : null;
  const matches =
    Boolean(existing) &&
    (!action.input.expectedTitle || existing?.title === action.input.expectedTitle) &&
    (!action.input.expectedSlug || existing?.slug === action.input.expectedSlug) &&
    (!action.input.expectedStatus || existing?.status === action.input.expectedStatus) &&
    (!contentType || existing?.typeId === contentType.id);

  return createPreviewChange({
    action,
    targetType: "entry",
    targetKey: action.input.expectedSlug ?? action.input.id,
    summary: `Update entry "${action.input.expectedTitle ?? action.input.id}"`,
    warnings:
      action.input.patch.status === "published"
        ? ["Publishing this entry may make it visible on the public site."]
        : [],
    conflicts: matches
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error",
            message: existing
              ? "Entry no longer matches the planned update target."
              : "Entry was not found.",
          },
        ],
    beforeValue: existing
      ? {
          id: existing.id,
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
          data: existing.data,
          seo: existing.seo,
        }
      : null,
    nextValue: existing
      ? {
          title: action.input.patch.title ?? existing.title,
          slug: action.input.patch.slug ?? existing.slug,
          status: action.input.patch.status ?? existing.status,
          data: action.input.patch.values
            ? { ...existing.data, ...action.input.patch.values }
            : existing.data,
          seo: action.input.patch.seo
            ? { ...(existing.seo ?? {}), ...action.input.patch.seo }
            : existing.seo,
        }
      : null,
  });
};

export const executeFormAutomationAction = async (
  action: AssistantFormAutomationUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const form = (await deps.listForms()).find((entry) => entry.id === action.input.formId) ?? null;
  if (!form) {
    throw new Error("assistant_action_dependency_missing");
  }
  const actions = await deps.listFormActions(action.input.formId);
  const existing = actions.find((entry) => entry.id === action.input.action.id) ?? null;
  const nextActions = existing
    ? actions.map((entry) => (entry.id === action.input.action.id ? action.input.action : entry))
    : [...actions, { ...action.input.action, orderIndex: actions.length }];
  const saved =
    preview.operation === "noop"
      ? actions
      : await deps.setFormActions(action.input.formId, nextActions);
  const record = saved.find((entry) => entry.id === action.input.action.id) ?? null;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "form-action",
    targetKey: `${action.input.formId}/${action.input.action.id}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: `/admin/advanced/forms/${encodeURIComponent(action.input.formId)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Form automation already matched the planned action."
        : "Form automation is updated.",
  };
};

export const executeFormAction = async (
  action: AssistantFormUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listForms()).find((entry) => entry.slug === action.input.slug) ?? null;
  const payload = {
    name: action.input.name,
    slug: action.input.slug,
    status: action.input.status,
    description: action.input.description,
    successMessage: action.input.successMessage,
    submissionAccess: action.input.submissionAccess,
  };
  const form =
    preview.operation === "create"
      ? await deps.createForm(payload)
      : preview.operation === "update" && existing
        ? await deps.updateForm(existing.id, payload)
        : existing;

  if (!form) {
    throw new Error("assistant_action_dependency_missing");
  }

  if (preview.operation !== "noop") {
    await deps.setFormFields(form.id, action.input.fields as unknown as FormFieldInput[]);
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "form",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: form.id,
    adminHref: `/admin/advanced/forms/${encodeURIComponent(form.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Inquiry form already matched the plan."
        : "Inquiry form is ready for catalog pages.",
  };
};

export const executeFormDeleteAction = async (
  action: AssistantFormDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getForm(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    existing.slug !== action.input.slug ||
    (expectedStatus && existing.status !== expectedStatus)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const submissionCount = await deps.countFormSubmissions(existing.id);
  if (submissionCount > 0) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const deleted = await deps.deleteForm(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "form",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/forms",
    publicHref: null,
    message: `Deleted form "${deleted.name}".`,
  };
};

export const executeFormArchiveAction = async (
  action: AssistantFormArchiveAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getForm(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    existing.slug !== action.input.slug ||
    (expectedStatus && existing.status !== expectedStatus && existing.status !== "archived")
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const archived =
    existing.status === "archived"
      ? existing
      : await deps.updateForm(existing.id, { status: "archived" });
  if (!archived) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "form",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: archived.id,
    adminHref: `/admin/advanced/forms/${encodeURIComponent(archived.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? `Form "${archived.name}" was already archived.`
        : `Archived form "${archived.name}".`,
  };
};

export const executeFormUpdateAction = async (
  action: AssistantFormUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getForm(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    existing.slug !== action.input.slug ||
    (expectedStatus && existing.status !== expectedStatus)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateForm(existing.id, action.input.patch);
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "form",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/advanced/forms/${encodeURIComponent(updated.id)}`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Form already matched the planned patch."
        : `Updated form "${updated.name}".`,
  };
};

export const executeEntryUpsertDraftAction = async (
  action: AssistantEntryUpsertDraftAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
) => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  if (!contentType) {
    throw new Error("assistant_action_dependency_missing");
  }

  const existing = await deps.getEntryBySlug(contentType.id, action.input.slug);
  const record =
    preview.operation === "create"
      ? await deps.createEntry(contentType.id, {
          title: action.input.title,
          slug: action.input.slug,
          data: action.input.values,
          authorId: actorId,
        })
      : preview.operation === "update" && existing
        ? await deps.updateEntry(existing.id, {
            title: action.input.title,
            slug: action.input.slug,
            data: action.input.values,
          })
        : existing;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "entry",
    targetKey: `${action.input.contentTypeSlug}/${action.input.slug}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: record
      ? `/admin/advanced/entries/${encodeURIComponent(action.input.contentTypeSlug)}/${encodeURIComponent(record.id)}`
      : "/admin/advanced/entries",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Draft entry already matched the planned data."
        : "Draft entry is ready in Coderso Entries.",
  };
};

export const executeEntrySampleCreateAction = async (
  action: AssistantEntrySampleCreateAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
) => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  if (!contentType) {
    throw new Error("assistant_action_dependency_missing");
  }

  const existing = await deps.getEntryBySlug(contentType.id, action.input.slug);
  const needsEntryUpdate =
    !existing ||
    existing.title !== action.input.title ||
    existing.slug !== action.input.slug ||
    !isDeepStrictEqual(existing.data, action.input.values);

  const upserted =
    preview.operation === "create"
      ? await deps.createEntry(contentType.id, {
          title: action.input.title,
          slug: action.input.slug,
          data: action.input.values,
          authorId: actorId,
        })
      : preview.operation === "update" && existing && needsEntryUpdate
        ? await deps.updateEntry(existing.id, {
            title: action.input.title,
            slug: action.input.slug,
            data: action.input.values,
          })
        : existing;
  if (!upserted) throw new Error("assistant_action_dependency_missing");

  if (action.input.seo && preview.operation !== "noop") {
    await deps.updateEntryMetadata(upserted.id, { seo: action.input.seo }, actorId);
  }

  const record =
    preview.operation === "noop" ? upserted : await deps.publishEntry(upserted.id, actorId);
  if (!record) throw new Error("assistant_action_dependency_missing");
  const publicHref = await buildEntryPublicHref(action.input.contentTypeSlug, record.slug, deps);

  return {
    actionId: action.id,
    type: action.type,
    targetType: "entry",
    targetKey: `${action.input.contentTypeSlug}/${action.input.slug}`,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: `/admin/advanced/entries/${encodeURIComponent(action.input.contentTypeSlug)}/${encodeURIComponent(record.id)}`,
    publicHref,
    message:
      preview.operation === "noop"
        ? "Public sample entry already matched the planned data."
        : "Public sample entry is published.",
  };
};

export const executeEntryDeleteAction = async (
  action: AssistantEntryDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getEntry(action.input.id);
  const contentType = action.input.contentTypeSlug
    ? await deps.getContentTypeBySlug(action.input.contentTypeSlug)
    : null;
  if (
    !existing ||
    (action.input.expectedTitle && existing.title !== action.input.expectedTitle) ||
    (action.input.expectedSlug && existing.slug !== action.input.expectedSlug) ||
    (action.input.expectedStatus && existing.status !== action.input.expectedStatus) ||
    (contentType && existing.typeId !== contentType.id)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const deleted = await deps.deleteEntry(existing.id);
  if (!deleted) throw new Error("assistant_action_dependency_missing");
  return {
    actionId: action.id,
    type: action.type,
    targetType: "entry",
    targetKey: action.input.expectedSlug ?? action.input.id,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: action.input.contentTypeSlug
      ? `/admin/advanced/entries/${encodeURIComponent(action.input.contentTypeSlug)}`
      : "/admin/advanced/entries",
    publicHref: null,
    message: `Deleted entry "${deleted.title}".`,
  };
};

export const executeEntryUpdateAction = async (
  action: AssistantEntryUpdateAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getEntry(action.input.id);
  const contentType = action.input.contentTypeSlug
    ? await deps.getContentTypeBySlug(action.input.contentTypeSlug)
    : null;
  if (
    !existing ||
    (action.input.expectedTitle && existing.title !== action.input.expectedTitle) ||
    (action.input.expectedSlug && existing.slug !== action.input.expectedSlug) ||
    (action.input.expectedStatus && existing.status !== action.input.expectedStatus) ||
    (contentType && existing.typeId !== contentType.id)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const data = action.input.patch.values
    ? { ...existing.data, ...action.input.patch.values }
    : existing.data;
  const entry =
    preview.operation === "noop"
      ? existing
      : await deps.updateEntry(existing.id, {
          title: action.input.patch.title ?? existing.title,
          slug: action.input.patch.slug ?? existing.slug,
          data,
        });
  if (!entry) throw new Error("assistant_action_dependency_missing");
  const metadata =
    action.input.patch.status || action.input.patch.seo
      ? await deps.updateEntryMetadata(
          entry.id,
          {
            status: action.input.patch.status,
            seo: action.input.patch.seo,
          },
          actorId
        )
      : entry;
  if (!metadata) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "entry",
    targetKey: action.input.expectedSlug ?? action.input.id,
    operation: preview.operation,
    status: "success" as const,
    resourceId: metadata.id,
    adminHref: action.input.contentTypeSlug
      ? `/admin/advanced/entries/${encodeURIComponent(action.input.contentTypeSlug)}/${encodeURIComponent(metadata.id)}`
      : "/admin/advanced/entries",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Entry already matched the planned patch."
        : `Updated entry "${metadata.title}".`,
  };
};
