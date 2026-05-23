# TASK-283: Section Widget Playwright Product Followups

# FileName: TASK-283_Section_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Section + Layout + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-02, TASK-256-03, TASK-256-05-01, TASK-256-08, TASK-326, TASK-327
**Status:** Done (2026-05-22)

---

## Overview

Create the Section-only follow-up family for
`_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md`.

This family owns product, editor, and runtime improvements that apply only to
the `section` layout widget. Shared widget-contract repairs stay in the
truthful shared owners (`TASK-256`, `TASK-326`, `TASK-327`) rather than being
buried inside widget-local follow-up leaves. `TASK-256-05-01` remains the
landed baseline prerequisite for placeholder, anchor, and default heading
semantics.

Do not use TASK-283 to duplicate shared fixes for clear/none token semantics,
editor-only placeholder leakage, baseline anchor safety, duplicated Advanced
ownership, or generic color-picker/token behavior.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/section.tsx`
- `core/admin/ui/widgets/editors/SectionEditors.tsx`
- `tests/vitest/widgets/section.test.tsx`
- `tests/vitest/ui/section-editor-wave.test.tsx`
- `tests/unit/widgets/validator.test.ts`
- `tests/unit/widgets/registry.test.ts`
- `_docs/_WIDGETS/SECTION.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/TASK-256-05-01_Section_and_Grid_Columns_Structural_Findings.md`

## Shared Exclusion Matrix

The following report findings are intentionally excluded from TASK-283 because
truthful shared owners (`TASK-256`, `TASK-326`, `TASK-327`) already own the
cross-widget contract drift or structural baseline repair.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| Public `Empty region.` placeholder leakage and U8 public empty-region behavior | `REPORT_SECTION_WIDGET.md:43,98,288,300,325,332,384` | TASK-256-03, TASK-256-05-01 | Shared editor-vs-public placeholder contract. If product later wants a user-facing empty-region message, that must be a separate Section product task after the placeholder leak is fixed. |
| Invalid `anchorId` accepted and emitted | `REPORT_SECTION_WIDGET.md:74,133,213,379` | TASK-256-05-01 | Baseline safe DOM ID validation. |
| CSS variable color picker overwrites token values | `REPORT_SECTION_WIDGET.md:85,142` | TASK-327 | Closed on 2026-05-23 in the shared helper; keep the historical finding out of widget-local TASK-283 leaves. |
| `resolveSectionBorderWidth` and `resolveSectionRadius` fallback drift | `REPORT_SECTION_WIDGET.md:81-82,343` | TASK-326 | Closed shared truthfulness cleanup on 2026-05-22; keep the historical finding out of widget-local TASK-283 leaves. |
| Duplicate `gradientAngle` and `overlayOpacity` in Advanced | `REPORT_SECTION_WIDGET.md:84,157-158,342,381` | TASK-326 | Closed shared mode-ownership cleanup on 2026-05-22; TASK-283 continues only with Visual-owned slider UX. |
| `content` and `wide` render identical CSS | `REPORT_SECTION_WIDGET.md:83,135,214,347,385` | TASK-326 | Closed as a truthfulness issue on 2026-05-22 by relabeling `wide` as an explicit alias and documenting the current runtime behavior. |
| Bleed variant copy/truthfulness baseline | `REPORT_SECTION_WIDGET.md:171-174,334,350,378` | TASK-326 | Closed shared baseline on 2026-05-22 with explicit edge-to-edge guidance instead of a hidden runtime semantic change. |
| Hardcoded heading hierarchy baseline | `REPORT_SECTION_WIDGET.md:58,197,211,289,346,382` | TASK-256-05-01 | Baseline semantic repair is already closed in the shared structural leaf. TASK-283 owns only bounded heading-level product controls on top of the safe default `h2` path. |

If a TASK-283 implementation leaf discovers that a desired Section feature
requires a shared helper, generic editor control, or cross-widget runtime
contract, split that shared piece back to TASK-256 instead of hiding it inside
this family.

## TASK-283 Scope Matrix

| Report finding | TASK-283 owner | Notes |
|---|---|---|
| C1 min-height/fullscreen sections | TASK-283-01 | Add Section-owned bounded height presets after baseline layout truthfulness lands. |
| C5 horizontal/grid region layouts | TASK-283-01 | Add bounded region flow model without changing shared slot mechanics. |
| W7 heading-to-regions gap | TASK-283-01 | Section layout spacing around owned heading/region wrapper. |
| W8 region gap controls | TASK-283-01 | Section-owned gap tokens for repeated regions. |
| C2 image/video background support | TASK-283-02 | Section-owned media background model using existing safe media patterns. |
| Media URL validation from U7 | TASK-283-02 | Closed by the landed Section background media model; compatible media sources now fail closed without adding a new widget-local leaf. |
| W11 layer z-index controls | TASK-283-02 | Bounded overlay/content layering only for Section surface layers. |
| C3 heading text color and size controls | TASK-283-03 | Product typography controls on top of the already-landed safe default heading baseline. |
| C4 heading level control | TASK-283-03 | Add bounded `h1`-`h6` product control without re-opening the already-fixed hardcoded baseline defect. |
| W5 heading alignment | TASK-283-03 | Section heading layout/typography. |
| U1 Wizard missing label | TASK-283-03 | Section Wizard completeness. |
| W1 section presets | TASK-283-04 | Section-only preset workflow. |
| U3 friendly max-width names | TASK-283-04 | Section editor copy/labels around width tokens. |
| U4 gradient override guidance | TASK-283-04 | Section-local guidance after TASK-256 clear/token behavior lands. |
| U6 Wizard/Visual variant UI mismatch | TASK-283-04 | Section editor onboarding consistency. |
| W2 box-shadow controls | TASK-283-05-01 | Section surface styling expansion beyond current `contained` shadow with explicit match-variant fallback. |
| W3 animation/scroll effects | TASK-283-05-01 | Bounded, reduced-motion-safe CSS-only Section reveals; scroll observers and parallax stay out of contract. |
| U2 slider/visual controls for angle and opacity | TASK-283-05-02 | Final Section-local slider UX now that `TASK-326` closed the duplicate Advanced owner and left Visual as the single truthful surface. |
| U5 gradient/overlay preview | TASK-283-05-01 | Derived Section surface preview without preview-only persisted state. |
| W6 responsive padding variants | TASK-283-06 | Section-owned mobile/desktop padding tokens. |
| W4 custom region names | TASK-283-07 | Section editor-only structure labels across Visual, canvas slot headers, and insert-target selectors without changing `region:<id>` storage. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-283-08 | Final evidence and synchronization. |

## No-Action Or Deferred Report Findings

| Report finding | Decision | Reason |
|---|---|---|
| Existing section/div element switch | No TASK-283 task | The report confirms it works. Keep covered by existing Section tests unless future leaves change semantics. |
| Closed shared current-control truthfulness cleanup (`borderWidth`/`radius` fallbacks, duplicated Visual/Advanced surface numbers, and `content`/`wide`/`bleed` semantics) | Shared TASK-326 | Closed on 2026-05-22; TASK-283 no longer owns any remaining work in this shared boundary. |
| Reopened shared color-swatch token overwrite drift (`borderColor` swatch replaces CSS-variable/custom token text) | Shared TASK-327 | Closed on 2026-05-23: shared swatch writes now preserve token/custom text unless a consumer opts into explicit picker replacement. |
| Region add/remove min/max behavior | No TASK-283 task | The report confirms min 1, max 8, and disabled add state work. |
| Raw payload snapshot | No TASK-283 task | The report confirms normalized JSON output works. |
| Admin/global Layout and Visibility panels in Advanced | No TASK-283 task | They are global editor wrapper controls, not Section data fields. |
| Expected admin/frontend theme variable differences | No TASK-283 task | `REPORT_SECTION_WIDGET.md:326-333` confirms CSS variables resolve differently in admin and public themes as expected; the separate swatch-overwrite bug is now tracked by shared `TASK-327`. |
| Current freeform color/token text input validation from U7 | No TASK-283 task | Section text inputs intentionally accept design tokens and CSS variables through the shared clearable-field contract. Do not add stricter format validation that would reject valid token strings; the media URL part of U7 is already closed by TASK-283-02. |
| Media URL validation part of U7 | Closed by TASK-283-02 | Section background media now validates compatible sources and fails closed for unsupported URLs, so no widget-local TASK-283 leaf remains for this part of U7. |
| Stale gradient Clear report row (W9) | No standalone TASK-283 leaf after report sync | Current Section editors already expose shared Clear actions for `gradientFrom` and `gradientTo`; TASK-283-04 adds focused evidence and corrects the stale report wording instead of restaging a shared fix. |
| Confirmed basic render, section/div switch, max-width, padding, border, overlay, gradient, and mobile no-overflow behavior | No TASK-283 task | The report marks these as working; keep existing tests unless a future TASK-283 leaf changes the related contract. |
| Prior 401 session-limit note | No TASK-283 task | `REPORT_SECTION_WIDGET.md:227,389` records a Playwright environment/session-limit setup issue that was resolved by raising the active-session limit; the current Section widget session completed and no widget implementation task is required. |

## Sub-Tasks

- [x] TASK-283-01: Section Layout Height and Region Flow Controls
- [x] TASK-283-02: Section Background Media and Layering Model
- [x] TASK-283-03: Section Heading Typography Alignment and Wizard UX
- [x] TASK-283-04: Section Presets Variant Guidance and Width Copy
- [x] TASK-283-05: Section Surface Shadow Motion and Preview Controls (closed across `TASK-283-05-01` and `TASK-283-05-02`)
- [x] TASK-283-06: Section Responsive Spacing and Mobile Density
- [x] TASK-283-07: Section Custom Region Labels and Structure UX
- [x] TASK-283-08: Section Report Docs Changelog and Closure

## Implementation Order

1. Build on the already-landed TASK-256-05-01 baseline. TASK-283 leaves must
   consume the final placeholder, anchor, fallback, Advanced-ownership,
   heading-baseline, and width-truthfulness repairs instead of duplicating
   them.
2. Complete TASK-283-01 first because height, region flow, and gap tokens define
   the layout model used by responsive and structure leaves.
3. Complete TASK-283-02 after the layout surface is stable, using existing media
   safety patterns and avoiding raw CSS or arbitrary z-index payloads.
4. Complete TASK-283-03 after TASK-283-01/02 settle the core layout/surface
   model, then extend the already-landed safe default heading baseline with
   product-owned level and typography controls.
5. Complete TASK-283-04 after width truthfulness and heading basics are stable,
   then add safer presets and variant guidance.
6. `TASK-283-05` is now complete through `TASK-283-05-02`, keeping the final
   angle/opacity UX on the single-owner Visual model after shared `TASK-326`.
7. Complete TASK-283-06 after base spacing tokens exist, then add responsive
   overrides with deterministic fallback behavior.
8. Complete TASK-283-07 after region flow is stable, because custom labels must
   map cleanly to repeatable slot targets.
9. Complete TASK-283-08 last after code, tests, report evidence, widget docs,
   changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-283*` files, Section owner files, Section tests, Section
  docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-283 rows/counts owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin page/template editing and public
  runtime rendering.
