# 1280 - TASK-517 Entry Visibility — Public Front Enforcement

**Date:** 2026-08-14
**Version:** Unreleased
**Tasks:** TASK-517

## Key Changes

- **Fail-closed visibility gate on the public render path**
  (`core/services/content/entryVisibilityGate.ts`): authenticated `content:read`
  always renders; `public` renders to everyone; `private` returns a UNIFORM 404
  to anonymous/non-`content:read` visitors (byte-identical to a missing slug —
  no existence leak); `password` shows a server-rendered prompt; unknown/null
  visibility fails closed to not-found. The gate is applied in the entry DETAIL
  render (`core/server/publicSite.tsx` + `core/site/renderPublicEntry.tsx`),
  the public LIST route (non-`public` entries omitted from the anon list),
  the anonymous public SEARCH index, and static-page LISTING blocks.
- **Password gate with HMAC unlock cookie** (TASK-517-02):
  - `POST /entries/:id/unlock` (`core/server/publicEntryUnlockApi.ts`):
    reject-unknown `{password}` validation (400 `validation_error`), exactly one
    `public_write` rate-limit charge keyed by entry id (429 on bucket hit),
    server-side Argon2id verify against the stored hash via the narrow
    `getEntryAccessPasswordHash` loader (never in a render projection), and
    UNIFORM `entry_unlock_failed` 401 + timing-equalized dummy-argon2 path for
    wrong password / missing entry / non-password entry (no existence oracle).
  - Success sets a stateless per-entry cookie
    (`entry_unlock_<entryId-hash>`, HMAC via `core/services/content/entryUnlockToken.ts`,
    `ENTRY_UNLOCK_SECRET`, TTL `ENTRY_UNLOCK_TTL_HOURS` default 12 h,
    `Path=/; SameSite=Strict; HttpOnly` + `Secure` per `COOKIE_SECURE`), then
    302s only to a same-origin validated `returnPath` (never an attacker host).
  - The prompt page (`renderPublicPasswordPromptHtml`) never renders the body.
- **Gated-entry cache exclusion (read + write)** (TASK-517-03): the
  auth-independent `entryRouteIsGated` probe (memoization-free, never reads
  `access_password`) makes `private`/`password` detail routes fully exempt from
  the shared public HTML cache on BOTH the read and the write side, so a
  previously-rendered unlocked body (or a poisoned entry) is never served to an
  ungated visitor. Only `public` entries keep the configured public HTML cache;
  the public list route and the homepage keep caching.

## Validation

- Vitest (Bun-free): `entry-visibility-gate` resolver 12/12; `entry-unlock-token`
  HMAC 13/13.
- Bun (DB/runtime): `entry-access-password-hash` 5/5; `entry-visibility-gate`
  (L04 render suite) 11/11; `entry-visibility-public-vectors` (L06 search +
  listing blocks) 4/4; `entry-password-gate` (02-L04 flow suite) 9/9;
  `entry-visibility-cache` (03 cache-exclusion suite) 5/5; `pages-runtime`
  regression green.
- Root `tsc -p tsconfig.json --noEmit` 0 errors; `bun --cwd core lint:types` and
  `bun --cwd core lint` green; semgrep-clean unlock util + endpoint (no
  `eval`/`new Function`; secrets from env only).
- Runtime smoke (owner mandate, wf517smoke): public renders; private anonymous
  404 identical to a non-existent slug (admin bypass renders); password prompt →
  wrong re-prompts uniformly → correct unlocks → reload stays unlocked within
  TTL; cross-entry cookie does not unlock; a private/password body is never
  served from the shared cache to an ungated fresh session; private/password
  entries absent from anonymous search + listing blocks. Light + dark admin, 0
  console errors on public flows.

## Docs

- `_docs/SECURITY_SPEC.md`: new "Public entry-visibility gate (TASK-517)"
  section (semantics, unlock endpoint, cache exclusion, env vars).
- `_docs/DATA_MODEL.md` + `_docs/CONTENT_TYPES_SPEC.md`: enforcement note +
  the narrow server-only hash loader exception.

## Residual follow-ups (recorded, not silently dropped)

- Optional reCAPTCHA on `POST /entries/:id/unlock` if abuse is observed.
- A login-redirect alternative for `private` (v1 is 404-only).
- Rate-limit-config surfacing for the unlock bucket.
- An admin "reset unlock cookies" / rotate `ENTRY_UNLOCK_SECRET` runbook note.
