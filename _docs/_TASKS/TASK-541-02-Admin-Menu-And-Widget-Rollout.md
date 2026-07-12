# TASK-541-02: Admin, Menu, Form, and Compatibility Rollout

# FileName: TASK-541-02-Admin-Menu-And-Widget-Rollout.md

**Parent Task:** TASK-541
**Priority:** High
**Category:** Shared Styling / Admin / Menus / Forms / Retained Compatibility
**Estimated Effort:** Large
**Dependencies:** TASK-541-01
**Status:** ✅ Done
**Started:** 2026-07-11
**Reopened:** 2026-07-12 (verified Runtime Preview description warning)
**Completed:** 2026-07-12
**Changelog:** 1253

---

## Goal

Replace admin, Menu, Form, and retained-compatibility color-language mirrors with the canonical owner while
preserving each boundary's existing UI/persistence role. Contextual inherited values
require explicit opt-in; no boundary clamps or silently accepts a value another
boundary rejects.

Every owned consumer passes the original raw field value directly to the canonical
parser before any consumer-side trimming, case folding, regex classification, or
numeric conversion. The parser alone owns raw-length measurement, ASCII-space
handling, case normalization, channel validation, and canonical bytes. Source-owned
tests pin this ordering with cap/cap+1 ASCII-padding cases and control/non-ASCII-space
rejection at each changed normalizer.

The sole composite exception is CTA Banner `background.gradient`: it passes the
untouched whole value first to the locally bounded exported
`parseCtaBannerBackgroundGradient`, whose one owner-local structural pattern
preserves the declared historical hex-stop grammar. It is not a simple-color value,
does not widen either canonical profile, and may not be copied into the CTA editor
or another consumer. Every CTA simple color still follows the canonical parser rule.

Form theme colors are the deliberate backward-compatible exception inherited from
TASK-516: their write normalizer, stored read, Design control, runtime preview, and
public render all opt into `inherited-render`. Do not manufacture an authoring-write
versus inherited-read split or a second Form settings adapter. Menu, Page, and new
ordinary authoring overrides continue to use `authoring`.

The Bun-free Form domain modules import the canonical theme service directly;
they must not depend on the historical `core/widgets/*` adapter. Retained renderers
may use that adapter only with an explicit profile. Hero's background gradient is
a bounded two-stop composite owned by its production module, not an unchecked raw
style and not a new shared color grammar. CTA's narrower legacy gradient likewise
has one local bounded production owner under the explicit exception above.

This subtask does not create or extend a configurable widget surface. Dashboard
widgets are out of scope. Pages, Forms, and Menus remain section/block-owned;
`core/widgets/*` changes are bounded legacy read/render maintenance only.

## Leaves

| Leaf | Exclusive seam | Status |
|---|---|---|
| TASK-541-02-L01 | Admin adapters and controls | ✅ Done |
| TASK-541-02-L02 | Menu write normalization | ✅ Done |
| TASK-541-02-L03 | Form and retained compatibility schema/render normalization | ✅ Done |

## Ownership and collision guards

Land leaves strictly L01 → L02 → L03. Each rollout leaf owns only its declared
source and changed-behavior tests. TASK-541-02-L02 lands before TASK-542 and
TASK-542 may not recreate a Menu parser. Admin rollout is not performed concurrently
with TASK-481 if it owns the same shared control tests/source. Form and compatibility
rollout must preserve unrelated schemas/defaults/markup and every present-only/empty
clear sentinel.

## Security Contract

No route topology, endpoint visibility, authentication, authorization, CSRF,
rate-limit, or anti-abuse contract changes. Existing admin Menu/Form CRUD writes
retain authenticated sessions, RBAC, session CSRF, strict reject-unknown
schemas/domain normalizers, and existing admin-write rate limiting. Scoped API-key
authentication remains limited to the unchanged internal Form submission/upload
write paths; it does not authenticate Menu CRUD or `POST /forms` /
`PATCH /forms/:id`.
Menu routes do not gain a fictitious nested color JSON schema; deep validation
remains in the domain owner. Form `POST /forms` and `PATCH /forms/:id` retain their
nested `formSettingsSchema`, `forms:write` permission, and centralized error
mapping. TASK-541 intentionally changes the nested Form theme value contract at
those existing routes: the declared `inherited-render` accepted set is recognized,
accepted noncanonical spellings persist as canonical bytes, and invalid values
follow the existing strict-structure/fail-soft-semantic policy without raw
persistence. That payload validation/persistence correction is not a route or auth
change and is regression-tested with uniquely owned DB fixtures. Public Form
upload/submission access, nonce, captcha, signature, and `public_write` behavior
are read-only and unchanged. UI validation remains defense-in-depth; write and
render boundaries both call the shared positive parser. No unsafe fallback,
browser cache secret, or scanner exception.

## Acceptance

- Every value emitted by an `authoring`-profile admin control is accepted with
  identical canonical bytes by Menu, Form's inherited-profile superset, and every
  applicable declared authoring/inherited compatibility consumer.
- Inherited-only values are emitted only by controls explicitly configured for an
  inherited context and are compared only with those declared Form/retained
  contexts. Default admin, Menu, and Page authoring do not accept them.
- Form's TASK-516 theme seam explicitly opts in at write, read, control, preview, and
  public render; this exception does not widen Menu/Page authoring.
- Form create/update schema and route tests prove nested reject-unknown handling,
  canonical persistence, inherited-profile compatibility, and fail-closed omission
  of semantically invalid color values without raw persistence.
- Hero's one production-owned gradient normalizer bounds total length and angle,
  permits exactly two canonical color stops, and is reused by schema, normalizer,
  editor, and renderer with no raw fallback. Both Hero overlay paths retain the
  existing `HeroOverlayField` visual/opacity interaction while replacing only its
  local color grammar/conversion with canonical parser metadata.
- Every owned simple-color field feeds its original raw value to the canonical
  parser before local trim/lowercase/conversion; cap/cap+1 ASCII padding, control
  characters, and Unicode whitespace are covered in the source-owning test lane.
  CTA's one composite gradient feeds its original whole value to its declared local
  parser first and has analogous tests against its own cap.
- Semantic regex/range mirrors are gone from the declared M-04 simple-color
  consumers and enumerated true color mirrors. The single exported CTA composite
  pattern remains only beside its production parser and is reused by schema; no
  editor/source copy is allowed. Unrelated historical raw-style contracts are not
  claimed by this task.
- Unknown stored values are not mutated merely by mounting an admin control.

## Validation

Run every leaf's targeted tests, then build/admin-boundary checks and `git diff --check`.
