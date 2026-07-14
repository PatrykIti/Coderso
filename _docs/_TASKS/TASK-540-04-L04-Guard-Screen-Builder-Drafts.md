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
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/routeParams.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/ui/custom-screen-route-params.test.ts`
- `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`

No other TASK-540 leaf edits these paths. In particular, TASK-540-03-L01 owns only the
renderer and record-interaction suites; this leaf exclusively owns the binding-flow
suite. TASK-540-04-L03 consumes the existing workspace/entry helper read-only; L04 owns
only the additive Screen-editor helper seam and its route-params assertions.
`tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx` is a read-only
TASK-505 regression gate for pruned-binding notices and detailed save errors; L04 may run
it but must not edit it.

## Grounded anchors

- Dirty state and diagnostics: `CustomScreenEditorPage.tsx:255-321`.
- `markDirty`: `:336-349`.
- Apply/save/clear path: `:396-430`.
- Initial and cache hydration: `:445-482`.
- Successful create navigation: `:759-780`.
- Existing workspace-only helper (ends in `/entries`): `routeParams.ts:29-42`.
- Existing route helper suite: `custom-screen-route-params.test.ts:1-41`.
- Shell receives badge only: `:970`.
- Shared guard: `AdminDirtyNavigationGuard.tsx:17-105`.

## Implementation Pseudocode

```tsx
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
}>;

