# TASK-343: Widget Report-Driven Remediation After the 28-05-2026 Audit Wave

# FileName: TASK-343_Widget_Report_Driven_Remediation_After_the_28-05-2026_Audit_Wave.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + UX + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-341, TASK-342
**Status:** Done (2026-05-30)

---

## Overview

Turn the deep live-audit evidence from `_docs/PLAYWRIGHT/28-05-2026/` into a
report-driven remediation program with physical task families, clear file
owners, and execution-ready leaf scope.

This umbrella does not reopen the whole widget surface blindly. It classifies
all `38/38` reports into:

- physical `TASK-343-*` remediation families for every report-backed finding
  that needs execution-ready implementation scope;
- shared-owner remediation families when several widget reports prove the same
  block wrapper, visibility, or color-state owner;
- explicitly deferred/current-state-sufficient reports where the 28-05 evidence
  is environment-only, already documented product behavior, or too minor for a
  physical implementation family in this wave.

## Current Evidence

- Audit wave root: `_docs/PLAYWRIGHT/28-05-2026/README.md`
- The wave is complete and documents real admin + frontend interactions for all
  `38` page-builder widgets.
- The most important follow-up class is no longer smoke stability. It is
  **truthfulness and UX fidelity**: controls that exist but mislead, controls
  that are visually inert, admin previews that hide runtime limits, and saved
  states that do not round-trip cleanly.
- Code-level reconciliation on 2026-05-29 compared the physical `TASK-343-*`
  leaves with current widget sources, editor sources, and existing test lanes.
  The leaf tasks now distinguish existing owner files from planned new tests,
  avoid stale helper/test names where current code already has owners, and call
  out shared-control routing instead of hiding shared drift in widget-local
  families.

## Report Classification

### Promoted Actionable Families

After the full 38-report reconciliation, `17` was under-scoped. The current
task breakdown promotes `31` physical families: `28` widget-local families plus
`3` shared-owner families.

| Report owner | Family | Main reason |
|---|---|---|
| `hero` | `TASK-343-01` | Confirmed persistence + overlay renderer defects. |
| `appointment-form` | `TASK-343-02` | Confirmed dead `No extra validation` preset. |
| `newsletter` | `TASK-343-03` | Public Enter-submit leak and misleading disconnected state. |
| `accordion` | `TASK-343-04` | Misleading Wizard count + admin preview cross-instance/runtime drift. |
| `faq-accordion` | `TASK-343-05` | Missing writable `style.spacing` control plus admin preview drift. |
| `booking-calendar` | `TASK-343-06` | Surface clear truthfulness + advanced flow-summary drift. |
| `feature-grid` | `TASK-343-07` | Click-blocked emoji affordance + destructive silent count reduction. |
| `compare-timeline` | `TASK-343-08` | Confirmed dead `segmentLabelSize` render path. |
| `stack` | `TASK-343-09` | Confirmed runtime Tailwind class loss across breakpoints. |
| `toggle-block` | `TASK-343-10` | Confirmed active-trigger contrast regression. |
| `team` | `TASK-343-11` | Confirmed social-handle corruption and silent Spotlight truncation. |
| `template-section` | `TASK-343-12` | Preview/diagnostics contract is structurally misleading. |
| `timeline` | `TASK-343-13` | Duplicate mode controls create divergent state. |
| `form-embed` | `TASK-343-14` | Multiple confirmed control-truthfulness and clear/reset issues. |
| `navigation` | `TASK-343-15` | Diagnostics incompleteness, clear/reset gaps, and silent link drop. |
| `product-gallery` | `TASK-343-16` | Preview hydration and route-truthfulness are misleading. |
| `rich-text-section` | `TASK-343-17` | Wizard/TOC/sanitizer diagnostics are misleading or incomplete. |
| `listing-filters` | `TASK-343-18` | High-priority missing facet option authoring, empty-facet guidance, and public a11y gaps. |
| `posts-feed` | `TASK-343-19` | Wrong audit fixture/public `404` plus missing route/view-all truthfulness. |
| `search-box` | `TASK-343-20` | Public a11y gaps, stale source checkbox state, and compact-mode truthfulness. |
| shared block wrapper / `product-compare` | `TASK-343-21` | Product Compare proves inherited block layout and Device Visibility shared-owner drift. |
| `cta-banner` | `TASK-343-22` | Indistinguishable `With Badge` variant, missing CTA guidance, and no repair feedback. |
| `gallery-mosaic` | `TASK-343-23` | Admin lightbox preview binding, accessible naming, and destructive count reduction. |
| `logo-cloud` | `TASK-343-24` | Silent logo-count truncation and saved-vs-effective strip/grid state. |
| `pricing-plans` | `TASK-343-25` | Nominal count copy, Wizard-to-Visual pointer drift, destructive confirmations, and static billing toggle. |
| `stats-kpi` | `TASK-343-26` | Inert inline card surface controls, divider toggle truthfulness, reset/normalize feedback. |
| `tabs` | `TASK-343-27` | Dead `triggerOverflow=scroll`, Wizard/slot count drift, and destructive removal inconsistency. |
| `split-layout` | `TASK-343-28` | Contradictory ratio disclosure and silent device-override reset. |
| `entry-teaser` | `TASK-343-29` | Section accessible name, non-link CTA guidance, and contextual Clear labels. |
| shared color controls / `content-list` and others | `TASK-343-30` | Repeated false `Saved custom color`/fallback/Clear semantics across reports. |
| shared MediaPicker dialog | `TASK-343-31` | Repeated Radix Dialog description warning in widget media-picker flows. |

