# 298 - TASK-059-04 Posts Admin UI Decoupling From Entries

- **Date:** 2026-02-22
- **Version:** 0.1.298
- **Tasks:** TASK-059, TASK-059-04

## Key Changes

### Posts Editor Decoupling
- `core/admin/ui/posts/PostEditorPage.tsx` przestal kierowac classic mode do `EntryEditor`.
- Dodano dedykowany fallback: `core/admin/ui/posts/editor/PostClassicEditorShell.tsx`.

### Entry Editor Cleanup
- `core/admin/ui/entries/EntryEditor.tsx` zostal uproszczony do entries-only:
  - usuniety routing/branching `mode=\"posts\"`,
  - usuniete posts-specific etykiety i preview messaging,
  - `activeHref` ustabilizowany dla entries flow.

### Classic Posts UX Contract
- Classic shell korzysta bezposrednio z `postsClient` (`getPostCached`, `updatePost`, `updatePostMetadata`, `publishPost`, `previewPost`).
- Zachowany jest workflow save/publish/preview oraz metadata panel.
- Save draft synchronizuje `data.content`/`data.excerpt` z `data.document` dla runtime parity.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/ui/post-editor-smoke-regression.test.tsx tests/integration/ui/post-autosave-flow.test.tsx tests/integration/ui/post-richtext-toolbar.test.tsx tests/integration/ui/post-block-dnd.test.tsx tests/integration/ui/post-block-inserter.test.tsx tests/integration/ui/post-document-inspector.test.tsx tests/integration/ui/post-block-inspector.test.tsx`
- `bun test tests/unit/contentUi/entryEditor.test.tsx tests/unit/ui/content-entry-editor.test.tsx tests/unit/ui/posts-list.test.tsx`

## Result
- TASK-059-04 is closed: posts admin UI no longer depends on `EntryEditor` for post routes, while classic fallback remains available via a dedicated posts component.
