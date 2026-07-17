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
**Modularity Repair Pending:** 2026-07-17 — verified history from pre-family baseline `e5f15a5675b58df85e573f760df4429af735400f` includes the touched 1,194-line `ScreenBlockInspector.tsx`. TASK-540-02-L01 must land the exact stable-facade/four-owner split below, re-anchor TASK-9999-01-L02 without executing it, and replace this historical pre-split receipt only after its static, 33/33 behavior, boundary, line, and drift gates pass.
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
| TASK-540-02-L01 | Expose link binding and complete tab-slot editing | stable `ScreenBlockInspector.tsx` facade; `screenBlockInspectorModel.ts`; `ScreenBlockInspectorControls.tsx`; `ScreenBlockInspectorTabs.tsx`; `ScreenBlockInspectorSection.tsx`; binding-panel/image-inspector suites | 🚧 In Progress |

## Mandatory Inspector modularity gate

The current blocker evidence is TASK-540-02-L01-owned
`core/admin/ui/custom-screens/ScreenBlockInspector.tsx` = 1,194 physical lines at
SHA-256 `eb49d21a99cd5fbf8dedfd502c727ba890dd455552a8259b9e9b45eb4b11d4df`.
Split it by cohesive responsibility into the five exact production paths named in the
leaf row while preserving the stable facade's exact runtime/type exports and reference
identity. Every original, extracted, test, and support path touched since the verified
baseline remains in the byte-based `{ path, owner, lines, sha256 }` receipt and must be
`<= 1000`; staging or committing cannot reset the gate. An over-limit result is neither
a LOW nor a TASK-9999 candidate.

`ScreenTabLabelDraft.baseLabel` remains intentionally present and behavior-neutral in
`ScreenBlockInspectorTabs.tsx`. The split must not execute TASK-9999-01-L02. Before the
split, its conditional evidence is the facade's current lines
`524,525,538,542,553,559,563` at the SHA-256 above. After the split, the closure/docs
owner records the exact final lines and SHA-256 for the same assignments in
`ScreenBlockInspectorTabs.tsx` and proves the symbol absent from the facade. Exactly one
layout may satisfy the workflow at a time.

This leaf lands after TASK-540-01-L01 and before TASK-540-03-L01. Its two behavior
suites remain independently runnable and preserve their existing 33 tests. The family
aggregate remains exactly 64 Vitest + 18 Bun = 82 targets, with 81 source-owner/read-only
files and one closure aggregate; pinned changelog 1252 is unchanged.

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
domain-builder consumer plus invalid Tab-label restore behavior implemented. Its exact
33/33 targeted UI gate, typecheck, lint, and diff check are historical pre-split
evidence; `Modularity Repair Pending` remains blocking until the five-owner graph and
TASK-9999 evidence transition are freshly gated. Aggregate persistence and live browser
flows remain owned by TASK-540-06 after TASK-540-04 consumes the clear sentinel.
