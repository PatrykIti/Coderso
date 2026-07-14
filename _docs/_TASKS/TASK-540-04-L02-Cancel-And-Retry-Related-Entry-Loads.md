# TASK-540-04-L02: Cancel and Retry Related-Entry Loads

# FileName: TASK-540-04-L02-Cancel-And-Retry-Related-Entry-Loads.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-04
**Priority:** High
**Category:** Custom Screens / Async UI / Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-540-04-L01
**Status:** ✅ Done
**Started:** 2026-07-13
**Completed:** 2026-07-13
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- new `core/admin/ui/custom-screens/hooks/useScreenRelatedEntries.ts`
- `core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx`
- new `tests/vitest/ui/use-screen-related-entries.test.tsx`
- `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`

No other leaf edits these paths. The hook owns target derivation, one-read-per-target
distribution, attempt cause/force, retry/cancellation, and target-cache subscriptions.
TASK-540-04-L03 consumes it. The existing related resolver and its tests are read-only
dependencies of this leaf.

## Grounded anchors

- Duplicated preview async IIFE without catch:
  `CustomScreenWorkspacePreviewDialog.tsx:68-131`.
- Entry duplicate still consumed later by TASK-540-04-L03:
  `CustomScreenEntryEditor.tsx:809-867`.
- Resolver contract: `core/services/customScreens/relatedEntryResolver.ts`.
- Existing authoritative client read: `entriesClient.ts:262-285`.
- Cache bus/key precedent: `CustomScreenEntryEditor.tsx:716-739` and
  `core/admin/services/cachePolicy.ts:32`.

## Implementation Pseudocode

