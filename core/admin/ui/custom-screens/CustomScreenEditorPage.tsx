import { Eye, Save, SlidersHorizontal } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
import { buildCustomScreenEditorPath, resolveCustomScreenId } from "./routeParams";
import { PageHeader } from "@/ui/shared/PageHeader";
import { useAdminDirtyNavigationGuard } from "@/ui/shared/AdminDirtyNavigationGuard";
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
  updateScreenSection,
  type ScreenBlockKind,
  type ScreenInsertTarget,
  type ScreenSectionPatch,
} from "../../../services/customScreens/screenDocumentOps";
import {
  useCustomScreenPreviewRecordState,
  type CustomScreenPreviewRecordState,
} from "./customScreenPreviewData";
import { createScreenFieldBinding } from "./ScreenBlockInspector";
import { ScreenAuthoringCanvas } from "./ScreenAuthoringCanvas";
import type { ContentField } from "../content-types/SchemaBuilder";

const normalizeText = (value: string) => value.trim();

type BuilderRouteVisit = Readonly<{ routeKey: string }>;
type BuilderRouteMessage = Readonly<{
  routeVisit: BuilderRouteVisit;
  kind: "load" | "save";
  message: string;
}>;
type BuilderLoadToken = Readonly<{
  routeKey: string;
  routeVisit: BuilderRouteVisit;
  routeGeneration: number;
  requestGeneration: number;
  draftGeneration: number;
}>;
type BuilderSaveToken = Readonly<{
  routeKey: string;
  routeVisit: BuilderRouteVisit;
  routeGeneration: number;
  saveGeneration: number;
  draftGeneration: number;
}>;

export const advanceBuilderDraftGeneration = (current: number) => current + 1;

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

// TASK-505-03 (Item B): client-side orphan detection for the binding-recovery
// affordance. Mirrors the 505-01 server predicates so client + server agree on
// what is prunable (no surprise divergence), and — crucially — is NON-destructive
// to valid bindings (source order preserved, orphans-only).
type ScreenBindingOrphans = {
  blockOrphans: ScreenFieldBinding[]; // blockId matches NO live block in the document
  fieldOrphans: ScreenFieldBinding[]; // field ROOT missing from the content type (+ system)
};

// System roots the binding validator always allows (mirror the server allow-set).
const SCREEN_SYSTEM_FIELD_ROOTS = new Set([
  "title",
  "slug",
  "status",
  "createdAt",
  "updatedAt",
  "publishedAt",
]);

export const detectScreenBindingOrphans = (
  document: ScreenDocumentV1,
  bindings: readonly ScreenFieldBinding[],
  fields: ReadonlyArray<{ name: string }>
): ScreenBindingOrphans => {
  const liveIds = new Set<string>();
  const walk = (blocks: readonly ScreenBlockV1[]) =>
    blocks.forEach((block) => {
      liveIds.add(block.id);
      if (block.children) walk(block.children);
      if (block.slots) Object.values(block.slots).forEach(walk);
    });
  document.sections.forEach((section) => walk(section.blocks));
  // Server parity (customScreenSchemas.ts): getAllowedBindingFieldRoots returns
  // `null` when the content type has NO schema properties, and the binding
  // normalizer then SKIPS field-root validation entirely — a schemaless content
  // type legitimately allows ANY field name. So field-root orphan detection MUST
  // be allow-all when `fields` is empty; flagging here would falsely mark valid
  // entry bindings and let the one-click prune DESTROY them (data-loss trap).
  const allowAllFields = fields.length === 0;
  const allowedRoots = new Set<string>([
    ...SCREEN_SYSTEM_FIELD_ROOTS,
    ...fields.map((field) => field.name),
  ]);
  const blockOrphans: ScreenFieldBinding[] = [];
  const fieldOrphans: ScreenFieldBinding[] = [];
  for (const binding of bindings) {
    if (!liveIds.has(binding.blockId)) {
      blockOrphans.push(binding);
      continue;
    }
    if (allowAllFields) continue; // schemaless type → server allows every field root
    const root = binding.field.split(".")[0] ?? binding.field; // dotted-path root
    if (!allowedRoots.has(root)) fieldOrphans.push(binding);
  }
  return { blockOrphans, fieldOrphans };
};

