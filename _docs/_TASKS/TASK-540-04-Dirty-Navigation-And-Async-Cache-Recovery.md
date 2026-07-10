# TASK-540-04: Dirty Navigation and Async/Cache Recovery

# FileName: TASK-540-04-Dirty-Navigation-And-Async-Cache-Recovery.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Admin State / Cache / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01, TASK-540-03
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Scope

Make related-entry reads retryable and cancellation-safe, subscribe entry hosts
to every relation target cache, and guard both Screen builder and entry drafts
with the shared navigation/beforeunload contract. Dirty content and presentation
state always wins over background hydration.

## Leaves and strict order

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-04-L01 | Make related-entry promise caches retryable | `core/admin/services/entriesClient.ts` | ⏳ To Do |
| TASK-540-04-L02 | Cancel and retry related-entry loads | new shared Screen hook + `CustomScreenWorkspacePreviewDialog.tsx` | ⏳ To Do |
| TASK-540-04-L03 | Guard entry drafts, subscribe related/media caches, and resolve presentation media UUIDs | `CustomScreenEntryEditor.tsx`, `CustomScreenEntryCanvas.tsx` | ⏳ To Do |
| TASK-540-04-L04 | Guard Screen builder drafts | `CustomScreenEditorPage.tsx` | ⏳ To Do |

## Shared contract

- Pending read entries are de-duplicated only while in flight. Success and
  rejection clear the exact stored promise through an identity-guarded `finally`.
- Related loaders expose visible retry state, catch every rejection, and discard
  results after unmount/input generation change.
- Related committed state carries normalized request identity separately from attempt/
  retry identity. A request mismatch derives empty/loading so prior-target rows never
  appear under a new target; a same-request background attempt retains current rows,
  exposes refreshing state, and still generation-guards every commit.
- Relation target slugs are derived from the same binding/field/data flow used by
  the resolver. Every non-empty target subscribes to `cacheKeys.entriesList`.
- Builder dirty guard covers its document/binding changes. Entry dirty guard
  covers content and presentation changes. Confirm clears the correct local
  dirty flags before blocker-skipping navigation.
- Cache refreshes use existing `keepUnsaved` behavior and must never replace a
  dirty draft.
- Presentation overrides remain media UUIDs. The entry host resolves only direct-image
  requested IDs via `listMediaCached`, forwards an identity-keyed UUID→URL map, and generation-guards
  entry/override changes, retries, cache events, and unmount before every state commit.
  The renderer owns final direct-image URL sanitization; media fields retain UUIDs for
  MediaPicker, and missing/unsafe direct-image winners do not fall back.

## Security Contract

Existing internal content reads/writes only. Authentication, `content:read` /
`content:write`, CSRF, and admin rate-limit buckets are unchanged. Cache keys and
errors contain resource identities only; no content, secret, or token is placed
in browser storage or logs.
