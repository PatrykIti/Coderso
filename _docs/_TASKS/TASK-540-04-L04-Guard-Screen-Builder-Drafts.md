# TASK-540-04-L04: Guard Screen Builder Drafts

# FileName: TASK-540-04-L04-Guard-Screen-Builder-Drafts.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-04
**Priority:** High
**Category:** Custom Screens / Builder / Data Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-540-04-L03
**Status:** 🚧 In Progress
**Started:** 2026-07-14
**Fix Started:** 2026-07-15
**Repair Reason:** Mandatory repository-wide `bun run test` confirmed that `tests/vitest/ui-integration/screen-editor-sections.test.tsx` had fully mocked `@/utils/cacheBus` without the L04-required `createCacheEventOperationToken` export. Its Save path rejected before `updateCustomScreen`, producing an unhandled rejection and zero mutation calls; the repair added only the missing fresh-symbol factory and re-gated the owning leaf.
**Implementation Complete:** 2026-07-15 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Revalidation Passed:** generation 57974d94b81d8f4afbf85a22ebe32bf4 / token 1e62523100e412eaf5611d3f3b152f24 / gate green
**Historical Completion:** 2026-07-14
**Historical Revalidation:** 2026-07-14 — `core lint:types`, `core lint`, root `tsc`, and the exact five-file Vitest matrix (57/57)
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/routeParams.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/ui/custom-screen-route-params.test.ts`
- `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx` (only the additive
  cacheBus factory mock required by the L03 API; all TASK-505 assertions stay byte-identical)
- `tests/vitest/ui-integration/screen-editor-sections.test.tsx` (only the additive
  `createCacheEventOperationToken: () => Symbol(),` property in its existing full-module
  cacheBus mock; all nine TASK-500 tests and all of their assertions, imports, and every other mock byte stay
  byte-identical)

No other TASK-540 leaf edits these paths. In particular, TASK-540-03-L01 owns only the
renderer and record-interaction suites; this leaf exclusively owns the binding-flow
suite. TASK-540-04-L03 consumes the existing workspace/entry helper read-only; L04 owns
only the additive Screen-editor helper seam and its route-params assertions.
The recovery suite remains a TASK-505 regression gate for pruned-binding notices and
detailed save errors. L04 added exactly
`createCacheEventOperationToken: () => Symbol()` to its full-module cacheBus mock so the
real L04 import can execute; it must not edit or re-baseline any behavior assertion.
The same exact additive factory was added in `screen-editor-sections.test.tsx`
because that legacy suite executes Save. Its nine TASK-500 tests retain their existing
behavior and assertion strength; this repair does not change imports, fixtures, mutation
mocks, save expectations, or any other cacheBus mock property.

Four other focused suites intentionally keep their current partial cacheBus mocks:
`canvas-editor-panel-toggle-dedupe.test.tsx`, `custom-screen-editor-restyle.test.tsx`,
`custom-screen-widget-picker.test.tsx`, and
`screen-editor-insertion-targeting.test.tsx`. None executes the Screen builder Save path,
so the existing `subscribeCacheEvents` export is sufficient for the behavior each suite
owns. Under YAGNI this repair does not edit them. Any future Save coverage in one of those
files must consciously add a fresh-symbol `createCacheEventOperationToken` factory rather
than reuse one shared symbol or silently import the real cache transport.

L04 consumes L03's landed cache-bus and mutation-client operation seams read-only. Existing
one-argument subscribers remain valid. The optional symbol token is same-context callback
metadata only; no cache key, serialized event field, storage key, network payload, or
broadcast transport changes.
The earlier corrective pass ran only after its L03 substrate/client phase and gate
passed. Its durable evidence is the affected task metadata and current gates, not the
mutable `_docs/_workflows/task-540-fix.mjs`, which now records only the completed
R01→R03 URL-control correction. That completion evidence remains historical. The
2026-07-15 one-property L04 repair and fresh six-file gate completed without rerunning
the then-completed sibling leaves. At that historical phase L04 and TASK-540-04 were
Done and closure resumed. The later TASK-540-04-L03 duplicate-delivery finding paused
closure again. In the current pre-1252 landed state L04 and TASK-540-04 remain
`🚧 In Progress` with `Implementation Complete`; L03 alone carries `Repair Pending`,
and TASK-540-06-L01 remains active and ungated.

## Historical pre-implementation grounded anchors

These 2026-07-13 line snapshots are retained as audit provenance. They describe the
pre-implementation source layout; current ownership and validation are anchored by the
named files, symbols, and regression suites in this contract rather than mutable line
numbers.

- Dirty, external-revision, and diagnostic state:
  `CustomScreenEditorPage.tsx:319-385`.
- Production-used refresh/save guards: `:121-136,713-740`.
- `markDirty` and the single definition mutation path: `:465-510`.
- Persisted apply, binding clear, and save paths: `:572-600`, `:1027-1107`, and
  `:1109-1276`.
- Initial/detail-cache hydration and exact self-event correlation: `:603-799`.
- Successful create navigation: `:1248-1256`.
- Existing workspace-only helper (ends in `/entries`): `routeParams.ts:36-42`.
- Existing route helper suite: `custom-screen-route-params.test.ts:1-74`.
- Shell dirty badge, unresolved Save state, warning action, and discard dialog:
  `CustomScreenEditorPage.tsx:1391-1513,1581-1591`.
- Shared guard: `AdminDirtyNavigationGuard.tsx:17-106`.
- Cache-event local/remote/operation delivery: `cacheBus.ts:73-138`.

## Implementation Pseudocode

```tsx
// tests/vitest/ui-integration/screen-editor-sections.test.tsx
// Preserve all imports, all nine TASK-500 tests and all of their assertions, and every other mock byte.
vi.mock("@/utils/cacheBus", () => ({
  createCacheEventOperationToken: () => Symbol(),
  subscribeCacheEvents: vi.fn(() => () => undefined),
}));