```ts
export type RelatedAttemptCause =
  | "initial"
  | "input-change"
  | "manual-retry"
  | "cache-event";
export type RelatedAttempt = {
  inputKey: string;
  requestKey: string;
  targetLoadKey: string;
  token: number;
  cause: RelatedAttemptCause;
  force: boolean;
  plan: NormalizedRelatedPlan;
};

export type RelatedBlockProjection = {
  blockId: string;
  bindingPath: string;
  target: string;
  selectedIds: readonly string[];
  displayField: string | null;
  limit: number;
};

export type NormalizedRelatedPlan = {
  blocks: readonly RelatedBlockProjection[];
  targetSlugs: readonly string[];
  // Resource identity: only the sorted unique slugs read from entriesClient.
  targetLoadKey: string;
  // Projection identity: every normalized tuple consumed by the resolver.
  requestKey: string;
};

export type RelatedEntriesCommit = {
  requestKey: string | null;
  attemptToken: number | null;
  items: Record<string, RelatedEntrySummary[]>;
  error: string | null;
};

type RelatedEntriesState = {
  items: Record<string, RelatedEntrySummary[]>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  targetSlugs: readonly string[];
  retry(): void;
};

const RELATED_LOAD_ERROR = "Related records could not be loaded.";
const resolveRelatedLoadMessage = (_error: unknown) => RELATED_LOAD_ERROR;

type RelatedProjectionTuple = readonly [
  blockId: string,
  bindingPath: string,
  target: string,
  selectedIds: readonly string[],
  displayField: string | null,
  limit: number,
];

const toRelatedProjectionTuple = (
  block: RelatedBlockProjection
): RelatedProjectionTuple => [
  block.blockId,
  block.bindingPath,
  block.target,
  block.selectedIds,
  block.displayField,
  block.limit,
];

const serializeRelatedProjection = (blocks: readonly RelatedBlockProjection[]) =>
  JSON.stringify(blocks.map(toRelatedProjectionTuple));
const serializeRelatedTargets = (targets: readonly string[]) => JSON.stringify(targets);

const RELATED_PATH_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const RELATED_UNSAFE_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);
const RELATED_PATH_MAX_LENGTH = 160;
const RELATED_LIMIT_MAX = 50;

function normalizeRelatedPath(value: unknown, maxLength: number | null): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    (maxLength !== null && normalized.length > maxLength) ||
    !RELATED_PATH_PATTERN.test(normalized)
  ) return null;
  const segments = normalized.split(".");
  if (
    segments.some(
      (segment) => segment.length === 0 || RELATED_UNSAFE_PATH_SEGMENTS.has(segment)
    )
  ) return null;
  return normalized;
}

// Every path entering request identity must already be canonical. The shared Screen
// document/binding schemas cap block ids, binding paths, target, and displayField at
// 160 bytes, so this hook mirrors that one bound for stored-read defense in depth.
const normalizeCanonicalRelatedPath = (value: unknown): string | null => {
  const normalized = normalizeRelatedPath(value, RELATED_PATH_MAX_LENGTH);
  return normalized !== null && normalized === value ? normalized : null;
};

const normalizeRelatedBlockId = normalizeCanonicalRelatedPath;
const normalizeRelatedBindingPath = normalizeCanonicalRelatedPath;
const normalizeTargetSlug = normalizeCanonicalRelatedPath;
const normalizeDisplayField = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") return null;
  return normalizeCanonicalRelatedPath(value);
};

// Preserve relatedEntryResolver.ts exactly: scalar becomes one id; arrays retain
// input order, duplicates, whitespace, and String(...) coercion; only zero-length
// strings are removed. This is projection identity, not a resource-id sanitizer.
const normalizeSelectedResourceIds = (value: unknown): readonly string[] =>
  (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value])
    .map(String)
    .filter((id) => id.length > 0);

// The screen schema owns max=50. Canonical identity stores the effective slice size,
// bounded by both that policy and the selected-id count.
const normalizeRelatedLimit = (value: unknown, selectedCount: number): number => {
  const candidate =
    typeof value === "number" && Number.isFinite(value)
      ? Math.trunc(value)
      : selectedCount;
  return Math.min(RELATED_LIMIT_MAX, selectedCount, Math.max(0, candidate));
};

const findExactItemsBinding = (
  bindings: readonly ScreenFieldBinding[],
  blockId: string
): ScreenFieldBinding | null =>
  bindings.find((binding) => binding.blockId === blockId && binding.propPath === "items") ?? null;

const findRelationField = (
  fields: readonly ContentField[] | undefined,
  bindingPath: string
): ContentField | null => fields?.find((field) => field.name === bindingPath) ?? null;

const compareCanonicalText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const compareNormalizedProjectionTuple = (
  left: RelatedBlockProjection,
  right: RelatedBlockProjection
): number =>
  compareCanonicalText(
    JSON.stringify(toRelatedProjectionTuple(left)),
    JSON.stringify(toRelatedProjectionTuple(right))
  );

type BuildNormalizedRelatedPlanInput = {
  document: ScreenDocumentV1;
  bindings: readonly ScreenFieldBinding[];
  values: Record<string, unknown>;
  fields?: readonly ContentField[];
};

export function buildNormalizedRelatedPlan(
  input: BuildNormalizedRelatedPlanInput
): NormalizedRelatedPlan {
  const documentBlocks = collectScreenDocumentBlocks(input.document);
  const documentBlockIds = documentBlocks.map((block) => normalizeRelatedBlockId(block.id));
  if (
    documentBlockIds.some((id) => id === null) ||
    new Set(documentBlockIds).size !== documentBlockIds.length
  ) {
    const emptyBlocks = Object.freeze([]) as readonly RelatedBlockProjection[];
    const emptyTargets = Object.freeze([]) as readonly string[];
    return Object.freeze({
      blocks: emptyBlocks,
      targetSlugs: emptyTargets,
      targetLoadKey: serializeRelatedTargets(emptyTargets),
      requestKey: serializeRelatedProjection(emptyBlocks),
    });
  }

  const blocks = documentBlocks.flatMap((block) => {
    if (block.type !== "related-list") return [];
    const blockId = normalizeRelatedBlockId(block.id);
    if (!blockId) return [];
    const binding = findExactItemsBinding(input.bindings, blockId);
    if (!binding) return [];
    const bindingPath = normalizeRelatedBindingPath(binding.field);
    if (!bindingPath) return [];
    const selectedIds = normalizeSelectedResourceIds(
      readBindingPathValue(input.values, bindingPath)
    );
    // Preserve resolveRelatedEntries' zero-read contract.
    if (selectedIds.length === 0) return [];
    // Preserve the existing nullish fallback: an authored relation-field target wins;
    // stored block target is consulted only when the relation target is null/undefined.
    const target = normalizeTargetSlug(
      findRelationField(input.fields, bindingPath)?.relation?.target ?? block.data.target
    );
    if (!target) return [];
    const rawDisplayField = block.data.displayField;
    const displayField = normalizeDisplayField(rawDisplayField);
    if (
      rawDisplayField !== undefined &&
      rawDisplayField !== null &&
      rawDisplayField !== "" &&
      displayField === null
    ) return [];
    return [{
      blockId,
      bindingPath,
      target,
      selectedIds,
      displayField,
      limit: normalizeRelatedLimit(block.data.limit, selectedIds.length),
    }];
  });
  blocks.sort(compareNormalizedProjectionTuple);
  const frozenBlocks = blocks.map((block) =>
    Object.freeze({
      ...block,
      selectedIds: Object.freeze([...block.selectedIds]),
    })
  );
  const targetSlugs = [...new Set(frozenBlocks.map((block) => block.target))]
    .sort(compareCanonicalText);
  return Object.freeze({
    blocks: Object.freeze(frozenBlocks),
    targetSlugs: Object.freeze(targetSlugs),
    targetLoadKey: serializeRelatedTargets(targetSlugs),
    requestKey: serializeRelatedProjection(frozenBlocks),
  });
}

async function projectRelatedBlocksFromTargetRows(
  plan: NormalizedRelatedPlan,
  rowsByTarget: ReadonlyMap<
    string,
    Awaited<ReturnType<typeof listEntriesCached>>
  >
): Promise<Record<string, RelatedEntrySummary[]>> {
  const pairs = await Promise.all(
    plan.blocks.map(async (block) => [
      block.blockId,
      await resolveRelatedEntries({
        ids: [...block.selectedIds],
        target: block.target,
        displayField: block.displayField ?? undefined,
        limit: block.limit,
        // In-memory injection preserves the existing resolver's private stringify,
        // lookup, ordering, and display projection without another transport read.
        readEntries: async (target) => rowsByTarget.get(target) ?? [],
      }),
    ] as const)
  );
  return Object.fromEntries(pairs);
}

async function loadEachTargetOnce(plan: NormalizedRelatedPlan, force: boolean) {
  const rowsByTarget = new Map(
    await Promise.all(
      plan.targetSlugs.map(async (slug) => [
        slug,
        await listEntriesCached(slug, { force }),
      ] as const)
    )
  );
  return projectRelatedBlocksFromTargetRows(plan, rowsByTarget);
}

export function buildRelatedMachineInputKey(
  enabled: boolean,
  plan: NormalizedRelatedPlan
): string {
  // Arrays make JSON key order irrelevant; all strings/IDs/limits are already canonical.
  return JSON.stringify([enabled ? 1 : 0, plan.blocks.map(toRelatedProjectionTuple)]);
}

export function decodeRelatedMachineInputKey(inputKey: string): {
  enabled: boolean;
  plan: NormalizedRelatedPlan;
} {
  const parsed: unknown = JSON.parse(inputKey);
  if (!Array.isArray(parsed) || parsed.length !== 2 || (parsed[0] !== 0 && parsed[0] !== 1)) {
    throw new Error("related_plan_invalid");
  }
  if (!Array.isArray(parsed[1])) throw new Error("related_plan_invalid");
  const blocks = parsed[1].map((value): RelatedBlockProjection => {
    if (!Array.isArray(value) || value.length !== 6) throw new Error("related_plan_invalid");
    const [blockId, bindingPath, target, selectedIds, displayField, limit] = value;
    if (
      typeof blockId !== "string" ||
      normalizeRelatedBlockId(blockId) !== blockId ||
      typeof bindingPath !== "string" ||
      normalizeRelatedBindingPath(bindingPath) !== bindingPath ||
      typeof target !== "string" ||
      normalizeTargetSlug(target) !== target ||
      !Array.isArray(selectedIds) ||
      selectedIds.length === 0 ||
      !selectedIds.every((id): id is string => typeof id === "string") ||
      JSON.stringify(normalizeSelectedResourceIds(selectedIds)) !== JSON.stringify(selectedIds) ||
      (displayField !== null && typeof displayField !== "string") ||
      normalizeDisplayField(displayField) !== displayField ||
      typeof limit !== "number" ||
      !Number.isInteger(limit) ||
      normalizeRelatedLimit(limit, selectedIds.length) !== limit
    ) throw new Error("related_plan_invalid");
    return Object.freeze({
      blockId,
      bindingPath,
      target,
      selectedIds: Object.freeze([...selectedIds]),
      displayField,
      limit,
    });
  });
  if (new Set(blocks.map((block) => block.blockId)).size !== blocks.length) {
    throw new Error("related_plan_invalid");
  }
  blocks.sort(compareNormalizedProjectionTuple);
  const targetSlugs = Object.freeze(
    [...new Set(blocks.map((block) => block.target))].sort(compareCanonicalText)
  );
  const plan = Object.freeze({
    blocks: Object.freeze(blocks),
    targetSlugs,
    targetLoadKey: serializeRelatedTargets(targetSlugs),
    requestKey: serializeRelatedProjection(blocks),
  });
  const enabled = parsed[0] === 1;
  if (buildRelatedMachineInputKey(enabled, plan) !== inputKey) {
    throw new Error("related_plan_invalid");
  }
  return { enabled, plan };
}

export type RelatedAttemptMachine = {
  inputKey: string;
  enabled: boolean;
  requestKey: string;
  targetLoadKey: string;
  hasTargets: boolean;
  lastToken: number;
  settledToken: number | null;
  attempt: RelatedAttempt | null;
  commit: RelatedEntriesCommit;
};
export type RelatedAttemptMachineInput = {
  enabled: boolean;
  requestKey: string;
  targetLoadKey: string;
  hasTargets: boolean;
  plan: NormalizedRelatedPlan;
};

export type RelatedAttemptAction =
  | {
      type: "sync-input";
      inputKey: string;
      enabled: boolean;
      plan: NormalizedRelatedPlan;
    }
  | {
      type: "force-attempt";
      requestKey: string;
      targetLoadKey: string;
      cause: "manual-retry" | "cache-event";
    }
  | {
      type: "settled-success";
      inputKey: string;
      requestKey: string;
      token: number;
      items: Record<string, RelatedEntrySummary[]>;
    }
  | {
      type: "settled-error";
      inputKey: string;
      requestKey: string;
      token: number;
      error: string;
    };

const assertNever = (value: never): never => {
  throw new Error(`Unhandled related-attempt action: ${String(value)}`);
};

function allocateRelatedAttempt(
  state: RelatedAttemptMachine,
  plan: NormalizedRelatedPlan,
  cause: RelatedAttemptCause,
  force: boolean
): RelatedAttemptMachine {
  const token = state.lastToken + 1;
  return {
    ...state,
    lastToken: token,
    attempt: {
      requestKey: state.requestKey,
      targetLoadKey: state.targetLoadKey,
      inputKey: state.inputKey,
      token,
      cause,
      force,
      plan, // already deeply frozen by buildNormalizedRelatedPlan
    },
  };
}

export function createRelatedAttemptMachine(
  input: RelatedAttemptMachineInput
): RelatedAttemptMachine {
  const state: RelatedAttemptMachine = {
    enabled: input.enabled,
    requestKey: input.requestKey,
    targetLoadKey: input.targetLoadKey,
    hasTargets: input.hasTargets,
    inputKey: buildRelatedMachineInputKey(input.enabled, input.plan),
    lastToken: 0,
    settledToken: null,
    attempt: null,
    commit: { requestKey: null, attemptToken: null, items: {}, error: null },
  };
  return input.enabled && input.hasTargets
    ? allocateRelatedAttempt(state, input.plan, "initial", false)
    : state;
}

export function relatedAttemptReducer(
  state: RelatedAttemptMachine,
  action: RelatedAttemptAction
): RelatedAttemptMachine {
  switch (action.type) {
    case "sync-input": {
      if (action.inputKey === state.inputKey) return state;
      const next = {
        ...state,
        inputKey: action.inputKey,
        enabled: action.enabled,
        requestKey: action.plan.requestKey,
        targetLoadKey: action.plan.targetLoadKey,
        hasTargets: action.plan.targetSlugs.length > 0,
        attempt: null,
      };
      if (!next.enabled || !next.hasTargets) return next;
      const priorPending =
        state.attempt !== null && state.attempt.token !== state.settledToken;
      const inheritForce =
        priorPending &&
        state.attempt!.force &&
        state.targetLoadKey === action.plan.targetLoadKey;
      return allocateRelatedAttempt(
        next,
        action.plan,
        inheritForce ? state.attempt!.cause : "input-change",
        Boolean(inheritForce)
      );
    }
    case "force-attempt":
      if (
        !state.enabled ||
        !state.hasTargets ||
        !state.attempt ||
        action.requestKey !== state.requestKey ||
        action.targetLoadKey !== state.targetLoadKey
      ) return state;
      return allocateRelatedAttempt(state, state.attempt.plan, action.cause, true);
    case "settled-success":
      if (
        state.inputKey !== action.inputKey ||
        state.attempt?.requestKey !== action.requestKey ||
        state.attempt.token !== action.token
      ) return state; // stale settlement is a strict no-op, never a retry
      return {
        ...state,
        settledToken: action.token,
        commit: {
          requestKey: action.requestKey,
          attemptToken: action.token,
          items: action.items,
          error: null,
        },
      }; // preserve attempt reference; identity + payload publish atomically
    case "settled-error":
      if (
        state.inputKey !== action.inputKey ||
        state.attempt?.requestKey !== action.requestKey ||
        state.attempt.token !== action.token
      ) return state;
      return {
        ...state,
        settledToken: action.token,
        commit: {
          requestKey: action.requestKey,
          attemptToken: action.token,
          items:
            state.commit.requestKey === action.requestKey ? state.commit.items : {},
          error: action.error,
        },
      };
    default:
      return assertNever(action);
  }
}

export function useScreenRelatedEntries(input): RelatedEntriesState {
  const plan = useMemo(
    () => buildNormalizedRelatedPlan(input),
    [input.document, input.bindings, input.values, input.fields]
  );
  const requestKey = plan.requestKey;

  const [machine, dispatch] = useReducer(
    relatedAttemptReducer,
    {
      enabled: input.enabled,
      requestKey,
      targetLoadKey: plan.targetLoadKey,
      hasTargets: plan.targetSlugs.length > 0,
      plan,
    },
    createRelatedAttemptMachine
  );

  const machineInputKey = buildRelatedMachineInputKey(input.enabled, plan);
  const currentInputKeyRef = useRef(machineInputKey);
  useLayoutEffect(() => {
    currentInputKeyRef.current = machineInputKey;
  }, [machineInputKey]);
  useEffect(() => {
    let active = true;
    // Async result boundary satisfies the hooks compiler: no synchronous effect update.
    queueMicrotask(() => {
      if (!active) return;
      const normalized = decodeRelatedMachineInputKey(machineInputKey);
      dispatch({
        type: "sync-input",
        inputKey: machineInputKey,
        enabled: normalized.enabled,
        plan: normalized.plan,
      });
    });
    return () => {
      active = false;
    };
  }, [machineInputKey]);

  const attempt =
    machine.requestKey === requestKey && machine.inputKey === machineInputKey
      ? machine.attempt
      : null;
  const attemptToken = attempt?.token ?? null;

  const beginAttempt = useCallback(
    (cause: "manual-retry" | "cache-event") => {
      dispatch({
        type: "force-attempt",
        requestKey,
        targetLoadKey: plan.targetLoadKey,
        cause,
      });
    },
    [plan.targetLoadKey, requestKey]
  );

  useEffect(() => {
    if (!input.enabled || !attempt || attempt.plan.targetSlugs.length === 0) {
      return undefined;
    }
    const targetSlugs = attempt.plan.targetSlugs;
    return subscribeCacheEvents((event) => {
      if (targetSlugs.some((slug) => event.key === cacheKeys.entriesList(slug))) {
        beginAttempt("cache-event");
      }
    });
  }, [input.enabled, beginAttempt, attempt]);

  useEffect(() => {
    if (
      !input.enabled ||
      !attempt ||
      attempt.requestKey !== requestKey ||
      attempt.plan.targetSlugs.length === 0
    ) return;
    const frozenAttemptToken = attempt.token;
    const frozenInputKey = attempt.inputKey;
    let active = true;
    void loadEachTargetOnce(attempt.plan, attempt.force)
      .then((items) => {
        if (!active || currentInputKeyRef.current !== frozenInputKey) return;
        dispatch({
          type: "settled-success",
          inputKey: frozenInputKey,
          requestKey,
          token: frozenAttemptToken,
          items,
        });
      })
      .catch((error) => {
        if (!active || currentInputKeyRef.current !== frozenInputKey) return;
        dispatch({
          type: "settled-error",
          inputKey: frozenInputKey,
          requestKey,
          token: frozenAttemptToken,
          error: resolveRelatedLoadMessage(error),
        });
      });
    return () => {
      active = false;
    };
  }, [input.enabled, requestKey, attempt]);

  const commit = machine.commit;
  const matchesRequest = commit.requestKey === requestKey;
  const refreshing = matchesRequest && commit.attemptToken !== attemptToken;
  const visible =
    !input.enabled || plan.targetSlugs.length === 0
      ? { items: {}, loading: false, refreshing: false, error: null }
      : matchesRequest
        ? {
            items: commit.items,
            loading: false,
            refreshing,
            error: refreshing ? null : commit.error,
          }
        : { items: {}, loading: true, refreshing: false, error: null };

  return {
    ...visible,
    targetSlugs: plan.targetSlugs,
    retry: () => beginAttempt("manual-retry"),
  };
}
```

