# TASK-540-03: Accessible Tabs and Selection Semantics

# FileName: TASK-540-03-Accessible-Tabs-And-Selection-Semantics.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Runtime UI / Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01, TASK-540-02
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Implementation Complete:** 2026-07-14 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Repair Started:** 2026-07-16
**Repair Reason:** Current final-source revalidation reproduced an accessibility defect in the defensive zero-item Tabs renderer: an empty `tablist` exposed no usable `tab`. TASK-540-03-L01 owns the visible fail-safe empty state and must emit no tablist, tab, or panel when there are zero tabs.
**Repair Revalidated:** 2026-07-16 — TASK-540-03-L01 independently passed `core lint:types`, `core lint`, its exact renderer/interaction/image Vitest gate 89/89, and `git diff --check` on the final shared source. This current receipt claims no new post-audit, live smoke, changelog, or closure result.
**Modularity Repair Revalidated:** 2026-07-17 — cohesive <=1,000-line split and exact owner gate passed.
**Post-Audit Fixture Integrity Revalidated:** 2026-07-17 — L01 restored direct compile-time typing for all shared renderer fixtures, corrected the receipt ordering, and passed core/root static checks, the exact dependency-shaped 89/89 gate, unchanged 72-name/67-declaration fingerprints, the family line gate, and `git diff --check`. The required clean family post-audit, repository-wide validation, smoke, changelog, and closure remain pending.
**Post-Audit Fixture Immutability Revalidated:** 2026-07-17 — L01 restored the prior shallow runtime-freeze depth without reintroducing fixture assertions; the exact 89/89 gate, static/name/line/format/diff checks, and a fresh zero-finding audit passed. The clean family post-audit, repository-wide validation, smoke, changelog, and closure remain pending.
**Historical Corrective Revalidation:** 2026-07-14 — TASK-540-03-L01 passed the then-current exact 89/89 renderer/interaction/image Vitest matrix, core lint/typecheck, `git diff --check`, and a fresh zero-finding post-audit
**Fix Started:** 2026-07-14
**Fix Reason:** TASK-540-03-L01 must pin final Button and Image DOM-sink behavior for ASCII-control-confused URLs after the R01 wrapper correction.
**Prior Corrective Revalidation:** 2026-07-14 — TASK-540-03-L01 passed `core lint:types`, `core lint`, the exact 83/83 renderer/interaction/image Vitest gate, `git diff --check`, and a fresh read-only post-audit with zero findings before the control-character corpus was added
**Previous Revalidation:** 2026-07-14 — TASK-540-03-L01 passed its exact core static and 83/83 renderer/interaction/image Vitest gate
**Previous Completion:** 2026-07-14
**Reopened:** 2026-07-14 (final URL-sink control-character regressions)
**Changelog:** 1252 (pinned; closure only)

---

## Scope

Turn the decorative Tabs branch into a functional, accessible component in all
Screen modes and remove composite-wrapper button semantics that contain links,
controls, and contenteditable fields. Selection remains reachable through real
authoring controls without swallowing Space or link/input activation.

## Leaf

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-03-L01 | Functional Tabs and no nested-interactive Space trap | stable renderer facade plus six focused production owners; runtime harness and four independently runnable renderer suites | 🚧 In Progress |

## Mandatory renderer modularity gate

The exact historical pre-split blockers were TASK-540-03-L01-owned
`core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` = 1,983 lines / SHA-256
`eb7b659f5c5c4edcd26bfc0ae53716ec538f6ecfad98aa284ae975a051b143ab` and
`tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` = 2,415 lines /
SHA-256 `455f8d1149d218f2125003fb8538a330c043e79ac894bb9203f150970452997e`.
The completed split owns the stable facade plus `screenRuntimeRendererModel.ts`,
`useScreenRuntimeInteractions.ts`, `ScreenRuntimeBlockFrame.tsx`,
`ScreenRuntimeLeafBlocks.tsx`, `ScreenRuntimeContainerBlocks.tsx`, and
`ScreenRuntimeSectionList.tsx`; the test family owns its stateless harness and exact
22+13+24+13 suite partition. Their final physical-line counts are respectively
1/395/188/177/635/420/284 for production and 638/611/798/343/95 for the four suites
plus harness, so every R03 owner is below its declared budget and the hard maximum.