// Existing test data flow remains:
// Save click -> captureScreenSaveToken() -> fresh opaque symbol -> updateCustomScreen()
// -> assert exactly one mutation and the binding-pruned persisted definition.
// Without the factory, the async Save handler rejects before the mutation; do not catch,
// fall back, weaken the call-count assertion, or re-baseline the persisted payload.
// Every call returns a distinct symbol so exact same-context operation identity remains
// reference-based and no token is serialized or shared across saves.

// routeParams.ts: canonical Screen-definition editor path (not the /entries workspace).
export function buildCustomScreenEditorPath(input: { screenId: string }) {
  return `/advanced/custom-screens/${encodeURIComponent(input.screenId)}`;
}

function resolveCustomScreenPathname(input: string) {
  // Hash is not part of pathname; query is stripped from the pre-hash part.
  return (input.split("#", 1)[0] ?? input).split("?", 1)[0] ?? input;
}

export function resolveCustomScreenId(input: string) {
  const pathname = resolveCustomScreenPathname(input);
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "custom-screens");
  if (index === -1) return null;
  const value = parts[index + 1] ?? null;
  return value ? decodeURIComponent(value) : null;
}

type BuilderRouteVisit = Readonly<{ routeKey: string }>;
type BuilderRouteMessage = Readonly<{
  routeVisit: BuilderRouteVisit;
  kind: "load" | "save";
  message: string;
}>;
type BuilderSaveToken = Readonly<{
  routeKey: string;
  routeVisit: BuilderRouteVisit;
  routeGeneration: number;
  saveGeneration: number;
  draftGeneration: number;
  externalEventGeneration: number;
  cacheEventOperationToken: CacheEventOperationToken;
}>;

// Consume, do not mirror, the exact L03-owned cacheBus contract.
import {
  createCacheEventOperationToken,
  subscribeCacheEvents,
  type CacheEventOperationToken,
  type CacheEventOrigin,
} from "@/utils/cacheBus";

// Production and tests use the same pure monotonic transition. Static source audit
// verifies that every semantic mutation reaches exactly one call through markDirty.
export function advanceBuilderDraftGeneration(current: number) {
  return current + 1;
}

export function runBuilderManualRefresh(input: {
  saveActive: boolean;
  refresh: () => void;
}): boolean {
  if (input.saveActive) return false;
  input.refresh();
  return true;
}

export function getBuilderExternalRevisionSaveError(
  externalRevisionUnresolved: boolean
): string | null {
  return externalRevisionUnresolved
    ? "Refresh the newer Screen version before saving."
    : null;
}

// The outer component owns no draft state. A textual A route returning after B gets
// a new mounted session and therefore a new opaque RouteVisit object.
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
const initialScreen = !isCreateMode && screenId ? getCachedCustomScreen(screenId) ?? null : null;
const initialRouteReady = isCreateMode || initialScreen !== null;

const builderDirtyRef = useRef(false);
const draftMutationGenerationRef = useRef(0);
const screenHydrationGenerationRef = useRef(0);
const screenSaveGenerationRef = useRef(0);
const activeScreenSaveTokenRef = useRef<BuilderSaveToken | null>(null);
const externalScreenEventGenerationRef = useRef(0);
const externalUpdateUnresolvedRef = useRef(false);
const persistedScreenTargetRef = useRef<{
  routeVisit: BuilderRouteVisit;
  routeGeneration: number;
  id: string;
} | null>(null);
const mountedRef = useRef(true);
const routeGenerationRef = useRef(0);
const [committedScreenVisit, setCommittedScreenVisit] = useState<BuilderRouteVisit | null>(
  initialRouteReady ? routeVisit : null
);
const [loadActivityVisit, setLoadActivityVisit] = useState<BuilderRouteVisit | null>(
  initialRouteReady ? null : routeVisit
);
const [saveActivityVisit, setSaveActivityVisit] = useState<BuilderRouteVisit | null>(null);
const [errorCommit, setErrorCommit] = useState<BuilderRouteMessage | null>(null);
const [externalWarningVisit, setExternalWarningVisit] = useState<BuilderRouteVisit | null>(null);
const [externalRevisionVisit, setExternalRevisionVisit] = useState<BuilderRouteVisit | null>(null);
const [externalRefreshConfirmOpen, setExternalRefreshConfirmOpen] = useState(false);
const [saveNoticeCommit, setSaveNoticeCommit] = useState<BuilderRouteMessage | null>(null);

const routeReady = committedScreenVisit === routeVisit;
const isLoading = !routeReady && loadActivityVisit === routeVisit;
const isSaving = saveActivityVisit === routeVisit;
const error = errorCommit?.routeVisit === routeVisit ? errorCommit.message : null;
const externalUpdatePending = externalWarningVisit === routeVisit;
const externalRevisionUnresolved = externalRevisionVisit === routeVisit;
const saveNotice = saveNoticeCommit?.routeVisit === routeVisit ? saveNoticeCommit.message : null;

useLayoutEffect(() => {
  mountedRef.current = true;
  routeGenerationRef.current += 1;
  return () => {
    clearActiveAssistantSurfaceContext();
    activeScreenSaveTokenRef.current = null;
    externalUpdateUnresolvedRef.current = false;
    persistedScreenTargetRef.current = null;
    mountedRef.current = false;
    routeGenerationRef.current += 1;
    screenHydrationGenerationRef.current += 1;
    screenSaveGenerationRef.current += 1;
  };
}, [routeVisit]);

