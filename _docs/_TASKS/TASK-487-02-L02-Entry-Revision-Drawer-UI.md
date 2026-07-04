# TASK-487-02-L02: `EntryRevisionDrawer` + History Button + Restore Handler
# FileName: TASK-487-02-L02-Entry-Revision-Drawer-UI.md

**Parent Subtask:** TASK-487-02
**Priority:** Medium
**Category:** Engine / Entries
**Estimated Effort:** Medium
**Dependencies:** TASK-487-02-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Add an `EntryRevisionDrawer` component and a "History" button to the
  entry editor toolbar that lists revisions, previews a snapshot, and restores
  one — re-hydrating the editor from the restored entry.
- **Owning module(s) to create-or-extend:**
  `core/admin/ui/entries/EntryRevisionDrawer.tsx` (create — mirror
  `core/admin/ui/posts/editor/PostRevisionDrawer.tsx`),
  `core/admin/ui/entries/EntryEditor.tsx` (extend — toolbar `:732-752`, state
  block `:155`, hydration helper `buildInitialValues` `:80`).
- **Source-of-truth docs:** `_docs/ADMIN_CACHE.md` (revision drawer hydrates
  from cache, `:478`), `_docs/CONTENT_EDITOR_UX.md`, `_docs/CMS_API.md`.
- **Reference to mirror:** `PostRevisionDrawer.tsx` (Sheet + ScrollArea +
  `ConfirmActionDialog` restore-confirm; loading/error/empty states).
- **Out of scope:** client methods (TASK-487-02-L01), backend (TASK-487-01),
  riders (TASK-487-03). Entry data is content-type field data, **not** a
  rich-text `document`, so do not reuse `postRichTextToPlainText`; render a
  field/value summary instead.

---

## Security Contract

- **Endpoint visibility:** n/a (UI). Consumes the L01 client methods, which call
  the internal `/admin/api/*` routes.
- **Auth model:** session (admin) via the shared client. The History button and
  Restore action are admin-only UI; the server re-checks `content:read` /
  `content:write`.
- **RBAC / CSRF:** enforced server-side; restore goes through
  `restoreEntryRevision` (L01) which sends `withCsrf: true`. No raw fetch in the
  component.
- **Rate-limit / Anti-abuse:** n/a (internal).
- **Secret/PII handling:** render only `revision.createdBy` (already
  PII-redacted author name/email from L01). Do not log revision payloads or push
  them to any debug surface.

---

## Implementation Pseudocode

```tsx
// core/admin/ui/entries/EntryRevisionDrawer.tsx  (mirror PostRevisionDrawer)
type EntryRevisionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: EntryRevision[];
  isLoading: boolean;
  error: string | null;
  restoringId: string | null;
  onRestore: (revisionId: string) => void;
};
// Reuse Sheet/SheetContent/ScrollArea + ConfirmActionDialog exactly like posts.
// Per-revision card: "Version {n}", formatTimestamp(createdAt), author label,
// a Preview toggle that shows a field summary (NOT rich text), and a Restore
// button guarded by ConfirmActionDialog ("Restore this revision? Current
// unsaved changes may be overwritten.").

const describeEntryRevision = (revision: EntryRevision) => {
  const data = revision.data ?? {};
  const keys = Object.keys(data);
  const title = typeof data.title === "string" ? data.title : null;
  return title ?? `Snapshot with ${keys.length} field${keys.length === 1 ? "" : "s"}`;
};
```

```tsx
// core/admin/ui/entries/EntryEditor.tsx
// 1) state (near :155)
const [revisionsOpen, setRevisionsOpen] = useState(false);
const [revisions, setRevisions] = useState<EntryRevision[]>([]);
const [revisionsLoading, setRevisionsLoading] = useState(false);
const [revisionsError, setRevisionsError] = useState<string | null>(null);
const [restoringId, setRestoringId] = useState<string | null>(null);

// 2) open handler — hydrate from cache, then revalidate (no mount-force loop)
const handleOpenRevisions = async () => {
  setRevisionsOpen(true);
  const cached = getCachedEntryRevisions(entryId);
  if (cached) setRevisions(cached);
  setRevisionsLoading(!cached);
  try {
    const next = await listEntryRevisionsCached(typeSlug, entryId, { force: Boolean(cached) });
    setRevisions(next);
    setRevisionsError(null);
  } catch (err) {
    setRevisionsError(err instanceof Error ? err.message : "Failed to load revisions.");
  } finally {
    setRevisionsLoading(false);
  }
};

// 3) restore handler — re-hydrate editor values from the returned entry
const handleRestoreRevision = async (revisionId: string) => {
  setRestoringId(revisionId);
  try {
    const result = await restoreEntryRevision(typeSlug, entryId, revisionId);
    if (result?.entry) {
      setValues(buildInitialValues(fields, result.entry.data)); // re-hydrate :80
      setTitle(result.entry.title);
      setSlug(result.entry.slug);
      // mark clean: restored state IS the persisted state
    }
    setRevisions(await listEntryRevisionsCached(typeSlug, entryId, { force: true }));
    setRevisionsOpen(false);
  } catch (err) {
    setRevisionsError(err instanceof Error ? err.message : "Failed to restore revision.");
  } finally {
    setRestoringId(null);
  }
};

// 4) toolbar button (next to Save draft / Publish, :732)
<Button variant="outline" size="sm" className="gap-2" onClick={() => void handleOpenRevisions()}>
  <History className="h-4 w-4" /> History
</Button>

// 5) render <EntryRevisionDrawer .../> near the existing details Sheet (:951).
```

**Data flow:** open → hydrate revisions from `entries:revisions:<id>` cache then
revalidate → restore → patch entry caches (L01) + re-hydrate editor field values
from the returned entry → close. Preserve dirty-state protection: gate restore
behind `ConfirmActionDialog` (same wording as posts) so unsaved edits are not
silently lost.

**Effect/lint discipline:** no synchronous `setState` in effect bodies; use the
event handlers above (AGENTS React-hooks rule). Hydrate lazily on open, not on
mount.

**Error handling:** surface client `ApiError` messages in the drawer's error
slot (mirrors `PostRevisionDrawer` `error` prop). A schema-incompatible restore
returns 400 `entry_validation_failed` from the server → show its message; do not
crash the editor.

**Regression-test shape (Vitest ui):**

- Drawer renders loading → list → empty/error states from props.
- Clicking History calls `listEntryRevisionsCached`; clicking Restore (after
  confirm) calls `restoreEntryRevision` and re-hydrates title/slug/values.
- Restore failure renders the error message and keeps the editor mounted.

---

## Testing Requirements

- Lane: **Vitest** (Bun-free UI render flow).
- Add cases to `tests/vitest/ui/content-entry-editor.test.tsx` (or a sibling in
  `tests/vitest/ui-integration/*`) with mocked client methods.
- `bun --cwd core lint`, `bun --cwd core lint:types` (treat `react-hooks/*`
  findings as contract issues; do not weaken the preset).
- No DB schema change → **no migration artifacts**.
