# TASK-220-05-01: Post Editor Ref and Autosave Signature Cleanup
# FileName: TASK-220-05-01_Post_Editor_Ref_and_Autosave_Signature_Cleanup.md

**Priority:** High
**Category:** Posts Editor + React Compiler Refs
**Estimated Effort:** Large
**Dependencies:** TASK-220-05
**Status:** In Progress (2026-04-27)

---

## Overview

Fix `react-hooks/refs` and mount refresh findings in `usePostEditorState`.
Render-time dirty-state derivation must not read `ref.current`; refs should stay
for callback freshness, while reactive data should live in state/reducer values.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/posts/editor/hooks/usePostEditorState.ts | 424 | react-hooks/refs (render-time ref.current access) | `const metadataDirty = metadataSignature !== baseMetadataSignatureRef.current;` | Move render-time ref read into reactive state/saved snapshot; keep refs only for async freshness. |
| core/admin/ui/posts/editor/hooks/usePostEditorState.ts | 479 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh({ force: true, setLoading: !initialCachedPost }).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/posts/editor/hooks/usePostEditorState.ts | 546 | react-hooks/refs (render-time ref.current access) | `payload: buildAutosavePayload(),` | Move render-time ref read into reactive state/saved snapshot; keep refs only for async freshness. |
| core/admin/ui/posts/editor/PostBlockEditorShell.tsx | 275 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setCategoryOptions([]);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/posts/editor/PostClassicEditorShell.tsx | 209 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `applyPost(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Replace render-time `baseMetadataSignatureRef.current` reads with a
  reactive baseline value or reducer-owned saved snapshot.
- [ ] Keep `hasUnsavedChangesRef` only for async callback freshness, not for
  render derivation.
- [ ] Ensure autosave signature generation does not indirectly read refs during
  render.
- [ ] Refactor mount refresh to avoid synchronous state mutation from the effect
  body.

## Files to Change

- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/PostClassicEditorShell.tsx`
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
- `tests/vitest/ui-integration/post-autosave-flow.test.tsx`
- Existing Posts editor Vitest suites under `tests/vitest/ui/**`.

## Security Contract

- Visibility: internal Posts editor.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: existing post edit/autosave permissions.
- CSRF: existing admin write CSRF handling unchanged.
- Rate-limit bucket: existing admin write/autosave bucket.
- Reject-unknown validation: post schemas/service normalization remain source of
  truth.
- Anti-abuse: autosave must not create duplicate in-flight writes or request
  amplification; background refresh must not overwrite dirty content.
- Secret handling: post editor state must not include secrets.

## Pseudocode

```ts
type SavedSnapshot = {
  data: Record<string, unknown>;
  metadataSignature: string;
};

const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshot>(() =>
  buildSavedSnapshot(initialPost)
);

const metadataDirty = metadataSignature !== savedSnapshot.metadataSignature;
```

## Testing Requirements

- Metadata dirty state toggles correctly after load, edit, save, and autosave.
- Autosave does not run while another autosave is in flight.
- Background refresh defers when the editor is dirty.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/post-autosave-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` only if Posts cache semantics change.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `usePostEditorState.ts` has no `react-hooks/refs` or
   `set-state-in-effect` findings.
2. Autosave and dirty-state tests prove no data-loss regression.
3. No backend Posts route contract changes are introduced.