function markDirty() {
  // This is the ONE local-mutation marker. Metadata handlers call it directly;
  // document/binding handlers call updateEditorView -> updateDefinition -> markDirty.
  draftMutationGenerationRef.current = advanceBuilderDraftGeneration(
    draftMutationGenerationRef.current
  );
  builderDirtyRef.current = true;
  setHasUnsavedChanges(true);
  setErrorCommit(null);
  setSaveNoticeCommit(null);
}

function updateDefinition(next) {
  definitionRef.current = next;
  setDefinition(next);
  markDirty(); // exactly once for this semantic document/binding mutation
}

function updateEditorView(next) {
  const current = definitionRef.current;
  updateDefinition({
    ...current,
    editorView: {
      ...current.editorView,
      document: next.document ?? current.editorView.document,
      bindings: next.bindings ?? current.editorView.bindings,
    },
  });
}

const captureScreenLoadToken = useCallback(
  () => ({
    routeKey,
    routeVisit,
    routeGeneration: routeGenerationRef.current,
    requestGeneration: ++screenHydrationGenerationRef.current,
    draftGeneration: draftMutationGenerationRef.current,
  }),
  [routeKey, routeVisit]
);

const isScreenLoadIdentityCurrent = useCallback(
  (token) =>
    mountedRef.current &&
    token.routeKey === routeKey &&
    token.routeVisit === routeVisit &&
    routeGenerationRef.current === token.routeGeneration &&
    screenHydrationGenerationRef.current === token.requestGeneration,
  [routeKey, routeVisit]
);

const mayApplyScreenLoad = useCallback(
  (token) =>
    isScreenLoadIdentityCurrent(token) &&
    token.draftGeneration === draftMutationGenerationRef.current &&
    !builderDirtyRef.current,
  [isScreenLoadIdentityCurrent]
);

const didBuilderDraftRemainClean = useCallback(
  (token) =>
    token.draftGeneration === draftMutationGenerationRef.current &&
    !builderDirtyRef.current,
  []
);

const resetBuilderDraftAuthority = useCallback(() => {
  // An exact persistence response establishes a new baseline.
  draftMutationGenerationRef.current = advanceBuilderDraftGeneration(
    draftMutationGenerationRef.current
  );
  builderDirtyRef.current = false;
  setHasUnsavedChanges(false);
}, []);

const buildScreenSaveNotice = useCallback((record: CustomScreenRecord) => {
  const fields = uniqueFieldNames(
    (record.warnings ?? [])
      .filter((warning) => warning.code === "binding_field_removed")
      .flatMap((warning) => warning.fields)
  );
  return fields.length > 0
    ? `Removed binding(s) for deleted field(s): ${fields.join(", ")}.`
    : null;
}, []);

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

