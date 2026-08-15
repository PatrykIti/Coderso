# TASK-517-01-L03: Render-Path Gate Insertion + Auth/Cookie Threading

# FileName: TASK-517-01-L03-Render-Path-Gate-Insertion.md

**Parent Task:** TASK-517
**Parent Subtask:** TASK-517-01
**Priority:** High
**Category:** Public Runtime / Security / Server Routes
**Estimated Effort:** Medium
**Status:** ✅ Done
**Completed:** 2026-08-14

---

## Scope

Executable leaf. Wires the pure resolver (517-01-L01) into the live render path. Sole
writer of `core/server/publicSite.tsx` within 517-01. Two edits: (a) slot the gate into
`renderEntryDetailHtml`'s GENERIC (`content_entries`) branch only (immediately AFTER the
existing `isEntryPublished` guard, BEFORE any render call), returning `null` for
`not-found` and a prompt marker for `prompt`; (b) thread the authenticated-context flag +
the parsed unlock context into `renderEntryDetailHtml`'s options object from
`handlePublicRequest`, which holds the `Request`. The password-`prompt` decision here
returns a sentinel that 517-02 turns into an actual prompt page — in 517-01 it lands as a
placeholder that returns the uniform 404 (so 517-01 is safe/fail-closed to merge alone: an
unauthenticated password entry is withheld); 517-02 replaces the placeholder with the 200
prompt page.

**Anti-poisoning write exemption lands HERE (not deferred to 517-03).** The mandated land
order is strictly 01 → 02 → 03. If the cache WRITE exemption for gated routes were deferred
entirely to 517-03, then after 517-01 + 517-02 have both landed but BEFORE 517-03, a single
admin/authed page-view of a `private`/`password` entry would render a bare STRING body
(`renderPublicEntryDetailHtml` → `renderToString`, `publicSite.tsx:576-590`) which the caller
marks `canCache = typeof detailHtml === "string" ? true : detailHtml.cacheable` (`:937`) →
`canCache=true` → it is WRITTEN into the SHARED `siteCache` under the auth-independent key
`buildSiteCacheKey(cacheProfileId, slugPath, searchSignature.signature)` (`:888`) and then
served verbatim to anonymous visitors from the READ at `:889-894` (which runs BEFORE route
dispatch and never varies on the unlock cookie or auth). That is a LIVE fail-open window in the
shipped sequence, not hypothetical. Therefore 517-01-L03 (this leaf) MUST close the WRITE side
from the FIRST landed leaf: the gated-route (`private`/`password`) `allow` render — including
the authed/preview bypass render — MUST return the OBJECT form `{ html, cacheable: false }`
(never a bare string), so `canCache` is `false` and the authed-bypass body can NEVER persist to
the shared anon-served cache. 517-03 still owns the full READ-side exemption + the
belt-and-braces `routeIsGatedEntry` short-circuit; but the WRITE-side poisoning vector is
closed here so no window exists where an authed render of a gated entry poisons the shared
cache. (Note: the parent's "517-01 is safe/fail-closed to merge alone" is true for the ANON
path; this write-exemption is what makes it true for the AUTHED path too.)

## Grounded anchors

