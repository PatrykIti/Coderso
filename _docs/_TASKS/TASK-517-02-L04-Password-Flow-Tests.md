# TASK-517-02-L04: Password-Gate Flow Tests (wrong → right → unlocked → tamper)

# FileName: TASK-517-02-L04-Password-Flow-Tests.md

**Parent Task:** TASK-517
**Parent Subtask:** TASK-517-02
**Priority:** High
**Category:** Tests / Security / Public Runtime
**Estimated Effort:** Small
**Status:** ✅ Done
**Completed:** 2026-08-14

---

## Scope

Executable leaf. Adds the Bun flow tests that prove the end-to-end password gate through
the real `handlePublicRequest` dispatch: a locked password entry serves the prompt (no
body); a wrong password is rejected uniformly; a correct password sets the per-entry cookie
+ 302; the subsequent request WITH that cookie serves the body; a tampered / expired /
cross-entry cookie is rejected. AMENDS 517-01-L04 scenario 4 (password-anon) from the
placeholder-404 expectation to the real 200-prompt expectation.

## Grounded anchors

- Dispatch: `handlePublicRequest(req)` (`publicSite.tsx:672`); unlock endpoint dispatched
  before content-route match (517-02-L02); content-route detail render at `:926`.
- Endpoint: `POST /entries/:id/unlock` → `handlePublicEntryUnlockApi` (517-02-L02); uniform
  401 failure; `302` + `Set-Cookie: entry_unlock_<hash>=…; …; SameSite=Strict; HttpOnly`.
- Cookie verify on the render path: `buildEntryUnlockContext` + `verifyEntryUnlockToken`
  (517-02-L03/L01).
- Seed via the 514 create/update service so `access_password` is hashed the real way; set
  `ENTRY_UNLOCK_SECRET` in suite setup.

## Regression-test shape

- **Lane:** Bun `tests/integration/runtime/entry-password-gate.test.ts` (NEW; full
  request-flow → Bun; alongside the existing `detail-page-runtime.test.ts`. There is NO
  `tests/integration/site/` dir).
- Fixtures (unique slugs, torn down): a published `password` entry with a known plaintext
  password → hashed `access_password`; a seeded content type + `site.contentRoutes` so the
  detail path resolves.
- Scenarios (≥5, per the smoke-five mandate applied at the test layer too):
  1. **Locked anon GET** → 200 prompt page: body contains `<form` with
     `action="/entries/<id>/unlock"` and a `type="password"` input, and does NOT contain
     the entry's rendered body content. (This REPLACES 517-01-L04 scenario 4.)
  2. **Wrong password POST** `/entries/:id/unlock` (`{password:"nope"}`) → uniform 401
     (`entry_unlock_failed`), NO `Set-Cookie`; a probe against a NON-existent id and against
     a `public` entry id returns the SAME 401 shape (no existence leak). Assert TIMING
     PARITY too: the null-hash / non-existent-id path must run the dummy argon2 verify
     (517-02-L02) so its latency is comparable to a wrong-password-on-a-real-entry — assert
     the code path (e.g. a spy/instrumentation that `verifyPassword` was invoked on the
     null-hash branch), not a brittle wall-clock threshold.
  3. **Right password POST** → 302, `Set-Cookie` present with `SameSite=Strict; HttpOnly`
     (and `Secure` when `COOKIE_SECURE`/prod), `Location` = the entry detail path.
  4. **Unlocked GET** — replay the detail GET carrying the `Cookie` from scenario 3 → 200,
     body NOW contains the entry's rendered content (unlock consumed on the render path).
  5. **Tampered cookie GET** — flip a hex char in the cookie token → 200 prompt again (NOT
     the body); **cross-entry cookie** — a valid cookie minted for entry A sent on entry B's
     detail path → prompt (B stays locked); **expired cookie** (mint with a past timestamp
     beyond TTL via the util's `now` param) → prompt.
  6. **Reject-unknown POST** — `{password:"x", extra:1}` → 400 `validation_error`.
  7. **Rate-limit** — exceeding `public_write` for the same `entryId` → 429 (bucket
     enforced), asserted with the suite's rate-limit-config harness (or documented skip if
     the shared harness disables it — mirror how the forms suite asserts/skenables it).
- **Shared-DB safety:** unique type + entry slugs per run, `afterAll` teardown of entries +
  content type + `site.contentRoutes` mutation, no cross-suite row-count coupling.

## Hard Invariants

1. Locked → prompt (no body); wrong → uniform 401 (no `Set-Cookie`, no existence leak by
   body OR timing — the null-hash branch runs the dummy argon2 verify); right → 302 +
   `SameSite=Strict; HttpOnly` cookie; unlocked → body served.
2. Tampered / expired / cross-entry cookie → stays locked (prompt), never body.
3. Reject-unknown (400) + rate-limit (`public_write`) asserted.
4. Amends 517-01-L04 scenario 4 to the real 200-prompt expectation.
5. Shared-DB scoped fixtures; no truncation; `ENTRY_UNLOCK_SECRET` set in suite setup.
