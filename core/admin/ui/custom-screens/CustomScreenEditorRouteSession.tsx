import { useEffect, useMemo, useState } from "react";

import {
  getCachedCustomScreenEditor,
  type CustomScreenRecord,
  type CustomScreenStatus,
} from "@/services/customScreensEditorClient";
import { getCachedContentTypes, type ContentTypeSummary } from "@/services/contentTypesClient";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { useAdminDirtyNavigationGuard } from "@/ui/shared/AdminDirtyNavigationGuard";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";
import type { CustomScreenDefinition } from "../../../services/customScreens/customScreenSchemas";
import type { ScreenInsertTarget } from "../../../services/customScreens/screenDocumentOps";
import { buildCustomScreenAssistantSurface } from "./assistantSurface";
import { CustomScreenEditorLayout } from "./CustomScreenEditorLayout";
import { CustomScreenEditorPreviewOwner } from "./CustomScreenEditorPreviewOwner";
import {
  detectScreenBindingOrphans,
  resolveScreenEditorDefinition,
  resolveScreenEditorInitialSelection,
  uniqueFieldNames,
  type BuilderRouteMessage,
  type BuilderRouteVisit,
} from "./customScreenEditorModel";
import { useCustomScreenDocumentActions } from "./hooks/useCustomScreenDocumentActions";
import { useCustomScreenEditorPersistence } from "./hooks/useCustomScreenEditorPersistence";

export type CustomScreenEditorRouteSessionProps = {
  routeKey: string;
  screenId: string | null;
  isCreateMode: boolean;
};