Derive one immutable plan exactly from resolver inputs: exact `items` binding, resolver-
compatible selected IDs, relation-field target first then stored target fallback,
display field, and clamped limit. Selected IDs preserve scalar/array `String(...)`
coercion, stored order, duplicates, and whitespace exactly as the existing resolver;
only null/undefined and zero-length strings produce an empty set. Missing bindings,
non-canonical/blank targets, and empty selected-ID sets produce no plan row and therefore
no read or subscription. Target slugs are canonical, de-duplicated, and byte-sorted.
One unique attempt invokes `listEntriesCached` exactly once
for each target slug even when many blocks consume it, then distributes that one row set
through existing resolver semantics. Referentially new but semantically identical input
objects reuse the same frozen plan keys and must not rerun an attempt.

Limit normalization intentionally aligns legacy/omitted values with the owning Screen
policy: coerce an already-numeric value to its effective integer, clamp to
`0..min(50, selectedIds.length)`, and use the selected-ID count when absent. This bounds
projection work without changing selected-ID order or identity. Path values are not
silently repaired: surrounding whitespace or any non-canonical path drops that block
projection before reads/subscriptions.

The load effect depends only on `enabled`, normalized `requestKey`, and the stable
attempt object (which contains its accepted `inputKey`, unique token, and frozen plan).
It reads the accepted key from `attempt.inputKey`, never from live machine state, so
`exhaustive-deps` passes without suppression. Live render-time
object/array identity is not a dependency; every initial, input-change, inherited-force, manual-retry, and cache-event
transition allocates and persists `lastToken + 1` in the one reducer. Tokens never reset
or repeat across request changes, empty/disabled intervals, or A→B→A. Before either
success or failure commits, the effect checks the exact current request/token identity
through its stable attempt closure and local cleanup state.

