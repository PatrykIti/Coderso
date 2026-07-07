# TASK-482-09-L02: Documentation updates
# FileName: TASK-482-09-L02-Docs-Updates.md

**Parent Subtask:** TASK-482-09
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Small
**Dependencies:** TASK-482-09-L01
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

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
- **Cross-stream collision guard (additive-only shared docs):**
  `_docs/AUTH_SPEC.md`, `_docs/SECURITY_SPEC.md` and `_docs/CMS_API.md` are
  shared surfaces also edited by the parallel TASK-483 (analytics) and
  TASK-484 (backups) streams on sibling branches. Edits here must be strictly
  **additive and scoped to new 482-owned sections/entries** — never
  restructure, reorder, renumber or reformat existing content, so the three
  branches merge cleanly (see the parent's "Coordination & Shared Surfaces"
  contract). The TASK-482 forbidden paths (`core/services/analytics/**`,
  `core/services/backups/**`, analytics/backups route modules,
  `core/db/schema.ts`, `core/db/migrations/**`) apply to this leaf as to all
  others.
- **Single 482-stream writer (intra-stream doc ownership):** for the TASK-482
  stream, THIS leaf (09-L02) is the **sole writer** of `_docs/AUTH_SPEC.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md` and `_docs/AUDIT_SPEC.md`. The
  implementation leaves (01-L02, 02-L02, 06-L02, and any other 482 leaf) do NOT
  edit these spec docs — they only cite them as source-of-truth and register the
  code-level routes / audit actions / settings keys that this leaf then documents
  in one place. This keeps a single writer per doc within the stream; the
  cross-stream additive rule above still governs how 483/484 append alongside.
- **Source-of-truth docs:** the files above are themselves the targets; verify
  every cited route/key/action exists in code before documenting.
- **Out-of-scope for THIS leaf (but IN scope for the TASK-482-09 closure
  step):** the changelog entry `_docs/_CHANGELOG/1220-*.md` (**pinned number
  1220**; 1219/1221/1222 are reserved by parallel streams) and the
  `_docs/_TASKS/README.md` TASK-482 rows + statistics deltas. These are
  written by the closure step defined in `TASK-482-09-E2E-Tests-And-Docs.md`
  (see its "Closure (board + changelog)" section), which runs after this leaf
  — not by an external orchestrator, and not by this docs leaf. Do not edit
  them here.

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