export function CustomScreenEditorRouteSession({
  routeKey,
  screenId,
  isCreateMode,
}: CustomScreenEditorRouteSessionProps) {
  const { navigate } = useAdminRouter();
  const [routeVisit] = useState<BuilderRouteVisit>(() => Object.freeze({ routeKey }));
  const initialScreen = useMemo(
    () => (!isCreateMode && screenId ? (getCachedCustomScreenEditor(screenId) ?? null) : null),
    [isCreateMode, screenId]
  );
  const initialDefinition = useMemo(
    () => resolveScreenEditorDefinition(initialScreen),
    [initialScreen]
  );
  const initialSelection = useMemo(
    () => resolveScreenEditorInitialSelection(initialDefinition.editorView.document),
    [initialDefinition]
  );
  const initialRouteReady = isCreateMode || initialScreen !== null;

  const [contentTypes, setContentTypes] = useState<ContentTypeSummary[]>(
    () => getCachedContentTypes() ?? []
  );
  const [screen, setScreen] = useState<CustomScreenRecord | null>(initialScreen);
  const [name, setName] = useState(initialScreen?.name ?? "");
  const [contentTypeId, setContentTypeId] = useState(initialScreen?.contentTypeId ?? "");
  const [status, setStatus] = useState<CustomScreenStatus>(initialScreen?.status ?? "draft");
  const [showInSidebar, setShowInSidebar] = useState(initialScreen?.showInSidebar ?? false);
  const [sidebarLabel, setSidebarLabel] = useState(initialScreen?.sidebarLabel ?? "");
  const [definition, setDefinition] = useState<CustomScreenDefinition>(initialDefinition);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelection.blockId);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    initialSelection.sectionId
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [committedScreenVisit, setCommittedScreenVisit] = useState<BuilderRouteVisit | null>(
    initialRouteReady ? routeVisit : null
  );
  const [loadActivityVisit, setLoadActivityVisit] = useState<BuilderRouteVisit | null>(
    initialRouteReady ? null : routeVisit
  );
  const [saveActivityVisit, setSaveActivityVisit] = useState<BuilderRouteVisit | null>(null);
  const [errorCommit, setErrorCommit] = useState<BuilderRouteMessage | null>(null);
  const [saveNoticeCommit, setSaveNoticeCommit] = useState<BuilderRouteMessage | null>(null);
  const [externalWarningVisit, setExternalWarningVisit] = useState<BuilderRouteVisit | null>(null);
  const [externalRevisionVisit, setExternalRevisionVisit] = useState<BuilderRouteVisit | null>(
    null
  );
  const [externalRefreshConfirmOpen, setExternalRefreshConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [insertPoint, setInsertPoint] = useState<ScreenInsertTarget | null>(null);

  const screenDocument = definition.editorView.document;
  const screenBindings = definition.editorView.bindings;
  const routeReady = committedScreenVisit === routeVisit;
  const isLoading = !routeReady && loadActivityVisit === routeVisit;
  const isSaving = saveActivityVisit === routeVisit;
  const error = errorCommit?.routeVisit === routeVisit ? errorCommit.message : null;
  const externalUpdatePending = externalWarningVisit === routeVisit;
  const externalRevisionUnresolved = externalRevisionVisit === routeVisit;
  const saveNotice = saveNoticeCommit?.routeVisit === routeVisit ? saveNoticeCommit.message : null;

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
    if (!routeReady || isCreateMode || !screen || !screenId) {
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
          ...(externalUpdatePending ? ["custom_screen_external_update_pending"] : []),
        ],
      })
    );

    return () => {
      clearActiveAssistantSurfaceContext();
    };
  }, [
    contentTypeId,
    definition,
    externalUpdatePending,
    hasUnsavedChanges,
    isCreateMode,
    name,
    previewCapabilities,
    routeReady,
    screen,
    screenBindings,
    screenDocument.sections,
    screenId,
    selectedId,
    showInSidebar,
    sidebarLabel,
    status,
  ]);

  const persistence = useCustomScreenEditorPersistence({
    identity: { routeKey, routeVisit, screenId, isCreateMode },
    draft: {
      screen,
      name,
      contentTypeId,
      status,
      showInSidebar,
      sidebarLabel,
      definition,
      setContentTypes,
      setScreen,
      setName,
      setContentTypeId,
      setStatus,
      setShowInSidebar,
      setSidebarLabel,
      setDefinition,
      setSelectedId,
      setSelectedSectionId,
      setHasUnsavedChanges,
      setPreviewOpen,
    },
    commits: {
      committedScreenVisit,
      setCommittedScreenVisit,
      setLoadActivityVisit,
      setSaveActivityVisit,
      setErrorCommit,
      setSaveNoticeCommit,
      setExternalWarningVisit,
      setExternalRevisionVisit,
      setExternalRefreshConfirmOpen,
    },
    navigate,
  });

  const bindingOrphans = useMemo(
    () =>
      selectedContentType
        ? detectScreenBindingOrphans(screenDocument, screenBindings, contentFields)
        : { blockOrphans: [], fieldOrphans: [] },
    [contentFields, screenBindings, screenDocument, selectedContentType]
  );
  const orphanCount = bindingOrphans.blockOrphans.length + bindingOrphans.fieldOrphans.length;

  const documentActions = useCustomScreenDocumentActions({
    definitionRef: persistence.definitionRef,
    contentFields,
    selectedId,
    selectedSectionId,
    insertPoint,
    updateDefinition: persistence.updateDefinition,
    setSelectedId,
    setSelectedSectionId,
    setInsertPoint,
  });

  const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
    blocked: hasUnsavedChanges,
    title: "Discard unsaved Screen changes?",
    description: "The Screen document or bindings have local changes.",
    confirmLabel: "Discard and continue",
    cancelLabel: "Keep editing",
    onConfirmDiscard: persistence.invalidateBuilderVisitForDiscard,
  });

  const changeName = (next: string) => {
    if (next === name || !persistence.markDirty()) return;
    setName(next);
  };
  const changeContentType = (next: string) => {
    if (next === contentTypeId || !persistence.markDirty()) return;
    setContentTypeId(next);
  };
  const changeStatus = (next: CustomScreenStatus) => {
    if (next === status || !persistence.markDirty()) return;
    setStatus(next);
  };
  const changeShowInSidebar = (next: boolean) => {
    if (next === showInSidebar || !persistence.markDirty()) return;
    setShowInSidebar(next);
  };
  const changeSidebarLabel = (next: string) => {
    if (next === sidebarLabel || !persistence.markDirty()) return;
    setSidebarLabel(next);
  };

  const previewOwnerKey = selectedContentType?.slug ?? "no-content-type";
  return (
    <CustomScreenEditorPreviewOwner key={previewOwnerKey} contentType={selectedContentType}>
      {({ previewDataLoading, previewRecordState, previewNotice }) => (
        <CustomScreenEditorLayout
          header={{
            name,
            status,
            hasUnsavedChanges,
            isCreateMode,
            routeReady,
            isLoading,
            isSaving,
            externalRevisionUnresolved,
          }}
          headerActions={{
            onPreviewOpen: () => setPreviewOpen(true),
            onSave: persistence.handleSave,
          }}
          alerts={{
            error,
            saveNotice,
            externalUpdatePending,
            orphanBindings: {
              count: orphanCount,
              fieldNames:
                bindingOrphans.fieldOrphans.length > 0
                  ? uniqueFieldNames(bindingOrphans.fieldOrphans)
                  : [],
              onRemove: () => documentActions.handleRemoveOrphanBindings(bindingOrphans),
            },
          }}
          alertActions={{ onExternalRefresh: persistence.requestExternalRefresh }}
          settings={{
            values: { name, contentTypeId, status, showInSidebar, sidebarLabel },
            contentTypes,
            actions: {
              onNameChange: changeName,
              onContentTypeChange: changeContentType,
              onStatusChange: changeStatus,
              onShowInSidebarChange: changeShowInSidebar,
              onSidebarLabelChange: changeSidebarLabel,
            },
          }}
          canvas={{
            document: screenDocument,
            bindings: screenBindings,
            fields: contentFields,
            selectedSectionId,
            selectedBlockId: selectedId,
            onSelectSection: documentActions.handleSelectSection,
            onSelectBlock: documentActions.handleSelectBlock,
            onAddSection: documentActions.handleAddSection,
            onRenameSection: documentActions.handleRenameSection,
            onMoveSection: documentActions.handleMoveSection,
            onDeleteSection: documentActions.handleDeleteSection,
            onAddBlock: documentActions.handleAddBlock,
            insertPoint,
            onSetInsertPoint: setInsertPoint,
            onDragMove: documentActions.handleDragMove,
            onPatchBlock: documentActions.handlePatchBlock,
            onPatchSection: documentActions.handlePatchSection,
            onPatchBlockData: documentActions.handlePatchBlockData,
            onPatchBinding: documentActions.handlePatchBinding,
            onMove: documentActions.handleMoveBlock,
            onDuplicate: documentActions.handleDuplicateBlock,
            onDelete: documentActions.handleDeleteBlock,
          }}
          panel={{ open: panelOpen, onOpenChange: setPanelOpen }}
          preview={{
            open: previewOpen,
            contentType: selectedContentType,
            listView: definition.listView,
            recordState: previewRecordState,
            loading: previewDataLoading,
            notice: previewNotice,
            onOpenChange: setPreviewOpen,
          }}
          externalRefreshDialog={{
            open: externalRefreshConfirmOpen,
            onOpenChange: setExternalRefreshConfirmOpen,
            onConfirm: persistence.discardLocalDraftAndRefresh,
          }}
          dirtyNavigationDialog={dirtyNavigationDialog}
        />
      )}
    </CustomScreenEditorPreviewOwner>
  );
}
