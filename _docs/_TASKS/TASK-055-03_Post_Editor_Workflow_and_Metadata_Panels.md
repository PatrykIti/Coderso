# TASK-055-03: Post Editor Workflow and Metadata Panels
# FileName: TASK-055-03_Post_Editor_Workflow_and_Metadata_Panels.md

**Priority:** High  
**Category:** Admin/UI + Editorial Workflow  
**Estimated Effort:** Large  
**Dependencies:** TASK-055-02  
**Status:** Done (2026-02-21)

---

## Goal
Build a dedicated post editor flow with predictable left/canvas/right layout and metadata controls.

## Files to Change
- `core/admin/ui/posts/PostEditorPage.tsx` (new)
- `core/admin/ui/posts/PostMetadataPanel.tsx` (new)
- `core/admin/ui/posts/PostStatusToolbar.tsx` (new)
- `core/admin/services/postsClient.ts`
- `core/admin/state/editorHistory/*`

## Editor Layout
- Left panel: structure blocks/sections for post content (or post field navigator).
- Center panel: editor canvas/form body.
- Right panel: SEO, author, slug, categories, tags, schedule, featured image.

## Required Features
- Save draft, publish, unpublish.
- Autosave with revision/history support (same UX baseline as pages where possible).
- Preview device control synchronized with runtime preview behavior.

## Pseudocode
```tsx
const [draft, setDraft] = useState<PostDraft>(initial);
useAutosave({ key: `post:${postId}`, value: draft, onSave: savePostDraft });

<PostStatusToolbar
  status={draft.status}
  onSaveDraft={() => saveDraft(draft)}
  onPublish={() => publishPost(postId)}
  onPreview={() => openRuntimePreview(postId, previewDevice)}
/>

<PostMetadataPanel
  value={draft.meta}
  onChange={(meta) => setDraft((prev) => ({ ...prev, meta }))}
/>
```

## Acceptance Criteria
1. Editor supports complete draft/publish workflow.
2. Metadata panel persists all post metadata fields correctly.
3. Autosave/history behavior is explicit and test-covered.

## Completion Notes (2026-02-21)
- Added dedicated posts editor route wrapper: `core/admin/ui/posts/PostEditorPage.tsx`.
- Reused `EntryEditor` workflow with post mode (`mode="posts"`) for draft/publish/preview/metadata operations.
- Added route wiring in `AdminApp.tsx`: `/coderso/posts/:id`.