// Production and tests use the same pure monotonic transition. Static source audit
// verifies that every semantic mutation reaches exactly one call through markDirty.
export function advanceBuilderDraftGeneration(current: number) {
  return current + 1;
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
const [remoteWarningVisit, setRemoteWarningVisit] = useState<BuilderRouteVisit | null>(null);
const [saveNoticeCommit, setSaveNoticeCommit] = useState<BuilderRouteMessage | null>(null);

const routeReady = committedScreenVisit === routeVisit;
const isLoading = !routeReady && loadActivityVisit === routeVisit;
const isSaving = saveActivityVisit === routeVisit;
const error = errorCommit?.routeVisit === routeVisit ? errorCommit.message : null;
const remoteUpdatePending = remoteWarningVisit === routeVisit;
const saveNotice = saveNoticeCommit?.routeVisit === routeVisit ? saveNoticeCommit.message : null;

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
    const token = captureScreenLoadToken();
    setLoadActivityVisit(token.routeVisit);
    try {
      const result = await load();
      if (!isActive() || !isScreenLoadIdentityCurrent(token)) return;
      // A read started before or by a same-tab save event is older than the active
      // mutation response and must not advance the draft baseline/generation.
      if (hasCurrentScreenSaveAuthority()) return;
      if (!mayApplyScreenLoad(token)) {
        setRemoteWarningVisit(token.routeVisit);
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

// Cache events read the synchronous authority, never a delayed React-state closure.
const handleCurrentScreenCacheEvent = useCallback(() => {
  if (hasCurrentScreenSaveAuthority()) return;
  if (builderDirtyRef.current) {
    setRemoteWarningVisit(routeVisit);
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

function invalidateBuilderVisitForDiscard() {
  // The guard calls this synchronously before its blocker-skipping continuation.
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

async function saveScreen(payload) {
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
    const saved = targetId
      ? await updateCustomScreen(targetId, payload)
      : await createCustomScreen(payload);
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
      {error ? <BuilderErrorAlert message={error} /> : null}
      {isLoading ? (
        <BuilderLoadingState />
      ) : routeReady ? (
        <ScreenAuthoringCanvas ... />
      ) : null}
    </CustomScreenShell>
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
awaiting, then guard every success apply, missing-record/error message, remote-update
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
denied by a newer edit emits the bounded remote-update warning; a current rejection
after a newer edit shows `Could not check for Screen updates. Local changes are
unchanged.`; and current `finally` always ends loading. None changes the draft. Only
route/request-current commits may update warning, error, or spinner state.

Generic API/`Failed to load custom screen.` copy is allowed only when the captured draft
generation is still exact and `builderDirtyRef.current` is false at catch time. A request
started while dirty, or any defensive dirty-ref/generation mismatch, uses the bounded
local-changes-unchanged copy; generation equality alone is never enough.

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
resumes. A synchronous `activeScreenSaveTokenRef` is installed before the client call.
While that exact save owns the visit, matching cache events do not start hydration and
any older hydration resolution or rejection is discarded before it can publish content,
diagnostics, or advance the draft baseline. Other cache events consult
`builderDirtyRef.current`, not a rendered-state
closure. Only identity-current save settlement, confirmed discard, or route cleanup may
clear the active token. The exact response still revokes its visit's hydration generation
and clears its superseded load error/warning/loading state before applying the server baseline. Save-first and
pre-existing-refresh-first settlement orders therefore preserve the same exact clean or
edit-superseded result without a false newer-local-changes notice.

## Error/compatibility flow

- Cancel stays in the builder with the complete draft intact.
- Confirm invalidates every current load/save continuation, hides the discarded visit,
  clears local dirty state, and performs the pending navigation once.
- Save failure remains dirty; only an exact-generation save success becomes clean.
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

## Gate tests owned here; aggregate additions owned by TASK-540-06

- `custom-screens-page.test.tsx`: clean navigation; dirty internal navigation;
  beforeunload; cancel/confirm; save error; successful create-save navigation with no
  dialog to the Screen editor via `buildCustomScreenEditorPath({screenId})`; successful
  existing update;
  deferred update and create saves followed by a local mutation preserve the newer
  draft/dirty ref, advance only the safe server baseline, show the bounded notice, and
  do not navigate; retry after stale create PATCHes the captured server ID without a
  second create, then exact success clears and auto-navigates to that ID; failed retry
  stays dirty and does not navigate; navigate create A→create B before A settles and
  prove B POSTs rather than PATCHing A; exact deferred saves clear/navigate; stale save
  rejection/finally and unmount cannot commit; existing Screen A→B→A with pending
  hydration in both old/new settlement orders, pending update, and create-route A→B→A
  prove that first-A content/error/warning/notice/spinner/save target and assistant
  context never become second-A authority;
  exactly one mutation-generation advance for metadata, document, binding create/update,
  and binding clear; initial hydration starts clean then an edit occurs before
  settlement; cache refresh starts clean then an edit occurs before settlement; stale
  request/route success, failure, remote-warning, and `finally` in both settlement orders
  plus unmount cannot commit; explicitly settle in the route-render → passive-cleanup
  window and prove layout invalidation; a current dirty success emits only the remote warning, a
  current dirty rejection shows the fixed local-changes-unchanged message for both
  dirty-before-start and dirty-during-load cases even with equal generation, while only
  fully clean unchanged state gets generic failure; current dirty `finally` ends loading;
  current clean loads can commit; an uncached current visit first renders its loading
  state, then a visible not-found/API/generic error without any old/default builder
  content; a clean existing-Screen save suppresses its matching self-cache event, and a
  pre-existing pending refresh resolving or rejecting before/after the mutation
  continuation cannot advance the draft generation, create a false error/warning/notice,
  or replace the draft;
  confirmed
  discard during hydration and during save invalidates all late success/failure/finally
  commits before navigation, while cancel leaves those continuations and the draft
  untouched.
- `custom-screen-route-params.test.ts`: `buildCustomScreenEditorPath` percent-encodes the
  ID and returns exactly `/advanced/custom-screens/:id` with no `/entries`;
  `resolveCustomScreenId` strips query/hash before decoding and query/hash-only variants
  resolve to the same ID; existing workspace/helper parsing and prefetch assertions
  remain unchanged.
- `custom-screen-editor-binding-flow.test.tsx`: visible bind→clear→rebind; exact
  binding removal; other bindings/static href preserved; mutation generation advances;
  no empty-field sentinel reaches the saved definition.
- `custom-screen-section-recovery.test.tsx` remains read-only and pins the existing
  `binding_field_removed` exact-save notice plus `ApiClientError.details.fields` save-error
  copy; L04 must run it but must not edit or re-baseline it.

The owned Page suite directly tests the production-used pure
`advanceBuilderDraftGeneration(current)` transition. Per-handler exact-one ownership is
then proven by static source audit: direct metadata handlers call `markDirty` once,
document/binding handlers call only `updateDefinition -> markDirty`, and no handler calls
both paths. Mounted tests prove semantic no-ops (including clearing an absent binding) do
not become dirty, while each real metadata/document/binding mutation does.

TASK-540-06 runs all three suites read-only and must not re-baseline these assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui/custom-screens-page.test.tsx \
  tests/vitest/ui/custom-screen-route-params.test.ts \
  tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx \
  tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx
```

Rerun a named failing file once in isolation.