- `renderEntryDetailHtml(typeSlug, routeValue, options)` @ `publicSite.tsx:352`; options
  object literal @ `:355-366` (ADDITIVE SEAM — extend with `isAuthenticated?` +
  `unlockContext?`; `requestPath?`/`requestOrigin?` ALREADY exist and are threaded at the
  detail call site `:932-933`). Branch split `if (!options?.preferGenericEntry &&
  isPostContentTypeSlug(typeSlug))` @ `:370`.
  - **Post branch — NO GATE (grounded exclusion):** the post branch loads via
    `getPost`/`getPostBySlug` @ `:371`, which return `PostDetail`
    (`core/services/content/postsService.ts`) backed by the SEPARATE `posts` table. `PostDetail`
    has NO `visibility` and NO `hasPassword` field, and the `posts` table has NO
    `visibility`/`access_password` columns — those live ONLY on `content_entries`
    (`core/db/tables/content.ts:48-49`; TASK-514 was scoped to entries, never posts). Gating
    this branch would thread `visibility === undefined` through the fail-closed resolver →
    uniform 404 for EVERY post to every anonymous visitor, breaking the whole blog front-end.
    So the post-branch render (`:373` published guard → `renderPublicEntryDetailHtml({...})` @
    `:378-397`) is left UNTOUCHED. If posts are ever to be gated, the `posts` table +
    `PostDetail` + `getPost` projection must first be extended with
    `visibility`/`access_password` (a separate 514-scope task) before gating.
  - **Generic branch (the ONLY gated branch):** `getContentTypeBySlug` @ `:400`; `entryDetail`
    resolved via `getEntry(routeValue)` (`:405`, id route) or `getEntryBySlug(contentType.id,
    routeValue)` → published guard → `getEntry(entry.id)` (`:407-412`, slug route); the resolved
    `entryDetail` published guard `if (!options?.preview && !isEntryPublished(entryDetail))
    return null;` @ `:416` → INSERT gate right after, BEFORE the detail-page-runtime branch
    (`if (activeDetailPageId)` @ `:432+`) AND the default generic render
    (`renderPublicEntryDetailHtml(...)` further down). Gate DECISION runs ONCE on the resolved
    `entryDetail` (covers both sub-branches). BUT the WRITE-exemption edit is NOT one wrap — it
    touches BOTH structurally-different allow exits: (a) the linked-detail-page runtime branch
    already returns an OBJECT `{ html, cacheable: blocksAllowSiteHtmlCache(blocks) }`
    (`:521-554`, flag @ `:553`) — for a gated entry OVERRIDE `cacheable` to `false`; (b) the
    default-generic branch returns a BARE STRING from `renderPublicEntryDetailHtml`
    (`:576-590`) — for a gated entry WRAP it in `{ html, cacheable: false }`. A fixer who wraps
    only `:576` leaves gated linked-detail-page entries writing a cacheable object into the
    shared cache — the exact poisoning window Invariant #7 closes. See Hard Invariant #7 +
    pseudocode.
- Only the GENERIC `content_entries` branch's `entryDetail` carries `visibility` +
  `hasPassword` (`EntryDetail`, `entryTypes.ts:20-21`); no extra fetch needed for the gate
  decision. The post branch's `PostDetail` does NOT carry them, which is why it is excluded
  above.
- Caller emits uniform 404 when `renderEntryDetailHtml` returns `null`: the `content-detail`
  branch @ `publicSite.tsx:935` (`if (!detailHtml) return new Response("Not Found",
  { status: 404 });`). Same convention as the not-published `null` return.
- `handlePublicRequest(req)` @ `:672` HAS `req`. The dispatch was refactored into
  `resolvePublicSiteRouteTarget` (`publicSiteRoutePrecedence.ts:11-18`) + `routeTarget`
  branches: `contentRoutes = getSetting("site.contentRoutes")` @ `:916`, `match =
  matchContentRoute(slugPath, contentRoutes)` @ `:917`, `routeTarget =
  resolvePublicSiteRouteTarget(match, hasPublishedStaticPage)` @ `:920`, detail branch @
  `:922-942` (detail call @ `:926-934`, `canCache` @ `:937`, write @ `:938-940`), list branch @
  `:960-971` (list call @ `:962-965`, write @ `:967-969`). **Shared auth-seam placement
  (grounded):** the list branch (`routeTarget === "content-list"`, `:960`) and the detail
  branch (`routeTarget === "content-detail"`, `:922`) are SIBLINGS in the SAME function scope;
  517-01-L05 (lands AFTER this leaf) also needs `isAuthenticated` at the LIST call site
  (`:962`). So the session→content:read→`isAuthenticated` boolean + the `cookies` local MUST be
  derived ONCE, HOISTED ABOVE the `routeTarget` branches (at/above `:916`, where
  `contentRoutes`/`match` are resolved) — NOT inline immediately before the detail call — so
  BOTH the list call site (`:962`, L05) and the detail call site (`:926`, this leaf) read the
  same in-scope `isAuthenticated`/`cookies`. This is the single shared writer seam L05 consumes;
  see Hard Invariant #8.
