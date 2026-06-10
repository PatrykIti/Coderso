# TASK-451-01-L01: Restore Preview Surface And Preserve Preview Token Guards
# FileName: TASK-451-01-L01-Restore-Preview-Surface-And-Preserve-Preview-Token-Guards.md

**Parent Subtask:** TASK-451-01
**Priority:** High
**Category:** Pages / Preview / Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-451-01
**Status:** ⏳ To Do

---

## Overview

Restore a working preview route/dialog flow so the editor regains real 3-surface
parity, while preserving the preview-token security model and the current vs
published data split.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
const token = await issuePreviewToken(pageId);
const previewUrl = buildPreviewUrl(token, { device });
return renderPreviewDialog({ url: previewUrl, status: "ready" });
```

Owner files:

- `core/server/publicSite.tsx`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/site/renderPublicPage.tsx`

Validation commands:

- `bun run test:bun`
- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Admin preview dialog resolves a reachable runtime URL.
- Preview renders current draft data, not published data.
- Token validation, TTL, and target checks remain unchanged.

Error handling:

- Broken preview targets surface bounded diagnostics instead of generic 404 UX.
- Invalid/expired tokens keep existing failure behavior.

Regression-test shape:

- Bun preview runtime coverage plus live dialog/browser smoke.

---

## Security Contract

- **Endpoint visibility:** existing public `/preview` route only.
- **Auth model:** preview remains token-gated.
- **RBAC:** existing Pages permissions for issuance.
- **CSRF:** unchanged admin-side token issuance.
- **Rate-limit bucket:** existing preview bucket.
- **Validation:** preview token TTL, hashing, and target validation must remain
  intact.

---

## Testing Requirements

- Relevant Bun preview/runtime tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