const applyPersistedScreen = useCallback(
  (
    record: CustomScreenRecord,
    acceptedRouteVisit: BuilderRouteVisit,
    source: "load" | "save",
    preserveExternalWarning = false
  ) => {
    applyScreenFieldsAndDefinition(record);
    resetBuilderDraftAuthority();
    if (source === "load") {
      externalUpdateUnresolvedRef.current = false;
      setExternalRevisionVisit(null);
    }
    if (!preserveExternalWarning) setExternalWarningVisit(null);
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
    // Update only server identity/metadata used as the persisted baseline. Do not touch
    // name/contentType/status/sidebar/definition/selection or either dirty authority.
    setScreen(record);
    setCommittedScreenVisit(acceptedRouteVisit);
  },
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
  async (
    load: () => Promise<CustomScreenRecord | null>,
    isActive: () => boolean
  ) => {
    // No manual/cache hydration may start while a save owns the visit.
    if (!mountedRef.current || !isActive() || hasCurrentScreenSaveAuthority()) return;
    const token = captureScreenLoadToken();
    setLoadActivityVisit(token.routeVisit);
    try {
      const result = await load();
      if (!isActive() || !isScreenLoadIdentityCurrent(token)) return;
      // A read started before or by a same-tab save event is older than the active
      // mutation response and must not advance the draft baseline/generation.
      if (hasCurrentScreenSaveAuthority()) return;
      if (!mayApplyScreenLoad(token)) {
        setExternalWarningVisit(token.routeVisit);
        return;
      }
      if (!result) {
        setErrorCommit({
          routeVisit: token.routeVisit,
          kind: "load",
          message: "Custom screen not found.",
        });
        return;
      }
      applyPersistedScreen(result, token.routeVisit, "load");
      setErrorCommit(null);
    } catch (error) {
      if (!isActive() || !isScreenLoadIdentityCurrent(token)) return;
      if (hasCurrentScreenSaveAuthority()) return;
      setErrorCommit({
        routeVisit: token.routeVisit,
        kind: "load",
        message: didBuilderDraftRemainClean(token)
          ? isApiClientError(error)
            ? error.message
            : "Failed to load custom screen."
          : "Could not check for Screen updates. Local changes are unchanged.",
      });
    } finally {
      if (isActive() && isScreenLoadIdentityCurrent(token)) {
        setLoadActivityVisit((current) =>
          current === token.routeVisit ? null : current
        );
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

function captureScreenSaveToken(): BuilderSaveToken {
  return {
    routeKey,
    routeVisit,
    routeGeneration: routeGenerationRef.current,
    saveGeneration: ++screenSaveGenerationRef.current,
    draftGeneration: draftMutationGenerationRef.current,
    externalEventGeneration: externalScreenEventGenerationRef.current,
    cacheEventOperationToken: createCacheEventOperationToken(),
  };
}

function isScreenSaveIdentityCurrent(token) {
  return mountedRef.current &&
    token.routeKey === routeKey &&
    token.routeVisit === routeVisit &&
    routeGenerationRef.current === token.routeGeneration &&
    screenSaveGenerationRef.current === token.saveGeneration;
}

function commitScreenSaveResponse(saved, token) {
  if (
    !isScreenSaveIdentityCurrent(token) ||
    activeScreenSaveTokenRef.current !== token
  ) {
    return { mayNavigate: false };
  }
  activeScreenSaveTokenRef.current = null;
  // The client broadcasts its cache mutation before its promise resumes. Revoke any
  // pre-response/self-event hydration and clear only this visit's refresh UI first.
  screenHydrationGenerationRef.current += 1;
  setLoadActivityVisit(null);
  setErrorCommit(null);
  const externalEventArrivedDuringSave =
    token.externalEventGeneration !== externalScreenEventGenerationRef.current;
  if (!externalEventArrivedDuringSave) setExternalWarningVisit(null);
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
  applyPersistedScreen(saved, token.routeVisit, "save", externalEventArrivedDuringSave);
  return { mayNavigate: true };
}

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

const requestExternalRefresh = useCallback(() => {
  runBuilderManualRefresh({
    saveActive: hasCurrentScreenSaveAuthority(),
    refresh: () => {
      if (builderDirtyRef.current) {
        setExternalRefreshConfirmOpen(true);
        return;
      }
      void refreshScreen(true);
    },
  });
}, [hasCurrentScreenSaveAuthority, refreshScreen]);

const discardLocalDraftAndRefresh = useCallback(() => {
  // The user explicitly discarded the authored draft. Restore the last known persisted
  // baseline synchronously so failed/missing refresh never presents discarded values as clean.
  if (!screen) return;
  draftMutationGenerationRef.current = advanceBuilderDraftGeneration(
    draftMutationGenerationRef.current
  );
  builderDirtyRef.current = false;
  screenHydrationGenerationRef.current += 1;
  applyScreenFieldsAndDefinition(screen);
  setHasUnsavedChanges(false);
  setLoadActivityVisit(null);
  setErrorCommit(null);
  setSaveNoticeCommit(null);
  setExternalRefreshConfirmOpen(false);
  void refreshScreen(true);
}, [applyScreenFieldsAndDefinition, refreshScreen, screen]);

// Visible disabling and the production-used helper are separate defenses. React
// intentionally suppresses delegated click listeners for a disabled button.
<Button disabled={isSaving} onClick={requestExternalRefresh}>Refresh</Button>;
<ConfirmActionDialog
  open={externalRefreshConfirmOpen}
  onOpenChange={setExternalRefreshConfirmOpen}
  title="Discard local Screen changes and refresh?"
  description="Your unsaved Screen changes will be discarded before loading the newer version."
  confirmLabel="Discard and refresh"
  cancelLabel="Keep editing"
  tone="warning"
  onConfirm={discardLocalDraftAndRefresh}
/>;

// Origin alone is insufficient: Assistant and other same-context actions are independent writers.
const handleCurrentScreenCacheEvent = useCallback((
  origin: CacheEventOrigin,
  operationToken?: CacheEventOperationToken
) => {
  const activeSave = activeScreenSaveTokenRef.current;
  const saveActive = hasCurrentScreenSaveAuthority();
  const isExactSelfEvent = Boolean(
    saveActive &&
      origin === "local" &&
      operationToken === activeSave?.cacheEventOperationToken
  );
  if (isExactSelfEvent) return;
  externalScreenEventGenerationRef.current += 1;
  externalUpdateUnresolvedRef.current = true;
  setExternalRevisionVisit(routeVisit);
  setExternalWarningVisit(routeVisit);
  if (builderDirtyRef.current || saveActive) {
    return;
  }
  void refreshScreen(true);
}, [hasCurrentScreenSaveAuthority, refreshScreen, routeVisit]);

useEffect(() => {
  if (isCreateMode || !screenId) return undefined;
  let active = true;
  // The async boundary keeps the effect body free of synchronous state updates.
  queueMicrotask(() => {
    if (active) void refreshScreen(true, () => active);
  });
  return () => {
    active = false;
  };
}, [isCreateMode, refreshScreen, screenId]);

useEffect(() => {
  if (isCreateMode || !screenId) return undefined;
  return subscribeCacheEvents((event, origin, operationToken) => {
    // A list event does not identify which Screen changed. Every supported mutation of
    // the current Screen also emits its exact detail key.
    if (event.key !== cacheKeys.customScreenDetail(screenId)) return;
    handleCurrentScreenCacheEvent(origin, operationToken);
  });
}, [handleCurrentScreenCacheEvent, isCreateMode, screenId]);

function invalidateBuilderVisitForDiscard() {
  // The guard calls this synchronously before its blocker-skipping continuation.
  draftMutationGenerationRef.current = advanceBuilderDraftGeneration(
    draftMutationGenerationRef.current
  );
  builderDirtyRef.current = false;
  screenHydrationGenerationRef.current += 1;
  screenSaveGenerationRef.current += 1;
  activeScreenSaveTokenRef.current = null;
  externalUpdateUnresolvedRef.current = false;
  setExternalRevisionVisit(null);
  persistedScreenTargetRef.current = null;
  setHasUnsavedChanges(false);
  setCommittedScreenVisit(null);
  setLoadActivityVisit(null);
  setSaveActivityVisit(null);
  setErrorCommit(null);
  setExternalWarningVisit(null);
  setSaveNoticeCommit(null);
  clearActiveAssistantSurfaceContext();
}

const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
  blocked: hasUnsavedChanges,
  title: "Discard unsaved Screen changes?",
  description: "The Screen document or bindings have local changes.",
  confirmLabel: "Discard and continue",
  cancelLabel: "Keep editing",
  onConfirmDiscard: () => {
    invalidateBuilderVisitForDiscard();
  },
});

function handlePatchBinding(blockId, propPath, patch) {
  const current = definitionRef.current;
  if (patch.field === "") {
    const bindings = current.editorView.bindings.filter(
      (binding) => !(binding.blockId === blockId && binding.propPath === propPath)
    );
    if (bindings.length === current.editorView.bindings.length) return;
    updateEditorView({ bindings });
    return; // never create or persist an empty-field binding
  }
  const existing = current.editorView.bindings.find(
    (binding) => binding.blockId === blockId && binding.propPath === propPath
  );
  const fieldName = patch.field ?? existing?.field ?? "title";
  const nextBinding = existing
    ? { ...existing, ...patch }
    : createScreenFieldBinding({ blockId, propPath, field: fieldName, mode: patch.mode });
  const bindings = existing
    ? current.editorView.bindings.map((binding) =>
        binding.id === existing.id ? nextBinding : binding
      )
    : [...current.editorView.bindings, nextBinding];
  const matchingField = contentFields.find((field) => field.name === fieldName);
  const document =
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
  updateEditorView({ document, bindings });
  // No direct markDirty here: updateEditorView reaches the one marker exactly once.
}

function resolveSiblingList(
  document: ScreenDocumentV1,
  location: ScreenBlockLocation
): ScreenBlockV1[] | null {
  const section = document.sections.find((item) => item.id === location.sectionId);
  if (!section) return null;
  if (location.parentId === null) {
    return location.slotId === null ? section.blocks : null;
  }
  const parent = findScreenBlockById(document, location.parentId);
  if (!parent) return null;
  return location.slotId === null
    ? (parent.children ?? null)
    : (parent.slots?.[location.slotId] ?? null);
}

function handleMoveBlock(blockId, direction) {
  const current = definitionRef.current;
  const location = findScreenBlockLocation(current.editorView.document, blockId);
  const siblings = location
    ? resolveSiblingList(current.editorView.document, location)
    : null;
  if (!location || !siblings) return;
  if (direction === "up" && location.index === 0) return;
  if (direction === "down" && location.index === siblings.length - 1) return;
  updateEditorView({
    document: moveScreenBlock(current.editorView.document, blockId, direction),
  });
}

function mapBoundedScreenSaveError(error: unknown) {
  if (!isApiClientError(error)) return "Failed to save custom screen.";
  const detail = error.details;
  const rawFields =
    detail && typeof detail === "object" && "fields" in detail
      ? (detail as { fields?: unknown }).fields
      : undefined;
  const fields = Array.isArray(rawFields)
    ? rawFields.filter((field): field is string => typeof field === "string")
    : [];
  return fields.length > 0
    ? `${error.message} (field(s): ${fields.join(", ")})`
    : error.message;
}

function commitSynchronousSaveValidationError(message: string) {
  // A validation click is newer diagnostic authority than every load already in flight.
  screenHydrationGenerationRef.current += 1;
  setLoadActivityVisit((current) => (current === routeVisit ? null : current));
  setErrorCommit({ routeVisit, kind: "save", message });
}

async function saveScreen(payload) {
  const externalRevisionError = getBuilderExternalRevisionSaveError(
    externalUpdateUnresolvedRef.current
  );
  if (externalRevisionError) {
    // Unlike field validation, this guard MUST NOT invalidate the forced GET that can
    // resolve the external authority. Keep its loading token/activity alive.
    setErrorCommit({ routeVisit, kind: "save", message: externalRevisionError });
    return;
  }
  if (!normalizeText(name)) {
    commitSynchronousSaveValidationError("Screen name is required.");
    return;
  }
  if (!contentTypeId) {
    commitSynchronousSaveValidationError("Select a content type before saving.");
    return;
  }
  const token = captureScreenSaveToken();
  activeScreenSaveTokenRef.current = token;
  setSaveActivityVisit(token.routeVisit);
  setErrorCommit(null);
  setSaveNoticeCommit(null);
  try {
    // A create response superseded by a local edit stores its ID; retry updates the
    // same server Screen instead of creating a duplicate.
    const capturedTarget = persistedScreenTargetRef.current;
    const targetId = screenId && !isCreateMode
      ? screenId
      : capturedTarget?.routeVisit === routeVisit &&
          capturedTarget.routeGeneration === routeGenerationRef.current
        ? capturedTarget.id
        : null;
    const mutationOptions = {
      cacheEventOperationToken: token.cacheEventOperationToken,
    };
    const saved = targetId
      ? await updateCustomScreen(targetId, payload, mutationOptions)
      : await createCustomScreen(payload, mutationOptions);
    const { mayNavigate } = commitScreenSaveResponse(saved, token);
    if (isCreateMode && mayNavigate) {
      navigate(buildCustomScreenEditorPath({ screenId: saved.id }), {
        skipBlockers: true,
      });
    }
  } catch (error) {
    if (isScreenSaveIdentityCurrent(token)) {
      if (activeScreenSaveTokenRef.current === token) {
        activeScreenSaveTokenRef.current = null;
      }
      setErrorCommit({
        routeVisit: token.routeVisit,
        kind: "save",
        message: mapBoundedScreenSaveError(error),
      });
    }
  } finally {
    if (isScreenSaveIdentityCurrent(token)) {
      if (activeScreenSaveTokenRef.current === token) {
        activeScreenSaveTokenRef.current = null;
      }
      setSaveActivityVisit(null);
    }
  }
}

return (
  <>
    <CustomScreenShell ...>
      <Button
        onClick={saveScreen}
        disabled={!routeReady || isLoading || isSaving || externalRevisionUnresolved}
      >
        Save
      </Button>
      {error ? <BuilderErrorAlert message={error} /> : null}
      {isLoading ? (
        <BuilderLoadingState />
      ) : routeReady ? (
        <ScreenAuthoringCanvas ... />
      ) : null}
    </CustomScreenShell>
    <ConfirmActionDialog ...external refresh discard contract... />
    {dirtyNavigationDialog}
  </>
);
}
```

Add and import the canonical `buildCustomScreenEditorPath` from L04-owned
`routeParams.ts`; do not use `buildCustomScreenWorkspacePath`, whose intentional
destination is `/advanced/custom-screens/:id/entries`. The editor helper percent-encodes
the ID and returns `/advanced/custom-screens/:id`, preserving the existing post-create
Screen-definition editor behavior without a hand-built path.
Route every local document, binding, metadata, and editor-view mutation through the one
synchronous `markDirty` path exactly once. `updateDefinition` owns the call for all
document/binding mutations, so binding helpers must not call it a second time. Direct
metadata setters call it once themselves. No mutation may update only React state and
leave the generation/ref stale.

Both initial forced revalidation and every cache-bus/manual refresh use
`runBackgroundScreenHydration`. They capture route, request, and draft identity before
awaiting, then guard every success apply, missing-record/error message, external-update
warning, and loading-finalization commit. A request that started clean must not
overwrite edits made while it was in flight; checking dirty only when starting the
request is insufficient. A user-confirmed destructive discard advances the draft
generation and clears ref/state before its authoritative replacement/navigation may
continue. Unmount or route change invalidates every late success, failure, warning, and
`finally` commit.

No route ref is written during render. The outer component owns only normalized route
resolution and renders a `key={routeKey}` inner session. Every mount allocates a new
opaque `BuilderRouteVisit`, even when navigation returns A→B→A and the textual key again
equals A. `useLayoutEffect([routeVisit])` cleanup increments route, hydration, and save
generations, revokes the visit-scoped create target, and clears assistant context before
late commits. Each initial/cache hydration effect also passes a local `active` cleanup
predicate. A promise resolving after route render but before passive-effect cleanup is
therefore rejected by the keyed layout boundary. The initial effect schedules hydration
through a cancellable microtask, so its body performs no synchronous state update; all
async/effect-facing helpers are stable `useCallback`s with exhaustive dependencies.
Until `committedScreenVisit === routeVisit`, persisted Screen content, builder controls,
preview, assistant context, and mutations are hidden or disabled. Current-visit initial
loading and current-visit terminal not-found/API/generic load errors remain visible before
route readiness; visit tagging hides every stale-visit diagnostic. No first-visit A state
can become authoritative on the second A visit.

The draft-generation/dirty barrier applies only to draft replacement. A current success
denied by a newer edit emits the bounded external-update warning; a current rejection
after a newer edit shows `Could not check for Screen updates. Local changes are
unchanged.`; and current `finally` always ends loading. None changes the draft. Only
route/request-current commits may update warning, error, or spinner state.

Generic API/`Failed to load custom screen.` copy is allowed only when the captured draft
generation is still exact and `builderDirtyRef.current` is false at catch time. A request
started while dirty, or any defensive dirty-ref/generation mismatch, uses the bounded
local-changes-unchanged copy; generation equality alone is never enough.

Every non-self current-detail event synchronously marks an unresolved external revision
before any await, pairs the synchronous ref with visit-scoped render state, shows the neutral
warning, and disables/rejects Save. Generic list events
are ignored because they do not identify the current Screen. A clean editor starts a
forced hydration; only an authoritative current load success clears the unresolved ref and
render state plus warning. Missing/error settlement keeps the warning and retry action. The
unresolved Save guard publishes its bounded diagnostic without advancing the hydration
generation or clearing load activity, so the already-authoritative forced GET remains able to
settle. If the user edits
while that load is pending, the draft barrier rejects the result and the unresolved marker
continues to block stale full-document PATCHes. Dirty Refresh first opens the dedicated
`ConfirmActionDialog`; cancel preserves the complete draft, while confirm synchronously
advances/clears dirty authority, restores the last known persisted baseline, and then performs
a fresh forced read. A missing/rejected read leaves that known baseline visible and clean while
the unresolved warning, retry action, and bounded load error remain. Discarded authored values
are never presented as clean or editable after confirmation. No failed refresh silently
discards a draft without that confirmation.

Keep the shared hook as the only router blocker and `beforeunload` owner. Confirm
synchronously advances draft, hydration, and save generations; clears the visit-scoped
persisted create target, committed visit, dirty ref/state, activity, errors, warnings,
notices, and assistant context; only then may the guard run its blocker-skipping
continuation. Cancel changes no ref, token, state, or draft. Every update/create save
captures route key, opaque visit, route/save generation, and draft generation before
awaiting. Only an identity-current response with the exact unchanged draft generation
may replace the draft, clear dirty state, or auto-navigate. If a local edit lands during
the save, update only the safe `screen` persisted baseline, retain all authored fields,
definition, selection, refs, and dirty state, and show `Saved server version; newer local
changes remain unsaved.` A stale create response stores its server ID scoped to exact
create `RouteVisit + routeGeneration`; layout cleanup synchronously clears it before
another route mounts. Retry on that same visit updates the record instead of creating a
duplicate. When that PATCH retry returns with exact draft authority, it makes the editor
clean and automatically navigates to
`buildCustomScreenEditorPath({ screenId: saved.id })` with `skipBlockers:true`.
A failed retry stays dirty and does not navigate. Successful exact create navigation
passes `{ skipBlockers: true }` only after persistence,
preventing the previous render's blocker closure from prompting after a successful save.
Failed, edit-superseded, or unsaved navigation never bypasses blockers. Do not change
`CustomScreenShell.tsx` merely to host the dialog.
An old create-A response settling after navigation cannot seed create-B; synchronous
route cleanup plus save identity means B performs POST, never PATCH against A's ID.
The Custom Screens client broadcasts list/detail cache events before its mutation promise
resumes. The cache bus marks same-context delivery as `local` and
BroadcastChannel/storage delivery as `remote` without changing the serialized event. The
L03-owned mutation client also forwards the save's unique symbol token only to same-context
callbacks. A synchronous `activeScreenSaveTokenRef` is installed before the client call.
Only local events carrying that exact token are self-events. Remote events and independent
same-context writers (including Assistant) advance the visit's external-event generation,
preserve the warning, and cannot start a competing refresh while save authority is active.
Manual Refresh is disabled and synchronously rejected while save authority is active by
the production-used `runBuilderManualRefresh` helper. A
save response clears only warnings that predate its captured external-event generation.
Therefore a failed save cannot lose a concurrent other-tab or Assistant update and no
refresh settlement can replace its later save diagnostic. In addition,
any older hydration resolution or rejection is discarded before it can publish content,
diagnostics, or advance the draft baseline. Other cache events consult
`builderDirtyRef.current`, not a rendered-state
closure. Only identity-current save settlement, confirmed discard, or route cleanup may
clear the active token. The exact response still revokes its visit's hydration generation
and clears its superseded load error/loading state plus only pre-capture warnings before
applying the server baseline. Save-first and
pre-existing-refresh-first settlement orders therefore preserve the same exact clean or
edit-superseded result without a false newer-local-changes notice.

## Error/compatibility flow

- Cancel stays in the builder with the complete draft intact.
- Confirm invalidates every current load/save continuation, hides the discarded visit,
  clears local dirty state, and performs the pending navigation once.
- Save failure remains dirty; only an exact-generation save success becomes clean.
- Synchronous name/content-type validation invalidates every older hydration before
  publishing its save error, so a late load success/rejection cannot erase or replace it.
- External-update copy is origin-neutral: title `Newer changes are available`; description
  `This Screen changed outside this editor. Refresh to load the latest version.` The same
  exact copy covers another tab and independent same-context writers.
- An unresolved current-detail event blocks Save synchronously and visibly until a current
  forced hydration succeeds. The guard does not invalidate that hydration. A list-only event
  for another Screen has no effect.
- Dirty Refresh requires `Discard local Screen changes and refresh?`; cancel preserves the
  draft, confirm discards once, immediately restores the last persisted baseline, and loads the
  current server version. Failed/missing retry keeps that baseline plus the warning/action and
  bounded error visible; discarded values never masquerade as a clean draft.
- Exact existing-update save, exact create-save, and confirmed discard each advance the
  generation once and synchronously reset the dirty ref/state; rejected or
  edit-superseded saves reset none of them.
- Exact create opens the persisted Screen without a discard prompt. A create response
  superseded by a newer edit stays in place, preserves retry, and never duplicates on
  retry.
- `resolveCustomScreenId` strips hash and query before segment parsing, so query/hash-only
  changes preserve both the decoded Screen ID and the mounted route visit and follow the
  shared guard's same-route behavior.
- Late initial/cache hydration never overwrites an intervening document or binding
  mutation.
- Clearing Button href binding through `{field:""}` removes exactly that binding,
  preserves static href data and every other binding, marks the builder dirty, and
  never persists the sentinel. Bind→clear→rebind remains deterministic.

## L04-owned tests and read-only prerequisite gate suites

- `custom-screens-page.test.tsx`: clean navigation; dirty internal navigation;
  beforeunload; cancel/confirm; save error; successful create-save navigation with no
  dialog to the Screen editor via `buildCustomScreenEditorPath({screenId})`; successful
  existing update;
  for each synchronous validation branch (blank name and missing content type), start a
  forced hydration first, click Save, and settle that older load as both resolve and reject;
  all four cases retain the exact save diagnostic, authored draft, dirty state, no external
  warning, and no spinner, while both create/update mutation call counts remain unchanged;
  deferred update and create saves followed by a local mutation preserve the newer
  draft/dirty ref, advance only the safe server baseline, show the bounded notice, and
  do not navigate; retry after stale create PATCHes the captured server ID without a
  second create, then exact success clears and auto-navigates to that ID; failed retry
  stays dirty and does not navigate; navigate create A→create B before A settles and
  prove B POSTs rather than PATCHing A; exact deferred saves clear/navigate; stale save
  rejection/finally and unmount cannot commit; existing Screen A→B→A with pending
  hydration in both old/new settlement orders, pending update, and create-route A→B→A
  prove that the stale first-A continuation cannot directly commit error/warning/notice/
  spinner/save-target/assistant authority. A successful first-A server update still emits
  real client cache events; a deferred current-visit hydration keeps the second A baseline
  unchanged until that hydration resolves, while rejection emits no event and keeps its baseline;
  exactly one mutation-generation advance for metadata, document, binding create/update,
  and binding clear, including an exact-one `updateEditorView -> updateDefinition` proof;
  first/last boundary block moves stay clean while a real move becomes dirty and persists
  the reordered block list for top-level, `children[]`, and named-slot siblings; initial
  hydration starts clean then an edit occurs before
  settlement; cache refresh starts clean then an edit occurs before settlement; stale
  request/route success, failure, remote-warning, and `finally` in both settlement orders
  plus unmount cannot commit; explicitly settle in the route-render → passive-cleanup
  window and prove layout invalidation; a current dirty success emits only the external-update warning, a
  current dirty rejection shows the fixed local-changes-unchanged message for both
  dirty-before-start and dirty-during-load cases even with equal generation, while only
  fully clean unchanged state gets generic failure; current dirty `finally` ends loading;
  current clean loads can commit; an uncached current visit first renders its loading
  state, then a visible not-found/API/generic error without any old/default builder
  content; a clean existing-Screen save suppresses only cache events carrying its exact
  operation token. The Page suite injects all three independent variants: remote origin,
  local origin with a distinct `Symbol()`, and local origin with no token. Both nonmatching
  local variants and the remote event remain external during pending-save success and
  rejection; none starts a load, rejection preserves the exact save error/dirty draft/
  exact neutral external-warning copy, and exact success retains a post-capture warning.
  A clean external current-detail event immediately shows the warning and visibly disables
  Save. A direct test of the production-used `getBuilderExternalRevisionSaveError` plus a
  source-slice assertion proving `handleSave` delegates to it pins the same-tick synchronous
  rejection without bypassing React's disabled-event semantics. Direct or edit-then-Save stays
  blocked while its forced GET is pending without invalidating that GET; resolve applies only through that GET,
  reject retains the warning/retry, and a list-only event for another Screen is ignored.
  Dirty Refresh proves cancel-preserves and confirm-discard-then-forced-load behavior for
  success, missing, and failure; immediately after confirm, discarded authored values are no
  longer visible/interactable and the persisted baseline is clean. Refresh is visibly disabled during save; a direct test of the
  production-used `runBuilderManualRefresh` proves its active-save branch starts no load,
  while its idle branch invokes exactly one refresh; a handler source-slice assertion proves
  the production Refresh action delegates to that helper. A
  pre-existing pending refresh resolving or rejecting before/after the mutation
  continuation cannot advance the draft generation, create a false error/warning/notice,
  or replace the draft;
  the owned Page suite asserts the complete bounded save-error description and complete
  `binding_field_removed` save-notice description, rather than partial substrings;
  Every deferred promise first proves consumption by its owning call before settlement:
  hydration defers pin the exact `{screenId, force:true}` call increment, while create/update
  defers pin the corresponding mutation-call increment and queue consumption. The A→B→A success case
  keeps cache hydration deferred and asserts the stale save continuation cannot directly
  update the second A. Document/binding handler source slices forbid direct `markDirty`,
  `updateDefinition`, or `draftMutationGenerationRef` access; metadata-handler slices instead
  require exactly one `markDirty` call and forbid direct `updateDefinition` or generation-ref
  mutation. Confirmed
  discard during hydration and during save invalidates all late success/failure/finally
  commits before navigation, while cancel leaves those continuations and the draft
  untouched.
- `custom-screen-route-params.test.ts`: `buildCustomScreenEditorPath` percent-encodes the
  ID and returns exactly `/advanced/custom-screens/:id` with no `/entries`;
  `resolveCustomScreenId` strips query/hash before decoding and query/hash-only variants
  resolve to the same ID; existing workspace/helper parsing and prefetch assertions
  remain unchanged.
- `custom-screen-editor-binding-flow.test.tsx`: visible bind→existing-binding update→clear
  →rebind; exact binding replacement/removal; other bindings/static href preserved;
  mutation generation advances; no empty-field sentinel reaches the saved definition.
- `cacheBus.test.ts`: same-tab callbacks receive `local`; storage/BroadcastChannel-shaped
  cross-context callbacks receive `remote`; an optional symbol token reaches only the
  exact same-context callback and never the serialized cache event.
- `custom-screen-section-recovery.test.tsx` adds only the cacheBus factory mock required
  by the new L03 import. Its TASK-505 recovery-flow and partial-copy assertions remain
  byte-identical and must not be re-baselined. The owned Page suite above pins both
  complete diagnostic strings exactly.
- `screen-editor-sections.test.tsx` adds only
  `createCacheEventOperationToken: () => Symbol(),` to the existing cacheBus mock. All
  nine TASK-500 tests remain byte-identical otherwise. In particular, the section-delete
  Save regression still proves one `updateCustomScreen` call and an empty persisted
  binding list; the repair supplies the production-required opaque token instead of
  catching the rejection or weakening those assertions.

The owned Page suite directly tests the production-used pure
`advanceBuilderDraftGeneration(current)` transition. Per-handler exact-one ownership is
then proven by static source audit: direct metadata handlers call `markDirty` once,
document/binding handlers call only `updateDefinition -> markDirty`, and no handler calls
both paths. Mounted tests prove semantic no-ops (including clearing an absent binding) do
not become dirty, while each real metadata/document/binding mutation does.

TASK-540-06 runs all owned and read-only gate suites without re-baselining these assertions.

## Validation

The 2026-07-15 repair gate passed `bun --cwd core lint:types`, `bun --cwd core lint`,
root `tsc`, exactly 6/6 Vitest files and 66/66 tests, workflow syntax, the 9/9
repair-sibling self-test, and diff check.
The originally failing `screen-editor-sections.test.tsx` suite also passed 9/9 in
isolation. Five fresh post-implementation audit lenses returned zero HIGH, MEDIUM, or LOW
findings.

```bash
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit
bunx vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx \
  tests/vitest/ui/custom-screen-route-params.test.ts \
  tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx \
  tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx \
  tests/vitest/ui-integration/screen-editor-sections.test.tsx \
  tests/vitest/admin/cacheBus.test.ts
node --check _docs/_workflows/task-540-implement.mjs
node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings
git diff --check
```

## Historical completion evidence

- The pre-repair corrective revalidation on 2026-07-14 passed `bun --cwd core lint:types`,
  `bun --cwd core lint`, and `./node_modules/.bin/tsc -p tsconfig.json --noEmit`.
- That historical exact owned/read-only matrix passed 5/5 files and 57/57 tests:
  `custom-screens-page`, `custom-screen-route-params`,
  `custom-screen-editor-binding-flow`, `custom-screen-section-recovery`, and
  `cacheBus`.
- This evidence remains truthful history and is distinct from the completed 2026-07-15
  six-file repair revalidation recorded above.
