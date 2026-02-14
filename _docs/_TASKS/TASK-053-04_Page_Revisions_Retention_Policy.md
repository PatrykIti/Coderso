# TASK-053-04: Page Revisions Retention Policy
# FileName: TASK-053-04_Page_Revisions_Retention_Policy.md

**Priority:** Medium  
**Category:** CMS/Pages + Data/Storage  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002-02, TASK-052-05  
**Status:** To Do  

---

## Overview

Define and implement a clear retention policy for page revision history to avoid unbounded storage growth.

**Decision from product:**
- Default retention is **10 revisions per page**.
- Retention is **configurable per page** in Page Settings.

---

## Scope

1. **Document current behavior**: when revisions are created, what is stored, and how restores behave.
2. **Per-page retention**: store `settings.revisionRetention` inside page data settings (default 10).
3. **Retention rules**: keep last `N` revisions per page, where `N` is resolved from page settings or defaults.
4. **Implement pruning**: prune older revisions deterministically on publish.
5. **Admin UI**: expose retention field in Page Settings.

---

## Data Contract

```ts
// page data settings
settings: {
  template?: string;
  showInNav?: boolean;
  layout?: PageLayoutSettings;
  revisionRetention?: number; // per-page override, default 10
}
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/validation/pageSchemas.ts` | update | allow `settings.revisionRetention` (min 1, max safe cap) |
| `core/services/pages/pageService.ts` | update | resolve retention value from `data.settings` or default (10) |
| `core/services/pages/revisionService.ts` | update | add `pruneRevisions(pageId, keep)` after `createRevisionTx` |
| `core/admin/ui/pages/PageSettingsDrawer.tsx` | update | add numeric field for revision retention with helper text |
| `core/admin/ui/pages/PageEditor.tsx` | update | include `revisionRetention` in `PageSettingsValue` + save payload |
| `tests/unit/services/pageRevisionRetention.test.ts` | new | verify pruning keeps last N revisions |
| `tests/unit/ui/page-settings-drawer.test.tsx` | update | verify retention value persists through save |

---

## Acceptance Criteria

1. Default retention is 10 revisions per page.
2. Page Settings allows changing retention per page.
3. Publishing prunes revisions older than the retention limit.
4. The newest revision is never deleted.

---

## Testing Requirements

- `bun test tests/unit/services/pageRevisionRetention.test.ts`
- `bun test tests/unit/ui/page-settings-drawer.test.tsx`
- `bun --cwd core lint && bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (revision storage + per-page retention)
- `_docs/CMS_SPEC.md` (page history behavior + retention field)
