# TASK-251-01: Workspace Preview Parity and Record-Backed Editor Preview
# FileName: TASK-251-01_Workspace_Preview_Parity_and_Record_Backed_Editor_Preview.md

**Priority:** High
**Category:** Coderso Custom Screens + Preview + Builder UX
**Estimated Effort:** Large
**Dependencies:** TASK-251
**Status:** To Do

---

## Overview

Align the Custom Screens workspace preview with the quality bar already set by
Pages while keeping the Custom Screens builder read-only and schema-bound.

This area owns two coupled problems:

- the preview dialog shell is too constrained for both `List View` and
  `Editor View`,
- the `Editor View` builder preview still uses synthetic schema samples instead
  of the first real record for the selected content type.

The builder canvas and the preview dialog must read from one shared preview
state so the same record-backed data drives both surfaces.

## Sub-Tasks

- [ ] TASK-251-01-01: Preview Dialog Shell Width and Device Framing Parity
- [ ] TASK-251-01-02: First-Record Preview Data for Editor View Canvas

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx`
- new `core/admin/ui/custom-screens/customScreenPreviewData.ts`
- `core/admin/ui/custom-screens/CustomScreenPreview.tsx` if fallback/meta copy
  is surfaced inside the preview frame
- `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- new pure helper suite for preview-state shaping if the data logic is
  extracted

## Product Contract

1. `List View` preview remains desktop-oriented but uses a roomy modal shell
   instead of a narrow card-in-dialog treatment.
2. `Editor View` preview can still emulate desktop/tablet/mobile framing, but
   the outer dialog must not choke the inner device frame.
3. The builder canvas and the preview dialog must use the same preview-record
   state for the selected content type.
4. The preview should prefer the first cached/current record and clearly signal
   when it falls back because no records exist yet.

## Implementation Pseudocode

```ts
type PreviewRecordState = {
  source: "entry" | "fallback";
  entry: EntrySummary | null;
  data: Record<string, unknown>;
  note: string | null;
};

const [previewRecordState, setPreviewRecordState] = useState<PreviewRecordState>(() =>
  buildInitialPreviewRecordState(selectedContentType, getCachedEntries(selectedContentType?.slug ?? ""))
);

useEffect(() => {
  if (!selectedContentType) {
    setPreviewRecordState(buildFallbackPreviewRecordState(null));
    return;
  }

  const cached = getCachedEntries(selectedContentType.slug);
  if (cached?.[0]) {
    setPreviewRecordState(buildPreviewRecordStateFromEntry(selectedContentType, cached[0]));
  } else {
    setPreviewRecordState(buildFallbackPreviewRecordState(selectedContentType));
  }

  let active = true;
  listEntriesCached(selectedContentType.slug, { force: !cached?.length })
    .then((items) => {
      if (!active) return;
      setPreviewRecordState(
        items[0]
          ? buildPreviewRecordStateFromEntry(selectedContentType, items[0])
          : buildFallbackPreviewRecordState(selectedContentType)
      );
    })
    .catch(() => {
      if (!active) return;
      setPreviewRecordState((current) => current);
    });

  return () => {
    active = false;
  };
}, [selectedContentType?.id, selectedContentType?.slug]);
```

```tsx
<CustomScreenWorkspacePreviewDialog
  mode={activeBuilderTab}
  previewRecordState={previewRecordState}
  listView={definition.listView}
  blocks={blocks}
  bindings={bindings}
/>
```

## Security Contract

- Visibility: internal admin UI and existing internal admin read routes only.
- Auth model: authenticated admin session on the existing session-cookie admin
  API.
- RBAC:
  - preview record hydration continues to require `content:read`,
  - screen saves remain `content:write`.
- CSRF:
  - this area adds no new write path,
  - existing screen writes remain CSRF-backed.
- Rate-limit bucket:
  - existing admin read bucket for `GET /content/:type/entries`.
- Reject-unknown validation:
  - preview shaping must reuse current `EntrySummary` / `ContentTypeSummary`
    contracts,
  - no ad-hoc preview payload schema may bypass current normalization.
- Anti-abuse:
  - no public read/write contract is introduced.

## Testing Requirements

- Run the focused suites required by TASK-251-01-01 and TASK-251-01-02.
- Assert mounted behavior, not only static render:
  - cached-first preview state renders immediately when cached entries exist,
  - background refresh can replace fallback preview with a real first record,
  - the same preview record is visible on the builder canvas and inside the
    preview dialog.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md` if preview-state behavior becomes canonical.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if preview-entry
  invalidation is documented explicitly.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Preview shell sizing no longer makes the Custom Screens preview feel smaller
   than the Pages reference.
2. `Editor View` preview reads from a real first record when possible.
3. Fallback preview behavior is explicit and does not masquerade as real entry
   content.
