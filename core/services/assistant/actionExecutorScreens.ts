// Action-executor custom-screen previews and handlers (TASK-569-01). Bodies are byte-identical to the legacy monolith.

import { isDeepStrictEqual } from "node:util";
import type { ContentTypeRecord } from "../content/typeService";
import type { getCustomScreen } from "../customScreens/customScreenService";
import {
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenDefinition,
} from "../customScreens/customScreenSchemas";
import {
  addScreenBlock,
  findScreenBlockById,
  moveScreenBlock,
  removeScreenBindingsForBlockTree,
  removeScreenBlock,
} from "../customScreens/screenDocumentOps";
import type {
  AssistantActionExecutionItem,
  AssistantActionPreviewChange,
  AssistantCustomScreenUpsertAction,
  AssistantCustomScreenDeleteAction,
  AssistantCustomScreenUpdateAction,
  AssistantCustomScreenSectionAddAction,
  AssistantCustomScreenBlockAddAction,
  AssistantCustomScreenBlockPatchAction,
  AssistantCustomScreenBlockMoveAction,
  AssistantCustomScreenBlockRemoveAction,
  AssistantCustomScreenBindingSetAction,
  AssistantCustomScreenListViewPatchAction,
} from "./actionPlanTypes";
import { createPreviewChange } from "./actionDiffService";
import type { ActionExecutorDeps, CustomScreenRecord } from "./actionExecutorTypes";
import {
  getExistingCustomScreenDefinition,
  customScreenTargetMatches,
  customScreenMissingConflict,
  withCustomScreenDefinition,
  addBlockToScreenSection,
  setCustomScreenBinding,
  applyScreenBlockDataPatch,
  applyCustomScreenUpdatePatch,
} from "./actionExecutorScreenOps";

const findExistingCustomScreenForUpsert = async (
  action: AssistantCustomScreenUpsertAction,
  deps: ActionExecutorDeps
): Promise<{
  contentType: ContentTypeRecord | null;
  existing: CustomScreenRecord | null;
  conflicts: AssistantActionPreviewChange["conflicts"];
}> => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  if (!contentType) {
    return { contentType: null, existing: null, conflicts: [] };
  }

  const role = action.input.collectionRole ?? null;
  const compositionKey = action.input.compositionKey ?? null;
  const screens = (await deps.listCustomScreens()).filter(
    (entry) => entry.contentTypeId === contentType.id
  );
  const metadataCandidates = role
    ? screens.filter(
        (entry) =>
          entry.collectionRole === role && (entry.compositionKey ?? null) === compositionKey
      )
    : [];
  const nameCandidates = screens.filter((entry) => entry.name === action.input.name);
  const legacyNameCandidates = role
    ? nameCandidates.filter(
        (entry) => entry.collectionRole === null && (entry.compositionKey ?? null) === null
      )
    : nameCandidates;
  const hasConflictingMetadataName =
    role &&
    metadataCandidates.length === 0 &&
    nameCandidates.length !== legacyNameCandidates.length;
  const candidates =
    metadataCandidates.length > 0
      ? metadataCandidates
      : hasConflictingMetadataName
        ? []
        : legacyNameCandidates;

  if (hasConflictingMetadataName) {
    return {
      contentType,
      existing: null,
      conflicts: [
        {
          code: "assistant_action_dependency_conflict",
          severity: "error",
          message: `Custom screen "${action.input.name}" already belongs to another composition; choose the exact collection screen before composing an update.`,
        },
      ],
    };
  }

  if (candidates.length > 1) {
    return {
      contentType,
      existing: null,
      conflicts: [
        {
          code: "assistant_action_dependency_conflict",
          severity: "error",
          message: `Custom screen target for "${action.input.name}" is ambiguous; choose the exact collection screen before composing an update.`,
        },
      ],
    };
  }

  return {
    contentType,
    existing: candidates[0] ?? null,
    conflicts: [],
  };
};