### Explicitly Deferred Or Current-State Sufficient

| Widget | Classification |
|---|---|
| `contact` | Current-state sufficient: report found no widget-local functional defect; remaining limitations are fixture/runtime branches. |
| `content-list` | Current-state sufficient for widget-local scope: report found no functional defect; shared color-state wording is covered by `TASK-343-30`. |
| `divider` | Deferred minor widget-local UX/a11y notes only: no functional defect; labeled separator semantics can be revisited outside this wave, while shared color wording is covered by `TASK-343-30` if touched. |
| `footer` | Current-state sufficient for footer-local functional scope; footer-local destination/page-picker polish is deferred, and the shared MediaPicker dialog warning is routed to `TASK-343-31`. |
| `grid-columns` | Current-state sufficient for widget-local scope: report found no functional/rendering bugs; shared visibility wording routes to `TASK-343-21` and shared color wording to `TASK-343-30` if touched. |
| `product-table` | Current-state/environment-only: current report supersedes the stale second-wave classification and found no functional defect; missing route effects are settings/fixture limitations. |
| `section` | Current-state sufficient: no functional defect; media diagnostics polish such as position/blend/layer details is low-priority documentation debt, with shared color wording covered by `TASK-343-30` if touched. |
| `spacer` | Current-state sufficient: report found full editor/runtime consistency; custom length UI remains intentional product limit, and shared visibility wording is not Spacer-local. |
| `testimonials` | Deferred minor widget-local UX notes only: formatted quote `<br>` behavior and CTA hint can be revisited after higher-risk families; shared color fallback wording is covered by `TASK-343-30` if touched. |

These reports still contain useful notes, but the current branch evidence does
not justify a physical implementation family in `TASK-343`.

## Sub-Tasks