The owner gate byte-counted every original/extracted/dependency test/support path touched
since the full verified baseline as `{ path, owner, lines, sha256 }`. The four suites
passed alone at 22/22, 13/13, 24/24, and 13/13 and together with their two dependencies
at 89/89 while preserving the exact sorted multiset of all 72 expanded names. Neither
line drift nor test-name/assertion drift is
TASK-9999-eligible. This leaf lands after TASK-540-02-L01 and before TASK-540-04-L01;
the reconciled family matrix remains 64 Vitest + 18 Bun = 82 files (81 source-owner/
read-only plus one closure aggregate) under pinned changelog 1252.

## Acceptance

- Tabs expose `tablist`, `tab`, `tabpanel`, unique relationships, roving
  `tabIndex`, `aria-selected`, one visible panel, and Arrow/Home/End behavior.
- A defensive zero-item Tabs value takes a separate accessible empty-state branch:
  it emits no `tablist`, `tab`, or `tabpanel`, and visibly renders exact
  `role="status"` text `No tabs available.`.
- Mouse and keyboard activation show a visible content change in builder,
  preview, and entry modes. Builder activation writes the tab's slot-end
  `insertPoint`, and its visible active panel derives from a direct target for that
  block or from the ancestor tab slot containing a descendant target. Activating a
  nested Tab inside a non-first outer panel must therefore keep every ancestor panel
  visible. Builder never consults preview/entry local state; preview and entry modes
  use renderer-instance local state only.
- Block/section composite roots have no `role=button`, focusability, or blanket
  Enter/Space cancellation. Real authoring selection buttons are siblings of
  interactive content, not ancestors.
- Typing Space into contenteditable inserts a space. Links, inputs, tab buttons,
  and selection handles perform only their own action.
- Button href is re-sanitized at the DOM seam. Builder mode always renders a
  non-anchor, non-navigating affordance, even for a safe link; preview and entry render
  an anchor only when `mode !== "builder"` and the href is safe. An absent, unsafe, or
  legacy-disabled href renders an `aria-disabled` non-anchor affordance in every mode.
- TAB/LF/CR protocol-relative-confused Button hrefs (plus NUL/DEL controls) are unsafe
  at that final seam and render as disabled non-anchors. The same control corpus used as
  an Image source renders the existing placeholder and emits no `img` element.
- Presentation image values remain media UUIDs. The pure renderer consumes an
  explicit host-resolved UUID→URL map only for direct image blocks. An active override
  is UUID-only and wins absolutely: resolve it through the map or show a placeholder,
  never fall back. Without an override, an existing binding accepts a scalar UUID or
  the first valid UUID in an array and likewise resolves to a URL or placeholder;
  malformed and URL-shaped bound values are never interpreted as URLs and never fall
  back. Only the absence of both override and binding permits sanitized static
  `data.src`. Media FieldRenderer keeps scalar/array UUID identity for MediaPicker.
  UUID recognition imports TASK-540-01's `isScreenMediaAssetUuid`; this leaf does not
  define another pattern or wait for TASK-540-04's later override normalizer.

## Security Contract

Render-only/admin UI change, no endpoint. Stored strings are trusted only after
TASK-540-01 normalization, and URL policy is repeated at the final DOM sink.
Static DOM IDs derive only from validated block/tab IDs. No HTML injection or
dynamic script is added.

## Corrective repair completed

The renderer behavior, collision correction, and 83/83 gate remain historical evidence.
After R01 tightened the shared Screen wrapper, R03 added the final Button/Image
control-character DOM-sink regressions in its existing renderer test. That historical
89/89 gate and zero-finding post-audit remain evidence. The current 2026-07-16 repair
adds the visible accessible zero-item Tabs state. The 2026-07-17 modular split then
passed the exact independent and combined 89/89 gate, preserved the 72-name fingerprint,
passed lint/typecheck/diff plus zero-finding code and cross-contract audits, and reduced
the family gate to 10 blockers. Its exact modularity receipt is current; full family
post-audit, live smoke, changelog 1252, and closure remain pending.
