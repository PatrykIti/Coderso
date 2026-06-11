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

Diagnose and fix the preview URL/environment composition so the admin preview
dialog renders and the editor regains real 3-surface parity, while preserving
the preview-token security model and the current vs published data split. The
public `/preview` route IS registered and gated by design
(`core/server/publicSite.tsx:1312-1319` — 404 without a valid token/type, 404
when `site.previewEnabled` is off); it must not be treated as missing or
restored. Diagnosis-first is a hard gate: confirm the environmental root cause
before changing any code.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
// Diagnose-first (hard gate). Do NOT reimplement token issuance or URL
// building — the full pipeline already exists:
//   handlePreview (core/admin/ui/pages/PageEditor.tsx:1665-1681)
//   -> previewPage(pageId, { ttlMinutes: 15, probe: true })
//   -> token issuance + resolvePreviewUrl + optional probe
//      (core/server/routes/pageRoutes.ts:217-247,
//       core/server/utils/previewUrls.ts:13-47)
//   -> RuntimePreviewDialog mount (PageEditor.tsx:2139).
// Candidate root causes to rule in/out, in order:
// 1. Public base URL resolution: resolvePublicBaseUrl
//    (core/server/utils/baseUrl.ts:105) + createPublicUrlContextFromHeaders
//    (core/server/utils/previewUrls.ts:32) composing a target URL that is not
//    reachable from the server-side probe or the admin browser.
// 2. Host routing for `coderso-a.localhost` (the composed absolute URL vs the
//    host actually serving the site in the audited environment).
// 3. `site.previewEnabled` state (default true,
//    core/services/settings/settingsService.ts:67; kill-switch 404 at
//    core/server/publicSite.tsx:1318-1319).
// 4. Preview token issuance from the editor dialog and probe semantics:
//    probeGeneratedPreviewUrl (core/services/pages/previewService.ts:278)
//    reporting reason "unreachable" means the server-side fetch of the
//    tokenized URL threw — a network/URL-composition failure, not a missing
//    route (tokenless GET /preview 404s by design at publicSite.tsx:1316).
// Then: fix only the confirmed root cause (URL/environment composition). If
// diagnosis proves the defect lives in the URL-composition helpers, scope the
// change there explicitly; otherwise treat those modules as
// preserved-unchanged. Finally verify RuntimePreviewDialog renders the
// tokenized target.
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

- Diagnosis confirms which candidate cause breaks the tokenized preview URL in
  the audited environment before any fix lands.
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
- **Anti-abuse controls:** the `site.previewEnabled` kill-switch
  (`core/server/publicSite.tsx:1318-1319`) must be preserved.

---

## Testing Requirements

- Relevant Bun preview/runtime tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