- Cookie parsing precedent: `parseCookies(header)` is a module-LOCAL `const` in
  `httpServer.ts:95` and duplicated in `publicFormsApi.ts:179` and `publicBookingApi.ts:239` —
  **NOT importable** (grep-verified: `export.*parseCookies` → empty). Likewise
  `buildHeadersRecord` is a private local `const` (`publicFormsApi.ts:198`,
  `publicBookingApi.ts:254`) and is NOT exported. `publicSite.tsx` does not currently import
  either. So the implementer must EITHER (a) export one canonical `parseCookies` +
  `buildHeadersRecord` (e.g. from `httpServer.ts` or a shared util) and import them, OR (b) add
  a small local copy of each inside `publicSite.tsx` (mirroring the existing private copies) —
  confirm no name collision first. Do NOT present them as ready-to-import.
  `attachUserFromSession` (`middleware/auth.ts:15`) IS exported and importable;
  `SESSION_COOKIE_NAME` (`sessionService.ts:16`) IS exported. The `resolveSessionUser` SHAPE at
  `publicBookingApi.ts:262-272` is grounded precedent but is itself a private local — only the
  shape is reused, not the symbol.
- Authenticated-render context: `handlePublicRequest` is the public raw Bun handler and
  currently has NO session/admin derivation on the content-route path — the preview-token
  bypass at `:763`/`:803` is a SEPARATE token-gated `/preview` route (`validatePreviewToken`),
  NOT a session, so it cannot supply an `isAuthenticated` flag for a normal content-route GET.
  There is NO `isAuthenticatedAdminRequest` helper anywhere in `core/` (grep-verified empty).
  The REAL request→session precedent on the public path is `attachUserFromSession(ctx)`
  (`core/server/middleware/auth.ts:15`), driven via a `resolveSessionUser`-style wrapper that
  builds `{ headers: buildHeadersRecord(req), cookies: parseCookies(...) }` and reads `ctx.user`
  — grounded at `core/server/publicBookingApi.ts:262-272` (session cookie name
  `SESSION_COOKIE_NAME = "session"`, `sessionService.ts:16`). 517-01-L03 INTRODUCES the small
  local derivation here at the content-route call site (build the auth context →
  `attachUserFromSession` → resolve `getUserPermissions(ctx.user.id)` →
  `isAuthenticated = hasPermission(perms, "content:read")`); the session→permission→bool
  derivation is done at the call site, NOT inside the pure resolver. `getUserPermissions`
  (`roleService.ts:91`) + `hasPermission` (`roleService.ts:54`) are exported/importable.
- **Bypass MUST be permission-bounded — `Boolean(user)` alone is a FAIL-OPEN escalation
  (grounded, MANDATED fix):** `attachUserFromSession` (`auth.ts:15-39`, verified) resolves
  `ctx.user` for ANY user whose `status==='active'` with a valid `session` cookie — there is NO
  role/permission check in that path. So `isAuthenticated = Boolean(authCtx.user)` would bypass
  the gate for EVERY logged-in user regardless of RBAC role. A doc-only assertion that "`session`
  is admin/editor-only" is NOT acceptable for this fail-closed security gate: the moment any
  future feature issues a `session` cookie to a customer/low-privilege account (a common
  evolution), every `private` (and unlock-less `password`) entry body silently leaks on the
  public front, with no code guard to catch it. This is the ONE path where a gated BODY renders
  without the gate refusing it, so it must be hardened in code, not documentation. Therefore
  517-01-L03 MUST resolve the session user's PERMISSION at the content-route call site and set
  `isAuthenticated` ONLY when the user holds the editor/admin content-read capability — NOT bare
  `Boolean(user)`. The grounded machinery already exists: after `attachUserFromSession(authCtx)`
  sets `authCtx.user`, resolve `getUserPermissions(authCtx.user.id)` (`roleService.ts:91`) and
  require `hasPermission(perms, "content:read")` (`roleService.ts:54`) — the exact permission
  slug the admin content routes gate on (`detailPageRoutes.ts:100`
  `requirePermission("content:read")`). Equivalently reuse the `requirePermission("content:read")`
  shape (`rbac.ts`) — but on the public path do NOT throw on failure; simply leave
  `isAuthenticated = false` so a non-content-read session falls through to the fail-closed
  404/prompt. The `content:read`-scoped bypass is REQUIRED; the "document the invariant only"
  branch is REMOVED. See Hard Invariant #6.

