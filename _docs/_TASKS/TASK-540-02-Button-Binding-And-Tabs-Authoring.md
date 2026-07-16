# TASK-540-02: Button Binding and Tabs Authoring

# FileName: TASK-540-02-Button-Binding-And-Tabs-Authoring.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Admin Authoring
**Estimated Effort:** Small
**Dependencies:** TASK-540-01
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Implementation Complete:** 2026-07-13 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Repair Started:** 2026-07-16
**Repair Reason:** The Inspector's binding factory must consume R01's schema-domain `buildScreenFieldBindingId` and prove maximum-length tuples remain distinct and max-120 without taking ownership of schema or document operations. The same current repair also restores visible blank or over-120 Tab-label drafts to the latest committed label on blur and Enter without emitting a document patch.
**Repair Revalidated:** 2026-07-16 — TASK-540-02-L01 passed `core lint:types`, `core lint`, its exact two-file Vitest gate 33/33 on the final shared schema state, including the domain-builder consumer and invalid blur/Enter restore regressions, and `git diff --check`; no full-suite, post-audit, smoke, changelog, or closure pass is claimed.
**Changelog:** 1252 (pinned; closure only)

---

## Scope

Make the already-modeled Button `href` binding reachable from the visible
Inspector, migrate the image-src authoring control to the Screen URL wrapper, and
make Tabs authoring target a concrete active slot. Reuse existing
binding callbacks and insertion contracts. The Inspector's existing binding factory
imports the schema-domain `buildScreenFieldBindingId` so its generated IDs share the
strict max-120 R01 contract; TASK-540-02 owns only this UI consumer, not the helper or
document-operation source. Do not modify the palette, block factory, document model,
or runtime renderer in this subtask.

## Leaf

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-02-L01 | Expose link binding and complete tab-slot editing | `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` | 🚧 In Progress |

## Acceptance

- The Inspector can create an eligible Button `href` binding and, only when that exact
  binding exists, emits `{ field: "" }` from the named clear affordance. This subtask
  does not persist the sentinel or claim the completed clear flow; the static sanitized
  fallback remains unchanged. The reusable `BoundFieldRow` exposes that control only
  through an explicit optional clear-affordance prop passed by the Button `href` branch;
  header, field, heading, image, and related-list binding rows do not gain link-specific
  copy or a clear action.
- The Action selector offers only Link.
- Tabs add/rename/remove uses deterministic collision-free IDs and keeps slots in
  lockstep. Labels edit through a buffered control: only a trimmed, non-empty value of
  at most 120 Unicode code points commits on blur/Enter; invalid transient text never
  enters the document. Blank or over-120 text restores the visible input to the latest
  committed label on either blur or Enter and emits no patch; Escape does the same after
  parent rerenders. The draft input must not use native `maxLength=120`, because HTML counts
  pre-trim UTF-16 units and would reject schema-valid emoji or surrounding whitespace.
  The inspector imports the shared
  minimum/maximum constants, cannot remove the final tab, and cannot create a draft
  rejected by the write schema. “Edit content” arms that tab's exact slot-end insertion
  target; the renderer consumes the same host identity in TASK-540-03.
- The image URL control calls `sanitizeScreenAuthoringUrl(..., "media")`; it no
  longer imports the compatibility `normalizeScreenImageSrc` alias. This subtask owns
  the existing `custom-screen-image-inspector.test.tsx` expectations and runs that suite
  together with `custom-screen-binding-panel.test.tsx`, including protocol-relative and
  backslash-confused UI input.
- `createScreenFieldBinding` delegates its ID to `buildScreenFieldBindingId`; maximum-
  length valid block IDs with distinct prop paths therefore produce distinct canonical
  IDs of at most 120 characters without a local slug mirror. R01 owns the helper and
  separately supersedes the historical `screenDocumentOps.ts` exclusion only to move
  its binding factories/duplication onto that helper. TASK-540-02 neither edits nor
  claims `screenDocumentOps.ts` or its test.
- No `ScreenBlockLibrary.tsx` edit is needed; its existing contract already supports
  Button and `href` binding input.

TASK-540-04-L04 exclusively consumes the clear sentinel, removes exactly that binding,
marks the draft dirty, and owns persistence. TASK-540-06-L01 owns aggregate
bind→clear→rebind/save/reopen proof. This handoff does not add a backward dependency;
TASK-540-02 still lands before TASK-540-04.

## Security Contract

Admin UI only. Persistence still rides existing session-authenticated internal
Custom Screen writes with `content:write`, CSRF, admin rate limiting, and TASK-540-01 server-side strict
validation. Client controls are not a security boundary and never bypass the
normalizer.

## Completion

The sole leaf remains `🚧 In Progress` with implementation and the 2026-07-16
domain-builder consumer plus invalid Tab-label restore correction revalidated. Its exact
33/33 targeted UI gate, typecheck, lint, and diff check are green; no new post-audit or
smoke is claimed. Aggregate persistence and live browser flows remain owned by
TASK-540-06 after TASK-540-04 consumes the clear sentinel.
