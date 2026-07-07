# TASK-517: Entry Visibility — Public Front Enforcement

# FileName: TASK-517_Entry_Visibility_Front_Enforcement.md

**Priority:** High
**Category:** Content / Security / Public Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-514 (Entries editor — ships the `content_entries.visibility` model:
`public` | `private` | `password` + hashed `access_password`, persisted + surfaced in admin,
respected in the admin editor only; front enforcement was explicitly DEFERRED to this task)
**Status:** ⏳ To Do
**Started:** 2026-07-06

---

## Overview

TASK-514 adds a per-entry **visibility** field (`public` | `private` | `password`) and a
write-only hashed `access_password`, and its owner-confirmed scope was
**persist + surface + respect-in-admin** with the public front-render enforcement
**deferred to a dedicated task** (this one) so 514 stays a UI/UX + model task and the
security-sensitive render-path gating gets its own focused contract, tests, and audit.

TASK-517 enforces visibility on the **public render path** so non-public entries are
actually protected when served to visitors:

- **`public`** — unchanged: rendered to everyone.
- **`private`** — requires an authenticated session (an admin/logged-in user). An
  anonymous request gets a fail-closed response (404 to avoid leaking existence, or a
  login redirect — decide in the contract; default **404** to not reveal private slugs).
- **`password`** — a password-prompt gate: the entry body is withheld until the visitor
  submits the correct password, verified against the entry's hashed `access_password`
  via the existing `verifyPassword` helper; a short-lived signed cookie/token then
  unlocks it for the session (no plaintext password stored client-side; the hash is
  never sent to the client).

## Coordination (pinned facts)

- **Changelog number:** closure creates `_docs/_CHANGELOG/1230-*.md` (1230 is the next
  free after 511=1229; 1224–1228 = 512–516, 1223 = 480). Only the closure subtask edits
  `_docs/_TASKS/*` + `_docs/_CHANGELOG/*`.
- **Branch/worktree:** dedicated `feature/task-517` worktree, branched from the
  post-514-merge `feature/tasks` HEAD (517 depends on 514's shipped model — do NOT start
  before 514 is merged; a fresh pre-implementation audit re-grounds 514's real column +
  helper names first).
- **No DB migration of its own** — reuses 514's `content_entries.visibility` +
  `access_password` columns. If a signed-unlock token needs storage, prefer a stateless
  signed cookie (HMAC, like the existing preview-token / nonce patterns) over a new table.
- **Shared REMOTE test DB** — scoped fixtures, no truncation; front-render tests drive the
  render path with seeded entries + clean up their own rows.

## Security Contract

- **Endpoint visibility:** public — this changes the PUBLIC entry render path
  (`core/site/renderPublicEntry.tsx` detail render + the `publicSite.tsx` entry-detail
  dispatch, incl. the post-content-type + generic-entry-detail branches) and adds a public
  **password-submit** endpoint for the `password` gate.
- **Fail-closed:** unknown/unresolved visibility → treat as the most restrictive; never
  render a `private`/`password` body without passing the gate. `private` anonymous →
  404 (no existence leak). Preview/admin render bypasses the gate (already authenticated).
- **Password gate:** verify submitted password against `access_password` hash server-side
  (`verifyPassword`); the hash is NEVER sent to the client. On success, set a short-lived
  **HMAC-signed** unlock cookie/token scoped to that entry id (reuse the forms/booking
  nonce/HMAC pattern — no weaker one-off). The submit endpoint is a public write:
  `public_write` rate-limit bucket + strict reject-unknown validation + bot/DNT-neutral;
  consider the optional captcha policy if abuse is a concern.
- **No secret/PII leak:** never expose whether a private entry exists (uniform 404),
  never expose the password hash, never cache a gated body in a shared/public cache.
- **Caching:** `private`/`password` entries must be excluded from the public HTML cache
  (or cached per-unlocked-session only) — a gated body must never be served from a shared
  cache to an ungated visitor.

## Sub-Tasks (to be broken down at authoring)

| ID | Title | Priority | Effort | Status |
|----|-------|----------|--------|--------|
| TASK-517-01 | Visibility resolver + private auth-gate on the public render path | High | Medium | ⏳ To Do |
| TASK-517-02 | Password-gate: submit endpoint + HMAC unlock cookie + prompt UI | High | Medium | ⏳ To Do |
| TASK-517-03 | Cache exclusion, tests (gate matrix) + docs & closure | Medium | Medium | ⏳ To Do |

Land order strictly sequential 01→02→03. Each subtask carries execution-ready pseudocode,
a Security Contract restatement (route-touching), correct test lanes (Bun for the render/route
path), and shared-DB safety. Run the standard pipeline (author → drift-audit → sequential
implement with gates → post-audit → runtime smoke of every gate state: public renders,
private 404-anon / renders-authed, password prompt → wrong → right → unlocked) before closure.