Each attempt owns the deeply frozen normalized plan it will execute. `settledToken` is a
separate machine field: settlement never clones or mutates the attempt object, so a
settlement render cannot restart the effect. The discriminated action union is handled by
an exhaustive switch; a stale `settled-*` action returns the identical state and can never
fall through into force/retry allocation. Success/error payload, settled identity, and
retained same-request rows are committed atomically by the reducer after exact
`inputKey + requestKey + token` validation; there is no separate `setCommit` publication.
A layout-bound current-input-key guard closes the render→passive-cleanup window before
dispatch. The load effect closes over the stable attempt
object and uses only its frozen plan plus local `active` cleanup. No `generationRef` is
needed or declared, and there are no render-time ref writes for current plan or token.
The input-sync effect is keyed solely by the normalized lossless `machineInputKey` and
decodes its frozen plan from that scalar. A referentially new but semantically identical
raw plan cannot dispatch, invalidate, or cancel anything. An ignored stale/disabled
force action returns the identical machine/attempt, so it also leaves the active effect
untouched; only an accepted new attempt changes the dependency and triggers cleanup.

Canonical identity uses only explicit JSON arrays of typed projection tuples. The decoder
fully validates tuple length/types, safe block IDs, normalized paths/targets/selected IDs,
display field, clamped integer limit, canonical sort order, and exact round-trip bytes
before rebuilding the frozen plan. No generic serializer or undeclared decoder helper is
part of the implementation. One pinned tuple example is
`["block-1","relations.tasks","tasks",["id-2","id-1","id-1"],"priority",3]`:
selected-ID order and duplicates remain byte-significant. Tuples are ordered by direct
`<`/`>` comparison of their JSON strings, not locale-sensitive sorting.