- RBAC: unchanged page/template/widget write permissions.
- CSRF: unchanged existing admin write route protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: every new Section schema field must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  tests when schema/defaults change.
- Anti-abuse: media, color, typography, animation, z-index, and preset fields
  must be schema-bound and must not accept raw HTML, script, unbounded class
  names, inline event handlers, or browser-stored secrets.
- Secret handling: no secrets, private URLs, provider keys, or privileged
  settings in Section widget data, browser cache, diagnostics, Playwright
  evidence, or changelog notes.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when Section
  renderer output markers, slots, or shared widget rendering assumptions change.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  Section token, spacing, radius, clear, or `none` semantics are adjacent.
- `bun test tests/unit/widgets/validator.test.ts` when Section schema/defaults
  change.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or
  widget registry wiring changes.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/SECTION.md` when schema, editor modes, runtime variants,
  media behavior, region labels, or layout behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Section pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every Section report finding is either owned by a shared task (`TASK-256`,
  `TASK-326`, `TASK-327`), covered by a TASK-283 physical leaf, explicitly
  marked no-action, or explicitly deferred by TASK-283-08 with a reason.
- TASK-283 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `section`
  payloads unless the leaf documents and tests a normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.

## Final Validation Notes

- Shared prerequisite `TASK-326` was integrated into this worktree as commit `491f048f`.
- `TASK-283-05-02` landed as commit `cbe4ffa6` on the dedicated Section branch/worktree.
- Final TASK-283 closure keeps the historical shared color-swatch overwrite drift mapped to `TASK-327`, which is now closed on 2026-05-23.
- Final validation commands and outcomes are recorded in `TASK-283-08`.