export const buildCustomScreenPreview = async (
  action: AssistantCustomScreenUpsertAction,
  deps: ActionExecutorDeps
) => {
  const { contentType, existing, conflicts } = await findExistingCustomScreenForUpsert(
    action,
    deps
  );
  const existingDefinition = existing
    ? normalizeCustomScreenDefinitionForRead({
        definition: existing.definition,
        schemaVersion: existing.schemaVersion,
        blocks: existing.blocks,
        bindings: existing.bindings,
      })
    : null;
  const comparableExisting = existing
    ? {
        name: existing.name,
        contentTypeSlug: action.input.contentTypeSlug,
        status: existing.status,
        collectionRole: existing.collectionRole ?? null,
        compositionKey: existing.compositionKey ?? null,
        showInSidebar: existing.showInSidebar,
        sidebarLabel: existing.sidebarLabel,
        definition: existingDefinition,
      }
    : null;
  const nextValue = {
    ...action.input,
    collectionRole: action.input.collectionRole ?? null,
    compositionKey: action.input.compositionKey ?? null,
  };

  return createPreviewChange({
    action,
    targetType: "custom-screen",
    targetKey: action.input.name,
    summary: `${existing ? "Update" : "Create"} custom screen "${action.input.name}"`,
    warnings: contentType
      ? []
      : ["The content type does not exist yet and will be created earlier in the plan."],
    conflicts,
    beforeValue: comparableExisting,
    nextValue,
  });
};

const buildCustomScreenDefinitionActionPreview = async (
  action:
    | AssistantCustomScreenSectionAddAction
    | AssistantCustomScreenBlockAddAction
    | AssistantCustomScreenBlockPatchAction
    | AssistantCustomScreenBlockMoveAction
    | AssistantCustomScreenBlockRemoveAction
    | AssistantCustomScreenBindingSetAction
    | AssistantCustomScreenListViewPatchAction,
  deps: ActionExecutorDeps,
  resolveNext: (definition: CustomScreenDefinition) => {
    definition: CustomScreenDefinition | null;
    conflict?: string;
    targetKey?: string;
  }
) => {
  const existing = await deps.getCustomScreen(action.input.id);
  const matches = customScreenTargetMatches(existing, action.input);
  const currentDefinition = matches ? getExistingCustomScreenDefinition(existing) : null;
  const result = currentDefinition ? resolveNext(currentDefinition) : null;
  return createPreviewChange({
    action,
    targetType: "custom-screen",
    targetKey: result?.targetKey ?? action.input.name,
    summary: action.title,
    conflicts:
      existing && matches && result?.definition
        ? []
        : [customScreenMissingConflict(existing, result?.conflict)],
    beforeValue: currentDefinition,
    nextValue: result?.definition ?? null,
  });
};

