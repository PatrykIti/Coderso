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
| TASK-540-02-L01 | Expose link binding and complete tab-slot editing | stable `ScreenBlockInspector.tsx` facade; `screenBlockInspectorModel.ts`; `ScreenBlockInspectorControls.tsx`; `ScreenBlockInspectorTabs.tsx`; `ScreenBlockInspectorSection.tsx`; binding-panel/image-inspector suites | 🚧 In Progress |

## Mandatory Inspector modularity gate

The historical blocker evidence was the TASK-540-02-L01-owned
`core/admin/ui/custom-screens/ScreenBlockInspector.tsx` at 1,194 physical lines and
SHA-256 `eb49d21a99cd5fbf8dedfd502c727ba890dd455552a8259b9e9b45eb4b11d4df`.
The completed cohesive split preserves the stable facade and exact reference identity;
the final production line counts are facade 561, model 209, controls 215, Tabs 176, and
Section 79. The two owned tests remain 787 and 454 lines. Every original, extracted,
test, and support path touched since the verified baseline remains in the byte-based
`{ path, owner, lines, sha256 }` receipt and is `<= 1000`; staging or committing never
resets the gate. An over-limit result is neither a LOW nor a TASK-9999 candidate.

`ScreenTabLabelDraft.baseLabel` remains intentionally present and behavior-neutral in
`ScreenBlockInspectorTabs.tsx`; TASK-9999-01-L02 was not executed and remains `⏳ To
Do`. The final evidence is lines `24,25,38,42,53,59,63`, source SHA-256
`03cbeb962f40a87085d11403c15f9b69b482302322c5fc85ad224df9a52e16d4`, and normalized
AST SHA-256 `15897646098bfeb9f653b940c0782e3b3f999a811b9cbc3d9bf46a01cae5df9a`;
the workflow proves the deferred symbols are absent from the facade.

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

The sole leaf remains `🚧 In Progress`. Its five-owner graph and TASK-9999 evidence
transition are implemented; final line counts are 561/209/215/176/79 for production and
787/454 for the tests. Independent 15/15 and 18/18 runs, combined 33/33, additional
facade/Section consumers 16/16, static gates, exact export/reference checks, and the
post-split AST proof and corrected-contract audit pass. The canonical modularity receipt
is recorded, while the deferred LOW remains `⏳ To Do`. Aggregate persistence and live
browser flows remain owned by TASK-540-06 after TASK-540-04 consumes the clear sentinel.
