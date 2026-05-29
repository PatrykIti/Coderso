# TASK-343: Widget Report-Driven Remediation After the 28-05-2026 Audit Wave

# FileName: TASK-343_Widget_Report_Driven_Remediation_After_the_28-05-2026_Audit_Wave.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + UX + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-341, TASK-342
**Status:** In Progress (2026-05-29)

---

## Overview

Turn the deep live-audit evidence from `_docs/PLAYWRIGHT/28-05-2026/` into a
report-driven remediation program with physical task families, clear file
owners, and execution-ready leaf scope.

This umbrella does not reopen the whole widget surface blindly. It classifies
all `38/38` reports into:

- first-wave actionable families promoted now as physical `TASK-343-*` leaves;
- second-wave candidates where the evidence is real but mostly lower-severity,
  shared-wrapper, or still better extracted into a later focused family;
- current-state-sufficient or environment-only reports that do not justify a
  new implementation family yet.

## Current Evidence

- Audit wave root: `_docs/PLAYWRIGHT/28-05-2026/README.md`
- The wave is complete and documents real admin + frontend interactions for all
  `38` page-builder widgets.
- The most important follow-up class is no longer smoke stability. It is
  **truthfulness and UX fidelity**: controls that exist but mislead, controls
  that are visually inert, admin previews that hide runtime limits, and saved
  states that do not round-trip cleanly.

## Report Classification

### First-Wave Actionable Families Promoted Now

| Widget | Family | Main reason |
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

### Second-Wave Candidates Not Yet Promoted

| Widget | Classification |
|---|---|
| `cta-banner` | Real UX drift; likely a small follow-up family after first-wave promotion. |
| `pricing-plans` | Real truthfulness drift; largely UX and copy semantics, lower urgency than first-wave bugs. |
| `tabs` | Real truthfulness drift, but close to the Accordion shared slot-story; defer extraction until after `TASK-343-04`. |
| `listing-filters` | Real useability drift, but several findings look shared to listing-runtime/editor shell. |
| `product-compare` | Real wrapper/layout truthfulness drift, but primarily shared wrapper owner rather than widget-local logic. |
| `product-table` | Real wrapper/layout truthfulness drift, but primarily shared wrapper owner rather than widget-local logic. |
| `gallery-mosaic` | Real admin-preview/runtime drift, but lower severity than first-wave bugs. |
| `stats-kpi` | Real UX truthfulness drift, but no confirmed runtime failure. |
| `entry-teaser` | Real a11y/truthfulness drift, but bounded and lower severity. |
| `logo-cloud` | Real truthfulness drift, but no confirmed hard renderer failure. |

### Current-State Sufficient Or Environment-Only

`section`, `spacer`, `divider`, `split-layout`, `grid-columns`, `contact`,
`content-list`, `footer`, `posts-feed`, `search-box`, `testimonials`.

These reports still contain useful notes, but the current branch evidence does
not justify a new implementation family yet.

## Sub-Tasks

- [ ] TASK-343-01: Hero Audit Remediation Family
- [ ] TASK-343-02: Appointment Form Audit Remediation Family
- [ ] TASK-343-03: Newsletter Audit Remediation Family
- [ ] TASK-343-04: Accordion Audit Remediation Family
- [ ] TASK-343-05: FAQ Accordion Audit Remediation Family
- [ ] TASK-343-06: Booking Calendar Audit Remediation Family
- [ ] TASK-343-07: Feature Grid Audit Remediation Family
- [ ] TASK-343-08: Compare Timeline Audit Remediation Family
- [ ] TASK-343-09: Stack Audit Remediation Family
- [ ] TASK-343-10: Toggle Block Audit Remediation Family
- [ ] TASK-343-11: Team Audit Remediation Family
- [ ] TASK-343-12: Template Section Audit Remediation Family
- [ ] TASK-343-13: Timeline Audit Remediation Family
- [ ] TASK-343-14: Form Embed Audit Remediation Family
- [ ] TASK-343-15: Navigation Audit Remediation Family
- [ ] TASK-343-16: Product Gallery Audit Remediation Family
- [ ] TASK-343-17: Rich Text Section Audit Remediation Family

## Files To Change

| File | Required change |
|---|---|
| `_docs/_TASKS/TASK-343*.md` | Keep the umbrella and physical families synchronized as scope is promoted or de-scoped. |
| `_docs/_TASKS/README.md` | Track the umbrella plus each promoted family and keep statistics synchronized. |
| `_docs/PLAYWRIGHT/28-05-2026/*.md` | Keep report routing and final remediation evidence synchronized with the owning task family. |
| `core/admin/ui/widgets/editors/*.tsx` | Widget-local editor truthfulness fixes owned by the promoted families. |
| `core/widgets/core/*.tsx` | Widget-local runtime fixes owned by the promoted families. |
| `core/widgets/renderers/widgetRenderer.tsx` | Shared wrapper follow-up only if a promoted family proves the owner is shared rather than widget-local. |
| `core/admin/ui/pages/builder/blockUtils.ts` | Shared layout/visibility follow-up only if a promoted family proves the owner is shared rather than widget-local. |
| `tests/vitest/ui/*.test.tsx` | Add targeted editor/admin-preview coverage for each promoted family. |
| `tests/vitest/widgets/*.test.tsx` | Add targeted renderer/runtime coverage for each promoted family. |

## Implementation Order

1. Start with the first-wave families above; do not promote second-wave notes
   into implementation until their owner boundary is clearer.
2. Prefer widget-local truthfulness fixes before shared-wrapper extraction.
3. If a first-wave family proves the real owner is shared, split or promote a
   dedicated shared family instead of silently widening the widget leaf.
4. Only after implementation families land, update the affected reports and the
   changelog.

## Implementation Pseudocode

Umbrella orchestration only:

```ts
type AuditFindingPromotion = "promoted" | "phase2" | "current-state-sufficient";

type WidgetAuditClassification = {
  widget: string;
  promotion: AuditFindingPromotion;
  owner: string;
  taskId?: string;
};

function classifyWidgetAudit(report: WidgetAuditReport): WidgetAuditClassification {
  if (report.containsConfirmedRendererBug || report.containsConfirmedControlTruthfulnessDrift) {
    return { widget: report.widget, promotion: "promoted", owner: report.owner, taskId: report.taskId };
  }
  if (report.containsRealButLowerSeverityFollowup || report.requiresSharedOwnerExtraction) {
    return { widget: report.widget, promotion: "phase2", owner: report.owner };
  }
  return { widget: report.widget, promotion: "current-state-sufficient", owner: report.owner };
}
```

Data flow:

- Each report is classified once in this umbrella.
- Promoted reports get a physical `TASK-343-*` family with execution-ready
  owner files, pseudocode, and regression-test shape.
- Second-wave candidates stay documented here until their owner boundary or
  severity justifies promotion.

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
- First-wave actionable reports have physical execution-ready `TASK-343-*`
  families.
- Lower-severity or shared-owner candidates are explicitly documented instead of
  being lost in free-form notes.