The local path validator mirrors the owning Screen `normalizePath` contract exactly:
trimmed non-empty text, `^[a-zA-Z0-9_.-]+$`, no empty dot segment, and no
`__proto__`, `prototype`, or `constructor` segment at any depth. The hook mirrors the
owning Screen schemas' 160-character bound for block IDs, binding paths, relation targets,
and display fields. Plan construction and scalar decoding require every normalized path
to be byte-identical to its input, so non-canonical or unsafe values fail closed instead
of entering `requestKey`, a cache key, or an object key.

`buildNormalizedRelatedPlan`, `createRelatedAttemptMachine`,
`relatedAttemptReducer`, their state/action/attempt types, and the key codec are exported
pure contracts from this internal hook module for direct Vitest observability. Production
consumers use only `useScreenRelatedEntries`; there is no test-only branch. Direct reducer
tests assert object identity, monotonic tokens, and strict stale-action no-ops without
reaching into React internals.

`targetLoadKey` identifies only the resource lists being fetched; `requestKey` identifies
the current block projection. Initial/input-change attempts use `force:false`, except
when a projection changes while a forceful attempt for the identical `targetLoadKey` is
still pending: the new request inherits the cause and `force:true`, receives a fresh
unique token, and supersedes the old projection attempt. It must never fall back to
an older value cache while the authoritative target refresh is in flight. If the target
load identity changes, the new targets start with their normal non-force initial attempt.
Manual retry and matching `cacheKeys.entriesList(slug)` events are explicitly forceful.
Attempt cause/force and pending/settled identity are explicit, never inferred from UI
loading flags.