## Implementation pseudocode

```ts
// publicSite.tsx — extend the options type (additive):
options?: {
  preview?: boolean;
  previewDevice?: DeviceTarget;
  themeName?: string;
  preferGenericEntry?: boolean;
  routeParam?: "slug" | "id";
  detailPageId?: string | null;
  contentRoutes?: ContentRouteSetting[];
  runtimeSearchParams?: URLSearchParams;
  requestPath?: string | null;                       // ALREADY EXISTS (threaded @ :932) — the prompt's returnPath
  requestOrigin?: string | null;                     // ALREADY EXISTS
  isAuthenticated?: boolean;                         // NEW: admin/preview render bypasses the gate
  unlockContext?: { hasValidUnlockFor: (entryId: string) => boolean }; // NEW (517-02 fills this)
}

// small local helper for the generic-branch gate (covers the linked-detail-page AND
// default-generic sub-branches off the one resolved entryDetail):
const gateOrNull = (
  entry: { id: string; visibility?: string | null; hasPassword?: boolean },
  opts: typeof options
): EntryGateDecision => resolveEntryVisibilityGate({
  visibility: entry.visibility,
  hasPassword: Boolean(entry.hasPassword),
  isAuthenticated: Boolean(opts?.preview || opts?.isAuthenticated),  // preview == authorized
  hasValidUnlock: Boolean(opts?.unlockContext?.hasValidUnlockFor?.(entry.id)),
});

// POST branch — NOT GATED. `PostDetail` (posts table) has no visibility/hasPassword, so the
// gate does NOT apply here; leave the :370-397 post render untouched (gating it would 404
// every post for anon visitors). See Grounded anchors.

// GENERIC branch (after :416 entryDetail published guard, before the detail-page-runtime
// branch and the default generic render) — the ONLY gate insertion point besides the
// entry-by-id/slug sub-branch it covers:
{
  const decision = gateOrNull(entryDetail, options);
  if (decision.kind === "not-found") return null;
  if (decision.kind === "prompt") return renderEntryPasswordPromptResult(entryDetail, options, options?.requestPath); // requestPath = same-origin detail path (517-02-L03)
  // allow → existing render logic unchanged, EXCEPT: for a GATED entry (private/password) the
  // allow render MUST NOT persist to the shared cache. The gate DECISION is taken ONCE here, but
  // the write-exemption edit touches BOTH structurally-different allow exits off this one
  // entryDetail — they are NOT one string return:
  const entryIsGated = entryDetail.visibility === "private" || entryDetail.visibility === "password";

  // EXIT (a) — linked detail-page runtime branch (:521-554) ALREADY returns an OBJECT
  //   `{ html, cacheable: blocksAllowSiteHtmlCache(blocks) }` at :553. Here you must OVERRIDE
  //   the cacheable flag to false for a gated entry (do NOT trust blocksAllowSiteHtmlCache,
  //   which can be true):
  return {
    html: await renderPublicPageRuntimeHtml({ /* ...existing args... */ }),
    cacheable: entryIsGated ? false : blocksAllowSiteHtmlCache(blocks),   // :553 override
  };

  // EXIT (b) — default-generic render (:576-590) returns a BARE STRING from
  //   renderPublicEntryDetailHtml. Here you must WRAP it in the object form for a gated entry:
  const renderedHtml = renderPublicEntryDetailHtml({ /* ...existing args... */ }); // string, :576-590
  return entryIsGated ? { html: renderedHtml, cacheable: false } : renderedHtml;
  // Public entries at BOTH exits: return exactly as today (bare string / real cacheable flag; canCache stays true).
}

// ── SHARED AUTH SEAM (HOISTED ABOVE the routeTarget branches, at/above :916) ─────────────────
// Canonical head-of-handlePublicRequest ordering shared by L03 / L05 / 517-03 (see Hard
// Invariant #8): resolve `cookies` + the content:read `isAuthenticated` boolean ONCE, ABOVE
// the `contentRoutes`/`match`/`routeTarget` resolution and BEFORE the routeTarget branches —
// NOT inline at :926 — precisely so 517-01-L05 can read the SAME in-scope `isAuthenticated` at
// the LIST call site (:962). A single writer owns this derivation; L05 consumes it, never
// re-derives it.
//
// Session derivation mirrors publicBookingApi.ts:262-272 (attachUserFromSession); there is
// NO pre-existing isAuthenticatedAdminRequest helper — this is the derivation, introduced here.
// NOTE: parseCookies + buildHeadersRecord are file-LOCAL non-exported consts elsewhere
// (httpServer.ts:95 / publicFormsApi.ts:179,198 / publicBookingApi.ts:239,254) — NOT importable
// into publicSite.tsx. Either export a canonical pair and import, or add a small local copy of
// each here (mirroring the existing private copies). attachUserFromSession + SESSION_COOKIE_NAME
// ARE exported/importable. See Grounded anchors.
const cookies = parseCookies(req.headers.get("cookie") ?? "");     // local/exported copy — see note
const authCtx = { headers: buildHeadersRecord(req), cookies };      // same shape as resolveSessionUser (buildHeadersRecord: local/exported copy)
await attachUserFromSession(authCtx);                               // core/server/middleware/auth.ts:15
// PERMISSION-BOUNDED bypass (MANDATED — bare Boolean(user) is fail-open, see Hard Invariant #6):
// Boolean(authCtx.user) is true for ANY active-session user (auth.ts:15-39 has NO role check),
// so it would leak private/password bodies to any future non-admin session. Instead resolve the
// user's content-read capability and bypass ONLY for editor/admin content-read holders. Do NOT
// throw on failure here (public path) — just leave isAuthenticated=false so the gate stays
// fail-closed for non-privileged sessions.
let isAuthenticated = false;
if (authCtx.user) {
  const perms = await getUserPermissions(authCtx.user.id);         // core/services/auth/roleService.ts:91
  isAuthenticated = hasPermission(perms, "content:read");          // roleService.ts:54; same slug as detailPageRoutes.ts:100
}
// (contentRoutes + match are also resolved here / above the cache read once 517-03 lands its
//  hoist — see 517-03 §A + Hard Invariant #8. This leaf only requires the auth seam above the
//  routeTarget branches; it does NOT itself move contentRoutes/match above the cache read.)
// ── END SHARED AUTH SEAM ──────────────────────────────────────────────────────────────────

// ...then in the list branch (:962, filled by 517-01-L05) the LIST call site reads this same
// `isAuthenticated`; and here at the detail call site (:926) it is threaded into the detail render:
const detailHtml = await renderEntryDetailHtml(match.type, slug, {
  themeName,
  routeParam: match.params.slug ? "slug" : "id",
  detailPageId: match.detailPageId,
  contentRoutes,
  runtimeSearchParams: url.searchParams,
  requestPath: slugPath,                                            // ALREADY threaded @ :932 — the prompt form's returnPath
  requestOrigin: url.origin,
  isAuthenticated,
  unlockContext: buildEntryUnlockContext(cookies),                   // 517-02 provides; 517-01 stub → hasValidUnlockFor:()=>false
});
if (!detailHtml) return new Response("Not Found", { status: 404 });  // :935
```

