# TASK-540-05: Responsive Canvas, ARIA, and User Preferences

# FileName: TASK-540-05-Responsive-Canvas-Aria-And-User-Preferences.md

**Parent Task:** TASK-540
**Priority:** Medium
**Category:** Custom Screens / Responsive UI / Accessibility / User Settings
**Estimated Effort:** Medium
**Dependencies:** TASK-540-04
**Status:** 🚧 In Progress
**Started:** 2026-07-14
**Implementation Complete:** 2026-07-14 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Corrective Revalidation:** 2026-07-14 — L02 exact Vitest matrix 65/65, exact Bun matrix 27/27 after reachable DB preflight, core/root static gates green, and fresh post-audit zero findings
**Previous Completion:** 2026-07-14
**Reopened:** 2026-07-14
**Changelog:** 1252 (pinned; closure only)

---

## Scope

Remove unconditional 300 px Screen-canvas clearance at narrow widths while
preserving the scroller's existing `p-6 lg:p-8` gutters, give the shared labelled
panel a valid landmark role, and move Screen entry preferences from a global
localStorage key to the existing authenticated per-user settings service without
a migration or new endpoint. The existing central HTTP error boundary must map
the user-settings service's two machine-readable validation errors to deterministic
400 responses and the optional expected-owner mismatch to deterministic 409 instead
of the generic 500 fallback. The isolated client transport
must runtime-normalize the exact response key/value envelope before any value enters
the per-user coordinator; a TypeScript generic is not response validation.
The expected-owner PATCH header is a server-required CORS header: middleware unions it
case-insensitively with configured allowed headers so trusted cross-origin Admin origins
work with both default and already-persisted security settings.

## Leaves and order

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-05-L01 | Keep Screen canvas usable and ARIA-valid | `ScreenAuthoringCanvas.tsx`, `CanvasEditor.tsx` | 🚧 In Progress |
| TASK-540-05-L02 | Scope Screen preferences through user settings | exact Bun-free preference/auth-identity contracts + route-persistent auth provider + user-settings service/client/route + Screen hook + narrow central HTTP error mapping | 🚧 In Progress |

## Security Contract

Canvas changes are local UI only.

- **Visibility/endpoints:** preference transport remains internal session-admin traffic
  on exactly `GET /admin/api/user-settings`,
  `GET /admin/api/user-settings/:key`, and
  `PATCH /admin/api/user-settings/:key`. No endpoint is added or made public.
- **Authentication/RBAC:** the HttpOnly authenticated session is the only auth model,
  and server-derived `ctx.user.id` is the sole read/write owner. User settings are
  self-scoped and require no additional RBAC permission; this task adds neither an
  API-key path nor any permission widening.
- **CSRF/rate limits:** PATCH remains CSRF-protected. Both GET routes are classified as
  `admin_read`; PATCH is classified as `admin_write`. The shared authenticated-admin
  rate-limit bypass remains unchanged, so successful session requests are not claimed
  to consume those counters.
- **Validation/anti-abuse:** PATCH keeps the strict reject-unknown `{value}` envelope;
  the service also rejects unknown setting keys and unknown value keys, versions, or
  types. There is no public write, so nonce, signature/HMAC, and CAPTCHA do not apply.

`user_settings_key_invalid` and `user_settings_value_invalid` preserve those exact
response codes and map to HTTP 400 at the central boundary. The existing PATCH route
accepts an optional
`X-Coderso-Expected-User-Id`; every Screen write sends captured A, and authenticated B
plus expected A returns exact `user_setting_identity_changed`/409 before persistence.
Header omission preserves legacy clients and the session remains the sole write scope.
Preference data is a non-secret boolean/version record; no localStorage content or
migration is added. Auth identity is also a write-dispatch boundary published by the
route-persistent `AdminAuthProvider`, not a Screen hook: a write queued for user A may
reach the network only while the
captured A identity epoch is current. Sign-out, A→B, or provider unmount invalidates
undispatched A work even when every Screen consumer is unmounted. An already-dispatched
A response may settle but cannot publish into B. Malformed, unknown-key, wrong-key, or
invalid-value GET/PATCH responses fail closed without exposing raw transport data.
When no authenticated user exists, the hook keeps only a mount-local ephemeral
preference value: it starts OFF, may be toggled for that mounted UI, emits no transport
or storage operation, and resets to OFF on a fresh hook remount.

## Acceptance

- At 320/390/480 px the scroller keeps `24px` left/right padding whether the
  panel is open or closed, the open panel remains inside the viewport, and the
  canvas has non-zero usable content geometry.
- At 1024 px and wider the closed right padding is `32px`; the open class is
  `lg:pr-[332px]`, so the border-box stays fixed and the content box loses
  exactly `300px` (within 1 CSS px) when the panel opens.
