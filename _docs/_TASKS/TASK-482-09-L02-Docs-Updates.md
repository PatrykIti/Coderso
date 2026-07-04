# TASK-482-09-L02: Documentation updates
# FileName: TASK-482-09-L02-Docs-Updates.md

**Parent Subtask:** TASK-482-09
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Small
**Dependencies:** TASK-482-09-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Record the two-phase onboarding feature in the source-of-truth docs so
  the new endpoints, settings key, audit actions, and the pre-auth security
  trade-off are discoverable and reviewable.
- **Owning module(s) to edit (docs only):**
  - `_docs/AUTH_SPEC.md` — Phase-1 installer flow; `GET /auth/install/status`,
    `POST /auth/install/admin`; the no-users fail-closed boundary; coexistence
    with `seedAdmin()`.
  - `_docs/SECURITY_SPEC.md` — pre-auth first-admin threat model: session-less ⇒
    no CSRF; boundary = no-users gate (re-checked in tx) + `auth` rate-limit +
    strong password + audit; self-disable; CSRF exemption scoped to the one path.
  - `_docs/CMS_SPEC.md` — two-phase onboarding overview (Phase 1 installer, Phase
    2 Basic/Advanced wizard, starter content).
  - `_docs/CMS_API.md` — request/response for `/auth/install/status`,
    `/auth/install/admin`, `/setup/starter-content/preview`,
    `/setup/starter-content/apply`.
  - `_docs/SETTINGS.md` — new `site.timezone` (default `UTC`, IANA-validated) and
    optional `site.branding.logoId`.
  - `_docs/AUDIT_SPEC.md` — `auth.install.admin.created`, `auth.install.blocked`,
    `setup.starter_content.applied` taxonomy entries.
- **Source-of-truth docs:** the files above are themselves the targets; verify
  every cited route/key/action exists in code before documenting.
- **Out-of-scope:** changelog entries (orchestrator handles the board);
  `_docs/_TASKS/README.md` (do not edit).

## Security Contract

- Not a route/auth/data leaf — **no Security Contract required** (documentation
  only). However, the SECURITY_SPEC edit must accurately describe the pre-auth
  route's controls; do not document a stronger guarantee than the code provides.

## Implementation Pseudocode

- For each doc: add a focused section; cross-link the endpoint ↔ spec ↔ settings
  key. Keep wording consistent with the implemented domain error codes
  (`install_unavailable`, `install_admin_invalid`, `starter_kit_unknown`,
  `settings_value_invalid`).
- Verification step (run before finishing): grep the codebase for each cited
  symbol/route/key/audit action and confirm it exists, correcting drift.

## Testing Requirements

- **Lane:** none (documentation). Validation is a manual cross-check that every
  cited route, setting key, and audit action exists in the shipped code from the
  prior leaves.
- No migration artifacts.
