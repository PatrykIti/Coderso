# TASK-540-02: Button Binding and Tabs Authoring

# FileName: TASK-540-02-Button-Binding-And-Tabs-Authoring.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Admin Authoring
**Estimated Effort:** Small
**Dependencies:** TASK-540-01
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Repair Started:** 2026-07-16
**Fix Started:** 2026-07-18
**Implementation Complete:** 2026-07-18 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Repair Reason:** The Inspector's binding factory must consume R01's schema-domain `buildScreenFieldBindingId` and prove maximum-length tuples remain distinct and max-120 without taking ownership of schema or document operations. The current repair also restores invalid Tab-label drafts, keeps keyboard focus on the same input after an Enter commit while invalidating stale drafts through the now-read `baseLabel`, restores the committed label when a host rejects that commit, assigns collision-free default Tab labels, garbage-collects bindings owned by a removed Tab slot subtree, invalidates stale Image URL drafts across block/committed-source changes, and gives every select/number control a distinct accessible name. The unbound field trigger displays the named `Not bound` placeholder and preserves exact-binding → authored-`data.field` → empty-placeholder precedence.
**Repair Revalidated:** 2026-07-16 — TASK-540-02-L01 passed `core lint:types`, `core lint`, its exact two-file Vitest gate 33/33 on the final shared schema state, including the domain-builder consumer and invalid blur/Enter restore regressions, and `git diff --check`; no full-suite, post-audit, smoke, changelog, or closure pass is claimed.
**Modularity Repair Revalidated:** 2026-07-17 — cohesive <=1,000-line split and exact owner gate passed.
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
| TASK-540-02-L01 | Expose link binding and complete tab-slot editing | stable `ScreenBlockInspector.tsx` facade; `screenBlockInspectorModel.ts`; `ScreenBlockInspectorControls.tsx`; `ScreenBlockInspectorTabs.tsx`; `ScreenBlockInspectorSection.tsx`; binding-panel/image-inspector suites plus cohesive shared Inspector harness | 🚧 In Progress |

## Mandatory Inspector modularity gate

The historical blocker evidence was the TASK-540-02-L01-owned
`core/admin/ui/custom-screens/ScreenBlockInspector.tsx` at 1,194 physical lines and
SHA-256 `eb49d21a99cd5fbf8dedfd502c727ba890dd455552a8259b9e9b45eb4b11d4df`.
The completed cohesive split preserves the stable facade and exact reference identity;
the current production line counts are facade 564, model 209, controls 238, Tabs 214, and
Section 80. The two owned tests are 932 and 443 lines, with a cohesive 194-line shared
Inspector test harness. Every original, extracted, test, and support path touched since
the verified baseline remains in the byte-based
`{ path, owner, lines, sha256 }` receipt and is `<= 1000`; staging or committing never
resets the gate. An over-limit result is neither a LOW nor a TASK-9999 candidate.

`ScreenTabLabelDraft.baseLabel` is now behavior-owning state in
`ScreenBlockInspectorTabs.tsx`: the commit-stable `block.id:tab.id` key preserves keyboard
focus after Enter, while the `draft.baseLabel !== tab.label` read invalidates a stale
draft when the committed label changes. New evidence therefore disproved the premise of
TASK-9999-01-L02; that leaf was re-triaged on 2026-07-18 and is `⏭️ Superseded` by
the active TASK-540-02-L01 repair. Removing `baseLabel` would regress visible focus and
stale-draft behavior and is not eligible for deferred LOW treatment.

This leaf lands after TASK-540-01-L01 and before TASK-540-03-L01. Its two behavior
suites remain independently runnable and now cover 18 binding-panel plus 18
image-inspector tests (36 total). The family
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
- An unbound row remains explicitly named `Bound field`, displays `Not bound`, and keeps
  its first eligible option selectable. An exact binding wins over authored
  `data.field`; authored `data.field` wins over the empty unbound placeholder. Merely
  rendering the first option never creates or implies a binding.
- Every Inspector enum/select trigger and numeric input has a non-empty accessible name.
  The Heading and block-layout `Align` controls use distinct names, and the slot target
  plus section-gap controls are named independently of placeholder text.
- The Action selector offers only Link.
- Tabs add/rename/remove uses deterministic collision-free IDs and keeps slots in
  lockstep. Generated labels also avoid every surviving label after remove→add cycles.
  Labels edit through a buffered control: only a trimmed, non-empty value of
  at most 120 Unicode code points commits on blur/Enter; invalid transient text never
  enters the document. Blank or over-120 text restores the visible input to the latest
  committed label on either blur or Enter and emits no patch; Escape does the same after
  parent rerenders. The draft input must not use native `maxLength=120`, because HTML counts
  pre-trim UTF-16 units and would reject schema-valid emoji or surrounding whitespace.
  A successful Enter commit keeps the same input mounted and focused; if the host
  drops/rejects the patch, the input immediately restores its committed value without
  phantom optimistic state. The buffered draft records the committed label it was based
  on and resets only when a later parent value differs from that `baseLabel`.
  The inspector imports the shared
  minimum/maximum constants, cannot remove the final tab, and cannot create a draft
  rejected by the write schema. “Edit content” arms that tab's exact slot-end insertion
  target; the renderer consumes the same host identity in TASK-540-03.
- Removing a Tab removes its exact slot and clears bindings for every block in that
  slot's nested subtree through the existing empty-field sentinel. Bindings owned by
  surviving slots remain untouched, and the final-tab guard performs neither mutation.
- The image URL control calls `sanitizeScreenAuthoringUrl(..., "media")`; it no
  longer imports the compatibility `normalizeScreenImageSrc` alias. This subtask owns
  the existing `custom-screen-image-inspector.test.tsx` expectations and runs that suite
  together with `custom-screen-binding-panel.test.tsx`, including protocol-relative and
  backslash-confused UI input. A raw draft may survive acknowledgement of its own
  sanitized write, but not a block switch or unrelated committed-source refresh.
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

The sole leaf remains `🚧 In Progress`; the exact active metadata receipt in the leaf
contract is the sole authority for its current gate state while canonical `✅ Done` awaits
family closure. The current graph is 564/209/238/214/80 lines for production, 932/443
for the tests, and 194 for their cohesive Inspector harness; its targeted matrix is 18
binding-panel plus 18 image-inspector tests. Historical 33/33 modularity evidence remains
provenance only. Current focus preservation, stale-draft and rejected-commit restoration,
collision-free labels, removed-slot binding GC, Image draft invalidation, and distinct
accessible control names remain owned by this leaf. TASK-9999-01-L02 is superseded, not
deferred. Aggregate
persistence and live browser flows remain owned by TASK-540-06 after TASK-540-04 consumes
the clear sentinel; no family post-audit, smoke, or closure is claimed.
