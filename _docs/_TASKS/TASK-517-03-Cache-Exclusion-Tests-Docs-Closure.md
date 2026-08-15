# TASK-517-03: Cache Exclusion + Gate-Matrix Tests + Docs & Closure

# FileName: TASK-517-03-Cache-Exclusion-Tests-Docs-Closure.md

**Parent Task:** TASK-517
**Priority:** Medium
**Category:** Public Runtime / Security / Tests / Docs / Closure
**Estimated Effort:** Medium
**Status:** ✅ Done
**Completed:** 2026-08-14
**Depends on:** TASK-517-01 + TASK-517-02 (all landed). Lands THIRD/last (01 → 02 → 03).

---

## Scope

Closes the gate: excludes `private` + `password` entries from the shared public HTML cache
on BOTH read and write, runs the full gate-matrix aggregate tests, updates the docs, and
records the closure. Owns the aggregate test/gate pass, the model/security docs, and the
closure record. Does NOT re-implement feature code (01/02 own it).

**What each prior leaf actually protects (grounded, no over/under-scope):** 517-02-L03 sets
`cacheable:false` ONLY on the PROMPT-page result — NOT on served bodies. The `allow`
(unlocked-body) and the private-authed-bypass renders go through `renderPublicEntryDetailHtml`
which returns a STRING (`publicSite.tsx:576-590`); at the call site `canCache = typeof detailHtml
=== "string" ? true : detailHtml.cacheable` (`:937`) → `canCache=true` for a bare string. So
517-02 does NOT protect the served-body WRITE at all. 517-01-L03 CLOSES that body-WRITE by
returning `{ html, cacheable:false }` for gated `allow` renders (see 517-01-L03 Security
Contract + Hard Invariant #7). What remains for 517-03 is (a) the READ-side exemption
(`getSiteCacheEntry` at `:889-894` runs BEFORE dispatch and ignores the unlock cookie, so a
previously-cached body could be served to an ungated visitor), and (b) a belt-and-braces
`routeIsGatedEntry` short-circuit that makes `shouldUseCache=false` on both read and write,
auth-independent — the single canonical anti-poisoning guard. 517-03 does NOT rely on 517-02
having protected served bodies (it did not).

## A. Cache exclusion (read + write) — the critical fix

**Grounded anchors.** Shared cache `core/site/cache/siteCache.ts` (in-memory LRU, 30 s
default TTL). In `handlePublicRequest` (`publicSite.tsx`): `shouldUseCache` const @ `:878`;
cache key `buildSiteCacheKey(cacheProfileId, slugPath, searchSignature.signature)` (`:888`);
**READ** `getSiteCacheEntry(cacheKey)` (`:890`) at `:889-894` — happens BEFORE the route
dispatch (`:916-920`) and keyed ONLY on path + searchSignature (it does NOT vary on the unlock
cookie); **WRITE** gated on `canCache` (`:937`, `= detailHtml.cacheable`) →
`setSiteCacheEntry` (`:939`). `resolveRenderCacheTtl` maps `cacheMode:"none"` → 0
(`:881-886`).

**The problem.** Because the READ at `:889-894` runs before dispatch and ignores the unlock
cookie, a `private`/`password` route could serve a previously-cached UNLOCKED body to an
ungated visitor (or a cached prompt to an unlocked one). Note what the prior leaves actually
cover: 517-02-L03 set `cacheable:false` only on the PROMPT result (NOT served bodies);
517-01-L03 closed the served-body WRITE by returning `{ html, cacheable:false }` for gated
`allow` renders (including the authed bypass, `:553`/`:576-590`). So the WRITE is covered by
01/02 — but the READ at `:889-894` is still unguarded, and 517-03 adds the canonical
`routeIsGatedEntry` short-circuit (belt-and-braces on both read AND write) as the single
auth-independent anti-poisoning guard.

**Implementation.** Make `private` + `password` entries FULLY cache-exempt on both sides:

```ts
// publicSite.tsx handlePublicRequest — BEFORE the cache read (:889), detect a gated
// content route and skip the shared cache entirely for it.
//
// CANONICAL HEAD ORDERING (shared with 517-01-L03 + 517-01-L05 — re-ground before editing):
// 517-01-L03 (+ L05) land BEFORE this leaf (order 01 → 02 → 03) and ALREADY restructure the top
// of handlePublicRequest: L03 hoists the session→content:read `isAuthenticated` boolean + the
// `cookies` local ONCE ABOVE the routeTarget branches (at/above :916, per L03 Hard Invariant #8),
// and L05 threads `isAuthenticated` into the list call site (:962) + suppresses the authed list
// cache WRITE. So by the time THIS leaf runs, the pristine :878/:888/:916/:917/:920 anchors below
// will have SHIFTED — treat the line numbers here as the ORIGINAL-layout reference and re-ground
// against the post-L03/L05 file before editing. The single canonical head ordering all three
// leaves converge on: resolve `contentRoutes` + `match` + `isAuthenticated` + `cookies` ONCE,
// ABOVE the cache READ (:889); THEN `routeIsGatedEntry` + `shouldUseCache` (this leaf) consume
// `match`; THEN the list (L05) and detail (L03) branches consume `isAuthenticated`.
//
// ORDERING HAZARD (grounded): today `contentRoutes = getSetting("site.contentRoutes")` (:916)
// and `match = matchContentRoute(slugPath, contentRoutes)` (:917) are resolved AFTER the cache
// READ at :889-894 — so `match` is NOT yet available at the read point. (L03 hoists the AUTH
// seam above the routeTarget branches but does NOT itself move contentRoutes/match — that hoist
// is THIS leaf's, layered on top of L03/L05's restructure.) This is NOT the additive edit the
// prose implies: 517-03 MUST HOIST the contentRoutes fetch + matchContentRoute ABOVE the :889
// cache read (a real reorder of handlePublicRequest). The homepage short-circuit (:896-914) and
// the routeTarget branches stay below; only the detail-gating signal must move up.
const contentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[]; // HOISTED above :889 (was :916)
const match = matchContentRoute(slugPath, contentRoutes);          // HOISTED above :889 (was :917)
const routeIsGatedEntry = match?.mode === "detail" && await entryRouteIsGated(match);

// ── H5: entryRouteIsGated memoization — NO MEMO BY DEFAULT (decision, not an open option) ──
// Do NOT memoize `routeIsGatedEntry` across requests. Rationale: the probe is a bounded,
// single-entry read that runs ONLY on `detail` route targets; gated routes skip the cache anyway,
// and public entries keep the 30 s cache (so the probe cost is one cheap read amortized against
// the avoided full render). A memo that caches "public" and goes stale is the FAIL-OPEN direction
// (it would serve a cached body to a now-private entry), so correctness wins over the marginal
// read cost. If a future perf pass MUST memoize, it has to satisfy ALL of: (1) key on the
// resolved entry id (or typeSlug+slug), never on the request path alone; (2) be invalidated by the
// SAME mutation path that already calls `invalidateContentEntryCache` (`siteCache.ts:279-296`) —
// every entry create/update/delete/visibility change must bump a module-level generation counter
// (or clear the memo) so a "public" memo can never outlive a visibility mutation; (3) be
// ADVISORY and fail-closed: a memo MISS re-probes, a memo "gated" hit is safe (skips cache), and
// a memo "public" hit is safe ONLY because (2) provably invalidates it. A raw TTL memo is NOT
// allowed. DEFAULT: no memo.

// SHARED-CONST REORDER (grounded, NOT an additive edit): `shouldUseCache` is a SINGLE `const` at
// publicSite.tsx:878 (`cacheTtlSeconds > 0 && searchSignature.cacheable`) CONSUMED BY THREE
// branches — the homepage write (:909-911), the list write (:967-969) and the detail write
// (:938-940) — not just the read at :889. So this line must REPLACE the existing :878 const
// (adding `&& !routeIsGatedEntry`), NOT declare a second `const shouldUseCache` in the same scope
// (that is a TS redeclare error / shadow). `routeIsGatedEntry` is guarded by `match?.mode ===
// "detail"` (above), so it is FALSE for the homepage (slugPath === "/") and list paths — those
// branches keep caching. That guard MUST stay: dropping it would accidentally gate (disable)
// list/homepage caching. See the regression test in §B (a public list route + the homepage still
// cache). NOTE (post-L05): by the time this leaf lands, 517-01-L05 has already changed the LIST
// write to `if (shouldUseCache && !isAuthenticated)` (:967-969) to suppress the authed full-list
// body. This leaf's `&& !routeIsGatedEntry` on the shared `shouldUseCache` composes with that
// per-branch `!isAuthenticated` guard — the list write becomes effectively `shouldUseCache &&
// !routeIsGatedEntry && !isAuthenticated`, and since `routeIsGatedEntry` is false for list
// matches, list caching for the ANON public-only body is unchanged. Do NOT remove L05's
// `!isAuthenticated` list guard when replacing the :878 const.
const shouldUseCache = cacheTtlSeconds > 0 && searchSignature.cacheable && !routeIsGatedEntry; // REPLACES :878 (was without the `&& !routeIsGatedEntry`)
if (shouldUseCache) {                                              // READ skipped for gated
  const cachedHtml = getSiteCacheEntry(cacheKey);
  if (cachedHtml) return buildHtmlResponse(cachedHtml);
}
// ... and the existing `if (shouldUseCache && canCache) setSiteCacheEntry(...)` WRITE now
// also short-circuits because shouldUseCache is false for gated routes (belt + braces with
// 517-02-L03's cacheable:false).
```

**Auth-independent (anti-poisoning).** `entryRouteIsGated` MUST run regardless of the
request's authentication — a `private`/`password` entry rendered under the 517-01-L03 authed
bypass returns a STRING body that would otherwise be WRITTEN into the shared cache under the
plain path key (key does NOT vary on auth, `:888`) and then served to anonymous visitors. So
the gated route is cache-exempt on BOTH read and write for authed AND anon requests (cross-ref
517-01-L03 Security Contract — the authed-bypass render must never persist to the shared
anon-served cache).

**`entryRouteIsGated(match)` implementation.** For a `detail` match, resolve the entry's
`visibility` with the SAME read loaders the detail render uses (no new loader required):
- `:id` route → `getEntry(match.params.id)` → `visibility` (or null → not gated).
- `:slug` route → `getContentTypeBySlug(match.type)` → `getEntryBySlug(contentType.id,
  match.params.slug)` → `visibility` (or null → not gated).
Return `visibility === "private" || visibility === "password"`. A missing/non-published entry
returns `false` (the detail branch 404s without writing cache, so `false` is safe there). The
probe NEVER reads `accessPassword`.

Simplest safe policy (RECOMMENDED): treat any `private`/`password` entry route as
`shouldUseCache = false` (both read and write, both authed and anon). Only `public` entries
keep the existing 30 s public HTML cache. Avoid a per-cookie cache key (adds a shared-cache
poisoning surface); full exemption is the safest and matches "gated bodies vary per visitor".
The visibility probe is computed fresh on every detail-route request (NO memo — see H5 above).

## B. Aggregate test + gate pass (the full gate matrix)

Green ALL of:
- Root `tsc -p tsconfig.json --noEmit` (covers `tests/`, not just `core/`) AND
  `bun --cwd core lint:types` (per the typecheck-scope memory — root `tsc` catches a test
  excess-prop error `bun --cwd core lint:types` misses).
- **Bun render/route lane** (where the 517 gate tests live):
  - `tests/vitest/content/entry-visibility-gate.test.ts` (517-01-L01 resolver, Vitest —
    pure) + `tests/vitest/content/entry-unlock-token.test.ts` (517-02-L01 HMAC, Vitest).
  - `tests/integration/server/entry-access-password-hash.test.ts` (517-01-L02, Bun).
  - `tests/integration/runtime/entry-visibility-gate.test.ts` (517-01-L04, Bun): public
    renders-to-all; private 404-anon / renders-authed; uniform 404.
  - `tests/integration/runtime/entry-password-gate.test.ts` (517-02-L04, Bun): locked →
    prompt; wrong → 401 uniform (body + timing); right → 302 + cookie; unlocked → body;
    tampered / expired / cross-entry → locked; reject-unknown 400; `public_write` rate-limit.
  - `tests/integration/server/entry-visibility-public-vectors.test.ts` (517-01-L06, Bun):
    anonymous public search + static-page listing blocks omit non-`public` entries.
  - NEW `tests/integration/runtime/entry-visibility-cache.test.ts` (517-03, Bun): a `public`
    entry IS cached (2nd request served from cache); a `private` and a `password` entry are
    NOT cached (a cached unlocked body is never served to an anon/locked follow-up; the
    cache read is bypassed for gated routes). Assert via the observable behavior (e.g. a
    body-mutation-between-requests probe or a cache-instrumentation hook).
    **REGRESSION GUARD for the `shouldUseCache` reorder (REQUIRED):** because §A REPLACES the
    single `const shouldUseCache` at `:878` (consumed by the homepage `:909-911`, list `:967-969`
    and detail `:938-940` writes), assert that a PUBLIC entry-LIST route AND the HOMEPAGE still
    cache after the reorder (2nd request served from cache) — proving `routeIsGatedEntry` stayed
    false for non-`detail` matches and the reorder did not accidentally disable list/homepage
    caching.
- `bun test` re-runs the pre-existing Bun suites (confirm green; re-run named files on
  spurious timeout flakes per the typecheck/vitest-flake memory).
- `gates:coderso` (lint, security scans): the unlock util + endpoint must clear semgrep —
  NO `eval`/`new Function` in shipped source; secrets read from env only.

## C. Docs to update (517-03 owns these)

- **`_docs/SECURITY_SPEC.md`** (or the equivalent security doc) — the public entry-visibility
  gate boundary: `public`/`private`/`password` semantics, private-anon uniform-404 (no
  existence leak, including the search + listing-block vectors), password gate (server-side
  `verifyPassword`, hash never client-sent, stateless per-entry HMAC unlock cookie
  `SameSite=Strict; HttpOnly; Secure`), the `public_write` rate-limit + reject-unknown on
  `POST /entries/:id/unlock`, and the gated-entry cache-exemption (read + write).
- **`_docs/PAGE_MODEL.md` / the ENTRY model note** — clarify that `content_entries.visibility`
  + `access_password` (added by 514) are ENFORCED on the front render path by 517 (not just
  the admin editor), and how a linked detail-page runtime is also gated.
- Note the ENV requirement: `ENTRY_UNLOCK_SECRET` (dedicated, distinct from
  `FORM_SUBMIT_NONCE_SECRET`) + optional `ENTRY_UNLOCK_TTL_HOURS` / `COOKIE_SECURE` in the
  deployment/env docs.

## D. Playwright smoke (owner mandate: ≥5 real-flow scenarios PER AREA)

Per the smoke-five-scenarios memory, on the live front + admin, light + dark, 0 console
errors, screenshots to `_docs/_workflows/_smoke/`. Cover every gate state as REAL flows:
1. `public` entry renders to an anonymous visitor (and is cached — 2nd load fast/served).
2. `private` entry → anonymous gets a 404 identical to a non-existent slug; the same entry
   renders when logged into admin (gate bypass).
3. `password` entry → locked visitor sees the prompt (no body); wrong password re-prompts
   (uniform failure); correct password unlocks + the body renders; reload still unlocked
   (cookie persists within TTL).
4. Cross-entry: unlocking entry A does NOT unlock entry B (per-entry cookie).
5. Cache correctness: a private/password body is never served from the shared cache to an
   ungated visitor (open the locked page in a fresh session after someone unlocked it).
6. publish→front parity + reduced-existence-leak: verify no 401/403 distinguishes a private
   entry from a missing one, AND a private/password entry is absent from anonymous search +
   listing blocks.
Assert as computed responses / DOM state, not checklist ticks.

## E. Closure record

- Closure changelog = **`_docs/_CHANGELOG/1280-*.md`** — live changelog entries exist through
  1273 and 1274 is reserved for TASK-559, so **1280 is the pinned next-free number** (the old
  1230/1236 pins were STALE — corrected). Confirm 1280 is still free at closure (grep highest+1);
  this is the ONLY subtask that edits `_docs/_CHANGELOG/*` + `_docs/_TASKS/README.md` (statistics
  + Done move).
- Flip TASK-517 + all subtasks/leaves to `✅ Done`; update the parent subtask table.
- Record residual OPEN follow-ups explicitly (do not silently drop scope): optional captcha
  on the unlock endpoint if abuse is observed; a login-redirect alternative for `private`
  (v1 is 404-only); rate-limit-config surfacing; an admin "reset unlock cookies"/rotate
  `ENTRY_UNLOCK_SECRET` runbook note.

## Definition of done

Gated entries fully cache-exempt (read + write, no memoized fail-open); all gate-matrix tests
green (resolver, HMAC util, narrow hash loader, private render, password flow, public-vector
filters, cache exemption); SECURITY_SPEC + ENTRY/PAGE model + env docs updated; ≥5-per-area
Playwright smoke passes light + dark with 0 console errors; parent Acceptance verified LIVE;
closure documented under changelog 1280.
