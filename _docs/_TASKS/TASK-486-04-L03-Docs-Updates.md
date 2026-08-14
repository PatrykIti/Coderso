# TASK-486-04-L03: Docs Updates (CMS_API / SECURITY_SPEC / ARCHITECTURE)
# FileName: TASK-486-04-L03-Docs-Updates.md

**Parent Subtask:** TASK-486-04
**Priority:** Medium
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Small
**Dependencies:** TASK-486-01-L03, TASK-486-03-L02
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Publish the new public contract in the source-of-truth docs so the
  endpoint, security model, and runtime delivery path are discoverable and the
  stale "engagement is internal-only" note is corrected.
- **Owning module(s) to create-or-extend:** `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/ARCHITECTURE.md`.
- **Source-of-truth docs:** the three files above (they ARE the targets).
- **Out of scope:** code/tests; the task board README (the orchestrator syncs
  it); changelog **1272** (pinned in the umbrella; created at closure by the
  program, not here — 1268..1271 are reserved for 489/555/556/557).

---

## Security Contract

No endpoint or permission model changes — documentation only. It records (does
not alter) the TASK-486-01-L03 contract.

---

## Implementation Pseudocode

Edits (prose, not code):

1. **`_docs/CMS_API.md`** — in the "Coderso Engagement" section:
   - Add a **Public API** subsection:
     - `GET /api/popups?path=<pathname>` → `{ items: PublicPopup[] }`.
     - Document `PublicPopup` = `{ id, slug, trigger, frequency, content,
       settings }` (note the deliberate omission of `name`/`status`/`targeting`/
       timestamps).
     - State: anonymous read, `public_read` rate-limit, audience resolved from
       session, published-only, server-side path/audience targeting.
   - **Correct** the existing note "v1 engagement routes are internal-only (no
     public `/api/popups` / `/api/reviews` routes)" → popups now expose a public
     read route; reviews remain internal-only.

2. **`_docs/SECURITY_SPEC.md`** — in the rate-limit / public-surface section:
   - Add popups `GET /api/popups` to the `public_read` bucket list.
   - Record the **no-PII output contract** (`toPublicPopup` projection) and that
     audience is server-derived (never client-asserted).
   - Add the **forward guard**: any future popup impression/dismissal write MUST
     use `public_write` + nonce+HMAC (forms/booking evaluators) + optional
     reCAPTCHA.

3. **`_docs/ARCHITECTURE.md`** — in the public-site runtime list:
   - Add the popup public-runtime delivery path: `GET /api/popups`
     (server-side targeting) → injected static IIFE (`buildPopupRuntimeScript`,
     cache-safe) → client engine (triggers/frequency) → `renderPopup`.
   - Note the serialization constraint (runtime fns are dependency-free so they
     can be `.toString()`-embedded) and the inline-script/CSP consideration.

**Data flow / error handling:** n/a (docs). Verify all cross-links resolve and
the endpoint shape matches the implemented route exactly.

**Regression-test shape:** n/a — manual review that the docs match the shipped
behaviour (no drift between `popupPublicQuerySchema` / `toPublicPopup` and the
documented shape).

---

## Testing Requirements

- No automated tests. Verify by re-reading the implemented route (TASK-486-01-L03)
  and contract (TASK-486-01-L01) and confirming the documented endpoint, DTO,
  bucket, and audience semantics match exactly.
- Do **not** edit `_docs/_TASKS/README.md` (orchestrator-synced) or add a
  changelog entry here.