**517-01 vs 517-02 seam.** In 517-01, `renderEntryPasswordPromptResult(entry, options,
requestPath)` is a **3-arg** placeholder that returns `null` (→ uniform 404) and IGNORES the
`requestPath` it already receives; `buildEntryUnlockContext` always yields
`hasValidUnlockFor: () => false`. This makes 517-01 fail-closed and safe to land alone: a
password entry is withheld (404) until 517-02 lands the real prompt page + real
cookie-verification. **The signature is 3-arg FROM THIS LEAF (517-01-L03), and the gate-insertion
call site passes `options?.requestPath` from L01 onward (see pseudocode above)** — precisely so
517-02-L03 only swaps the placeholder BODY, never the signature and never the call site, honoring
517-02-L03 Hard Invariant #5 ("fills ONLY the two named seams … does NOT re-edit the gate
insertion"). 517-02 is the SOLE writer that replaces these two seams with real implementations —
517-01-L03 defines their (final, 3-arg) signatures so 517-02 slots in without editing the gate
insertion again. The `requestPath` plumbing (the ALREADY-EXISTING `requestPath?` option on
`renderEntryDetailHtml` + the `options?.requestPath` argument at the call site) requires NO new
option key in THIS leaf — it is already threaded at `:932` — so it works end-to-end the moment
517-02 fills the body.