const executeCustomScreenDefinitionAction = async (
  action:
    | AssistantCustomScreenSectionAddAction
    | AssistantCustomScreenBlockAddAction
    | AssistantCustomScreenBlockPatchAction
    | AssistantCustomScreenBlockMoveAction
    | AssistantCustomScreenBlockRemoveAction
    | AssistantCustomScreenBindingSetAction
    | AssistantCustomScreenListViewPatchAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps,
  resolveNext: (definition: CustomScreenDefinition) => CustomScreenDefinition | null,
  message: (updated: NonNullable<Awaited<ReturnType<typeof getCustomScreen>>>) => string
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getCustomScreen(action.input.id);
  if (!existing || !customScreenTargetMatches(existing, action.input)) {
    throw new Error("assistant_action_dependency_missing");
  }
  const currentDefinition = getExistingCustomScreenDefinition(existing);
  if (!currentDefinition) throw new Error("assistant_action_dependency_missing");
  const nextDefinition = resolveNext(currentDefinition);
  if (!nextDefinition) throw new Error("assistant_action_dependency_missing");
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateCustomScreen(existing.id, {
          definition: nextDefinition,
          // TASK-569: definition-bearing PATCHes must carry the loaded revision.
          expectedRevision: existing.revision,
        });
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "custom-screen",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/advanced/custom-screens/${encodeURIComponent(updated.id)}/entries`,
    publicHref: null,
    message:
      preview.operation === "noop" ? "Custom screen already matched the plan." : message(updated),
  };
};

export const buildCustomScreenDeletePreview = async (
  action: AssistantCustomScreenDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getCustomScreen(action.input.id);
  const nameMatches = existing?.name === action.input.name;
  const prefix = action.input.expectedNamePrefix?.trim() ?? "";
  const prefixMatches =
    !prefix || existing?.name.toLowerCase().startsWith(prefix.toLowerCase()) === true;
  const conflicts =
    existing && nameMatches && prefixMatches
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error" as const,
            message: existing
              ? "Custom screen no longer matches the planned delete target."
              : "Custom screen was not found.",
          },
        ];

  return createPreviewChange({
    action,
    targetType: "custom-screen",
    targetKey: action.input.name,
    operation: "delete",
    summary: `Delete custom screen "${action.input.name}"`,
    warnings:
      existing?.showInSidebar === true
        ? ["This active custom screen is shown in the Coderso sidebar."]
        : [],
    conflicts,
    beforeValue: existing,
    nextValue: null,
  });
};

export const buildCustomScreenUpdatePreview = async (
  action: AssistantCustomScreenUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getCustomScreen(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedContentTypeId = action.input.expectedContentTypeId?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    (!expectedStatus || existing.status === expectedStatus) &&
    (!expectedContentTypeId || existing.contentTypeId === expectedContentTypeId);
  const nextValue =
    existing && matches ? applyCustomScreenUpdatePatch(existing, action.input.patch) : null;
  const conflictMessage = existing
    ? "Custom screen no longer matches the planned update target."
    : "Custom screen was not found.";

  return createPreviewChange({
    action,
    targetType: "custom-screen",
    targetKey: action.input.name,
    summary: `Update custom screen "${action.input.name}"`,
    conflicts:
      existing && matches && nextValue
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: conflictMessage,
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          status: existing.status,
          showInSidebar: existing.showInSidebar,
          sidebarLabel: existing.sidebarLabel,
        }
      : null,
    nextValue,
  });
};

export const buildCustomScreenSectionAddPreview = (
  action: AssistantCustomScreenSectionAddAction,
  deps: ActionExecutorDeps
) =>
  buildCustomScreenDefinitionActionPreview(action, deps, (definition) => {
    if (
      definition.editorView.document.sections.some(
        (section) => section.id === action.input.section.id
      )
    ) {
      return {
        definition: null,
        conflict: "Custom screen section id already exists.",
      };
    }
    return {
      definition: withCustomScreenDefinition(definition, {
        editorView: {
          ...definition.editorView,
          document: {
            ...definition.editorView.document,
            sections: [...definition.editorView.document.sections, action.input.section],
          },
        },
      }),
      targetKey: `${action.input.name}/${action.input.section.id}`,
    };
  });

export const buildCustomScreenBlockAddPreview = (
  action: AssistantCustomScreenBlockAddAction,
  deps: ActionExecutorDeps
) =>
  buildCustomScreenDefinitionActionPreview(action, deps, (definition) => {
    const document = action.input.parentId
      ? addScreenBlock(definition.editorView.document, action.input.block, {
          parentId: action.input.parentId,
          slotId: action.input.slotId ?? "content",
        })
      : addBlockToScreenSection(
          definition.editorView.document,
          action.input.sectionId,
          action.input.block
        );
    if (isDeepStrictEqual(document, definition.editorView.document)) {
      return {
        definition: null,
        conflict: "Custom screen block target was not found.",
      };
    }
    return {
      definition: withCustomScreenDefinition(definition, {
        editorView: {
          ...definition.editorView,
          document,
          bindings: [...definition.editorView.bindings, ...(action.input.bindings ?? [])],
        },
      }),
      targetKey: `${action.input.name}/${action.input.block.id}`,
    };
  });

export const buildCustomScreenBlockPatchPreview = (
  action: AssistantCustomScreenBlockPatchAction,
  deps: ActionExecutorDeps
) =>
  buildCustomScreenDefinitionActionPreview(action, deps, (definition) => {
    const patch = applyScreenBlockDataPatch(definition.editorView.document, action.input);
    if (patch.status !== "ok") {
      return {
        definition: null,
        conflict:
          patch.status === "type_mismatch"
            ? "Selected custom screen block type changed."
            : patch.status === "missing_path"
              ? "Selected custom screen block data path does not exist."
              : "Selected custom screen block was not found.",
      };
    }
    return {
      definition: withCustomScreenDefinition(definition, {
        editorView: {
          ...definition.editorView,
          document: patch.document,
        },
      }),
      targetKey: `${action.input.name}/${action.input.blockId}/${action.input.dataPath.join(".")}`,
    };
  });

export const buildCustomScreenBlockMovePreview = (
  action: AssistantCustomScreenBlockMoveAction,
  deps: ActionExecutorDeps
) =>
  buildCustomScreenDefinitionActionPreview(action, deps, (definition) => {
    const document = moveScreenBlock(
      definition.editorView.document,
      action.input.blockId,
      action.input.direction
    );
    if (isDeepStrictEqual(document, definition.editorView.document)) {
      return {
        definition: null,
        conflict: "Selected custom screen block could not be moved.",
      };
    }
    return {
      definition: withCustomScreenDefinition(definition, {
        editorView: {
          ...definition.editorView,
          document,
        },
      }),
      targetKey: `${action.input.name}/${action.input.blockId}`,
    };
  });

export const buildCustomScreenBlockRemovePreview = (
  action: AssistantCustomScreenBlockRemoveAction,
  deps: ActionExecutorDeps
) =>
  buildCustomScreenDefinitionActionPreview(action, deps, (definition) => {
    const current = findScreenBlockById(definition.editorView.document, action.input.blockId);
    if (!current) {
      return {
        definition: null,
        conflict: "Selected custom screen block was not found.",
      };
    }
    if (action.input.expectedBlockType && current.type !== action.input.expectedBlockType) {
      return {
        definition: null,
        conflict: "Selected custom screen block type changed.",
      };
    }
    const removal = removeScreenBlock(definition.editorView.document, action.input.blockId);
    return {
      definition: withCustomScreenDefinition(definition, {
        editorView: {
          ...definition.editorView,
          document: removal.document,
          bindings: removeScreenBindingsForBlockTree(
            definition.editorView.bindings,
            removal.removed
          ),
        },
      }),
      targetKey: `${action.input.name}/${action.input.blockId}`,
    };
  });

export const buildCustomScreenBindingSetPreview = (
  action: AssistantCustomScreenBindingSetAction,
  deps: ActionExecutorDeps
) =>
  buildCustomScreenDefinitionActionPreview(action, deps, (definition) => {
    if (!findScreenBlockById(definition.editorView.document, action.input.binding.blockId)) {
      return {
        definition: null,
        conflict: "Custom screen binding block was not found.",
      };
    }
    return {
      definition: withCustomScreenDefinition(definition, {
        editorView: {
          ...definition.editorView,
          bindings: setCustomScreenBinding(definition.editorView.bindings, action.input.binding),
        },
      }),
      targetKey: `${action.input.name}/${action.input.binding.blockId}/${action.input.binding.propPath}`,
    };
  });

export const buildCustomScreenListViewPatchPreview = (
  action: AssistantCustomScreenListViewPatchAction,
  deps: ActionExecutorDeps
) =>
  buildCustomScreenDefinitionActionPreview(action, deps, (definition) => ({
    definition: withCustomScreenDefinition(definition, {
      listView: action.input.listView,
    }),
    targetKey: `${action.input.name}/list-view`,
  }));

export const executeCustomScreenAction = async (
  action: AssistantCustomScreenUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const { contentType, existing, conflicts } = await findExistingCustomScreenForUpsert(
    action,
    deps
  );
  if (!contentType) {
    throw new Error("assistant_action_dependency_missing");
  }
  if (conflicts.length > 0) {
    throw new Error("assistant_action_dependency_conflict");
  }

  const record =
    preview.operation === "create"
      ? await deps.createCustomScreen({
          name: action.input.name,
          contentTypeId: contentType.id,
          status: action.input.status,
          collectionRole: action.input.collectionRole ?? null,
          compositionKey: action.input.compositionKey ?? null,
          showInSidebar: action.input.showInSidebar,
          sidebarLabel: action.input.sidebarLabel,
          definition: action.input.definition,
        })
      : preview.operation === "update" && existing
        ? await deps.updateCustomScreen(existing.id, {
            name: action.input.name,
            contentTypeId: contentType.id,
            status: action.input.status,
            collectionRole: action.input.collectionRole ?? null,
            compositionKey: action.input.compositionKey ?? null,
            showInSidebar: action.input.showInSidebar,
            sidebarLabel: action.input.sidebarLabel,
            definition: action.input.definition,
            // TASK-569: definition-bearing PATCHes must carry the loaded revision.
            expectedRevision: existing.revision,
          })
        : existing;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "custom-screen",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: record
      ? `/admin/advanced/custom-screens/${encodeURIComponent(record.id)}/entries`
      : "/admin/advanced/custom-screens",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Dedicated admin screen already matched the plan."
        : "Dedicated House Projects screen is ready in Coderso.",
  };
};

export const executeCustomScreenDeleteAction = async (
  action: AssistantCustomScreenDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getCustomScreen(action.input.id);
  const prefix = action.input.expectedNamePrefix?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    (prefix && !existing.name.toLowerCase().startsWith(prefix.toLowerCase()))
  ) {
    throw new Error("assistant_action_dependency_missing");
  }

  const deleted = await deps.deleteCustomScreen(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "custom-screen",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/custom-screens",
    publicHref: null,
    message: `Deleted custom screen "${deleted.name}".`,
  };
};

export const executeCustomScreenUpdateAction = async (
  action: AssistantCustomScreenUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getCustomScreen(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const expectedContentTypeId = action.input.expectedContentTypeId?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    (expectedStatus && existing.status !== expectedStatus) ||
    (expectedContentTypeId && existing.contentTypeId !== expectedContentTypeId)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const nextValue = applyCustomScreenUpdatePatch(existing, action.input.patch);
  if (!nextValue) throw new Error("assistant_action_dependency_missing");
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updateCustomScreen(existing.id, {
          name: nextValue.name,
          status: nextValue.status,
          collectionRole: nextValue.collectionRole,
          compositionKey: nextValue.compositionKey,
          showInSidebar: nextValue.showInSidebar,
          sidebarLabel: nextValue.sidebarLabel,
        });
  if (!updated) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "custom-screen",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: updated.id,
    adminHref: `/admin/advanced/custom-screens/${encodeURIComponent(updated.id)}/entries`,
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Custom screen already matched the planned patch."
        : `Updated custom screen "${updated.name}".`,
  };
};

export const executeCustomScreenSectionAddAction = (
  action: AssistantCustomScreenSectionAddAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) =>
  executeCustomScreenDefinitionAction(
    action,
    preview,
    deps,
    (definition) =>
      definition.editorView.document.sections.some(
        (section) => section.id === action.input.section.id
      )
        ? null
        : withCustomScreenDefinition(definition, {
            editorView: {
              ...definition.editorView,
              document: {
                ...definition.editorView.document,
                sections: [...definition.editorView.document.sections, action.input.section],
              },
            },
          }),
    (updated) => `Added section to custom screen "${updated.name}".`
  );

export const executeCustomScreenBlockAddAction = (
  action: AssistantCustomScreenBlockAddAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) =>
  executeCustomScreenDefinitionAction(
    action,
    preview,
    deps,
    (definition) => {
      const document = action.input.parentId
        ? addScreenBlock(definition.editorView.document, action.input.block, {
            parentId: action.input.parentId,
            slotId: action.input.slotId ?? "content",
          })
        : addBlockToScreenSection(
            definition.editorView.document,
            action.input.sectionId,
            action.input.block
          );
      if (isDeepStrictEqual(document, definition.editorView.document)) return null;
      return withCustomScreenDefinition(definition, {
        editorView: {
          ...definition.editorView,
          document,
          bindings: [...definition.editorView.bindings, ...(action.input.bindings ?? [])],
        },
      });
    },
    (updated) => `Added block to custom screen "${updated.name}".`
  );

export const executeCustomScreenBlockPatchAction = (
  action: AssistantCustomScreenBlockPatchAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) =>
  executeCustomScreenDefinitionAction(
    action,
    preview,
    deps,
    (definition) => {
      const patch = applyScreenBlockDataPatch(definition.editorView.document, action.input);
      if (patch.status !== "ok") return null;
      return withCustomScreenDefinition(definition, {
        editorView: {
          ...definition.editorView,
          document: patch.document,
        },
      });
    },
    (updated) => `Patched custom screen block in "${updated.name}".`
  );

export const executeCustomScreenBlockMoveAction = (
  action: AssistantCustomScreenBlockMoveAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) =>
  executeCustomScreenDefinitionAction(
    action,
    preview,
    deps,
    (definition) => {
      const document = moveScreenBlock(
        definition.editorView.document,
        action.input.blockId,
        action.input.direction
      );
      return isDeepStrictEqual(document, definition.editorView.document)
        ? null
        : withCustomScreenDefinition(definition, {
            editorView: {
              ...definition.editorView,
              document,
            },
          });
    },
    (updated) => `Moved custom screen block in "${updated.name}".`
  );

export const executeCustomScreenBlockRemoveAction = (
  action: AssistantCustomScreenBlockRemoveAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) =>
  executeCustomScreenDefinitionAction(
    action,
    preview,
    deps,
    (definition) => {
      const current = findScreenBlockById(definition.editorView.document, action.input.blockId);
      if (!current) return null;
      if (action.input.expectedBlockType && current.type !== action.input.expectedBlockType) {
        return null;
      }
      const removal = removeScreenBlock(definition.editorView.document, action.input.blockId);
      return withCustomScreenDefinition(definition, {
        editorView: {
          ...definition.editorView,
          document: removal.document,
          bindings: removeScreenBindingsForBlockTree(
            definition.editorView.bindings,
            removal.removed
          ),
        },
      });
    },
    (updated) => `Removed custom screen block from "${updated.name}".`
  );

export const executeCustomScreenBindingSetAction = (
  action: AssistantCustomScreenBindingSetAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) =>
  executeCustomScreenDefinitionAction(
    action,
    preview,
    deps,
    (definition) =>
      findScreenBlockById(definition.editorView.document, action.input.binding.blockId)
        ? withCustomScreenDefinition(definition, {
            editorView: {
              ...definition.editorView,
              bindings: setCustomScreenBinding(
                definition.editorView.bindings,
                action.input.binding
              ),
            },
          })
        : null,
    (updated) => `Updated custom screen binding in "${updated.name}".`
  );

export const executeCustomScreenListViewPatchAction = (
  action: AssistantCustomScreenListViewPatchAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) =>
  executeCustomScreenDefinitionAction(
    action,
    preview,
    deps,
    (definition) =>
      withCustomScreenDefinition(definition, {
        listView: action.input.listView,
      }),
    (updated) => `Updated custom screen list view in "${updated.name}".`
  );