`requestKey` canonically serializes only normalized block ID, binding path, relation
target, selected resource IDs, display field, and limit tuples consumed by the resolver.
It is memory-only and never logged or persisted. Request
mismatch derives empty/loading during render, so A rows never appear under B. A
same-request attempt retains committed rows with `refreshing:true`. Every success and
failure commit requires the locally active exact-attempt closure. No caught effect error
is swallowed or re-thrown.

Replace the Preview dialog IIFE with the hook and pass
`enabled: open && mode === "editor-view"`. Render a compact alert with a real Retry
button for a settled error: title `Related records unavailable`, bounded description
`Related records could not be loaded.`, and button label `Retry`. The alert is visible
only when `loading=false`, `refreshing=false`, and the current attempt settled with an
error. A request mismatch exposes empty rows plus loading; a same-request retry/cache
refresh retains rows plus refreshing and hides the prior error; a settled empty success
is neither loading nor failure. Closing or unmounting cancels every commit.

## Error/compatibility flow

- First failure is visible; manual retry forces a new authoritative L01 request.
- A target cache event forces one read per unique target, retains same-request rows
  while refreshing, and distributes one target result to all matching blocks.
- Later accepted attempt tokens win; cleaned-up stale success and failure cannot commit.
- Disabled, closed, or relation-free documents perform zero reads and expose `{}`.
- Existing `relatedEntries` renderer prop shape remains unchanged.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- `use-screen-related-entries.test.tsx`: stable target derivation; disabled and
  zero-target guards; missing binding plus null/undefined/`""`/`[]` selected IDs issue zero
  reads/subscriptions; a valid canonical plan decodes, rebuilds a deeply frozen plan,
  and round-trips to the exact original scalar bytes; negative scalar round-trip cases
  reject leading/trailing whitespace, invalid characters, empty/double-dot segments,
  every root and nested `__proto__`/`prototype`/`constructor` segment for both block ID
  and binding path, plus 161-character block ID, binding path, target, and display field,
  while each valid 160-character boundary remains accepted; selected-ID order,
  duplicates, whitespace, and the pinned tuple bytes remain stable; empty selected-ID
  tuples and duplicate block IDs are rejected by the codec, while duplicate raw-document
  block IDs derive an empty plan before type/binding/value/target filtering; cover both
  cross-type duplicates and two related-list duplicates where one projection would
  otherwise be discarded. Non-canonical raw plan inputs fail closed before
  reads/subscriptions;
  semantically identical fresh object identities issue no new
  input-sync dispatch, cancellation, or attempt and preserve exact attempt-object
  identity after settlement, including while a forced request is pending; ignored
  stale/disabled force actions do not cancel the active request; initial non-force
  attempt; manual retry and cache-event
  `force:true`; multiple blocks sharing one slug issue exactly one call and receive
  the same target rows; multiple unique slugs each issue exactly one call; request
  A→B immediate empty/loading; same-request refresh retains rows; same-target
  projection A→B during a forced manual retry and during a forced cache event inherits
  force, starts one new unique-target attempt, and commits only B in both old-first and
  new-first settlement orders; forced A1→same-target B2→multiple manual/cache retries
  allocate strictly increasing tokens, and B→A never reuses A1; exercise every old/new
  settlement order; a changed target-load key starts normally; stale
  success/failure/settled actions are strict no-ops, settlement preserves attempt object
  identity, and cancellation/unmount cannot commit; success and failure resolving after
  a new-input render but before passive cleanup fail the layout input-key guard and never
  publish reducer payload. Pin the exact bounded error,
  loading, refreshing, settled-empty, and Retry transitions.