- The panel's accessible name is attached to `role="region"`.
- Preference state follows the authenticated server user; switching users cannot
  inherit another user's flag. Returning to the same user in one mounted session
  may reuse only that user's keyed in-memory value while authoritative revalidation
  runs. An unchanged per-user write generation lets that read replace stale same-user
  optimism; a local toggle made after the read began increments the generation and
  wins over the delayed response. A write waiting behind another A write never
  dispatches after sign-out, provider unmount, or an A→B identity-epoch change,
  including when the final Screen consumer unmounted before the change. The CSRF GET
  may finish after abort, but every subsequent PATCH/retry receives the already-aborted
  signal and emits zero PATCHes. Cancellation/failure releases queue authority; a
  failed PATCH retries only after one fresh setter action. Unauthenticated/unavailable
  service writes no global browser key. With no authenticated user, the visible switch
  starts OFF, one setter action toggles the hook-mount-local ephemeral value, and a full
  hook remount resets it to OFF with zero GET/PATCH/storage calls.
- Isolated GET and PATCH accept only the requested key plus the strict versioned
  preference value. Malformed JSON, a non-object envelope, unknown envelope/value
  keys, a mismatched key, wrong version, or wrong value type is a handled failure and
  remains retryable; no response-derived optimistic or hydrated value is published.
  For a malformed PATCH response, the already-normalized local per-user intent remains
  visibly optimistic but marked unsynced; it never auto-replays and only a later
  explicit setter action creates a retry. A rejected or malformed GET evicts its exact
  registry entry without an in-mount retry loop; a fresh remount or identity revisit
  performs one fresh GET.
- Once a settled coordinator snapshot is identity-guardedly pruned, an A→B→A return
  inside the same mounted hook session may keep visible only its hook-local copy of
  that identity's latest exact shared settled snapshot while a fresh current-epoch GET
  runs; it never paints a superseded keyed value or the default over that copy. A
  brand-new remount after global prune starts from the default/unhydrated contract and
  issues a fresh GET. The bounded handoff path still prevents a flash while an eligible
  shared snapshot remains retained.
- Real HTTP tests prove session-derived self-scope, strict envelope rejection,
  PATCH CSRF, `admin_write` bucket selection, and deterministic 400 mapping for
  both user-settings validation codes. A direct session-B PATCH with expected user A
  proves exact 409 and no settings write; a header-omitted legacy request still works.
  They inventory the exact access-log rows
  emitted by their synthetic sessions/requests. Every suite request, including the
  unauthenticated cases, carries one unique non-secret exact User-Agent marker so its
  otherwise unscoped 401/403 log rows remain ownable. Because access-log writes are
  fire-and-forget, every suite fetch goes through one tracked helper that records its
  completed `{method,path,status,userId,sessionId}` expectation. After server close, a
  bounded candidate query by exact marker plus exact synthetic user/session UUIDs must
  equal that request ledger in count and full multiset, including duplicate requests.
  The same sorted exact row-UUID array must then remain unchanged for at least three
  polls separated by 50 ms and a minimum 250 ms quiet window (5-second deadline).
  Missing, extra, wrong-identity/status/path, changed, or late rows remain explicit test
  failures, but mismatch validation is separate from `finally` cleanup. Cleanup deletes
  only the exact UUID inventory; any later exact-scope owned row is also deleted only by
  its newly observed UUID while preserving a late-row failure. The candidate query must
  then be exactly empty for at least three cadence-separated polls across another 250 ms
  quiet window before settings/session/user deletion and before the retained behavior
  error is rethrown. No wait exceeds 50 ms; no truncation, prefix-wide delete, or
  predicate-wide delete is allowed.
  Normal fire-and-forget convergence before the first complete ledger equality is not
  classified as late. A mixed owned/out-of-scope observation retains a scope failure,
  drains only the exact owned UUIDs, leaves the out-of-scope row untouched, proves
  owned-scope absence, then reports the failure. Validation, late-row, and cleanup
  errors have deterministic ordered aggregation so cleanup never masks behavior drift.

## Required proof

- Bun-free client/hook/UI tests cover strict response normalization, handled
  failure→fresh-action retry, rejected GET→fresh-remount/identity-visit retry, pending A
  write plus queued A write followed by Screen-consumer unmount and provider A→B (the
  queued PATCH hit count stays zero), stale in-flight completion rejection,
  same-mounted-session prune→A→B→A retaining only the latest exact shared-settled
  hook-local copy, a brand-new post-prune remount starting default/unhydrated with a
  fresh GET, no-user OFF→toggle→remount-reset with zero transport/storage, a single
  identity event/epoch for provider A→B with no transitional null, and malformed PATCH
  retaining only the normalized local unsynced intent until an explicit setter retry.
- The real `startHttpServer` suite owns session/CSRF/rate-limit/error-boundary proof
  and task-scoped access-log ledger/acquisition/quiescence/cleanup. Its deterministic
  helper tests cover exact success plus missing, extra/duplicate, wrong signature or
  marker/identity, late UUID, post-dispatch fetch rejection, and post-delete
  reappearance failures. They also pin the tracked-request ledger behavior and prove
  each failure path still drains all exact owned UUIDs before rethrowing while an
  out-of-scope row is never deleted.
  Runtime HTTP behavior remains in Bun; the pure transport/coordinator/UI contract
  remains in Vitest.

## Validation floor

Run both leaf-specific gates, `bun --cwd core lint:types`, `bun --cwd core lint`, and
the root TypeScript contract explicitly with:

```bash
./node_modules/.bin/tsc -p tsconfig.json --noEmit
```