- [x] TASK-343-01: Hero Audit Remediation Family
- [x] TASK-343-02: Appointment Form Audit Remediation Family
- [x] TASK-343-03: Newsletter Audit Remediation Family
- [x] TASK-343-04: Accordion Audit Remediation Family
- [x] TASK-343-05: FAQ Accordion Audit Remediation Family
- [x] TASK-343-06: Booking Calendar Audit Remediation Family
- [x] TASK-343-07: Feature Grid Audit Remediation Family
- [x] TASK-343-08: Compare Timeline Audit Remediation Family
- [x] TASK-343-09: Stack Audit Remediation Family
- [x] TASK-343-10: Toggle Block Audit Remediation Family
- [x] TASK-343-11: Team Audit Remediation Family
- [x] TASK-343-12: Template Section Audit Remediation Family
- [x] TASK-343-13: Timeline Audit Remediation Family
- [x] TASK-343-14: Form Embed Audit Remediation Family
- [x] TASK-343-15: Navigation Audit Remediation Family
- [x] TASK-343-16: Product Gallery Audit Remediation Family
- [x] TASK-343-17: Rich Text Section Audit Remediation Family
- [x] TASK-343-18: Listing Filters Audit Remediation Family
- [x] TASK-343-19: Posts Feed Audit Remediation Family
- [x] TASK-343-20: Search Box Audit Remediation Family
- [x] TASK-343-21: Shared Block Layout and Device Visibility Audit Remediation Family
- [x] TASK-343-22: CTA Banner Audit Remediation Family
- [x] TASK-343-23: Gallery Mosaic Audit Remediation Family
- [x] TASK-343-24: Logo Cloud Audit Remediation Family
- [x] TASK-343-25: Pricing Plans Audit Remediation Family
- [x] TASK-343-26: Stats KPI Audit Remediation Family
- [x] TASK-343-27: Tabs Audit Remediation Family
- [x] TASK-343-28: Split Layout Audit Remediation Family
- [x] TASK-343-29: Entry Teaser Audit Remediation Family
- [x] TASK-343-30: Shared Widget Color State Truthfulness Audit Remediation Family
- [x] TASK-343-31: Shared MediaPicker Dialog Accessibility Audit Remediation Family

## Files To Change

| File | Required change |
|---|---|
| `_docs/_TASKS/TASK-343*.md` | Keep the umbrella and physical families synchronized as scope is promoted or de-scoped. |
| `_docs/_TASKS/README.md` | Track the umbrella plus each promoted family and keep statistics synchronized. |
| `_docs/PLAYWRIGHT/28-05-2026/*.md` | Keep report routing and final remediation evidence synchronized with the owning task family. |
| `core/admin/ui/widgets/editors/*.tsx` | Widget-local editor truthfulness fixes owned by the promoted families. |
| `core/widgets/core/*.tsx` | Widget-local runtime fixes owned by the promoted families. |
| `core/widgets/renderers/widgetRenderer.tsx` | Shared wrapper visibility/rendering fixes owned by `TASK-343-21` where proven shared. |
| `core/admin/ui/pages/builder/blockUtils.ts`, `AdvancedPanel.tsx`, `VisualPanel.tsx`, `LayoutPanel.tsx` | Shared layout/visibility UI and helper fixes owned by `TASK-343-21`. |
| `core/admin/ui/widgets/editors/ClearableFields.tsx`, `SharedColorControl.tsx` | Shared color-state fixes owned by `TASK-343-30`. |
| `core/admin/ui/media/MediaPicker.tsx` | Shared dialog accessibility fixes owned by `TASK-343-31`. |
| `tests/vitest/ui/*.test.tsx` | Add targeted editor/admin-preview coverage for each promoted family. |
| `tests/vitest/widgets/*.test.tsx`, `tests/unit/widgets/*.test.tsx` | Add targeted renderer/runtime coverage in the lane already owning that surface. |

## Implementation Order

1. Start with the high-risk public/runtime and destructive-data families:
   `TASK-343-01`, `TASK-343-03`, `TASK-343-07`, `TASK-343-09`,
   `TASK-343-10`, `TASK-343-11`, `TASK-343-12`, `TASK-343-13`, `TASK-343-14`, `TASK-343-18`, `TASK-343-19`,
   `TASK-343-21`, `TASK-343-29`, `TASK-343-30`, and `TASK-343-31`.
