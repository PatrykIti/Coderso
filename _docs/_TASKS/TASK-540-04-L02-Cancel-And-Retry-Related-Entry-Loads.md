# TASK-540-04-L02: Cancel and Retry Related-Entry Loads

# FileName: TASK-540-04-L02-Cancel-And-Retry-Related-Entry-Loads.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-04
**Priority:** High
**Category:** Custom Screens / Async UI / Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-540-04-L01
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- new `core/admin/ui/custom-screens/hooks/useScreenRelatedEntries.ts`
- new `tests/vitest/ui/use-screen-related-entries.test.tsx`
- compatibility-expectation updates required before this source gate in
  `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx` and
  `tests/vitest/customScreens/relatedEntryResolver.test.ts`
- `core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx`

No other leaf edits these paths. The new hook owns shared load/retry/cancellation
and target-cache subscription; TASK-540-04-L03 consumes it.

## Grounded anchors

- Duplicated preview async IIFE without catch:
  `CustomScreenWorkspacePreviewDialog.tsx:68-131`.
- Entry duplicate to be removed by consumer leaf:
  `CustomScreenEntryEditor.tsx:809-867`.
- Resolver contract: `core/services/customScreens/relatedEntryResolver.ts`.
- Existing client read: `entriesClient.ts:261-273`.
- Cache bus/key precedent: `CustomScreenEntryEditor.tsx:716-739` and
  `core/admin/services/cachePolicy.ts:48+`.

## Implementation Pseudocode

```ts
type RelatedEntriesCommit = {
  requestKey: string | null;
  attemptKey: string | null;
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

export function useScreenRelatedEntries(input): RelatedEntriesState {
  const [retryRevision, retry] = useReducer((n) => n + 1, 0);
  const [commit, setCommit] = useState<RelatedEntriesCommit>({
    requestKey: null,
    attemptKey: null,
    items: {},
    error: null,
  });
  const targets = useMemo(() => deriveTargetsFromBlocksBindingsAndFields(input), [...]);
  const requestKey = useMemo(
    () => buildScreenRelatedRequestKey(exact normalized resolver inputs and targets),
    [stable resolver inputs, targets]
  );
  const attemptKey = `${requestKey}:${retryRevision}`;
  const matchesCurrentRequest = commit.requestKey === requestKey;
  const isRefreshing = matchesCurrentRequest && commit.attemptKey !== attemptKey;

  // Render-time identity derivation: no synchronous setState in an effect body.
  const visible = targets.length === 0
    ? { items: {}, loading: false, refreshing: false, error: null }
    : matchesCurrentRequest
      ? {
          items: commit.items,
          loading: false,
          refreshing: isRefreshing,
          error: isRefreshing ? null : commit.error,
        }
      : { items: {}, loading: true, refreshing: false, error: null };

  useEffect(() => subscribeCacheEvents((event) => {
    if (targets.some((slug) => event.key === cacheKeys.entriesList(slug))) retry();
  }), [targets]);

  useEffect(() => {
    if (targets.length === 0) return;
    let active = true;
    const generation = ++generationRef.current;
    void resolveAllRelatedEntries(input)
      .then((items) => {
        if (!active || generation !== generationRef.current) return;
        setCommit({ requestKey, attemptKey, items, error: null });
      })
      .catch((error) => {
        if (!active || generation !== generationRef.current) return;
        setCommit((previous) => ({
          requestKey,
          attemptKey,
          items: previous.requestKey === requestKey ? previous.items : {},
          error: resolveRelatedLoadMessage(error),
        }));
      });
    return () => { active = false; };
  }, [stable inputs, targets, requestKey, attemptKey]);

  return { ...visible, targetSlugs: targets, retry };
}
```

Derive targets exactly as today: bound relation field target first, then stored
block target fallback; trim, reject blanks, de-duplicate and sort for stable
dependencies. `buildScreenRelatedRequestKey` is a pure canonical serialization of only
the normalized block ID, binding path, relation target, selected resource IDs,
display-field, and limit tuples actually consumed by the resolver; it is memory-only and
never logged or persisted. A normalized `requestKey` mismatch derives empty/loading
during render, so committed rows for target A cannot appear under target B while B is
pending. A changed `attemptKey` for the same request retains committed rows and exposes
`refreshing:true`; it does not masquerade as an initial load. Same-request refresh
failure retains those rows and exposes the bounded error after the attempt settles.
State commits occur only for the active generation and exact `attemptKey`. No caught
error is silently swallowed or re-thrown from an effect.

Replace the Preview dialog IIFE with the hook. Render a compact alert with a real
Retry button when `error` is non-null; resolved empty arrays remain distinct from
loading/failure. Closing the dialog/unmounting cancels state commits.

## Error/compatibility flow

- First failure becomes visible and retry invokes a fresh client request because
  L01 cleared the rejected pending promise.
- CacheBus updates for any target trigger a background retry that retains matching-
  request rows while exposing `refreshing:true`.
- A later request identity/generation wins; stale committed rows disappear immediately
  on A→B input change, and stale success or failure cannot overwrite B.
- Documents with no related-list blocks perform zero requests and expose `{}`.
- Existing `relatedEntries` renderer prop shape remains unchanged.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- `custom-screen-workspace-preview-dialog.test.tsx`: failure UI, retry success,
  cancellation/unmount, stale generation, target cache event, zero-block guard.
- Create exact `tests/vitest/ui/use-screen-related-entries.test.tsx` before this leaf's
  first validation command: target derivation,
  zero-request empty document, loading/success/error, visible retry trigger, stale
  generation, unmount, and every target cache event. Resolve the initial A request and
  assert A rows; start a second deferred A refresh and assert the same rows plus
  `refreshing:true`; switch to a deferred B request and assert the immediate render is
  `{}` plus initial loading—not A's rows. Resolve the stale A refresh and prove it cannot
  commit, then resolve B and assert only B rows. This leaf is its sole writer;
  TASK-540-06 runs it read-only.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx \
  tests/vitest/customScreens/relatedEntryResolver.test.ts \
  tests/vitest/ui/use-screen-related-entries.test.tsx
```

The new hook suite must exist and pass in this source leaf; a missing path or result is a
failed gate. TASK-540-06 may add aggregate caller coverage but cannot defer this proof.

Rerun a named failing file once in isolation.