## Security Contract (restatement — route-touching)

- **Endpoint visibility:** public (`renderEntryDetailHtml` on the public dispatch).
- **Fail-closed:** `not-found` → `null` → uniform 404 (byte-identical to not-published);
  unknown visibility → `not-found` (resolver). Preview/admin (`opts.preview ||
  opts.isAuthenticated`) → bypass. Password without valid unlock → withheld (`prompt`,
  which in 517-01 is a placeholder 404, in 517-02 the 200 prompt page — the body is NEVER
  rendered without a valid unlock).
- **No existence leak:** private-anon and locked-password-without-unlock never render the
  body; private-anon is 404-uniform.
- **No hash access on the render path:** the gate reads only `visibility` + `hasPassword`
  (loader-derived); the hash is never fetched here.
- **Cache-exempt WRITE lands HERE, regardless of authentication (anti-poisoning):** a
  `private`/`password` entry rendered under the authed/preview bypass returns a STRING body from
  `renderPublicEntryDetailHtml` (`:576-590`), which the caller would otherwise mark
  `canCache = typeof detailHtml === "string" ? true : detailHtml.cacheable` (`:937`) → `true`
  → WRITE into the SHARED public cache under the plain path key (key =
  profileId+path+searchSignature @ `:888` — it does NOT vary on auth), then serve to anonymous
  visitors from the READ at `:889-894`. This leaf CLOSES the WRITE side from the first landed
  leaf: the gated (`private`/`password`) `allow` render — INCLUDING the authed/preview bypass —
  returns the OBJECT form `{ html, cacheable: false }` (never a bare string), so `canCache` is
  `false` and the authed-bypass body can NEVER persist to the shared anon-served cache. This is
  NOT deferred to 517-03 (deferring it would leave a live poisoning window after 01+02 land but
  before 03). 517-03 still owns the full READ-side exemption + the belt-and-braces
  `routeIsGatedEntry` short-circuit (read + write, auth-independent); this leaf owns the WRITE
  exemption so the sequence is safe at every land step. Cross-reference: 517-03 §A.
- **Rate-limit / validation:** N/A for the render path (GET); the write path
  (unlock submit) carries `public_write` + reject-unknown in 517-02.

## Regression-test shape

- Covered by 517-01-L04 (Bun render tests: public renders, private 404-anon,
  private-authed [content:read] renders, password-anon withheld). This leaf's own change is
  validated through those render tests + typecheck; no separate unit file.