// De-dupe binding field roots for a readable recovery message.
export const uniqueFieldNames = (
  bindings: readonly ScreenFieldBinding[] | readonly string[]
): string[] => {
  const seen = new Set<string>();
  for (const item of bindings) {
    const field = typeof item === "string" ? item : item.field;
    const root = field.split(".")[0] ?? field;
    if (root) seen.add(root);
  }
  return [...seen];
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
  const { path } = useAdminRouter();
  const screenId = useMemo(() => resolveCustomScreenId(path), [path]);
  const isCreateMode = !screenId || screenId === "new";
  const routeKey = `${screenId ?? ""}\u0000${isCreateMode}`;

  return (
    <CustomScreenEditorRouteSession
      key={routeKey}
      routeKey={routeKey}
      screenId={screenId}
      isCreateMode={isCreateMode}
    />
  );
}

function CustomScreenEditorRouteSession({
  routeKey,
  screenId,
  isCreateMode,
}: {
  routeKey: string;
  screenId: string | null;
  isCreateMode: boolean;
}) {
  const { navigate } = useAdminRouter();
  const [routeVisit] = useState<BuilderRouteVisit>(() => Object.freeze({ routeKey }));
  const initialScreen = useMemo(
    () => (!isCreateMode && screenId ? (getCachedCustomScreen(screenId) ?? null) : null),
    [isCreateMode, screenId]
  );
  const initialDefinition = useMemo(() => resolveScreenDefinition(initialScreen), [initialScreen]);
  const initialSelection = useMemo(
    () => resolveInitialSelection(initialDefinition.editorView.document),
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
  const screenDocument = definition.editorView.document;
  const screenBindings = definition.editorView.bindings;
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
  // TASK-505-03 (Item B3): a NON-blocking, success-adjacent notice naming the
  // field(s) the 505-01 save-path GC pruned (read off the returned record's
  // transient `warnings`). Cleared by markDirty alongside setError(null).
  const [saveNoticeCommit, setSaveNoticeCommit] = useState<BuilderRouteMessage | null>(null);
  const [remoteWarningVisit, setRemoteWarningVisit] = useState<BuilderRouteVisit | null>(null);
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
  const builderDirtyRef = useRef(false);
  const draftMutationGenerationRef = useRef(0);
  const screenHydrationGenerationRef = useRef(0);
  const screenSaveGenerationRef = useRef(0);
  const activeScreenSaveTokenRef = useRef<BuilderSaveToken | null>(null);
  const persistedScreenTargetRef = useRef<{
    routeVisit: BuilderRouteVisit;
    routeGeneration: number;
    id: string;
  } | null>(null);
  const mountedRef = useRef(true);
  const routeGenerationRef = useRef(0);

  const routeReady = committedScreenVisit === routeVisit;
  const isLoading = !routeReady && loadActivityVisit === routeVisit;
  const isSaving = saveActivityVisit === routeVisit;
  const error = errorCommit?.routeVisit === routeVisit ? errorCommit.message : null;
  const remoteUpdatePending = remoteWarningVisit === routeVisit;
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

  useLayoutEffect(() => {
    mountedRef.current = true;
    routeGenerationRef.current += 1;
    return () => {
      clearActiveAssistantSurfaceContext();
      activeScreenSaveTokenRef.current = null;
      persistedScreenTargetRef.current = null;
      mountedRef.current = false;
      routeGenerationRef.current += 1;
      screenHydrationGenerationRef.current += 1;
      screenSaveGenerationRef.current += 1;
    };
  }, [routeVisit]);

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

  const markDirty = useCallback(() => {
    if (committedScreenVisit !== routeVisit) return false;
    draftMutationGenerationRef.current = advanceBuilderDraftGeneration(
      draftMutationGenerationRef.current
    );
    builderDirtyRef.current = true;
    setHasUnsavedChanges(true);
    setErrorCommit(null);
    setSaveNoticeCommit(null);
    return true;
  }, [committedScreenVisit, routeVisit]);

  const updateDefinition = useCallback(
    (next: CustomScreenDefinition) => {
      if (next === definitionRef.current) return false;
      if (!markDirty()) return false;
      definitionRef.current = next;
      setDefinition(next);
      return true;
    },
    [markDirty]
  );

  const updateEditorView = useCallback(
    (next: {
      document?: CustomScreenDefinition["editorView"]["document"];
      bindings?: ScreenFieldBinding[];
    }) => {
      const current = definitionRef.current;
      const document = next.document ?? current.editorView.document;
      const bindings = next.bindings ?? current.editorView.bindings;
      if (document === current.editorView.document && bindings === current.editorView.bindings) {
        return false;
      }
      return updateDefinition({
        ...current,
        editorView: {
          ...current.editorView,
          document,
          bindings,
        },
      });
    },
    [updateDefinition]
  );

  // TASK-505-03 (Item B2): proactive orphan detection over the live editor state.
  // Gives the user a recovery path BEFORE hitting Save — the previously-opaque
  // un-saveable dead-end becomes a one-click fix. Suppressed until the content
  // type resolves so a transient empty `contentFields` can't false-flag valid
  // field bindings (block-orphans don't depend on `contentFields`, so they stay
  // accurate throughout).
  const bindingOrphans = useMemo(
    () =>
      selectedContentType
        ? detectScreenBindingOrphans(screenDocument, screenBindings, contentFields)
        : { blockOrphans: [], fieldOrphans: [] },
    [selectedContentType, screenDocument, screenBindings, contentFields]
  );
  const orphanCount = bindingOrphans.blockOrphans.length + bindingOrphans.fieldOrphans.length;

  const handleRemoveOrphanBindings = () => {
    const current = definitionRef.current;
    const orphanIds = new Set(
      [...bindingOrphans.blockOrphans, ...bindingOrphans.fieldOrphans].map((binding) => binding.id)
    );
    if (orphanIds.size === 0) return;
    updateEditorView({
      document: current.editorView.document, // document unchanged — bindings-only prune
      bindings: current.editorView.bindings.filter((binding) => !orphanIds.has(binding.id)),
    });
  };

  const applyScreenFieldsAndDefinition = useCallback((record: CustomScreenRecord) => {
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
  }, []);

  const resetBuilderDraftAuthority = useCallback(() => {
    draftMutationGenerationRef.current = advanceBuilderDraftGeneration(
      draftMutationGenerationRef.current
    );
    builderDirtyRef.current = false;
    setHasUnsavedChanges(false);
  }, []);

  const buildScreenSaveNotice = useCallback((record: CustomScreenRecord) => {
    const prunedFields = uniqueFieldNames(
      (record.warnings ?? [])
        .filter((warning) => warning.code === "binding_field_removed")
        .flatMap((warning) => warning.fields)
    );
    return prunedFields.length > 0
      ? `Removed binding(s) for deleted field(s): ${prunedFields.join(", ")}.`
      : null;
  }, []);

  const applyPersistedScreen = useCallback(
    (
      record: CustomScreenRecord,
      acceptedRouteVisit: BuilderRouteVisit,
      source: "load" | "save"
    ) => {
      applyScreenFieldsAndDefinition(record);
      resetBuilderDraftAuthority();
      setRemoteWarningVisit(null);
      setCommittedScreenVisit(acceptedRouteVisit);
      const notice = source === "save" ? buildScreenSaveNotice(record) : null;
      setSaveNoticeCommit(
        notice ? { routeVisit: acceptedRouteVisit, kind: "save", message: notice } : null
      );
    },
    [applyScreenFieldsAndDefinition, buildScreenSaveNotice, resetBuilderDraftAuthority]
  );

  const updatePersistedScreenBaselineWithoutReplacingDraft = useCallback(
    (record: CustomScreenRecord, acceptedRouteVisit: BuilderRouteVisit) => {
      setScreen(record);
      setCommittedScreenVisit(acceptedRouteVisit);
    },
    []
  );

  const captureScreenLoadToken = useCallback(
    (): BuilderLoadToken => ({
      routeKey,
      routeVisit,
      routeGeneration: routeGenerationRef.current,
      requestGeneration: ++screenHydrationGenerationRef.current,
      draftGeneration: draftMutationGenerationRef.current,
    }),
    [routeKey, routeVisit]
  );

  const isScreenLoadIdentityCurrent = useCallback(
    (token: BuilderLoadToken) =>
      mountedRef.current &&
      token.routeKey === routeKey &&
      token.routeVisit === routeVisit &&
      token.routeGeneration === routeGenerationRef.current &&
      token.requestGeneration === screenHydrationGenerationRef.current,
    [routeKey, routeVisit]
  );

  const mayApplyScreenLoad = useCallback(
    (token: BuilderLoadToken) =>
      isScreenLoadIdentityCurrent(token) &&
      token.draftGeneration === draftMutationGenerationRef.current &&
      !builderDirtyRef.current,
    [isScreenLoadIdentityCurrent]
  );

  const didBuilderDraftRemainClean = useCallback(
    (token: BuilderLoadToken) =>
      token.draftGeneration === draftMutationGenerationRef.current && !builderDirtyRef.current,
    []
  );

  const hasCurrentScreenSaveAuthority = useCallback(() => {
    const token = activeScreenSaveTokenRef.current;
    return Boolean(
      token &&
      mountedRef.current &&
      token.routeKey === routeKey &&
      token.routeVisit === routeVisit &&
      token.routeGeneration === routeGenerationRef.current &&
      token.saveGeneration === screenSaveGenerationRef.current
    );
  }, [routeKey, routeVisit]);

  const runBackgroundScreenHydration = useCallback(
    async (load: () => Promise<CustomScreenRecord | null>, isActive: () => boolean) => {
      if (!mountedRef.current || !isActive()) return;
      const token = captureScreenLoadToken();
      setLoadActivityVisit(token.routeVisit);
      try {
        const detail = await load();
        if (!isActive() || !isScreenLoadIdentityCurrent(token)) return;
        if (hasCurrentScreenSaveAuthority()) return;
        if (!mayApplyScreenLoad(token)) {
          setErrorCommit(null);
          setRemoteWarningVisit(token.routeVisit);
          return;
        }
        if (!detail) {
          setErrorCommit({
            routeVisit: token.routeVisit,
            kind: "load",
            message: "Custom screen not found.",
          });
          return;
        }
        applyPersistedScreen(detail, token.routeVisit, "load");
        setErrorCommit(null);
      } catch (loadError) {
        if (!isActive() || !isScreenLoadIdentityCurrent(token)) return;
        if (hasCurrentScreenSaveAuthority()) return;
        setErrorCommit({
          routeVisit: token.routeVisit,
          kind: "load",
          message: didBuilderDraftRemainClean(token)
            ? isApiClientError(loadError)
              ? loadError.message
              : "Failed to load custom screen."
            : "Could not check for Screen updates. Local changes are unchanged.",
        });
      } finally {
        if (isActive() && isScreenLoadIdentityCurrent(token)) {
          setLoadActivityVisit((current) => (current === token.routeVisit ? null : current));
        }
      }
    },
    [
      applyPersistedScreen,
      captureScreenLoadToken,
      didBuilderDraftRemainClean,
      hasCurrentScreenSaveAuthority,
      isScreenLoadIdentityCurrent,
      mayApplyScreenLoad,
    ]
  );

  const refreshScreen = useCallback(
    async (force = true, isActive: () => boolean = () => true) => {
      if (!screenId || isCreateMode) return;
      await runBackgroundScreenHydration(
        () => getCustomScreenCached(screenId, { force }),
        () => mountedRef.current && isActive()
      );
    },
    [isCreateMode, runBackgroundScreenHydration, screenId]
  );

  const handleCurrentScreenCacheEvent = useCallback(() => {
    if (!mountedRef.current) return;
    if (hasCurrentScreenSaveAuthority()) return;
    if (builderDirtyRef.current) {
      setRemoteWarningVisit(routeVisit);
      return;
    }
    void refreshScreen(true);
  }, [hasCurrentScreenSaveAuthority, refreshScreen, routeVisit]);

  const handleSelectBlock = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setSelectedSectionId(findBlockSectionId(definitionRef.current.editorView.document, id));
    }
  }, []);

  useEffect(() => {
    let active = true;
    void listContentTypesCached({ force: true })
      .then((items) => {
        if (active && mountedRef.current) setContentTypes(items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isCreateMode || !screenId) return undefined;
    let active = true;
    queueMicrotask(() => {
      if (active && mountedRef.current) void refreshScreen(true, () => active);
    });
    return () => {
      active = false;
    };
  }, [isCreateMode, refreshScreen, screenId]);

  useEffect(() => {
    if (isCreateMode || !screenId) return undefined;
    return subscribeCacheEvents((event) => {
      if (
        event.key !== cacheKeys.customScreensList &&
        event.key !== cacheKeys.customScreenDetail(screenId)
      ) {
        return;
      }
      handleCurrentScreenCacheEvent();
    });
  }, [handleCurrentScreenCacheEvent, isCreateMode, screenId]);

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

  // TASK-505-03 (Item A): section-layout write — mirrors handlePatchBlock. The
  // `style` key rides the same `definition` PATCH envelope (no new persisted key
  // beyond 505-01's document contract; schemaVersion unchanged).
  const handlePatchSection = (sectionId: string, patch: ScreenSectionPatch) => {
    const current = definitionRef.current;
    updateEditorView({
      document: updateScreenSection(current.editorView.document, sectionId, patch),
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
    if (patch.field === "") {
      const nextBindings = current.editorView.bindings.filter(
        (binding) => !(binding.blockId === blockId && binding.propPath === propPath)
      );
      if (nextBindings.length === current.editorView.bindings.length) return;
      updateEditorView({ bindings: nextBindings });
      return;
    }
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
    const selectedBlock = findScreenBlockById(current.editorView.document, blockId);
    const documentNeedsFieldUpdate =
      propPath === "value" &&
      Boolean(
        selectedBlock &&
        (selectedBlock.data.field !== fieldName ||
          (matchingField && selectedBlock.data.label !== matchingField.label))
      );
    if (
      existing &&
      existing.field === nextBinding.field &&
      existing.mode === nextBinding.mode &&
      !documentNeedsFieldUpdate
    ) {
      return;
    }
    const nextDocument = documentNeedsFieldUpdate
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

  const mapBoundedScreenSaveError = (saveError: unknown) => {
    if (!isApiClientError(saveError)) return "Failed to save custom screen.";
    const detail = saveError.details;
    const rawFields =
      detail && typeof detail === "object" && "fields" in detail
        ? (detail as { fields?: unknown }).fields
        : undefined;
    const fields = Array.isArray(rawFields)
      ? rawFields.filter((field): field is string => typeof field === "string")
      : [];
    return fields.length > 0
      ? `${saveError.message} (field(s): ${fields.join(", ")})`
      : saveError.message;
  };

  const captureScreenSaveToken = (): BuilderSaveToken => ({
    routeKey,
    routeVisit,
    routeGeneration: routeGenerationRef.current,
    saveGeneration: ++screenSaveGenerationRef.current,
    draftGeneration: draftMutationGenerationRef.current,
  });

  const isScreenSaveIdentityCurrent = (token: BuilderSaveToken) =>
    mountedRef.current &&
    token.routeKey === routeKey &&
    token.routeVisit === routeVisit &&
    token.routeGeneration === routeGenerationRef.current &&
    token.saveGeneration === screenSaveGenerationRef.current;

  const commitScreenSaveResponse = (
    saved: CustomScreenRecord,
    token: BuilderSaveToken
  ): { mayNavigate: boolean } => {
    if (!isScreenSaveIdentityCurrent(token) || activeScreenSaveTokenRef.current !== token) {
      return { mayNavigate: false };
    }
    activeScreenSaveTokenRef.current = null;
    screenHydrationGenerationRef.current += 1;
    setLoadActivityVisit(null);
    setErrorCommit(null);
    setRemoteWarningVisit(null);
    if (token.draftGeneration !== draftMutationGenerationRef.current) {
      if (isCreateMode) {
        persistedScreenTargetRef.current = {
          routeVisit: token.routeVisit,
          routeGeneration: token.routeGeneration,
          id: saved.id,
        };
      }
      updatePersistedScreenBaselineWithoutReplacingDraft(saved, token.routeVisit);
      setSaveNoticeCommit({
        routeVisit: token.routeVisit,
        kind: "save",
        message: "Saved server version; newer local changes remain unsaved.",
      });
      return { mayNavigate: false };
    }
    persistedScreenTargetRef.current = null;
    applyPersistedScreen(saved, token.routeVisit, "save");
    return { mayNavigate: true };
  };

  const invalidateBuilderVisitForDiscard = useCallback(() => {
    draftMutationGenerationRef.current = advanceBuilderDraftGeneration(
      draftMutationGenerationRef.current
    );
    builderDirtyRef.current = false;
    screenHydrationGenerationRef.current += 1;
    screenSaveGenerationRef.current += 1;
    activeScreenSaveTokenRef.current = null;
    persistedScreenTargetRef.current = null;
    setHasUnsavedChanges(false);
    setCommittedScreenVisit(null);
    setLoadActivityVisit(null);
    setSaveActivityVisit(null);
    setErrorCommit(null);
    setRemoteWarningVisit(null);
    setSaveNoticeCommit(null);
    setPreviewOpen(false);
    clearActiveAssistantSurfaceContext();
  }, []);

  const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
    blocked: hasUnsavedChanges,
    title: "Discard unsaved Screen changes?",
    description: "The Screen document or bindings have local changes.",
    confirmLabel: "Discard and continue",
    cancelLabel: "Keep editing",
    onConfirmDiscard: invalidateBuilderVisitForDiscard,
  });

  const handleSave = async () => {
    if (!routeReady) return;
    const trimmedName = normalizeText(name);
    if (!trimmedName) {
      setErrorCommit({
        routeVisit,
        kind: "save",
        message: "Screen name is required.",
      });
      return;
    }
    if (!contentTypeId) {
      setErrorCommit({
        routeVisit,
        kind: "save",
        message: "Select a content type before saving.",
      });
      return;
    }

    const token = captureScreenSaveToken();
    activeScreenSaveTokenRef.current = token;
    screenHydrationGenerationRef.current += 1;
    setLoadActivityVisit((current) => (current === token.routeVisit ? null : current));
    setSaveActivityVisit(token.routeVisit);
    setErrorCommit(null);
    setSaveNoticeCommit(null);
    const payload = {
      name: trimmedName,
      contentTypeId,
      status,
      showInSidebar,
      sidebarLabel: sidebarLabel.trim() || null,
      definition: definitionRef.current,
    };

    try {
      const capturedTarget = persistedScreenTargetRef.current;
      const targetId =
        screenId && !isCreateMode
          ? screenId
          : capturedTarget?.routeVisit === routeVisit &&
              capturedTarget.routeGeneration === routeGenerationRef.current
            ? capturedTarget.id
            : null;
      const saved = targetId
        ? await updateCustomScreen(targetId, payload)
        : await createCustomScreen(payload);
      const { mayNavigate } = commitScreenSaveResponse(saved, token);
      if (isCreateMode && mayNavigate) {
        navigate(buildCustomScreenEditorPath({ screenId: saved.id }), {
          skipBlockers: true,
        });
      }
    } catch (saveError) {
      if (isScreenSaveIdentityCurrent(token)) {
        if (activeScreenSaveTokenRef.current === token) {
          activeScreenSaveTokenRef.current = null;
        }
        setErrorCommit({
          routeVisit: token.routeVisit,
          kind: "save",
          message: mapBoundedScreenSaveError(saveError),
        });
      }
    } finally {
      if (isScreenSaveIdentityCurrent(token)) {
        if (activeScreenSaveTokenRef.current === token) {
          activeScreenSaveTokenRef.current = null;
        }
        setSaveActivityVisit((current) => (current === token.routeVisit ? null : current));
      }
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
            const next = event.target.value;
            if (next === name || !markDirty()) return;
            setName(next);
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
            if (value === contentTypeId || !markDirty()) return;
            setContentTypeId(value);
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
            const next = value as CustomScreenStatus;
            if (next === status || !markDirty()) return;
            setStatus(next);
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
              const next = checked === true;
              if (next === showInSidebar || !markDirty()) return;
              setShowInSidebar(next);
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
            const next = event.target.value;
            if (next === sidebarLabel || !markDirty()) return;
            setSidebarLabel(next);
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
    <>
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
                    disabled={!routeReady || isLoading || isSaving}
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
                {/* TASK-505-03 (Item B2/B3): the outer gate is widened beyond
                  `error || remoteUpdatePending` so the amber orphan notice (no
                  current error on the reopen path) and the post-save pruned-field
                  notice (no error on a clean save) actually mount. The per-notice
                  inner gates still decide which Alert shows. */}
                {error || remoteUpdatePending || orphanCount > 0 || saveNotice ? (
                  <div className="shrink-0 space-y-3 px-6 pt-4">
                    {error ? (
                      <Alert variant="destructive">
                        <AlertTitle>Custom screen error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ) : null}
                    {orphanCount > 0 ? (
                      <Alert data-screen-orphan-notice="true">
                        <AlertTitle>Orphaned field bindings</AlertTitle>
                        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <span>
                            {orphanCount} binding(s) reference{" "}
                            {bindingOrphans.fieldOrphans.length > 0
                              ? `deleted field(s): ${uniqueFieldNames(bindingOrphans.fieldOrphans).join(", ")}`
                              : "removed blocks"}
                            . They block saving until removed.
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveOrphanBindings}
                            data-screen-remove-orphans="true"
                          >
                            Remove orphaned bindings
                          </Button>
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    {saveNotice ? (
                      <Alert data-screen-save-notice="true">
                        <AlertTitle>Binding cleanup</AlertTitle>
                        <AlertDescription>{saveNotice}</AlertDescription>
                      </Alert>
                    ) : null}
                    {remoteUpdatePending ? (
                      <Alert>
                        <AlertTitle>Updated in another tab</AlertTitle>
                        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <span>
                            New changes are available. Refresh to load the latest version.
                          </span>
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
                ) : routeReady ? (
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
                    onPatchSection={handlePatchSection}
                    onPatchBlockData={handlePatchBlockData}
                    onPatchBinding={handlePatchBinding}
                    onMove={handleMoveBlock}
                    onDuplicate={handleDuplicateBlock}
                    onDelete={handleDeleteBlock}
                  />
                ) : null}
              </CustomScreenShell>

              {routeReady ? (
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
              ) : null}
            </>
          );
        }}
      </CustomScreenPreviewRecordOwner>
      {dirtyNavigationDialog}
    </>
  );
}