2. Then close medium-risk widget-local truthfulness families in dependency
   order, especially families that depend on shared decisions (`TASK-343-24`,
   `TASK-343-25`, `TASK-343-27` after `TASK-343-30`; `TASK-343-28` after
   shared layout decisions if overlap appears).
3. Prefer widget-local truthfulness fixes before shared-wrapper extraction, but
   do not duplicate shared color/layout fixes in every widget leaf.
4. Only after implementation families land, update the affected reports and the
   changelog.

## Implementation Pseudocode

Umbrella orchestration only:

```ts
type AuditFindingPromotion =
  | "promoted-widget"
  | "promoted-shared"
  | "deferred-minor"
  | "current-state-sufficient"
  | "environment-only";

type WidgetAuditClassification = {
  widget: string;
  promotion: AuditFindingPromotion;
  owner: string;
  taskId?: string;
};

function classifyWidgetAudit(report: WidgetAuditReport): WidgetAuditClassification {
  if (report.containsConfirmedRendererBug || report.containsConfirmedControlTruthfulnessDrift) {
    return { widget: report.widget, promotion: "promoted-widget", owner: report.owner, taskId: report.taskId };
  }
  if (report.requiresSharedOwnerExtraction) {
    return { widget: report.widget, promotion: "promoted-shared", owner: report.owner, taskId: report.taskId };
  }
  if (report.containsMinorUxOnlyFollowup) {
    return { widget: report.widget, promotion: "deferred-minor", owner: report.owner };
  }
  return { widget: report.widget, promotion: "current-state-sufficient", owner: report.owner };
}
```

Data flow:

- Each report is classified once in this umbrella.
- Promoted widget-local and shared reports get a physical `TASK-343-*` family with execution-ready
  owner files, pseudocode, and regression-test shape.
- Deferred-minor/current-state/environment-only reports stay documented here
  with explicit reasons so they are not mistaken for lost findings.

## Security Contract

No API routes are added by the umbrella itself.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged unless a promoted family explicitly
  widens a widget contract with matching schema and test updates.
- Anti-abuse: no new public write surface may be introduced by report-driven
  UX fixes.
- Secret handling: audit reports and tasks must not commit secrets, session
  data, or privileged payloads.

## Testing Requirements

Planning-only baseline:

- `git diff --check`

Each promoted family owns its concrete lint/type/test commands.

## Documentation Updates Required

- Keep this umbrella in sync with promotion/de-scope decisions.
- Keep `_docs/PLAYWRIGHT/28-05-2026/README.md` and the affected widget reports
  synchronized with task ownership.
- Keep `_docs/_TASKS/README.md` synchronized on every status change.
- Add changelog entries only when implementation families actually close.

## Acceptance Criteria

- All `38` reports from the 28-05-2026 wave are classified into a concrete
  owner state.
- Actionable widget-local and shared-owner reports have physical execution-ready `TASK-343-*`
  families.
- Deferred, current-state, or environment-only reports are explicitly documented
  instead of being lost in free-form notes.

## Validation Evidence

- All `31` TASK-343 physical remediation families are closed.
- Final family validation for `TASK-343-02`:
  `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx`,
  `bun --cwd core lint`, `bun --cwd core lint:types`, and strict
  `appointment-form` Playwright smoke with `adminFailures=0`,
  `publicFailures=0`, `fixtureGaps=0`, `metadataGaps=0`.
- `claude -p --tools "" --input-format text --output-format text` reviewed
  the TASK-343 closure summaries, status audit, board, changelog index, diff
  checks, and staged diff stat; it reported no blockers. The status audit was
  also verified locally: every `TASK-343*.md` file is `Done (2026-05-30)` and
  no unchecked TASK-343 checklist items remain.
- Retrospective `claude -p` closure reviews were also run for the completed
  family files that did not already carry per-family Claude evidence. Claude
  initially flagged `TASK-343-25` for missing task-file validation evidence;
  that docs drift was fixed in
  `TASK-343-25_Pricing_Plans_Audit_Remediation_Family.md`, and the focused
  rerun then reported no blockers.