- **REQUIRED (not optional) assertions in L04:** (i) a session user WITHOUT `content:read` does
  NOT bypass — a `private` entry still 404s for that session (permission-bounded bypass, Hard
  Invariant #6); (ii) cache non-write for BOTH a linked-detail-page gated entry (exit a, `:553`)
  AND a default-generic gated entry (exit b, `:576-590`) under the authed bypass (Hard Invariant #7).
- **Lane:** Bun (`tests/integration/runtime/*` render tests driving `handlePublicRequest`,
  alongside `detail-page-runtime.test.ts` / `redirects-runtime.test.ts` — see 517-01-L04;
  the 517 gate test file is NEW under that existing dir).

## Hard Invariants

1. Gate inserted AFTER the `isEntryPublished` guard, BEFORE any render call, on the GENERIC
   `content_entries` branch ONLY (covering linked-detail-page AND default-generic). The POST
   branch is NOT gated — `PostDetail`/`posts` has no visibility/access_password model, so
   gating it would 404 every post for anon visitors.
2. `not-found` → `null` → uniform 404; `allow` for a PUBLIC entry → existing render path
   unchanged (bare string); `allow` for a GATED (`private`/`password`) entry → same render body
   but returned as `{ html, cacheable: false }` so it never persists to the shared cache; `prompt`
   → 517-02 prompt (517-01 placeholder → uniform 404, fail-closed).
3. Auth + unlock context threaded via the ADDITIVE options seam from `handlePublicRequest`;
   the pure resolver never touches `req`/cookies.
4. `public` entries render byte-identical to today (no behavior change) and keep `canCache=true`.
5. Sole writer of `publicSite.tsx` within 517-01; 517-02 only fills the two named seams.
6. **Bypass is permission-bounded (MANDATED — no document-only branch):** `isAuthenticated` MUST
   be set ONLY when the session user holds the `content:read` capability, resolved in code via
   `getUserPermissions(user.id)` + `hasPermission(perms, "content:read")` (`roleService.ts:91`/`:54`,
   the same slug the admin content routes gate on, `detailPageRoutes.ts:100`) — NEVER bare
   `Boolean(user)`. `attachUserFromSession` (auth.ts:15-39) applies NO role check, so bare
   `Boolean(user)` is a FAIL-OPEN escalation the moment any `session` cookie is issued to a
   non-admin/customer account. A doc-only "session is admin-only" assertion is NOT an acceptable
   remediation and is REMOVED — this fail-closed gate must refuse the bypass in code. The L04
   render test that a NON-content-read session does NOT bypass (still 404/prompt) is a REQUIRED
   (not optional) assertion. Never grant the private/password bypass to a bare "any logged-in user".
7. **Write-side cache exemption lands in THIS leaf, not 517-03, at BOTH allow exits:** the gated
   `allow` render (including the authed/preview bypass) must never persist to the shared cache.
   This is TWO edits, not one: (a) at the linked-detail-page runtime object return (`:553`) set
   `cacheable: false` for a gated entry (OVERRIDE `blocksAllowSiteHtmlCache(blocks)`, which may be
   true); (b) at the default-generic string return (`:576-590`) WRAP the string in
   `{ html, cacheable: false }`. Both make `canCache` (`:937`) false so the authed-bypass body
   can NEVER be written to the shared anon-served cache — closing the poisoning window that would
   otherwise exist after 01+02 land but before 03. The L04 render tests MUST assert cache
   non-write for BOTH a linked-detail-page gated entry AND a default-generic gated entry under the
   authed bypass. 517-03 adds the READ-side exemption + `routeIsGatedEntry` short-circuit on top.
8. **Shared auth seam — the `isAuthenticated`/`cookies` derivation is placed ONCE ABOVE the
   `routeTarget` branches (at/above `:916`), NOT inline at `:926`:** the list branch
   (`routeTarget === "content-list"`, `:960-971`) sits as a SIBLING of the detail branch
   (`:922-942`), and 517-01-L05 (lands AFTER this leaf) reads `isAuthenticated` at the LIST call
   site (`:962`). If this leaf declared `isAuthenticated`/`cookies` inline just before the detail
   call (`:926`), L05 could not reference it at `:962` (declared-in-a-different-branch-scope) and
   would be forced to re-edit this leaf's derivation — violating the single-writer intent.
   Therefore the session→content:read→`isAuthenticated` boolean + the `cookies` local are derived
   ONCE, hoisted above the `routeTarget` branches, so BOTH the list call site (`:962`, L05) and
   the detail call site (`:926`, this leaf) consume the same in-scope values. This is the CANONICAL
   head-of-`handlePublicRequest` ordering shared by L03 / L05 / 517-03: resolve `cookies` +
   `isAuthenticated` ONCE (517-03 additionally HOISTS `contentRoutes`/`match` above the cache READ
   at `:889` for `routeIsGatedEntry`), THEN the list (L05) and detail (this leaf) branches consume
   `isAuthenticated`. Because L03 (+ L05) land BEFORE 517-03 and already restructure this head
   region, the pristine `:916`/`:917`/`:920` anchors 517-03 cites will have SHIFTED by the time it
   runs — 517-03 must re-ground against the post-L03/L05 layout, not the pristine line numbers.
   This leaf itself only requires the auth seam above the routeTarget branches; it does not move
   `contentRoutes`/`match` above the cache read (that is 517-03's hoist).