- `custom-screen-workspace-preview-dialog.test.tsx`: enabled/open wiring, visible
  failure, forced retry success, close/unmount cancellation, target event refresh, and
  zero-block guard.

TASK-540-06 runs both suites read-only and must not re-baseline attempt, force,
de-duplication, or cancellation assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui/use-screen-related-entries.test.tsx \
  tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx
```

The new hook suite must exist and pass in this leaf. Rerun a named failing file once in
isolation.

## Completion

Implemented the shared related-entry plan/codec and reducer-owned attempt machine,
including one authoritative read per unique target, in-memory reuse of the existing
resolver, exact request/target identities, monotonic attempt tokens, force inheritance,
cache-event refresh, bounded retry errors, and layout/unmount cancellation. The Preview
dialog now enables the hook only while its editor preview is open and exposes a visible
failure with a real Retry action.

The pre-audit required an execution-contract repair: previously unnamed normalizers and
projector semantics were defined, reducer internals became directly testable pure
contracts, accepted `inputKey` moved into the immutable attempt, and raw document ID
uniqueness moved ahead of projection filtering. The first post-audit found one React
Hooks `exhaustive-deps` failure; destructuring the exact hook inputs fixed it without a
suppression or semantic-object dependency. The final fresh audit reported zero HIGH,
MEDIUM, or LOW findings. Final validation: targeted Vitest 44/44, targeted and full
core lint, typecheck, tracked/untracked diff-checks, empty staging, and Page collision
guards all passed.
