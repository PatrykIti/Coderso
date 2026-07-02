import { Eye, Save, SlidersHorizontal } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  createCustomScreen,
  getCachedCustomScreen,
  getCustomScreenCached,
  updateCustomScreen,
  type CustomScreenRecord,
  type CustomScreenStatus,
} from "@/services/customScreensClient";
import {
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenDefinition,
  type ScreenBlockV1,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";

import { CustomScreenShell } from "./CustomScreenShell";
import { CustomScreenWorkspacePreviewDialog } from "./CustomScreenWorkspacePreviewDialog";
import { resolveCustomScreenId } from "./routeParams";
import { PageHeader } from "@/ui/shared/PageHeader";
import { buildCustomScreenAssistantSurface } from "./assistantSurface";
import {
  addScreenBlockAt,
  addScreenSection,
  createScreenBlock,
  duplicateScreenBlockWithBindings,
  findScreenBlockById,
  findScreenBlockLocation,
  getFirstScreenBlockId,
  moveScreenBlock,
  moveScreenBlockTo,
  moveScreenSection,
  removeScreenBindingsForBlockTree,
  removeScreenBlock,
  removeScreenSection,
  renameScreenSection,
  updateScreenBlock,
  type ScreenBlockKind,
  type ScreenInsertTarget,
} from "../../../services/customScreens/screenDocumentOps";
import {
  useCustomScreenPreviewRecordState,
  type CustomScreenPreviewRecordState,
} from "./customScreenPreviewData";
import { createScreenFieldBinding } from "./ScreenBlockInspector";
import { ScreenAuthoringCanvas } from "./ScreenAuthoringCanvas";
import type { ContentField } from "../content-types/SchemaBuilder";

const normalizeText = (value: string) => value.trim();

const blockTreeContains = (blocks: readonly ScreenBlockV1[], blockId: string): boolean =>
  blocks.some(
    (block) =>
      block.id === blockId ||
      (block.children ? blockTreeContains(block.children, blockId) : false) ||
      (block.slots
        ? Object.values(block.slots).some((slotBlocks) => blockTreeContains(slotBlocks, blockId))
        : false)
  );

const findBlockSectionId = (document: ScreenDocumentV1, blockId: string | null) => {
  if (!blockId) return null;
  return (
    document.sections.find((section) => blockTreeContains(section.blocks, blockId))?.id ?? null
  );
};

const resolveInitialSelection = (document: ScreenDocumentV1) => {
  const blockId = getFirstScreenBlockId(document);
  return {
    blockId,
    sectionId: findBlockSectionId(document, blockId) ?? document.sections[0]?.id ?? null,
  };
};

const resolveScreenDefinition = (
  screen: CustomScreenRecord | null | undefined
): CustomScreenDefinition => {
  return normalizeCustomScreenDefinitionForRead({
    definition: screen?.definition,
    schemaVersion: screen?.schemaVersion,
    blocks: screen?.blocks,
    bindings: screen?.bindings,
  });
};

function PreviewStateNotice({
  contentType,
  previewRecordState,
  isLoading,
}: {
  contentType: ContentTypeSummary | null;
  previewRecordState: CustomScreenPreviewRecordState;
  isLoading: boolean;
}) {
  const message = isLoading
    ? `Loading the first record for ${contentType?.name ?? "this content type"}. Schema fallback values are shown until preview data is ready.`
    : previewRecordState.source === "entry"
      ? previewRecordState.note
      : previewRecordState.note;
  if (!message) return null;

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function CustomScreenPreviewRecordOwner({
  contentType,
  children,
}: {
  contentType: ContentTypeSummary | null;
  children: (state: {
    isLoading: boolean;
    previewRecordState: CustomScreenPreviewRecordState;
  }) => ReactNode;
}) {
  const state = useCustomScreenPreviewRecordState(contentType);
  return <>{children(state)}</>;
}

export function CustomScreenEditorPage() {
  const { path, navigate } = useAdminRouter();
  const screenId = useMemo(() => resolveCustomScreenId(path), [path]);
  const isCreateMode = !screenId || screenId === "new";

  const [contentTypes, setContentTypes] = useState<ContentTypeSummary[]>(
    () => getCachedContentTypes() ?? []
  );
  const [screen, setScreen] = useState<CustomScreenRecord | null>(() => {
    if (isCreateMode || !screenId) return null;
    return getCachedCustomScreen(screenId) ?? null;
  });
  const [name, setName] = useState(screen?.name ?? "");
  const [contentTypeId, setContentTypeId] = useState(screen?.contentTypeId ?? "");
  const [status, setStatus] = useState<CustomScreenStatus>(screen?.status ?? "draft");
  const [showInSidebar, setShowInSidebar] = useState(screen?.showInSidebar ?? false);
  const [sidebarLabel, setSidebarLabel] = useState(screen?.sidebarLabel ?? "");
  const [definition, setDefinition] = useState<CustomScreenDefinition>(() =>
    resolveScreenDefinition(screen)
  );
  const screenDocument = definition.editorView.document;
  const screenBindings = definition.editorView.bindings;
  const [selectedId, setSelectedId] = useState<string | null>(
    () => resolveInitialSelection(resolveScreenDefinition(screen).editorView.document).blockId
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    () => resolveInitialSelection(resolveScreenDefinition(screen).editorView.document).sectionId
  );
  const [isLoading, setIsLoading] = useState(() => !isCreateMode && !screen);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  // TASK-496-02: host-owned controlled flag for the shared `CanvasEditor` shell
  // (the shell only READS it; the toolbar toggle + reopen chip flip it directly).
  const [panelOpen, setPanelOpen] = useState(true);
  // TASK-500-02: the explicit insertion point the author armed on the canvas
  // (a before/after gap or a slot drop zone). ONE-SHOT: consumed (cleared) by
  // the next insert; a drag-move also clears it (indices may be stale after
  // the document reshuffles — the ops fail soft, but a stale point would
  // silently redirect the next insert).
  const [insertPoint, setInsertPoint] = useState<ScreenInsertTarget | null>(null);
  const definitionRef = useRef(definition);

  const selectedContentType = useMemo(
    () => contentTypes.find((type) => type.id === contentTypeId) ?? null,
    [contentTypeId, contentTypes]
  );
  const contentFields = useMemo(
    () => (selectedContentType ? fieldsFromSchema(selectedContentType.schema) : []),
    [selectedContentType]
  );
  const previewCapabilities = useMemo(
    () => resolveCustomScreenCapabilities({ definition }),
    [definition]
  );

  useEffect(() => {
    if (isCreateMode || !screen || !screenId) {
      clearActiveAssistantSurfaceContext();
      return undefined;
    }

    setActiveAssistantSurfaceContext(
      buildCustomScreenAssistantSurface({
        screen: {
          ...screen,
          name: name.trim() || screen.name,
          contentTypeId: contentTypeId || screen.contentTypeId,
          status,
          showInSidebar,
          sidebarLabel: sidebarLabel.trim() || null,
          definition,
        },
        blocks: screenDocument.sections.flatMap((section) => section.blocks),
        bindings: screenBindings,
        capabilities: previewCapabilities,
        selectedBlockId: selectedId,
        warnings: [
          ...(hasUnsavedChanges ? ["custom_screen_has_unsaved_changes"] : []),
          ...(remoteUpdatePending ? ["custom_screen_remote_update_pending"] : []),
        ],
      })
    );

    return () => {
      clearActiveAssistantSurfaceContext();
    };
  }, [
    contentTypeId,
    definition,
    hasUnsavedChanges,
    isCreateMode,
    name,
    previewCapabilities,
    remoteUpdatePending,
    screen,
    screenBindings,
    screenDocument.sections,
    screenId,
    selectedId,
    showInSidebar,
    sidebarLabel,
    status,
  ]);

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setError(null);
  }, []);

  const updateDefinition = useCallback(
    (next: CustomScreenDefinition) => {
      definitionRef.current = next;
      setDefinition(next);
      markDirty();
    },
    [markDirty]
  );

  const updateEditorView = useCallback(
    (next: {
      document?: CustomScreenDefinition["editorView"]["document"];
      bindings?: ScreenFieldBinding[];
    }) => {
      const current = definitionRef.current;
      updateDefinition({
        ...current,
        editorView: {
          ...current.editorView,
          document: next.document ?? current.editorView.document,
          bindings: next.bindings ?? current.editorView.bindings,
        },
      });
    },
    [updateDefinition]
  );

  const applyScreen = useCallback((record: CustomScreenRecord) => {
    const nextDefinition = resolveScreenDefinition(record);
    const nextSelection = resolveInitialSelection(nextDefinition.editorView.document);
    definitionRef.current = nextDefinition;
    setScreen(record);
    setName(record.name);
    setContentTypeId(record.contentTypeId);
    setStatus(record.status);
    setShowInSidebar(record.showInSidebar ?? false);
    setSidebarLabel(record.sidebarLabel ?? "");
    setDefinition(nextDefinition);
    setSelectedId(nextSelection.blockId);
    setSelectedSectionId(nextSelection.sectionId);
    setHasUnsavedChanges(false);
  }, []);

  const refreshScreen = useCallback(
    async (force?: boolean) => {
      if (!screenId || isCreateMode) return;
      try {
        const detail = await getCustomScreenCached(screenId, { force });
        if (!detail) {
          setError("Custom screen not found.");
          return;
        }
        applyScreen(detail);
        setError(null);
      } catch (err) {
        setError(isApiClientError(err) ? err.message : "Failed to load custom screen.");
      } finally {
        setIsLoading(false);
      }
    },
    [applyScreen, isCreateMode, screenId]
  );

  const handleSelectBlock = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setSelectedSectionId(findBlockSectionId(definitionRef.current.editorView.document, id));
    }
  }, []);

  useEffect(() => {
    listContentTypesCached({ force: true })
      .then((items) => setContentTypes(items))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isCreateMode) return;
    if (!screenId) return;
    let active = true;
    getCustomScreenCached(screenId, { force: true })
      .then((detail) => {
        if (!active || !detail) return;
        applyScreen(detail);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(isApiClientError(err) ? err.message : "Failed to load custom screen.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyScreen, isCreateMode, screenId]);

  useEffect(() => {
    if (isCreateMode || !screenId) return undefined;
    return subscribeCacheEvents((event) => {
      if (
        event.key !== cacheKeys.customScreensList &&
        event.key !== cacheKeys.customScreenDetail(screenId)
      ) {
        return;
      }
      if (hasUnsavedChanges) {
        setRemoteUpdatePending(true);
        return;
      }
      refreshScreen(true).catch(() => undefined);
    });
  }, [hasUnsavedChanges, isCreateMode, refreshScreen, screenId]);

  // TASK-500-02: resolve the ScreenInsertTarget an insert should use. Priority:
  // (a) the explicit armed insertion point (before/after gap or slot drop zone)
  // (b) the selected container's derived default slot end (field-group→content,
  //     columns→left, else first slot key) — safe because selectedId is cleared
  //     whenever a section is clicked (selectTarget section branch +
  //     handleSelectSection defense-in-depth), so no stale container in another
  //     section can hijack the insert
  // (c) the selected section's end
  // (d) the first section's end.
  const resolveInsertTarget = (
    document: CustomScreenDefinition["editorView"]["document"]
  ): ScreenInsertTarget => {
    if (insertPoint) return insertPoint;
    const selected = findScreenBlockById(document, selectedId);
    if (selected?.slots) {
      const slotId =
        selected.type === "field-group"
          ? "content"
          : selected.type === "columns"
            ? "left"
            : Object.keys(selected.slots)[0];
      if (slotId) {
        const location = findScreenBlockLocation(document, selected.id);
        return {
          kind: "slot-end",
          sectionId: location?.sectionId ?? selectedSectionId ?? "",
          parentId: selected.id,
          slotId,
        };
      }
    }
    return {
      kind: "section-end",
      sectionId: selectedSectionId ?? document.sections[0]?.id ?? "",
    };
  };

  const handleAddBlock = (type: ScreenBlockKind, field?: ContentField) => {
    const current = definitionRef.current;
    const created = createScreenBlock({
      type,
      field: field?.name,
      label: field?.label,
      // TASK-498-02 B2: pass the relation target so the `related-list` factory can
      // seed `data.target` (the field NAME alone carries no relation metadata).
      relationTarget: field?.relation?.target,
    });
    // TASK-500-02: author-directed insertion — addScreenBlockAt clamps indices
    // and fails soft on an unknown target (never throws in the editor path).
    const target = resolveInsertTarget(current.editorView.document);
    const nextDocument = addScreenBlockAt(current.editorView.document, created.block, target);
    updateEditorView({
      document: nextDocument,
      bindings: [...current.editorView.bindings, ...created.bindings],
    });
    setSelectedId(created.block.id);
    setSelectedSectionId(findBlockSectionId(nextDocument, created.block.id));
    setInsertPoint(null); // consume the one-shot point
  };

  // TASK-500-02: drag-to-position — the canvas reports {blockId, target} once a
  // drop resolves. moveScreenBlockTo owns the cycle guard + the same-list
  // removal-first index decrement; a no-op (cycle/unknown block) returns the
  // ORIGINAL document so `===` skips the dirty mark.
  const handleDragMove = (blockId: string, target: ScreenInsertTarget) => {
    const current = definitionRef.current;
    const nextDocument = moveScreenBlockTo(current.editorView.document, blockId, target);
    if (nextDocument === current.editorView.document) return;
    updateEditorView({ document: nextDocument });
    setSelectedId(blockId);
    setSelectedSectionId(findBlockSectionId(nextDocument, blockId));
    setInsertPoint(null);
  };

  // TASK-500-01: section CRUD host handlers (pure ops → updateEditorView →
  // existing PATCH on save; no other pathway changes).
  const handleAddSection = () => {
    const current = definitionRef.current;
    const selectedIndex = current.editorView.document.sections.findIndex(
      (section) => section.id === selectedSectionId
    );
    const atIndex = selectedIndex >= 0 ? selectedIndex + 1 : undefined; // insert AFTER selected
    const { document, sectionId } = addScreenSection(current.editorView.document, { atIndex });
    updateEditorView({ document });
    setSelectedId(null); // a section, not a block, is now the active target
    setSelectedSectionId(sectionId);
  };

  // TASK-500 post-audit (spurious dirty state): the canvas rename input commits
  // on EVERY blur, and renameScreenSection always returns new objects even for
  // an identical label — so the host must no-op an unchanged commit itself or a
  // mere focus+blur marks the document dirty (unsaved-changes chip + suppressed
  // remote refresh / "Updated in another tab" alert).
  const handleRenameSection = (sectionId: string, label: string) => {
    const document = definitionRef.current.editorView.document;
    const section = document.sections.find((item) => item.id === sectionId);
    if (!section) return; // unknown id — fail soft, nothing to dirty
    const clean = label.trim() || "Section"; // mirror renameScreenSection's normalization
    if (section.label === clean && section.data.title === clean) return; // unchanged — no dirty mark
    updateEditorView({ document: renameScreenSection(document, sectionId, clean) });
  };

  const handleMoveSection = (sectionId: string, direction: "up" | "down") => {
    const current = definitionRef.current.editorView.document;
    const nextDocument = moveScreenSection(current, sectionId, direction);
    // Boundary/unknown-id no-op returns the SAME document reference (same
    // pattern as handleDragMove) — skip the update so no dirty mark is set.
    if (nextDocument === current) return;
    updateEditorView({ document: nextDocument });
  };

  const handleDeleteSection = (sectionId: string) => {
    const current = definitionRef.current;
    const { document, removed } = removeScreenSection(current.editorView.document, sectionId);
    if (!removed) return; // last-section no-op (or unknown id) — nothing deleted, selection intact
    // Prune bindings for EVERY block in the removed section subtree.
    let bindings = current.editorView.bindings;
    removed.blocks.forEach((block) => {
      bindings = removeScreenBindingsForBlockTree(bindings, block);
    });
    updateEditorView({ document, bindings });
    // A delete only happens when ≥2 sections existed, so the doc still has ≥1 section here.
    if (selectedSectionId === sectionId) setSelectedSectionId(document.sections[0]?.id ?? null);
    if (selectedId && !findScreenBlockById(document, selectedId)) setSelectedId(null);
  };

  // TASK-500-01 defense-in-depth: the canvas selectTarget already clears the
  // block selection on a section click (its section branch calls
  // onSelectBlock(null) before onSelectSection), so steering already works
  // through the canvas path. This handler ALSO clears setSelectedId(null) so it
  // is self-contained regardless of caller.
  const handleSelectSection = (sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    setSelectedId(null);
  };

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
    const current = definitionRef.current;
    updateEditorView({
      document: moveScreenBlock(current.editorView.document, blockId, direction),
    });
  };

  const handleDuplicateBlock = (blockId: string) => {
    const current = definitionRef.current;
    const result = duplicateScreenBlockWithBindings(
      current.editorView.document,
      current.editorView.bindings,
      blockId
    );
    updateEditorView({
      document: result.document,
      bindings: result.bindings,
    });
    if (result.duplicatedBlockId) {
      setSelectedId(result.duplicatedBlockId);
      setSelectedSectionId(findBlockSectionId(result.document, result.duplicatedBlockId));
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    const current = definitionRef.current;
    const result = removeScreenBlock(current.editorView.document, blockId);
    if (!result.removed) return;
    updateEditorView({
      document: result.document,
      bindings: removeScreenBindingsForBlockTree(current.editorView.bindings, result.removed),
    });
    if (selectedId && !findScreenBlockById(result.document, selectedId)) {
      const nextSelection = resolveInitialSelection(result.document);
      setSelectedId(nextSelection.blockId);
      setSelectedSectionId(nextSelection.sectionId);
    }
  };

  const handlePatchBlock = (blockId: string, patch: Partial<ScreenBlockV1>) => {
    const current = definitionRef.current;
    updateEditorView({
      document: updateScreenBlock(current.editorView.document, blockId, patch),
    });
  };

  const handlePatchBlockData = (blockId: string, patch: Record<string, unknown>) => {
    const current = definitionRef.current;
    updateEditorView({
      document: updateScreenBlock(current.editorView.document, blockId, (block) => ({
        ...block,
        data: {
          ...block.data,
          ...patch,
        },
      })),
    });
  };

  const handlePatchBinding = (
    blockId: string,
    propPath: string,
    patch: Partial<Pick<ScreenFieldBinding, "field" | "mode">>
  ) => {
    const current = definitionRef.current;
    const existing = current.editorView.bindings.find(
      (binding) => binding.blockId === blockId && binding.propPath === propPath
    );
    const fieldName = patch.field ?? existing?.field ?? "title";
    const nextBinding = existing
      ? {
          ...existing,
          ...patch,
        }
      : createScreenFieldBinding({
          blockId,
          propPath,
          field: fieldName,
          mode: patch.mode,
        });
    const nextBindings = existing
      ? current.editorView.bindings.map((binding) =>
          binding.id === existing.id ? nextBinding : binding
        )
      : [...current.editorView.bindings, nextBinding];
    const matchingField = contentFields.find((field) => field.name === fieldName);
    const nextDocument =
      propPath === "value"
        ? updateScreenBlock(current.editorView.document, blockId, (block) => ({
            ...block,
            data: {
              ...block.data,
              field: fieldName,
              ...(matchingField ? { label: matchingField.label } : {}),
            },
          }))
        : current.editorView.document;
    updateEditorView({
      document: nextDocument,
      bindings: nextBindings,
    });
  };

  const handleSave = async () => {
    const trimmedName = normalizeText(name);
    if (!trimmedName) {
      setError("Screen name is required.");
      return;
    }
    if (!contentTypeId) {
      setError("Select a content type before saving.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const payload = {
      name: trimmedName,
      contentTypeId,
      status,
      showInSidebar,
      sidebarLabel: sidebarLabel.trim() || null,
      definition,
    };

    try {
      if (isCreateMode) {
        const created = await createCustomScreen(payload);
        applyScreen(created);
        navigate(`/advanced/custom-screens/${encodeURIComponent(created.id)}`);
      } else if (screenId) {
        const updated = await updateCustomScreen(screenId, payload);
        applyScreen(updated);
      }
      setRemoteUpdatePending(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save custom screen.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const screenSettingsPanel = (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Screen name
        </p>
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            markDirty();
          }}
          placeholder="Custom screen name"
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content type
        </p>
        <Select
          value={contentTypeId}
          onValueChange={(value) => {
            setContentTypeId(value);
            markDirty();
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select content type" />
          </SelectTrigger>
          <SelectContent>
            {contentTypes.length === 0 ? (
              <SelectItem value="no-content-types" disabled>
                No content types available
              </SelectItem>
            ) : (
              contentTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </p>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as CustomScreenStatus);
            markDirty();
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sidebar shortcut
        </p>
        <div className="flex h-10 items-center justify-between rounded-md border px-3">
          <span className="text-sm text-muted-foreground">Show records workflow in left menu</span>
          <Switch
            checked={showInSidebar}
            onCheckedChange={(checked) => {
              setShowInSidebar(checked === true);
              markDirty();
            }}
          />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sidebar label
        </p>
        <Input
          value={sidebarLabel}
          onChange={(event) => {
            setSidebarLabel(event.target.value);
            markDirty();
          }}
          placeholder={name.trim() || "Use screen name"}
          disabled={!showInSidebar}
        />
        <p className="text-xs text-muted-foreground">
          When empty, the shortcut uses the screen name.
        </p>
      </div>
    </div>
  );

  const previewOwnerKey = selectedContentType?.slug ?? "no-content-type";

  return (
    <CustomScreenPreviewRecordOwner key={previewOwnerKey} contentType={selectedContentType}>
      {({ isLoading: previewDataLoading, previewRecordState }) => {
        // TASK-498-01: the List/Editor view toggle is removed — the screen editor
        // is now the entry-view BUILDER only. The header keeps Preview + Save; the
        // in-content PageHeader still renders above the shared `CanvasEditor` shell
        // (prototype CustomScreenEditorPreview.tsx:188-211).
        const screenPageHeader = (
          <PageHeader
            className="mb-0 shrink-0 px-6 pb-3 pt-4"
            title={name || (isCreateMode ? "New screen" : "Untitled")}
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleSave}
                  disabled={isLoading || isSaving}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            }
          />
        );
        // Panel Hide/Show toggle (mirrors PageEditor) — the real consumer of
        // setPanelOpen, so the controlled-shell setter is not a dead passthrough.
        const screenPanelToggle = (
          <Button
            type="button"
            variant={panelOpen ? "soft" : "ghost"}
            size="sm"
            onClick={() => setPanelOpen((open) => !open)}
            aria-label={panelOpen ? "Hide panel" : "Show panel"}
            aria-pressed={panelOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {panelOpen ? "Hide panel" : "Show panel"}
          </Button>
        );
        // Pages-parity reopen chip shown when the panel is hidden.
        const screenReopen = (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-label="Show panel"
            className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop transition-colors hover:text-primary"
          >
            <SlidersHorizontal className="size-3.5" /> Show panel
          </button>
        );
        return (
          <>
            <CustomScreenShell
              variant="canvas"
              name={name}
              status={status}
              hasUnsavedChanges={hasUnsavedChanges}
              isCreateMode={isCreateMode}
            >
              {error || remoteUpdatePending ? (
                <div className="shrink-0 space-y-3 px-6 pt-4">
                  {error ? (
                    <Alert variant="destructive">
                      <AlertTitle>Custom screen error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}
                  {remoteUpdatePending ? (
                    <Alert>
                      <AlertTitle>Updated in another tab</AlertTitle>
                      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span>New changes are available. Refresh to load the latest version.</span>
                        <Button variant="outline" size="sm" onClick={() => refreshScreen(true)}>
                          Refresh
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              ) : null}

              {isLoading ? (
                <div className="mx-6 mb-6 flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground shadow-card">
                  Loading custom screen...
                </div>
              ) : (
                <ScreenAuthoringCanvas
                  document={screenDocument}
                  bindings={screenBindings}
                  fields={contentFields}
                  values={previewRecordState.data}
                  header={screenPageHeader}
                  panelToggle={screenPanelToggle}
                  reopenAffordance={screenReopen}
                  panelOpen={panelOpen}
                  onPanelOpenChange={setPanelOpen}
                  previewNotice={
                    <PreviewStateNotice
                      contentType={selectedContentType}
                      previewRecordState={previewRecordState}
                      isLoading={previewDataLoading}
                    />
                  }
                  settingsPanel={screenSettingsPanel}
                  selectedSectionId={selectedSectionId}
                  selectedBlockId={selectedId}
                  onSelectSection={handleSelectSection}
                  onSelectBlock={handleSelectBlock}
                  onAddSection={handleAddSection}
                  onRenameSection={handleRenameSection}
                  onMoveSection={handleMoveSection}
                  onDeleteSection={handleDeleteSection}
                  onAddBlock={handleAddBlock}
                  insertPoint={insertPoint}
                  onSetInsertPoint={setInsertPoint}
                  onDragMove={handleDragMove}
                  onPatchBlock={handlePatchBlock}
                  onPatchBlockData={handlePatchBlockData}
                  onPatchBinding={handlePatchBinding}
                  onMove={handleMoveBlock}
                  onDuplicate={handleDuplicateBlock}
                  onDelete={handleDeleteBlock}
                />
              )}
            </CustomScreenShell>

            <CustomScreenWorkspacePreviewDialog
              open={previewOpen}
              onOpenChange={setPreviewOpen}
              mode="editor-view"
              contentType={selectedContentType}
              listView={definition.listView}
              document={screenDocument}
              bindings={screenBindings}
              fields={contentFields}
              previewRecordState={previewRecordState}
              previewLoading={previewDataLoading}
            />
          </>
        );
      }}
    </CustomScreenPreviewRecordOwner>
  );
}
